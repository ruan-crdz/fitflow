import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { useFoodStore, FoodEntry } from '@/stores/useFoodStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { useToastStore } from '@/stores/useToastStore';
import { useAIStore } from '@/stores/useAIStore';
import { useMealStore, SavedMeal } from '@/stores/useMealStore';
import { WaterTracker } from '@/components/ui/WaterTracker';
import { useHealthIntegrationStore } from '@/stores/useHealthIntegrationStore';
import { askAI } from '@/utils/ai';
import { calculateTDEE, calculateMacros } from '@/utils/calories';
import { calculateWaterIntake } from '@/utils/water';
import { getToday } from '@/utils/date';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

type IngredientUnit = 'g' | 'un' | 'colher_sopa' | 'colher_cha' | 'ml' | 'copo' | 'xicara';

interface IngredientInput {
  name: string;
  amount: string;
  unit: IngredientUnit;
  calories?: string;
}

const FOOD_UNITS: { value: IngredientUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'un', label: 'un' },
  { value: 'colher_sopa', label: 'colher' },
  { value: 'colher_cha', label: 'chá' },
  { value: 'ml', label: 'ml' },
  { value: 'copo', label: 'copo' },
  { value: 'xicara', label: 'xícara' },
];

const UNIT_LABEL: Record<IngredientUnit, string> = {
  g: 'gramas',
  un: 'unidade(s)',
  colher_sopa: 'colher(es) de sopa',
  colher_cha: 'colher(es) de chá',
  ml: 'ml',
  copo: 'copo(s)',
  xicara: 'xícara(s)',
};

export function Health() {
  const profile = useProfileStore((s) => s.profile)!;
  const { getTodayEntries, getTodayTotals, addEntry, removeEntry } = useFoodStore();
  const waterGlasses = useWaterStore((s) => s.getToday());
  const addGlass = useWaterStore((s) => s.addGlass);
  const removeGlass = useWaterStore((s) => s.removeGlass);
  const apiKey = useAIStore((s) => s.apiKey);
  const healthDaily = useHealthIntegrationStore((s) => s.daily);

  const [showAddModal, setShowAddModal] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([{ name: '', amount: '', unit: 'g' }]);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealResult, setMealResult] = useState<{ name: string; description: string; calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraAbortRef = useRef<AbortController | null>(null);
  const { shortcuts, recents, addShortcut, addRecent, removeShortcut } = useMealStore();

  const calories = calculateTDEE(profile);
  const macros = calculateMacros(calories, profile.goal);
  const water = calculateWaterIntake(profile.weight);
  const waterGoal = Math.round(water * 4);

  const entries = getTodayEntries();
  const today = getToday();
  const healthSummary = healthDaily[today] || {
    date: today,
    steps: 0,
    activeCalories: 0,
    source: 'none' as const,
    syncedAt: 0,
  };
  const totals = getTodayTotals();
  const burned = healthSummary.activeCalories;
  const net = totals.calories - burned;
  const remaining = calories - net;
  const progressCalories = Math.min(totals.calories / calories, 1);
  const validIngredients = ingredients.filter((i) => i.name.trim());
  const hasAnyIngredient = validIngredients.length > 0;
  const ingredientsWithoutCalories = validIngredients.filter((i) => !Number(i.calories));
  const needsAIForMeal = ingredientsWithoutCalories.length > 0;

  const handleAIMealCalc = async () => {
    if (validIngredients.length === 0) return;
    if (needsAIForMeal && !apiKey) {
      useToastStore.getState().show('Preencha as kcal ou configure a IA no Perfil.', 'error');
      return;
    }
    setMealLoading(true);
    setMealResult(null);
    const profile = useProfileStore.getState().profile!;
    const description = validIngredients.map((i) => `${i.amount ? `${i.amount} ${UNIT_LABEL[i.unit]} de ` : ''}${i.name.trim()}`).join(', ');
    const manualItems = validIngredients.filter((i) => Number(i.calories) > 0);
    const manualCalories = manualItems.reduce((sum, item) => sum + Number(item.calories || 0), 0);
    const mealName = validIngredients.length === 1
      ? validIngredients[0].name.trim()
      : `Refeição: ${validIngredients.slice(0, 3).map((i) => i.name.trim()).join(', ')}${validIngredients.length > 3 ? '...' : ''}`;

    if (!needsAIForMeal) {
      const result = {
        name: mealName,
        description,
        calories: manualCalories,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      const entry: FoodEntry = {
        id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      addEntry(entry);
      addRecent({ id: `recent_${Date.now()}`, ...result });
      setMealResult(result);
      setShowSavePrompt(true);
      useToastStore.getState().show(`${result.name} — ${result.calories} kcal`, 'success');
      setMealLoading(false);
      return;
    }
    try {
      const aiPrompt = `Calcule macros e calorias APENAS dos itens sem kcal manual.

ITENS PARA CALCULAR:
${ingredientsWithoutCalories.map((i) => `- ${i.amount ? `${i.amount} ${UNIT_LABEL[i.unit]}` : 'porção padrão'} de ${i.name.trim()}`).join('\n')}

ITENS JA PREENCHIDOS PELO USUARIO, NAO RECALCULE:
${manualItems.length ? manualItems.map((i) => `- ${i.name.trim()}: ${Number(i.calories)} kcal`).join('\n') : '- nenhum'}

REGRAS:
- Some no JSON final as kcal manuais (${manualCalories} kcal) + sua estimativa dos itens sem kcal.
- Não altere as kcal manuais informadas pelo usuário.
- Use tabelas nutricionais brasileiras (TACO) como referência.
- Considere os pesos informados. Se não informou peso, estime porção padrão.
- Arredonde para inteiros.

Responda JSON: {"name":"nome curto do prato","calories":número,"protein":gramas,"carbs":gramas,"fat":gramas}`;

      const response = await askAI(apiKey!, profile, aiPrompt, true);
      const parsed = JSON.parse(response);
      if (parsed.calories > 0) {
        setMealResult({ ...parsed, name: parsed.name || mealName, description });
      } else {
        useToastStore.getState().show('Não consegui calcular. Detalhe melhor.', 'error');
      }
    } catch {
      useToastStore.getState().show('Erro ao calcular. Verifique sua chave IA.', 'error');
    }
    setMealLoading(false);
  };

  const handleConfirmMeal = () => {
    if (!mealResult) return;
    const entry: FoodEntry = {
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: mealResult.name,
      calories: mealResult.calories,
      protein: mealResult.protein,
      carbs: mealResult.carbs,
      fat: mealResult.fat,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    addEntry(entry);
    addRecent({ id: `recent_${Date.now()}`, name: mealResult.name, description: mealResult.description, calories: mealResult.calories, protein: mealResult.protein, carbs: mealResult.carbs, fat: mealResult.fat });
    useToastStore.getState().show(`${mealResult.name} — ${mealResult.calories} kcal`, 'success');
    setShowSavePrompt(true);
  };

  const handleSaveAsShortcut = () => {
    if (!mealResult) return;
    addShortcut({ id: `shortcut_${Date.now()}`, name: mealResult.name, description: mealResult.description, calories: mealResult.calories, protein: mealResult.protein, carbs: mealResult.carbs, fat: mealResult.fat });
    useToastStore.getState().show('⭐ Salvo como atalho!', 'success');
    closeModal();
  };

  const handleQuickAdd = (meal: SavedMeal) => {
    const entry: FoodEntry = {
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    addEntry(entry);
    useToastStore.getState().show(`${meal.name} — ${meal.calories} kcal`, 'success');
    setShowAddModal(false);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIngredients([{ name: '', amount: '', unit: 'g' }]);
    setMealResult(null);
    setShowSavePrompt(false);
    setMealLoading(false);
  };

  const handleCameraCapture = async (file: File, userHint = '') => {
    if (!apiKey) {
      useToastStore.getState().show('Configure sua chave IA no Perfil primeiro', 'error');
      return;
    }
    cameraAbortRef.current?.abort();
    const controller = new AbortController();
    cameraAbortRef.current = controller;
    let restartedWithHint = false;
    const hintTimeout = window.setTimeout(() => {
      if (userHint || controller.signal.aborted) return;
      const hint = window.prompt('A IA está demorando. Descreva rapidinho a comida/bebida para ajudar na identificação:');
      if (!hint?.trim()) return;
      restartedWithHint = true;
      controller.abort();
      void handleCameraCapture(file, hint.trim());
    }, 8000);
    setCameraLoading(true);
    const toast = useToastStore.getState().show;

    try {
      const base64 = await compressAndEncode(file);
      const extraHint = userHint
        ? `\n\nDESCRIÇÃO DO USUÁRIO PARA AJUDAR NA ANÁLISE:\n${userHint}\nUse essa descrição como contexto, mas ainda valide pela foto.`
        : '';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
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

RESPONDA JSON: {"name":"descrição curta","calories":número,"protein":gramas,"carbs":gramas,"fat":gramas}${extraHint}`,
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
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Você é um nutricionista. Responda em JSON válido.' },
                { role: 'user', content: [
                  { type: 'text', text: `Identifique este alimento/produto e estime calorias e macros da porção visível. JSON: {"name":"...","calories":0,"protein":0,"carbs":0,"fat":0}${extraHint}` },
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
            toast(`${parsed.name} — ${parsed.calories} kcal`, 'success');
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
        toast(`${parsed.name} — ${parsed.calories} kcal`, 'success');
      } else {
        toast('Não consegui identificar. Tente outra foto.', 'error');
      }
    } catch (err) {
      if (restartedWithHint || controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast(`Falha: ${msg.slice(0, 60)}`, 'error');
    } finally {
      window.clearTimeout(hintTimeout);
      if (!restartedWithHint) setCameraLoading(false);
      if (cameraAbortRef.current === controller) cameraAbortRef.current = null;
    }
  };

  return (
    <div className="gym-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="gym-kicker">Nutrição e saúde</p>
          <h1 className="gym-title mt-1">Saúde</h1>
        </div>
        <div className="gym-icon-tile">
          <MaterialIcon name="health_and_safety" className="text-2xl text-primary-300" />
        </div>
      </div>

      {/* Calorie Progress */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white/80 flex items-center gap-2">
            <MaterialIcon name="whatshot" className="text-primary-300" />
            Calorias do dia
          </h2>
          <span className="text-xs text-white/40">Meta: {calories} kcal</span>
        </div>

        <div className="relative h-4 bg-dark-300 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${progressCalories >= 1 ? 'bg-red-500' : 'bg-primary-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressCalories * 100}%` }}
            transition={{ type: 'spring', stiffness: 80 }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-primary-300">{totals.calories}</p>
            <p className="text-[10px] text-white/40">Consumidas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary-300">{burned}</p>
            <p className="text-[10px] text-white/40">Queimadas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary-300">{remaining}</p>
            <p className="text-[10px] text-white/40">{remaining > 0 ? 'Restantes' : 'Excedido'}</p>
          </div>
        </div>

        {/* Macro bars */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <MacroBar label="Proteína" current={totals.protein} goal={macros.protein} color="bg-primary-500" />
          <MacroBar label="Carboidratos" current={totals.carbs} goal={macros.carbs} color="bg-primary-500" />
          <MacroBar label="Gorduras" current={totals.fat} goal={macros.fat} color="bg-primary-500" />
        </div>
      </div>

      {/* Water Tracker */}
      <WaterTracker glasses={waterGlasses} goal={waterGoal} onAdd={addGlass} onRemove={removeGlass} />

      {/* Old Water Tracker */}
      {false && (
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white/80 flex items-center gap-2"><MaterialIcon name="opacity" className="text-primary-300" /> Água</h2>
          <p className="text-xs text-white/40">{waterGlasses * 250}ml / {waterGoal * 250}ml</p>
        </div>
        <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary-500"
            animate={{ width: `${Math.min(waterGlasses / waterGoal, 1) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
        <div className="flex items-center justify-between">
          <button onClick={removeGlass} disabled={waterGlasses <= 0} className="w-9 h-9 rounded-full bg-dark-300 flex items-center justify-center text-white/50 disabled:opacity-30">−</button>
          <p className="text-sm text-primary-300 font-semibold">{waterGlasses} / {waterGoal} copos</p>
          <button onClick={addGlass} className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-300 font-bold">+</button>
        </div>
        {waterGlasses >= waterGoal && <p className="text-center text-xs text-primary-300">Meta atingida!</p>}
      </div>
      )}

      {/* Food Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white/80 flex items-center gap-2">
            <MaterialIcon name="restaurant_menu" className="text-primary-300" />
            Refeições
          </h2>
          <div className="flex gap-2">
            {apiKey && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={cameraLoading}
                className="px-3 py-2 rounded-xl bg-primary-500/15 border border-primary-500/25 text-primary-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
              >
                <MaterialIcon name="photo_camera" /> {cameraLoading ? 'Analisando...' : 'Foto IA'}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium"
            >
              + Adicionar
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
            ><MaterialIcon name="smart_toy" className="text-primary-300" /></motion.div>
            <p className="text-sm text-primary-300 font-semibold">Analisando com IA...</p>
            <p className="text-[10px] text-white/30 mt-1">Identificando alimento e estimando macros</p>
          </motion.div>
        )}

        {entries.length === 0 && !cameraLoading && (
          <div className="card text-center py-10">
            <MaterialIcon name="restaurant" className="text-5xl text-primary-300 mx-auto mb-3" />
            <p className="text-sm text-white/50 font-medium">Nenhuma refeição registrada</p>
            <p className="text-xs text-white/25 mt-1">Tire uma foto ou adicione manualmente</p>
          </div>
        )}

        <AnimatePresence>
          {groupEntries(entries).map((group) => (
            <GroupedEntry key={group.name} group={group} onAdd={addEntry} onRemove={removeEntry} />
          ))}
        </AnimatePresence>
      </div>

      {/* Add Food Modal - Full Screen */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-[rgb(var(--color-bg-rgb))] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-white/5">
              <button onClick={closeModal} className="text-white/50 text-sm font-medium">Cancelar</button>
              <h3 className="font-bold">Adicionar refeição</h3>
              <div className="w-16" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Save prompt */}
              {showSavePrompt && mealResult ? (
                <div className="space-y-4 text-center pt-10">
                  <p className="text-4xl">⭐</p>
                  <p className="font-semibold text-lg">Adicionado!</p>
                  <p className="text-sm text-white/50">Salvar como atalho rápido?</p>
                  <p className="text-xs text-white/30 bg-dark-300 rounded-xl px-4 py-3">{mealResult.description}</p>
                  <div className="flex gap-3 pt-2">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-medium">
                      Não
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveAsShortcut} className="flex-1 btn-primary text-sm">
                      ⭐ Salvar
                    </motion.button>
                  </div>
                </div>
              ) : mealResult ? (
                /* Result */
                <div className="space-y-4 pt-4">
                  <div className="card bg-dark-300/50 space-y-3">
                    <p className="font-semibold text-white/90 text-center">{mealResult.name}</p>
                    <p className="text-xs text-white/30 text-center">{mealResult.description}</p>
                    <div className="grid grid-cols-4 gap-2 text-center pt-3 border-t border-white/5">
                      <div>
                        <p className="text-xl font-bold text-primary-300">{mealResult.calories}</p>
                        <p className="text-[9px] text-white/30">kcal</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-primary-300">{mealResult.protein}g</p>
                        <p className="text-[9px] text-white/30">proteína</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-primary-300">{mealResult.carbs}g</p>
                        <p className="text-[9px] text-white/30">carbs</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-primary-300">{mealResult.fat}g</p>
                        <p className="text-[9px] text-white/30">gordura</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setMealResult(null); }} className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-medium">
                      Refazer
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirmMeal} className="flex-1 btn-primary text-sm">
                      Adicionar
                    </motion.button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Quick shortcuts */}
                  {shortcuts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">⭐ Atalhos</p>
                      <div className="flex flex-wrap gap-2">
                        {shortcuts.map((meal) => (
                          <div key={meal.id} className="flex items-center rounded-xl bg-primary-500/10 border border-primary-500/20 overflow-hidden">
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => handleQuickAdd(meal)}
                              className="px-3 py-2 text-xs text-primary-300 font-medium"
                            >
                              {meal.name} <span className="text-white/30">({meal.calories}kcal)</span>
                            </motion.button>
                            <button
                              onClick={() => removeShortcut(meal.id)}
                              className="self-stretch px-2 border-l border-primary-500/20 text-primary-300 flex items-center"
                              aria-label={`Remover ${meal.name} dos atalhos`}
                            >
                              <MaterialIcon name="close" className="text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recents */}
                  {recents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider flex items-center gap-1"><MaterialIcon name="history" /> Recentes</p>
                      <div className="flex flex-wrap gap-2">
                        {recents.slice(0, 6).map((meal) => (
                          <motion.button
                            key={meal.id}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleQuickAdd(meal)}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50"
                          >
                            {meal.name} <span className="text-white/25">({meal.calories}kcal)</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ingredient rows */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider flex items-center gap-1"><MaterialIcon name="restaurant_menu" /> Ingredientes</p>
                      <p className="text-[11px] text-white/35">Kcal é opcional: preencha se souber; se deixar vazio, a IA calcula.</p>
                    </div>
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => {
                            const next = [...ingredients];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setIngredients(next);
                          }}
                          placeholder="Alimento"
                          className="input-field text-sm flex-1"
                          autoFocus={idx === ingredients.length - 1}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={ing.amount}
                          onChange={(e) => {
                            const next = [...ingredients];
                            next[idx] = { ...next[idx], amount: e.target.value };
                            setIngredients(next);
                          }}
                          placeholder="Qtd"
                          className="input-field text-sm w-16 text-center"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) => {
                            const next = [...ingredients];
                            next[idx] = { ...next[idx], unit: e.target.value as IngredientUnit };
                            setIngredients(next);
                          }}
                          className="input-field h-12 text-xs w-20 px-2 text-center appearance-none"
                        >
                          {FOOD_UNITS.map((unit) => (
                            <option key={unit.value} value={unit.value} className="bg-dark-200">
                              {unit.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={ing.calories || ''}
                          onChange={(e) => {
                            const next = [...ingredients];
                            next[idx] = { ...next[idx], calories: e.target.value };
                            setIngredients(next);
                          }}
                          placeholder="kcal"
                          className="input-field text-sm w-20 text-center"
                        />
                        {ingredients.length > 1 && (
                          <button
                            onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                            className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-sm font-bold shrink-0 active:scale-90 transition-transform"
                          >×</button>
                        )}
                      </div>
                    ))}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIngredients([...ingredients, { name: '', amount: '', unit: 'g' }])}
                      className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-white/40 text-sm font-medium active:bg-white/5 transition-colors"
                    >
                      + Adicionar ingrediente
                    </motion.button>
                  </div>
                </>
              )}
            </div>

            {/* Bottom action */}
            {!mealResult && !showSavePrompt && (
              <div className="px-5 pb-24 pt-3 border-t border-white/5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={!hasAnyIngredient || mealLoading || (needsAIForMeal && !apiKey)}
                  onClick={handleAIMealCalc}
                >
                  {mealLoading ? (
                    <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="inline-block"><MaterialIcon name="bolt" /></motion.span> Calculando...</>
                  ) : !needsAIForMeal ? (
                    <><MaterialIcon name="save" /> Salvar refeição</>
                  ) : (
                    <><MaterialIcon name="psychology" /> Calcular com IA</>
                  )}
                </motion.button>
                {needsAIForMeal && !apiKey && <p className="text-[10px] text-red-400/60 text-center mt-2">Preencha kcal em todos os itens ou configure sua chave IA no Perfil</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EntryGroup {
  name: string;
  entries: FoodEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  qty: number;
}

function groupEntries(entries: FoodEntry[]): EntryGroup[] {
  const map = new Map<string, FoodEntry[]>();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.values()).map((items) => ({
    name: items[0].name,
    entries: items,
    totalCalories: items.reduce((a, e) => a + e.calories, 0),
    totalProtein: items.reduce((a, e) => a + e.protein, 0),
    totalCarbs: items.reduce((a, e) => a + e.carbs, 0),
    totalFat: items.reduce((a, e) => a + e.fat, 0),
    qty: items.length,
  }));
}

function GroupedEntry({ group, onAdd, onRemove }: { group: EntryGroup; onAdd: (entry: FoodEntry) => void; onRemove: (id: string) => void }) {
  const x = useMotionValue(0);
  const bg = useTransform(x, [-100, 0], ['rgba(239,68,68,0.3)', 'rgba(0,0,0,0)']);
  const lastEntry = group.entries[group.entries.length - 1];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) {
      // Remove all entries in the group
      group.entries.forEach((e) => onRemove(e.id));
      useToastStore.getState().show(`${group.name} removido`, 'info');
    }
  };

  const handleAdd = () => {
    onAdd({
      ...lastEntry,
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
    useToastStore.getState().show(`+1 ${group.name}`, 'success');
  };

  const handleRemoveOne = () => {
    onRemove(lastEntry.id);
    if (group.qty <= 1) {
      useToastStore.getState().show(`${group.name} removido`, 'info');
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
        className="card flex items-center gap-2"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {group.qty > 1 && <span className="text-[10px] font-bold text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">x{group.qty}</span>}
            <p className="font-medium text-sm truncate">{group.name}</p>
          </div>
          <p className="text-[11px] text-white/35 mt-0.5">
            P:{group.totalProtein}g • C:{group.totalCarbs}g • G:{group.totalFat}g
          </p>
        </div>
        <p className="text-sm font-bold text-primary-300 shrink-0">{group.totalCalories}</p>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button onClick={handleRemoveOne} className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold active:scale-90 transition-transform">−</button>
          <button onClick={handleAdd} className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-300 text-xs font-bold active:scale-90 transition-transform">+</button>
        </div>
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

function compressAndEncode(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Falha ao ler imagem')); };
    img.src = objectUrl;
  });
}
