import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useToastStore } from '@/stores/useToastStore';
import { WORKOUTS } from '@/constants/workouts';
import { EXERCISE_CATALOG, MUSCLE_GROUPS } from '@/constants/exerciseCatalog';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { askAI } from '@/utils/ai';
import type { WorkoutType } from '@/types';

interface CatalogItem {
  name: string;
  muscleGroup: string;
  image: string;
}

interface SwapSuggestion {
  currentId: string;
  currentName: string;
  suggestion: CatalogItem;
  reason: string;
}

export function WorkoutPlans() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<WorkoutType>('A');
  const [editing, setEditing] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<WorkoutType | null>(null);

  // AI Builder states
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [aiMode, setAIMode] = useState<'add' | 'swap'>('add');
  const [aiAddSuggestion, setAIAddSuggestion] = useState<CatalogItem | null>(null);
  const [aiSwapList, setAISwapList] = useState<SwapSuggestion[]>([]);
  const [aiSwapIndex, setAISwapIndex] = useState(0);
  const [aiMessage, setAIMessage] = useState('');

  // Per-exercise swap
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [swapTargetSuggestion, setSwapTargetSuggestion] = useState<CatalogItem | null>(null);
  const [swapTargetLoading, setSwapTargetLoading] = useState(false);
  const [manualSwapTargetId, setManualSwapTargetId] = useState<string | null>(null);

  const { getExercises, setExercises, resetWorkout, swapExercise, activeSlots, addSlot, removeSlot, exportWorkout, exportAll, importWorkouts } = useCustomWorkoutStore();
  const apiKey = useAIStore((s) => s.apiKey);
  const aiEnabled = useAIStore((s) => s.isEnabled);
  const profile = useProfileStore((s) => s.profile);
  const toast = useToastStore((s) => s.show);

  const activeTypes = activeSlots;

  const defaultWorkout = WORKOUTS.find((w) => w.type === selected) || { type: selected, label: `Treino ${selected}`, focus: 'Personalizado', exercises: [] };
  const exercises = getExercises(selected);

  // Derive focus label from actual muscle groups in the workout
  const deriveFocus = (): string => {
    if (exercises.length === 0) return 'Vazio';
    const groups = exercises.map((e) => e.muscleGroup.toLowerCase());
    const upper = ['costas', 'peitoral', 'ombros', 'bíceps', 'tríceps', 'costas / bíceps'];
    const lower = ['quadríceps', 'posterior de coxa', 'glúteos', 'panturrilhas', 'panturrilha'];
    const upperCount = groups.filter((g) => upper.some((u) => g.includes(u))).length;
    const lowerCount = groups.filter((g) => lower.some((l) => g.includes(l))).length;
    const total = exercises.length;

    if (upperCount >= total * 0.7) return 'Superior';
    if (lowerCount >= total * 0.7) return 'Inferior';
    if (upperCount > 0 && lowerCount > 0) return 'Full Body';

    // Find the most common group
    const freq: Record<string, number> = {};
    groups.forEach((g) => { freq[g] = (freq[g] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2);
    return top.map(([g]) => g.charAt(0).toUpperCase() + g.slice(1)).join(' + ');
  };

  const workoutFocus = deriveFocus();

  // Maps compound muscle groups from workouts to catalog filter names
  const toCatalogGroups = (mg: string): string[] => {
    const lower = mg.toLowerCase();
    const matched: string[] = [];
    if (lower.includes('peito') || lower.includes('peitoral')) matched.push('Peitoral');
    if (lower.includes('costas')) matched.push('Costas');
    if (lower.includes('bíceps') || lower.includes('biceps')) matched.push('Bíceps');
    if (lower.includes('tríceps') || lower.includes('triceps')) matched.push('Tríceps');
    if (lower.includes('ombro')) matched.push('Ombros');
    if (lower.includes('abdômen') || lower.includes('abdomen')) matched.push('Abdômen');
    if (lower.includes('quadríceps') || lower.includes('quadriceps')) matched.push('Quadríceps');
    if (lower.includes('posterior') || lower.includes('isquio')) matched.push('Posterior de Coxa');
    if (lower.includes('glúte') || lower.includes('glute')) matched.push('Glúteos');
    if (lower.includes('panturrilha')) matched.push('Panturrilhas');
    if (matched.length === 0) {
      const direct = MUSCLE_GROUPS.find((g) => g.toLowerCase() === lower);
      if (direct) matched.push(direct);
    }
    return matched.length > 0 ? matched : [mg];
  };

  const toPrimaryCatalogGroup = (mg: string): string => toCatalogGroups(mg)[0];

  const toCustom = () => exercises.map((e) => ({
    id: e.id, name: e.name, sets: e.sets, repsMin: e.repsMin,
    repsMax: e.repsMax, muscleGroup: e.muscleGroup, image: e.image,
  }));

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const list = toCustom();
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    setExercises(selected, list);
  };

  const handleMoveDown = (index: number) => {
    if (index >= exercises.length - 1) return;
    const list = toCustom();
    [list[index], list[index + 1]] = [list[index + 1], list[index]];
    setExercises(selected, list);
  };

  const handleDelete = (id: string) => setDeleteTarget(id);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = toCustom().filter((e) => e.id !== deleteTarget);
    setExercises(selected, list);
    setDeleteTarget(null);
  };

  const handleAddFromCatalog = (item: CatalogItem) => {
    if (manualSwapTargetId) {
      const ex = exercises.find((e) => e.id === manualSwapTargetId);
      swapExercise(selected, manualSwapTargetId, {
        id: `swap_${Date.now()}`, name: item.name,
        sets: ex?.sets || 3, repsMin: ex?.repsMin || 10, repsMax: ex?.repsMax || 15,
        muscleGroup: item.muscleGroup, image: item.image,
      });
      setManualSwapTargetId(null);
    } else {
      const newId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const list = toCustom();
      list.push({
        id: newId, name: item.name, sets: 3, repsMin: 10, repsMax: 15,
        muscleGroup: item.muscleGroup, image: item.image,
      });
      setExercises(selected, list);
    }
    setShowCatalog(false);
  };

  const handleManualSwap = (exerciseId: string, muscleGroup: string) => {
    setManualSwapTargetId(exerciseId);
    setCatalogFilter(toPrimaryCatalogGroup(muscleGroup));
    setShowCatalog(true);
  };

  const workoutGuide: Record<string, string> = {
    A: `Treino A é SUPERIOR COMPLETO. Ideal: 2-3 de Costas, 2 de Peitoral, 1-2 de Ombros, 1 de Bíceps, 1 de Tríceps, 1 de Abdômen.`,
    B: `Treino B é POSTERIOR + GLÚTEOS. Ideal: 2-3 de Posterior de Coxa, 2-3 de Glúteos, 1 de Panturrilhas, 1 de Abdômen.`,
    C: `Treino C é QUADRÍCEPS + GLÚTEOS. Ideal: 2-3 de Quadríceps, 1-2 de Glúteos, 1-2 de Posterior de Coxa, 1 de Panturrilhas, 1 de Abdômen.`,
  };

  const handleAIBuild = async () => {
    if (!apiKey || !profile) return;
    setAILoading(true);
    setShowAIBuilder(true);
    setAIAddSuggestion(null);
    setAISwapList([]);
    setAISwapIndex(0);
    setAIMessage('');
    setAIMode('add');

    try {
      const currentList = exercises.map((e) => `- ${e.name} (${e.muscleGroup})`).join('\n');
      const availableNames = EXERCISE_CATALOG
        .filter((e) => !exercises.some((ex) => ex.name.toLowerCase() === e.name.toLowerCase()))
        .map((e) => `${e.name} (${e.muscleGroup})`)
        .join(', ');

      const sexContext = profile.sex === 'male'
        ? 'Você é personal trainer de homens. Volume de treino pode ser maior, priorize compostos pesados.'
        : 'Você é personal trainer de mulheres. Priorize glúteos e posterior nos treinos de perna.';

      const prompt = `${sexContext} Analise este treino:

${workoutGuide[selected]}

TREINO ATUAL (${selected} — ${defaultWorkout.focus}):
${currentList}

OBJETIVO: ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manter'}

Analise se algum grupo muscular está faltando ou com volume insuficiente para o objetivo desse treino.

Se FALTA algum grupo muscular, responda:
{"action":"add","name":"NOME EXATO","muscleGroup":"grupo","reason":"frase curta"}

Se o treino JÁ ESTÁ COMPLETO e não falta nenhum grupo, sugira SUBSTITUIÇÕES para melhorar. Responda:
{"action":"swap","swaps":[{"currentName":"nome do exercício atual","name":"NOME EXATO substituto","muscleGroup":"grupo","reason":"frase curta biomecânica"}]}

REGRA BIOMECÂNICA CRÍTICA para substituições:
- RESPEITE o padrão de movimento! Puxada vertical (graviton, puxada, barra fixa) só troca por OUTRA puxada vertical.
- Remada (horizontal) só troca por OUTRA remada. Supino só por outro empurrar horizontal.
- Stiff/RDL (extensão de quadril) só por outro exercício de extensão de quadril.
- Flexora (flexão de joelho) só por outra flexão de joelho.
- NÃO troque movimentos compostos por isolamentos (ou vice-versa) sem justificativa forte.

Máximo 4 substituições. Cada substituto DEVE ser da lista abaixo e NÃO pode ser um que já está no treino.
Exercícios disponíveis: ${availableNames}

Responda APENAS JSON puro (sem markdown, sem \`\`\`).`;

      const response = await askAI(apiKey, profile, prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);

        if (parsed.action === 'add') {
          setAIMode('add');
          const catalogItem = EXERCISE_CATALOG.find(
            (e) => e.name.toLowerCase() === parsed.name?.toLowerCase()
              || e.name.toLowerCase().includes(parsed.name?.toLowerCase().slice(0, 12)),
          );
          if (catalogItem && !exercises.some((ex) => ex.name.toLowerCase() === catalogItem.name.toLowerCase())) {
            setAIAddSuggestion(catalogItem);
            setAIMessage(parsed.reason || '');
          } else {
            setAIMessage('Não encontrei exercício adequado no catálogo. Tente manualmente!');
          }
        } else if (parsed.action === 'swap' && parsed.swaps?.length > 0) {
          setAIMode('swap');
          setAIMessage('Treino já está completo! Veja sugestões de melhoria:');
          const validSwaps: SwapSuggestion[] = [];
          for (const s of parsed.swaps) {
            const catalogItem = EXERCISE_CATALOG.find(
              (e) => e.name.toLowerCase() === s.name?.toLowerCase()
                || e.name.toLowerCase().includes(s.name?.toLowerCase().slice(0, 12)),
            );
            const currentEx = exercises.find(
              (e) => e.name.toLowerCase() === s.currentName?.toLowerCase()
                || e.name.toLowerCase().includes(s.currentName?.toLowerCase().slice(0, 8)),
            );
            if (catalogItem && currentEx && !exercises.some((ex) => ex.name.toLowerCase() === catalogItem.name.toLowerCase())) {
              validSwaps.push({
                currentId: currentEx.id,
                currentName: currentEx.name,
                suggestion: catalogItem,
                reason: s.reason || '',
              });
            }
          }
          if (validSwaps.length > 0) {
            setAISwapList(validSwaps);
            setAISwapIndex(0);
          } else {
            setAIMessage('Seu treino já está ótimo! Nenhuma substituição necessária. 💪');
          }
        }
      }
    } catch { /* ignore */ }
    setAILoading(false);
  };

  const handleAcceptAdd = () => {
    if (aiAddSuggestion) {
      handleAddFromCatalog(aiAddSuggestion);
      setShowAIBuilder(false);
    }
  };

  const handleAcceptSwap = () => {
    const current = aiSwapList[aiSwapIndex];
    if (!current) return;
    const existingEx = exercises.find((e) => e.id === current.currentId);
    swapExercise(selected, current.currentId, {
      id: `swap_${Date.now()}`, name: current.suggestion.name,
      sets: existingEx?.sets || 3, repsMin: existingEx?.repsMin || 10,
      repsMax: existingEx?.repsMax || 15,
      muscleGroup: current.suggestion.muscleGroup, image: current.suggestion.image,
    });
    goNextSwap();
  };

  const handleRejectSwap = () => goNextSwap();

  const goNextSwap = () => {
    if (aiSwapIndex < aiSwapList.length - 1) {
      setAISwapIndex(aiSwapIndex + 1);
    } else {
      setAIMessage('Pronto! Todas as sugestões foram avaliadas. 🎉');
      setAISwapList([]);
    }
  };

  const handleExerciseAISwap = async (exerciseId: string) => {
    if (!apiKey || !profile) return;
    setSwapTargetId(exerciseId);
    setSwapTargetLoading(true);
    setSwapTargetSuggestion(null);

    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;

    try {
      const catalogGroups = toCatalogGroups(ex.muscleGroup);
      const available = EXERCISE_CATALOG
        .filter((e) => catalogGroups.includes(e.muscleGroup) && !exercises.some((ex2) => ex2.name.toLowerCase() === e.name.toLowerCase()))
        .map((e) => e.name);

      if (available.length === 0) {
        setSwapTargetLoading(false);
        return;
      }

      const prompt = `Você é um biomecânico esportivo. Sugira UM substituto para "${ex.name}" no treino ${selected} (${defaultWorkout.focus}).

REGRA CRÍTICA: O substituto deve ter o MESMO PADRÃO DE MOVIMENTO, não apenas o mesmo grupo muscular.
Exemplos de padrões:
- Puxada vertical (graviton, puxada frontal, barra fixa) → substituir por OUTRA puxada vertical
- Puxada horizontal (remada sentada, remada curvada) → substituir por OUTRA puxada horizontal
- Empurrar vertical (desenvolvimento) → substituir por OUTRO empurrar vertical
- Empurrar horizontal (supino) → substituir por OUTRO empurrar horizontal
- Extensão de quadril (stiff, levantamento romeno) → substituir por OUTRA extensão de quadril
- Flexão de joelho (mesa flexora, cadeira flexora) → substituir por OUTRA flexão de joelho
- Extensão de joelho (cadeira extensora, agachamento) → substituir por OUTRA extensão de joelho
- Abdução de quadril (abdutora, kickback lateral) → substituir por OUTRA abdução
- Isolamento (rosca, tríceps) → substituir por OUTRO isolamento do mesmo músculo

NÃO troque puxada vertical por horizontal ou vice-versa. NÃO troque empurrar por puxar.

Responda APENAS JSON: {"name":"NOME EXATO da lista","reason":"frase curta biomecânica"}
ESCOLHA OBRIGATORIAMENTE um destes: ${available.join(', ')}`;

      const response = await askAI(apiKey, profile, prompt);
      const match = response.match(/\{[^}]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const catalogItem = EXERCISE_CATALOG.find(
          (e) => e.name.toLowerCase() === parsed.name?.toLowerCase()
            || e.name.toLowerCase().includes(parsed.name?.toLowerCase().slice(0, 12)),
        );
        if (catalogItem) {
          setSwapTargetSuggestion(catalogItem);
        } else {
          // Fallback: pick the first available from catalog
          const fallback = EXERCISE_CATALOG.find((e) => available.includes(e.name));
          if (fallback) setSwapTargetSuggestion(fallback);
        }
      }
    } catch { /* ignore */ }
    setSwapTargetLoading(false);
  };

  const confirmExerciseSwap = () => {
    if (!swapTargetId || !swapTargetSuggestion) return;
    const ex = exercises.find((e) => e.id === swapTargetId);
    swapExercise(selected, swapTargetId, {
      id: `swap_${Date.now()}`, name: swapTargetSuggestion.name,
      sets: ex?.sets || 3, repsMin: ex?.repsMin || 10, repsMax: ex?.repsMax || 15,
      muscleGroup: swapTargetSuggestion.muscleGroup, image: swapTargetSuggestion.image,
    });
    setSwapTargetId(null);
    setSwapTargetSuggestion(null);
  };

  const filteredCatalog = catalogFilter
    ? EXERCISE_CATALOG.filter((e) => e.muscleGroup === catalogFilter)
    : EXERCISE_CATALOG;

  return (
    <div className="px-5 pt-14 pb-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[26px] font-bold">Seus Treinos</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setEditing(!editing)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            editing ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white/5 text-white/60 border border-white/10'
          }`}
        >
          {editing ? '✓ Salvar' : '✏️ Editar'}
        </motion.button>
      </div>

      {/* Action toolbar */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowShareMenu(true)}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-medium flex items-center gap-1 shrink-0"
        >
          📤 Compartilhar
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowImport(true)}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-medium flex items-center gap-1 shrink-0"
        >
          📥 Importar
        </motion.button>
        {aiEnabled && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/plans/reeval')}
            className="px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 text-[11px] font-medium flex items-center gap-1 shrink-0"
          >
            🧠 Reavaliação IA
          </motion.button>
        )}
      </div>

      {/* Tabs + Add Day */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {activeTypes.map((type) => (
          <motion.button
            key={type}
            whileTap={{ scale: 0.92 }}
            onClick={() => !editing && setSelected(type)}
            className={`flex-1 min-w-[52px] py-3 rounded-xl font-semibold transition-all relative ${
              selected === type ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : editing ? 'bg-dark-200 text-white/20 opacity-50' : 'bg-dark-200 text-white/40'
            }`}
          >
            {type}
            {activeTypes.length > 2 && (
              <button
                onClick={(e) => { e.stopPropagation(); setRemoveTarget(type); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
              >×</button>
            )}
          </motion.button>
        ))}
        {activeTypes.length < 5 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const slot = addSlot();
              if (slot) {
                toast(`Treino ${slot} adicionado!`, 'success');
                setSelected(slot);
              }
            }}
            className="min-w-[52px] py-3 rounded-xl border-2 border-dashed border-white/15 text-white/30 font-bold text-lg"
          >
            +
          </motion.button>
        )}
      </div>

      {/* Workout Detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-3"
        >
          <div className="mb-4">
            <h2 className="text-lg font-bold">Treino {selected}</h2>
            <p className="text-primary-400 text-sm">{workoutFocus}</p>
            <p className="text-white/30 text-xs mt-1">
              {exercises.reduce((acc, e) => acc + e.sets, 0)} séries • {exercises.length} exercícios
            </p>
          </div>

          {/* Top Actions */}
          {editing && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setCatalogFilter(''); setShowCatalog(true); }}
                className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-primary-500/30 text-primary-300 text-xs font-medium"
              >
                + Adicionar
              </button>
              {aiEnabled && (
                <button
                  onClick={handleAIBuild}
                  className="flex-1 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-medium"
                >
                  🤖 IA Inteligente
                </button>
              )}
            </div>
          )}

          {exercises.map((exercise, i) => (
            <motion.div
              key={exercise.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card"
            >
              <div className="flex items-center gap-3">
                {editing && (
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleMoveUp(i)} disabled={i === 0} className="text-white/40 text-xs disabled:opacity-20">▲</button>
                    <button onClick={() => handleMoveDown(i)} disabled={i === exercises.length - 1} className="text-white/40 text-xs disabled:opacity-20">▼</button>
                  </div>
                )}
                {exercise.image ? (
                  <img src={exercise.image} alt={exercise.name} className="w-10 h-10 rounded-lg object-cover bg-dark-200" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary-500/15 flex items-center justify-center text-xs font-bold text-primary-300">{i + 1}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{exercise.name}</p>
                  <p className="text-white/30 text-xs">{exercise.sets}×{exercise.repsMin}-{exercise.repsMax} • {exercise.muscleGroup}</p>
                </div>
                {editing && (
                  <button onClick={() => handleDelete(exercise.id)} className="text-red-400/60 text-lg px-1">🗑️</button>
                )}
              </div>

              {/* Per-exercise swap actions */}
              {editing && (
                <div className="flex gap-2 mt-2 ml-[52px]">
                  {aiEnabled && (
                    <button
                      onClick={() => handleExerciseAISwap(exercise.id)}
                      className="px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-300 text-[10px] font-medium"
                    >
                      🤖 Substituir com IA
                    </button>
                  )}
                  <button
                    onClick={() => handleManualSwap(exercise.id, exercise.muscleGroup)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-white/70 text-[10px] font-medium"
                  >
                    🔄 Trocar manual
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {editing && (
            <div className="pt-4">
              <button onClick={() => resetWorkout(selected)} className="w-full py-2 text-white/30 text-xs">
                Restaurar treino padrão
              </button>
            </div>
          )}

          {!editing && (
            <div className="card mt-4 border-primary-500/20">
              <p className="text-xs text-white/40 leading-relaxed">
                💡 <strong>RIR 2-3</strong> — Termine cada série sentindo que poderia fazer mais 2-3 reps.
                Progressão dupla: quando atingir o topo da faixa de reps, aumente a carga ~5%.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Exercise Catalog Modal */}
      <AnimatePresence>
        {showCatalog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-dark-400 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-12 pb-4">
              <h2 className="text-lg font-bold">{manualSwapTargetId ? 'Escolha o substituto' : 'Catálogo de Exercícios'}</h2>
              <button onClick={() => { setShowCatalog(false); setCatalogFilter(''); setManualSwapTargetId(null); }} className="text-white/40 text-xl">✕</button>
            </div>

            <div className="px-5 pb-4 overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setCatalogFilter('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    !catalogFilter ? 'bg-primary-500 text-white' : 'bg-dark-100 text-white/50'
                  }`}
                >
                  Todos
                </button>
                {MUSCLE_GROUPS.map((mg) => (
                  <button
                    key={mg}
                    onClick={() => setCatalogFilter(mg)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      catalogFilter === mg ? 'bg-primary-500 text-white' : 'bg-dark-100 text-white/50'
                    }`}
                  >
                    {mg}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <div className="grid grid-cols-2 gap-3">
                {filteredCatalog.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleAddFromCatalog(item)}
                    className="bg-dark-100 rounded-xl overflow-hidden text-left border border-white/5 active:border-primary-500/50 transition-colors"
                  >
                    <img src={item.image} alt={item.name} className="w-full h-20 object-cover bg-dark-200" loading="lazy" />
                    <div className="p-2">
                      <p className="text-[11px] font-medium leading-tight">{item.name}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{item.muscleGroup}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Builder Modal */}
      <AnimatePresence>
        {showAIBuilder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center px-6"
          >
            <button onClick={() => { setShowAIBuilder(false); setAISwapList([]); setAIAddSuggestion(null); }} className="absolute top-12 right-5 text-white/40 text-xl">✕</button>
            <p className="text-sm text-primary-300 font-semibold mb-6">🤖 IA analisando seu treino</p>

            {/* Loading */}
            {aiLoading && (
              <div className="w-72 h-40 rounded-2xl bg-dark-100 border border-white/10 flex items-center justify-center">
                <span className="text-white/30 animate-pulse text-sm">Analisando distribuição muscular...</span>
              </div>
            )}

            {/* ADD mode */}
            {!aiLoading && aiMode === 'add' && aiAddSuggestion && (
              <>
                <p className="text-xs text-white/50 mb-4 text-center max-w-[280px]">
                  Falta este grupo muscular no seu treino:
                </p>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-64 rounded-2xl overflow-hidden bg-dark-100 border border-white/10 shadow-2xl"
                >
                  <img src={aiAddSuggestion.image} alt={aiAddSuggestion.name} className="w-full h-44 object-cover" />
                  <div className="p-4 text-center">
                    <p className="font-bold text-base">{aiAddSuggestion.name}</p>
                    <p className="text-primary-400 text-sm mt-1">{aiAddSuggestion.muscleGroup}</p>
                    {aiMessage && <p className="text-white/40 text-xs mt-2">{aiMessage}</p>}
                  </div>
                </motion.div>
                <div className="flex gap-8 mt-8">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAIBuilder(false)}
                    className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center text-xl text-red-400">✗</motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={handleAcceptAdd}
                    className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-xl text-green-400">✓</motion.button>
                </div>
              </>
            )}

            {/* SWAP mode - Tinder carousel */}
            {!aiLoading && aiMode === 'swap' && aiSwapList.length > 0 && (
              <>
                <p className="text-xs text-white/50 mb-2 text-center max-w-[280px]">{aiMessage}</p>
                <p className="text-[10px] text-white/30 mb-4">{aiSwapIndex + 1} de {aiSwapList.length}</p>

                <motion.div
                  key={aiSwapIndex}
                  initial={{ scale: 0.8, opacity: 0, x: 50 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  className="w-72 rounded-2xl overflow-hidden bg-dark-100 border border-white/10"
                >
                  {/* Current exercise */}
                  <div className="p-3 bg-red-500/5 border-b border-white/5">
                    <p className="text-[10px] text-red-400 font-medium uppercase tracking-wide">Atual</p>
                    <p className="text-sm font-semibold mt-1">{aiSwapList[aiSwapIndex].currentName}</p>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center py-1.5">
                    <span className="text-primary-400 text-lg">↓</span>
                  </div>

                  {/* Suggested replacement */}
                  <div className="border-t border-white/5">
                    <img src={aiSwapList[aiSwapIndex].suggestion.image} alt="" className="w-full h-32 object-cover" />
                    <div className="p-3 bg-green-500/5">
                      <p className="text-[10px] text-green-400 font-medium uppercase tracking-wide">Sugestão</p>
                      <p className="text-sm font-semibold mt-1">{aiSwapList[aiSwapIndex].suggestion.name}</p>
                      <p className="text-primary-400 text-xs">{aiSwapList[aiSwapIndex].suggestion.muscleGroup}</p>
                      <p className="text-white/40 text-[11px] mt-1">{aiSwapList[aiSwapIndex].reason}</p>
                    </div>
                  </div>
                </motion.div>

                <div className="flex gap-8 mt-6">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={handleRejectSwap}
                    className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center text-xl text-red-400">✗</motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={handleAcceptSwap}
                    className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-xl text-green-400">✓</motion.button>
                </div>
                <p className="text-[10px] text-white/20 mt-3">Manter = ✗ • Trocar = ✓</p>
              </>
            )}

            {/* Done message */}
            {!aiLoading && aiSwapList.length === 0 && !aiAddSuggestion && aiMessage && (
              <div className="text-center px-8">
                <p className="text-white/60 text-sm leading-relaxed">{aiMessage}</p>
                <button onClick={() => setShowAIBuilder(false)} className="mt-6 px-6 py-2.5 rounded-xl bg-primary-500/20 text-primary-300 text-sm font-medium">
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-exercise AI Swap Modal */}
      <AnimatePresence>
        {swapTargetId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6"
          >
            <button onClick={() => { setSwapTargetId(null); setSwapTargetSuggestion(null); }} className="absolute top-12 right-5 text-white/40 text-xl">✕</button>

            {swapTargetLoading && (
              <div className="w-64 h-32 rounded-2xl bg-dark-100 border border-white/10 flex items-center justify-center">
                <span className="text-white/30 animate-pulse text-sm">Buscando substituto...</span>
              </div>
            )}

            {!swapTargetLoading && swapTargetSuggestion && (
              <>
                <p className="text-xs text-white/50 mb-4">Substituir por:</p>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-64 rounded-2xl overflow-hidden bg-dark-100 border border-white/10"
                >
                  <img src={swapTargetSuggestion.image} alt="" className="w-full h-44 object-cover" />
                  <div className="p-4 text-center">
                    <p className="font-bold text-base">{swapTargetSuggestion.name}</p>
                    <p className="text-primary-400 text-sm mt-1">{swapTargetSuggestion.muscleGroup}</p>
                  </div>
                </motion.div>
                <div className="flex gap-8 mt-6">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => { setSwapTargetId(null); setSwapTargetSuggestion(null); }}
                    className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center text-xl text-red-400">✗</motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={confirmExerciseSwap}
                    className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-xl text-green-400">✓</motion.button>
                </div>
              </>
            )}

            {!swapTargetLoading && !swapTargetSuggestion && (
              <p className="text-white/40 text-sm">Nenhum substituto encontrado para esse grupo.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Remover exercício?"
        message="Tem certeza que quer tirar esse exercício do treino?"
        confirmText="Remover"
        cancelText="Cancelar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Remove Day Confirmation */}
      <ConfirmModal
        open={!!removeTarget}
        title={`Remover Treino ${removeTarget}?`}
        message="Você pode adicionar de volta depois. Os exercícios serão resetados."
        confirmText="Remover"
        cancelText="Cancelar"
        danger
        onConfirm={() => {
          if (removeTarget) {
            const remaining = activeTypes.filter((t) => t !== removeTarget);
            removeSlot(removeTarget);
            toast(`Treino ${removeTarget} removido`, 'info');
            if (selected === removeTarget) setSelected(remaining[0] || 'A');
          }
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Share/Export Modal */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
            onClick={() => setShowShareMenu(false)}
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
              <h3 className="text-lg font-bold">Compartilhar treinos</h3>
              <p className="text-xs text-white/40">Gere um código para enviar a alguém. A pessoa importa no app dela.</p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const code = exportWorkout(selected);
                  navigator.clipboard.writeText(code);
                  toast(`Treino ${selected} copiado!`, 'success');
                  setShowShareMenu(false);
                }}
                className="w-full py-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-semibold"
              >
                📋 Copiar Treino {selected}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const code = exportAll();
                  navigator.clipboard.writeText(code);
                  toast('Todos os treinos copiados!', 'success');
                  setShowShareMenu(false);
                }}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium"
              >
                📋 Copiar Todos ({activeTypes.join('')})
              </motion.button>

              {typeof navigator.share === 'function' && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const code = exportAll();
                    await navigator.share({ title: 'FitFlow - Meus Treinos', text: code });
                    setShowShareMenu(false);
                  }}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium"
                >
                  🔗 Compartilhar via...
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
            onClick={() => setShowImport(false)}
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
              <h3 className="text-lg font-bold">Importar treino</h3>
              <p className="text-xs text-white/40">Cole o código que alguém te enviou.</p>

              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="Cole o código aqui..."
                className="input-field text-sm min-h-[100px] resize-none"
                autoFocus
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!importInput.trim()}
                onClick={() => {
                  const success = importWorkouts(importInput.trim());
                  if (success) {
                    toast('Treinos importados com sucesso!', 'success');
                    setImportInput('');
                    setShowImport(false);
                  } else {
                    toast('Código inválido. Verifique e tente novamente.', 'error');
                  }
                }}
                className="btn-primary"
              >
                Importar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
