import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/stores/useSessionStore';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useNotesStore } from '@/stores/useNotesStore';
import { useTimer } from '@/hooks/useTimer';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ExerciseInfo } from '@/components/workout/ExerciseInfo';
import { ExerciseImage } from '@/components/workout/ExerciseImage';
import { AIWorkoutTip } from '@/components/workout/AIWorkoutTip';
import { RestTimer } from '@/components/workout/RestTimer';
import { getRestDuration } from '@/utils/rest';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useAIConfigStore } from '@/stores/useAIConfigStore';
import { WORKOUT_MAP } from '@/constants/workouts';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { RichText } from '@/components/ui/RichText';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';

interface InlineSwapAction {
  sourceExerciseId: string;
  replacementExerciseId: string;
  reason?: string;
}

interface CatalogOption {
  id: string;
  name: string;
  muscleGroup: string;
  image: string;
}

export function Workout() {
  const navigate = useNavigate();
  const [resting, setResting] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showQuickSwap, setShowQuickSwap] = useState(false);
  const [aiQuestion, setAIQuestion] = useState('');
  const [aiAnswer, setAIAnswer] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [swapSuggestion, setSwapSuggestion] = useState<{ option: CatalogOption; reason?: string } | null>(null);
  const { activeSession, completeSet, previousExercise, goToExercise, endSession, markExerciseSkipped, syncExerciseStates } =
    useSessionStore();
  const aiEnabled = useAIStore((s) => s.isEnabled);
  const assistantName = useAIConfigStore((s) => s.assistantName);
  const apiKey = useAIStore((s) => s.apiKey);
  const profile = useProfileStore((s) => s.profile);
  const goal = useProfileStore((s) => s.profile?.goal || 'maintain');
  const { notes, setNote } = useNotesStore();
  const getExercises = useCustomWorkoutStore((s) => s.getExercises);
  const swapExercise = useCustomWorkoutStore((s) => s.swapExercise);

  const { formatted } = useTimer(activeSession?.startedAt ?? null);

  if (!activeSession) {
    navigate('/dashboard');
    return null;
  }

  const workout = WORKOUT_MAP[activeSession.workoutType] || { label: `Treino ${activeSession.workoutType}`, focus: 'Personalizado' };
  const exercises = getExercises(activeSession.workoutType);
  const currentIndex = Math.min(activeSession.currentExerciseIndex, exercises.length - 1);
  const exercise = exercises[currentIndex];

  if (!exercise) {
    navigate('/dashboard');
    return null;
  }

  const completedSets = activeSession.setsCompleted[exercise.id] || 0;
  const exerciseStates = activeSession.exerciseStates || {};
  const isCardio = exercise.muscleGroup === 'Cardio';
  const cardioBlocks = exercise.cardioBlocks || [];
  const totalCardioMinutes = cardioBlocks.reduce((acc, block) => acc + block.minutes, 0);
  const allSetsComplete = completedSets >= exercise.sets;
  const allExercisesComplete = exercises.every((item) => (activeSession.setsCompleted[item.id] || 0) >= item.sets);

  const exerciseIdsKey = exercises.map((item) => item.id).join('|');
  useEffect(() => {
    syncExerciseStates(exercises.map((item) => item.id));
  }, [syncExerciseStates, exerciseIdsKey]);

  const totalSetsInWorkout = exercises.reduce((acc, e) => acc + e.sets, 0);
  const completedTotalSets = Object.entries(activeSession.setsCompleted).reduce(
    (acc, [, sets]) => acc + sets,
    0,
  );

  const handleCompleteSet = () => {
    completeSet(exercise.id, exercise.sets);
    const newCompleted = completedSets + 1;
    if (!isCardio && newCompleted < exercise.sets) {
      setResting(true);
    }
  };

  const exerciseSummary = isCardio
    ? `${totalCardioMinutes || exercise.sets} min • ${(cardioBlocks.map((b) => b.intensity).filter(Boolean).join(' + ') || 'Moderado')}`
    : exercise.setRows?.length
      ? exercise.setRows.map((row, index) => `${index + 1}ª ${row.reps}`).join(' / ') + ' reps'
      : `${exercise.sets} series x ${exercise.repsMin}-${exercise.repsMax} reps`;

  const handleNext = () => {
    if (allExercisesComplete) {
      navigate('/workout/complete');
      return;
    }

    const nextIdx = exercises.findIndex((item, index) => {
      const done = activeSession.setsCompleted[item.id] || 0;
      if (done >= item.sets) return false;
      return index > currentIndex;
    });

    if (nextIdx >= 0) {
      goToExercise(nextIdx);
      return;
    }

    const firstIncomplete = exercises.findIndex((item) => (activeSession.setsCompleted[item.id] || 0) < item.sets);
    if (firstIncomplete >= 0) goToExercise(firstIncomplete);
  };

  const handlePrevious = () => {
    setResting(false);
    previousExercise();
  };

  const handlePickExercise = (index: number) => {
    if (index !== currentIndex && !allSetsComplete) {
      markExerciseSkipped(exercise.id);
    }
    setResting(false);
    goToExercise(index);
    setShowExercisePicker(false);
  };

  const handleQuit = () => navigate('/dashboard');

  const handleAbandon = () => setShowQuitModal(true);

  const confirmAbandon = () => {
    endSession();
    navigate('/dashboard');
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !apiKey || !profile) return;
    setAILoading(true);
    setAIAnswer('');
    try {
      const normalizeText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const catalogOptions: CatalogOption[] = EXERCISE_CATALOG.map((item, index) => ({
        id: `catalog_${index}_${normalizeText(item.name).replace(/[^a-z0-9]+/g, '_')}`,
        name: item.name,
        muscleGroup: item.muscleGroup,
        image: item.image,
      }));
      const catalogById = new Map(catalogOptions.map((item) => [item.id, item]));

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
              role: 'system',
              content: `Você é um assistente de treino baseado em evidências.
Se a usuária pedir para trocar/substituir o exercício atual, use a função replace_workout_exercise com IDs válidos da lista fornecida.
Se faltarem dados de equipamento/disponibilidade/dor para decidir com segurança, faça pergunta curta antes de sugerir troca.
Não invente IDs e não use exercícios fora da lista.`,
            },
            {
              role: 'user',
              content: `Exercício atual:
- id: ${exercise.id}
- nome: ${exercise.name}
- grupo: ${exercise.muscleGroup}
- série/reps: ${exercise.sets}x${exercise.repsMin}-${exercise.repsMax}

Treino atual: ${workout.label} — ${workout.focus}
Objetivo da usuária: ${profile.goal}

Exercícios válidos para substituição (id | nome | grupo):
${catalogOptions.map((item) => `- ${item.id} | ${item.name} | ${item.muscleGroup}`).join('\n')}

Pergunta da usuária: ${aiQuestion}`,
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'replace_workout_exercise',
                description: 'Solicita substituição do exercício atual por outro do catálogo.',
                parameters: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['sourceExerciseId', 'replacementExerciseId'],
                  properties: {
                    sourceExerciseId: { type: 'string' },
                    replacementExerciseId: { type: 'string' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          ],
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Erro na API');
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const answer = (choice?.message?.content || '').trim();
      const toolCalls = choice?.message?.tool_calls as Array<{ function?: { name?: string; arguments?: string } }> | undefined;
      const swapCall = toolCalls?.find((toolCall) => toolCall.function?.name === 'replace_workout_exercise');

      if (swapCall?.function?.arguments) {
        let action: InlineSwapAction | null = null;
        try {
          action = JSON.parse(swapCall.function.arguments) as InlineSwapAction;
        } catch {
          action = null;
        }

        if (action?.sourceExerciseId !== exercise.id) {
          setAIAnswer('Posso trocar, mas preciso que seja para o exercício atual. Tenta pedir novamente com o contexto desta tela.');
          setSwapSuggestion(null);
        } else {
          const replacement = catalogById.get(action.replacementExerciseId);
          if (!replacement) {
            setAIAnswer('A sugestão veio com ID inválido. Tenta novamente que eu recalculo a troca.');
            setSwapSuggestion(null);
          } else {
            setSwapSuggestion({ option: replacement, reason: action.reason });
            setAIAnswer((answer || 'Tenho uma sugestão de troca para você.') + '\n\nDeseja substituir? Toque "Trocar" abaixo.');
          }
        }
      } else {
        setSwapSuggestion(null);
        setAIAnswer(answer || 'Não consegui responder com segurança. Reformule sua pergunta.');
      }
    } catch {
      setAIAnswer('Erro ao consultar IA. Tente novamente.');
    }
    setAILoading(false);
  };

  const handleSwapAccept = () => {
    if (!swapSuggestion) return;
    const { swapExercise: doSwap } = useCustomWorkoutStore.getState();
    const newId = `swap_${Date.now()}`;
    doSwap(activeSession!.workoutType, exercise.id, {
      id: newId,
      name: swapSuggestion.option.name,
      sets: exercise.sets,
      repsMin: exercise.repsMin,
      repsMax: exercise.repsMax,
      muscleGroup: swapSuggestion.option.muscleGroup || exercise.muscleGroup,
      image: swapSuggestion.option.image,
    });
    setSwapSuggestion(null);
    setAIAnswer('Exercício trocado! Avance para continuar.');
    setShowAIChat(false);
  };

  const resolveCatalogGroup = (muscleGroup: string) => {
    const lower = muscleGroup.toLowerCase();
    if (lower.includes('costas')) return 'Costas';
    if (lower.includes('peito') || lower.includes('peitoral')) return 'Peitoral';
    if (lower.includes('bíceps') || lower.includes('biceps')) return 'Bíceps';
    if (lower.includes('tríceps') || lower.includes('triceps')) return 'Tríceps';
    if (lower.includes('ombro')) return 'Ombros';
    if (lower.includes('quadríceps') || lower.includes('quadriceps')) return 'Quadríceps';
    if (lower.includes('posterior')) return 'Posterior de Coxa';
    if (lower.includes('glúte') || lower.includes('glute')) return 'Glúteos';
    if (lower.includes('panturrilha')) return 'Panturrilhas';
    if (lower.includes('abd')) return 'Abdômen';
    if (lower.includes('cardio')) return 'Cardio';
    return muscleGroup;
  };

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const getMovementTags = (exerciseName: string, muscleGroup: string) => {
    const text = `${normalizeText(exerciseName)} ${normalizeText(muscleGroup)}`;
    const tags = new Set<string>();

    if (text.includes('remada')) tags.add('pull-horizontal');
    if (text.includes('puxada') || text.includes('pulldown') || text.includes('graviton') || text.includes('barra fixa')) tags.add('pull-vertical');
    if (text.includes('supino')) tags.add('push-horizontal');
    if (text.includes('desenvolvimento')) tags.add('push-vertical');
    if (text.includes('agachamento') || text.includes('leg press') || text.includes('hack')) tags.add('knee-dominant');
    if (text.includes('stiff') || text.includes('levantamento') || text.includes('deadlift') || text.includes('hip thrust')) tags.add('hip-hinge');
    if (text.includes('cadeira extensora')) tags.add('knee-isolation');
    if (text.includes('flexora')) tags.add('hamstring-isolation');
    if (text.includes('panturrilha')) tags.add('calf');
    if (text.includes('abd')) tags.add('core');
    if (text.includes('cardio') || text.includes('esteira') || text.includes('bike') || text.includes('bicicleta') || text.includes('eliptico') || text.includes('remo')) tags.add('cardio');

    if (tags.size === 0) tags.add(`group:${resolveCatalogGroup(muscleGroup)}`);
    return tags;
  };

  const replacementScore = (
    targetName: string,
    targetGroup: string,
    optionName: string,
    optionGroup: string,
  ) => {
    const targetTags = getMovementTags(targetName, targetGroup);
    const optionTags = getMovementTags(optionName, optionGroup);
    let score = 0;

    if (resolveCatalogGroup(targetGroup) === resolveCatalogGroup(optionGroup)) score += 30;

    targetTags.forEach((tag) => {
      if (optionTags.has(tag)) score += 40;
    });

    const targetWords = normalizeText(targetName).split(/\s+/).filter(Boolean);
    const optionWords = normalizeText(optionName).split(/\s+/).filter(Boolean);
    const wordOverlap = targetWords.filter((word) => optionWords.includes(word)).length;
    score += Math.min(wordOverlap * 6, 18);

    return score;
  };

  const quickSwapOptions = EXERCISE_CATALOG
    .filter((item) => item.muscleGroup === resolveCatalogGroup(exercise.muscleGroup) && item.name !== exercise.name)
    .map((item) => ({
      ...item,
      score: replacementScore(exercise.name, exercise.muscleGroup, item.name, item.muscleGroup),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const handleQuickSwap = (name: string, muscleGroup: string, image: string) => {
    swapExercise(activeSession.workoutType, exercise.id, {
      id: `swap_${Date.now()}`,
      name,
      sets: exercise.sets,
      repsMin: exercise.repsMin,
      repsMax: exercise.repsMax,
      muscleGroup,
      image,
    });
    setShowQuickSwap(false);
    setResting(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dark-400 px-5 pt-10 pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleQuit}
          className="text-white/40 text-sm font-medium px-3 py-1"
        >
          ← Sair
        </button>
        <span className="text-white/30 text-sm font-mono">{formatted}</span>
        <div className="flex items-center gap-2">
          {aiEnabled && (
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className="text-primary-400 text-sm font-medium px-2 py-1"
            ><MaterialIcon name="smart_toy" className="text-lg" /></button>
          )}
          <button
            onClick={handleAbandon}
            className="text-red-400/60 text-xs px-2 py-1"
          >
            Desistir
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <ProgressBar current={completedTotalSets} total={totalSetsInWorkout} className="mb-6" />

      {/* Workout Label */}
      <p className="text-sm text-primary-400 font-medium mb-1">{workout.label} — {workout.focus}</p>

      {/* Exercise Card */}
      <motion.div
        key={exercise.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col"
      >
        {/* Exercise Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold leading-tight">{exercise.name}</h1>
            <p className="text-white/40 text-sm mt-1">{exerciseSummary}</p>
          </div>
          <ExerciseInfo exercise={exercise} />
        </div>

        {/* Muscle Group Badge */}
        <span className="inline-block self-start px-3 py-1 bg-primary-500/15 text-primary-300 rounded-full text-xs font-medium mb-4">
          {exercise.muscleGroup}
        </span>

        {/* Exercise Image */}
        <ExerciseImage src={exercise.image} alt={exercise.name} muscleGroup={exercise.muscleGroup} />

        {/* AI Tip */}
        {aiEnabled && <AIWorkoutTip exerciseName={exercise.name} muscleGroup={exercise.muscleGroup} />}

        {/* Sets Visual */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-4">
          <div className="flex gap-3 flex-wrap justify-center">
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8 }}
                animate={{
                  scale: i < completedSets ? 1.1 : 1,
                  backgroundColor: i < completedSets ? 'rgb(var(--color-primary-rgb))' : 'rgb(var(--color-bg-card-rgb))',
                }}
                className="min-w-14 h-14 px-3 rounded-xl flex items-center justify-center border border-white/10"
              >
                <span className="text-lg font-bold">
                  {i < completedSets ? 'OK' : isCardio ? `${cardioBlocks[i]?.minutes || totalCardioMinutes || exercise.sets}m` : exercise.setRows?.[i]?.reps || i + 1}
                </span>
              </motion.div>
            ))}
          </div>

          <p className="text-white/30 text-sm">
            {isCardio ? `${completedSets}/${exercise.sets} blocos concluidos` : `${completedSets}/${exercise.sets} series concluidas`}
          </p>
          {isCardio && cardioBlocks.length > 0 && (
            <div className="w-full space-y-2">
              {cardioBlocks.map((block, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <span className="text-xs text-white/45">Bloco {index + 1}</span>
                  <span className="text-sm font-semibold text-white/75">{block.minutes} min - {block.intensity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <input
          type="text"
          placeholder="Anotação: carga, obs... (ex: 40kg)"
          value={notes[exercise.id] || ''}
          onChange={(e) => setNote(exercise.id, e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-primary-500 mb-4"
        />

        {/* Action Buttons */}
        <div className="space-y-3 mt-auto">
          {!allSetsComplete ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCompleteSet}
              className="btn-primary text-xl py-5"
            >
              {isCardio ? 'Bloco concluido!' : 'Serie feita!'}
            </motion.button>
          ) : (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="btn-success text-xl py-5"
            >
              {allExercisesComplete ? 'Finalizar treino' : 'Próximo Exercício →'}
            </motion.button>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              className="btn-secondary flex-1 py-3 text-sm"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setShowExercisePicker(true)}
              className="btn-secondary flex-1 py-3 text-sm"
            >
              Pular →
            </button>
          </div>
          <button
            onClick={() => setShowQuickSwap(true)}
            className="btn-secondary py-2.5 text-xs"
          >
            Aparelho ocupado? Trocar exercício equivalente
          </button>
        </div>
      </motion.div>

      <RestTimer active={resting} duration={getRestDuration(exercise, goal)} onSkip={() => setResting(false)} />

      {/* Exercise Picker */}
      <AnimatePresence>
        {showExercisePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
            onClick={() => setShowExercisePicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md max-h-[78vh] overflow-y-auto rounded-t-[28px] bg-[rgb(var(--color-bg-card-rgb))] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Escolher proximo exercicio</h2>
                  <p className="text-xs text-white/35">Pule fila, aparelho ocupado ou ajuste a ordem na hora.</p>
                </div>
                <button onClick={() => setShowExercisePicker(false)} className="text-white/35 text-xl"><MaterialIcon name="close" /></button>
              </div>

              <div className="space-y-2">
                {exercises.map((item, index) => {
                  const done = activeSession.setsCompleted[item.id] || 0;
                  const selectedItem = index === currentIndex;
                  const state = exerciseStates[item.id] || (selectedItem ? 'in_progress' : 'pending');
                  const stateLabel = state === 'completed'
                    ? 'Concluído'
                    : state === 'in_progress'
                      ? 'Atual'
                      : state === 'skipped_temporarily'
                        ? 'Pulado'
                        : 'Pendente';
                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePickExercise(index)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        selectedItem
                          ? 'bg-primary-500/15 border-primary-500/35'
                          : 'bg-white/5 border-white/10 active:border-primary-400/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          selectedItem ? 'bg-primary-500 text-white' : 'bg-dark-200 text-white/45'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-[10px] text-white/35 truncate">{item.muscleGroup}</p>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] text-white/45 whitespace-nowrap">
                            {Math.min(done, item.sets)}/{item.sets}
                          </span>
                          <span className="block text-[10px] text-primary-300 whitespace-nowrap">{stateLabel}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickSwap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
            onClick={() => setShowQuickSwap(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="w-full max-w-md max-h-[78vh] overflow-y-auto rounded-t-[28px] bg-[rgb(var(--color-bg-card-rgb))] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Trocar exercício</h2>
                  <p className="text-xs text-white/35">Mesmo grupo muscular, sem quebrar o treino.</p>
                </div>
                <button onClick={() => setShowQuickSwap(false)} className="text-white/35 text-xl"><MaterialIcon name="close" /></button>
              </div>

              <div className="space-y-2">
                {quickSwapOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleQuickSwap(option.name, option.muscleGroup, option.image)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left active:border-primary-400/50"
                  >
                    <p className="text-sm font-semibold">{option.name}</p>
                    <p className="text-[10px] text-white/35">{option.muscleGroup} • similaridade {option.score}</p>
                  </button>
                ))}
                {quickSwapOptions.length === 0 && (
                  <p className="text-xs text-white/40">Nenhuma opção equivalente disponível no catálogo.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-dark-100 border-t border-white/10 rounded-t-3xl p-5 max-h-[60vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-primary-300 inline-flex items-center gap-1"><MaterialIcon name="smart_toy" className="text-base" /> {assistantName} ? Treinando</span>
              <button onClick={() => setShowAIChat(false)} className="text-white/30 text-lg"><MaterialIcon name="close" /></button>
            </div>
            {aiAnswer && (
              <div className="mb-3">
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line bg-white/5 rounded-xl p-3">
                  <RichText text={aiAnswer} />
                </p>
                {swapSuggestion && (
                  <button
                    onClick={handleSwapAccept}
                    className="mt-2 w-full py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium"
                  ><span className="inline-flex items-center gap-1"><MaterialIcon name="check" /> Trocar por {swapSuggestion.option.name}</span></button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAIQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                placeholder="Ex: substitui esse exercício por qual?"
                className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleAskAI}
                disabled={aiLoading || !aiQuestion.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center"
              >
                {aiLoading ? '...' : <MaterialIcon name="send" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={showQuitModal}
        title="Desistir do treino?"
        message="Isso vai zerar o progresso desse treino. Pra só pausar, use o botão ← Sair."
        confirmText="Desistir"
        cancelText="Voltar"
        danger
        onConfirm={confirmAbandon}
        onCancel={() => setShowQuitModal(false)}
      />
    </div>
  );
}
