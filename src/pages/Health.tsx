import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { useFoodStore, FoodEntry } from '@/stores/useFoodStore';
import { useWaterStore } from '@/stores/useWaterStore';
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
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setShowAddModal(false);
  };

  const handleCameraCapture = async (file: File) => {
    if (!apiKey) return;
    setCameraLoading(true);

    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analise esta foto de alimento. Estime as calorias e macronutrientes (proteína, carboidratos, gorduras em gramas).
Responda APENAS em JSON: {"name": "nome do alimento", "calories": 300, "protein": 20, "carbs": 30, "fat": 10}
Se não conseguir identificar o alimento, responda: {"name": "Não identificado", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}`,
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' },
                },
              ],
            },
          ],
          max_tokens: 200,
        }),
      });

      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();
      const content = data.choices[0].message.content;
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.calories > 0) {
          addEntry({
            id: `food_${Date.now()}`,
            name: parsed.name,
            calories: parsed.calories,
            protein: parsed.protein || 0,
            carbs: parsed.carbs || 0,
            fat: parsed.fat || 0,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            imageData: base64.slice(0, 500), // thumbnail hint
          });
        }
      }
    } catch {
      // Silently fail, user can add manually
    } finally {
      setCameraLoading(false);
    }
  };

  return (
    <div className="px-5 pt-12 pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Saúde 🩺</h1>

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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-300 text-xs font-medium"
              >
                📷 Câmera
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-300 text-xs font-medium"
            >
              + Adicionar
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCameraCapture(file);
            e.target.value = '';
          }}
        />

        {cameraLoading && (
          <div className="card text-center py-6">
            <p className="text-sm text-white/60 animate-pulse">🤖 Analisando alimento...</p>
          </div>
        )}

        {entries.length === 0 && !cameraLoading && (
          <div className="card text-center py-8">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-sm text-white/40">Nenhuma refeição registrada hoje</p>
            <p className="text-xs text-white/25 mt-1">Use a câmera ou adicione manualmente</p>
          </div>
        )}

        <AnimatePresence>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="card flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">{entry.time}</span>
                  <p className="font-medium text-sm">{entry.name}</p>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  P:{entry.protein}g • C:{entry.carbs}g • G:{entry.fat}g
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-orange-400">{entry.calories} kcal</p>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="text-white/20 text-lg"
                >
                  ×
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Food Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-8"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-dark-200 rounded-2xl p-6 space-y-4 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
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
                  <label className="text-[10px] text-white/40">Calorias (kcal)</label>
                  <input type="number" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} placeholder="300" className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40">Proteína (g)</label>
                  <input type="number" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} placeholder="30" className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40">Carboidratos (g)</label>
                  <input type="number" value={manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} placeholder="40" className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40">Gorduras (g)</label>
                  <input type="number" value={manualFat} onChange={(e) => setManualFat(e.target.value)} placeholder="10" className="input-field text-sm" />
                </div>
              </div>
              <button
                className="btn-primary"
                disabled={!manualName.trim() || !manualCalories}
                onClick={handleManualAdd}
              >
                Adicionar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
