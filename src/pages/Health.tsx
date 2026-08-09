import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { useFoodStore, FoodEntry } from '@/stores/useFoodStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { useToastStore } from '@/stores/useToastStore';
import { useAIStore } from '@/stores/useAIStore';
import { calculateTDEE, calculateMacros } from '@/utils/calories';
import { calculateWaterIntake } from '@/utils/water';

export function Health() {
  const profile = useProfileStore((s) => s.profile)!;
  const { getTodayEntries, getTodayTotals, addEntry, removeEntry } = useFoodStore();
  const waterGlasses = useWaterStore((s) => s.getToday());
  const addGlass = useWaterStore((s) => s.addGlass);
  const removeGlass = useWaterStore((s) => s.removeGlass);
  const apiKey = useAIStore((s) => s.apiKey);

  const [showAddModal, setShowAddModal] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calories = calculateTDEE(profile);
  const macros = calculateMacros(calories, profile.goal);
  const water = calculateWaterIntake(profile.weight);
  const waterGoal = Math.round(water * 4);

  const entries = getTodayEntries();
  const totals = getTodayTotals();
  const burned = 0; // TODO: integrate with workout session data
  const net = totals.calories - burned;
  const remaining = calories - net;
  const progressCalories = Math.min(totals.calories / calories, 1);

  const handleManualAdd = () => {
    if (!manualName.trim() || !manualCalories) return;
    const entry: FoodEntry = {
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: manualName.trim(),
      calories: Number(manualCalories) || 0,
      protein: Number(manualProtein) || 0,
      carbs: Number(manualCarbs) || 0,
      fat: Number(manualFat) || 0,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    addEntry(entry);
    useToastStore.getState().show(`${entry.name} adicionado`, 'success');
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setShowAddModal(false);
  };

  const handleCameraCapture = async (file: File) => {
    if (!apiKey) {
      useToastStore.getState().show('Configure sua chave IA no Perfil primeiro', 'error');
      return;
    }
    setCameraLoading(true);
    const toast = useToastStore.getState().show;

    try {
      const base64 = await compressAndEncode(file);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Você é um nutricionista esportivo. Sempre responda em JSON válido.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analise esta foto de alimento/bebida com MÁXIMA precisão.

INSTRUÇÕES:
1. Identifique TODOS os itens visíveis (comida, bebida, snack, doce, embalagem)
2. Se for uma EMBALAGEM ou produto industrializado (chocolate, salgadinho, cerveja, refrigerante etc), use as informações nutricionais conhecidas do produto
3. Estime a porção baseado no que está visível (1 unidade, 1 lata, 1 prato etc)
4. Para pratos caseiros, estime baseado no tamanho do prato/recipiente
5. Considere método de preparo (grelhado, frito, cozido)

Exemplos:
- Sonho de Valsa (1 bombom): ~125kcal, P:1g, C:14g, G:7g
- Cerveja Brahma 350ml: ~150kcal, P:1g, C:11g, G:0g
- Prato com arroz+feijão+carne: ~550kcal, P:35g, C:60g, G:15g

RESPONDA JSON: {"name":"descrição curta","calories":número,"protein":gramas,"carbs":gramas,"fat":gramas}`,
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' },
                },
              ],
            },
          ],
          max_tokens: 300,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        const msg = err?.error?.message || `Status ${response.status}`;
        // Fallback to gpt-4o-mini if model not available
        if (response.status === 404 || msg.includes('model')) {
          const fallback = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Você é um nutricionista. Responda em JSON válido.' },
                { role: 'user', content: [
                  { type: 'text', text: 'Identifique este alimento/produto e estime calorias e macros da porção visível. JSON: {"name":"...","calories":0,"protein":0,"carbs":0,"fat":0}' },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } },
                ] },
              ],
              max_tokens: 200,
              response_format: { type: 'json_object' },
            }),
          });
          if (!fallback.ok) throw new Error(msg);
          const fallbackData = await fallback.json();
          const content = fallbackData.choices[0].message.content;
          const parsed = JSON.parse(content);
          if (parsed.calories > 0) {
            addEntry({
              id: `food_${Date.now()}`,
              name: parsed.name,
              calories: parsed.calories,
              protein: parsed.protein || 0,
              carbs: parsed.carbs || 0,
              fat: parsed.fat || 0,
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            });
            toast(`✅ ${parsed.name} — ${parsed.calories} kcal`, 'success');
          } else {
            toast('Não identificado. Tente foto mais nítida.', 'error');
          }
          return;
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      if (parsed.calories > 0) {
        addEntry({
          id: `food_${Date.now()}`,
          name: parsed.name,
          calories: parsed.calories,
          protein: parsed.protein || 0,
          carbs: parsed.carbs || 0,
          fat: parsed.fat || 0,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
        toast(`✅ ${parsed.name} — ${parsed.calories} kcal`, 'success');
      } else {
        toast('Não consegui identificar. Tente outra foto.', 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast(`❌ Falha: ${msg.slice(0, 60)}`, 'error');
    } finally {
      setCameraLoading(false);
    }
  };

  return (
    <div className="px-5 pt-14 pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold">Saúde</h1>
        <span className="text-2xl">🩺</span>
      </div>

      {/* Calorie Progress */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white/80">Calorias do dia</h2>
          <span className="text-xs text-white/40">Meta: {calories} kcal</span>
        </div>

        <div className="relative h-4 bg-dark-300 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${progressCalories >= 1 ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressCalories * 100}%` }}
            transition={{ type: 'spring', stiffness: 80 }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-emerald-400">{totals.calories}</p>
            <p className="text-[10px] text-white/40">Consumidas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-orange-400">{burned}</p>
            <p className="text-[10px] text-white/40">Queimadas</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${remaining > 0 ? 'text-blue-400' : 'text-red-400'}`}>{remaining}</p>
            <p className="text-[10px] text-white/40">{remaining > 0 ? 'Restantes' : 'Excedido'}</p>
          </div>
        </div>

        {/* Macro bars */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <MacroBar label="Proteína" current={totals.protein} goal={macros.protein} color="bg-red-400" />
          <MacroBar label="Carboidratos" current={totals.carbs} goal={macros.carbs} color="bg-yellow-400" />
          <MacroBar label="Gorduras" current={totals.fat} goal={macros.fat} color="bg-green-400" />
        </div>
      </div>

      {/* Water Tracker */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white/80">💧 Água</h2>
          <p className="text-xs text-white/40">{waterGlasses * 250}ml / {waterGoal * 250}ml</p>
        </div>
        <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
            animate={{ width: `${Math.min(waterGlasses / waterGoal, 1) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
        <div className="flex items-center justify-between">
          <button onClick={removeGlass} disabled={waterGlasses <= 0} className="w-9 h-9 rounded-full bg-dark-300 flex items-center justify-center text-white/50 disabled:opacity-30">−</button>
          <p className="text-sm text-white/60">{waterGlasses} / {waterGoal} copos</p>
          <button onClick={addGlass} className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">+</button>
        </div>
        {waterGlasses >= waterGoal && <p className="text-center text-xs text-green-400">✅ Meta atingida!</p>}
      </div>

      {/* Food Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white/80">Refeições</h2>
          <div className="flex gap-2">
            {apiKey && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={cameraLoading}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/20 text-primary-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>📷</span> {cameraLoading ? 'Analisando...' : 'Foto IA'}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium"
            >
              + Manual
            </motion.button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCameraCapture(file);
            e.target.value = '';
          }}
        />

        {cameraLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center py-8 border-primary-500/30 bg-primary-500/5"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="text-3xl inline-block mb-3"
            >🔍</motion.div>
            <p className="text-sm text-primary-300 font-semibold">Analisando com IA...</p>
            <p className="text-[10px] text-white/30 mt-1">Identificando alimento e estimando macros</p>
          </motion.div>
        )}

        {entries.length === 0 && !cameraLoading && (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm text-white/50 font-medium">Nenhuma refeição registrada</p>
            <p className="text-xs text-white/25 mt-1">Tire uma foto ou adicione manualmente</p>
          </div>
        )}

        <AnimatePresence>
          {entries.map((entry) => (
            <SwipeableEntry key={entry.id} entry={entry} onDelete={removeEntry} />
          ))}
        </AnimatePresence>
      </div>

      {/* Add Food Modal - Bottom Sheet */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[rgb(var(--color-bg-card-rgb))] rounded-t-[28px] p-6 space-y-4 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2" />
              <h3 className="text-lg font-bold">Adicionar alimento</h3>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Nome (ex: Frango grelhado)"
                className="input-field text-sm"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 font-medium">Calorias (kcal)</label>
                  <input type="number" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} placeholder="300" className="input-field text-sm mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-medium">Proteína (g)</label>
                  <input type="number" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} placeholder="30" className="input-field text-sm mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-medium">Carboidratos (g)</label>
                  <input type="number" value={manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} placeholder="40" className="input-field text-sm mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-medium">Gorduras (g)</label>
                  <input type="number" value={manualFat} onChange={(e) => setManualFat(e.target.value)} placeholder="10" className="input-field text-sm mt-1" />
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                disabled={!manualName.trim() || !manualCalories}
                onClick={handleManualAdd}
              >
                Adicionar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SwipeableEntry({ entry, onDelete }: { entry: FoodEntry; onDelete: (id: string) => void }) {
  const x = useMotionValue(0);
  const bg = useTransform(x, [-100, 0], ['rgba(239,68,68,0.3)', 'rgba(0,0,0,0)']);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) {
      onDelete(entry.id);
      useToastStore.getState().show('Refeição removida', 'info');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -200, transition: { duration: 0.2 } }}
      style={{ background: bg }}
      className="rounded-2xl overflow-hidden"
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="card flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/25 font-mono">{entry.time}</span>
            <p className="font-medium text-sm truncate">{entry.name}</p>
          </div>
          <p className="text-[11px] text-white/35 mt-0.5">
            P:{entry.protein}g • C:{entry.carbs}g • G:{entry.fat}g
          </p>
        </div>
        <p className="text-sm font-bold text-orange-400 ml-3">{entry.calories}</p>
      </motion.div>
    </motion.div>
  );
}

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const progress = Math.min(current / goal, 1);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-white/40 w-20">{label}</span>
      <div className="flex-1 h-2 bg-dark-300 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>
      <span className="text-[10px] text-white/50 w-16 text-right">{current}/{goal}g</span>
    </div>
  );
}

// Compresses image to max 1024px and JPEG 0.8 quality to keep payload small
function compressAndEncode(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
