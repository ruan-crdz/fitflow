import { useState } from 'react';
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
import { WORKOUT_MAP } from '@/constants/workouts';
import { askAI } from '@/utils/ai';

export function Workout() {
  const navigate = useNavigate();
  const [resting, setResting] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAIQuestion] = useState('');
  const [aiAnswer, setAIAnswer] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [swapSuggestion, setSwapSuggestion] = useState<{ name: string; muscleGroup: string; image?: string } | null>(null);
  const { activeSession, completeSet, nextExercise, previousExercise, endSession } =
    useSessionStore();
  const aiEnabled = useAIStore((s) => s.isEnabled);
  const apiKey = useAIStore((s) => s.apiKey);
  const profile = useProfileStore((s) => s.profile);
  const goal = useProfileStore((s) => s.profile?.goal || 'maintain');
  const { notes, setNote } = useNotesStore();
  const getExercises = useCustomWorkoutStore((s) => s.getExercises);

  const { formatted } = useTimer(activeSession?.startedAt ?? null);

  if (!activeSession) {
    navigate('/dashboard');
    return null;
  }

  const workout = WORKOUT_MAP[activeSession.workoutType] || { label: `Treino ${activeSession.workoutType}`, focus: 'Personalizado' };
  const exercises = getExercises(activeSession.workoutType);
  const currentIndex = Math.min(activeSession.currentExerciseIndex, exercises.length - 1);
  const exercise = exercises[currentIndex];
  const isLastExercise = currentIndex === exercises.length - 1;

  if (!exercise) {
    navigate('/dashboard');
    return null;
  }

  const completedSets = activeSession.setsCompleted[exercise.id] || 0;
  const isCardio = exercise.muscleGroup === 'Cardio';
  const cardioBlocks = exercise.cardioBlocks || [];
  const totalCardioMinutes = cardioBlocks.reduce((acc, block) => acc + block.minutes, 0);
  const allSetsComplete = completedSets >= exercise.sets;

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
    if (isLastExercise) {
      navigate('/workout/complete');
    } else {
      nextExercise();
    }
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
      const context = `Exercício atual: ${exercise.name} (${exercise.muscleGroup}, ${exercise.sets}x${exercise.repsMin}-${exercise.repsMax}).
Treino: ${workout.label} — ${workout.focus}.
Equipamentos disponíveis: academia completa.

IMPORTANTE: Se a usuária pedir pra SUBSTITUIR o exercício, responda com uma sugestão E inclua no final da resposta este bloco JSON:
[SWAP:{"name":"Nome do exercício substituto","muscleGroup":"grupo","image":"URL da imagem"}]
O exercício substituto DEVE ser da lista de exercícios com foto do app.`;
      const answer = await askAI(apiKey, profile, `${context}\n\nPergunta da usuária: ${aiQuestion}`);

      // Check if AI suggested a swap
      const swapMatch = answer.match(/\[SWAP:(\{[^}]+\})\]/);
      if (swapMatch) {
        const cleanAnswer = answer.replace(/\[SWAP:[^\]]+\]/, '').trim();
        setAIAnswer(cleanAnswer + '\n\n✅ Deseja substituir? Toque "Trocar" abaixo.');
        try {
          const swapData = JSON.parse(swapMatch[1]);
          setSwapSuggestion(swapData);
        } catch { /* ignore parse error */ }
      } else {
        setAIAnswer(answer);
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
      name: swapSuggestion.name,
      sets: exercise.sets,
      repsMin: exercise.repsMin,
      repsMax: exercise.repsMax,
      muscleGroup: swapSuggestion.muscleGroup || exercise.muscleGroup,
      image: swapSuggestion.image,
    });
    setSwapSuggestion(null);
    setAIAnswer('✅ Exercício trocado! Avance para continuar.');
    setShowAIChat(false);
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
            >
              🤖
            </button>
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
              {isLastExercise ? 'Finalizar Treino 🎉' : 'Próximo Exercício →'}
            </motion.button>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={previousExercise}
              disabled={currentIndex === 0}
              className="btn-secondary flex-1 py-3 text-sm disabled:opacity-20"
            >
              ← Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={!allSetsComplete}
              className="btn-secondary flex-1 py-3 text-sm disabled:opacity-20"
            >
              Pular →
            </button>
          </div>
        </div>
      </motion.div>

      <RestTimer active={resting} duration={getRestDuration(exercise, goal)} onSkip={() => setResting(false)} />

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
              <span className="text-sm font-semibold text-primary-300">🤖 GymPilot AI — Treinando</span>
              <button onClick={() => setShowAIChat(false)} className="text-white/30 text-lg">✕</button>
            </div>
            {aiAnswer && (
              <div className="mb-3">
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line bg-white/5 rounded-xl p-3">
                  {aiAnswer}
                </p>
                {swapSuggestion && (
                  <button
                    onClick={handleSwapAccept}
                    className="mt-2 w-full py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium"
                  >
                    ✓ Trocar por {swapSuggestion.name}
                  </button>
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
                className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-40"
              >
                {aiLoading ? '...' : '→'}
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
