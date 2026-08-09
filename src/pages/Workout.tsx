import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { WORKOUT_MAP } from '@/constants/workouts';

export function Workout() {
  const navigate = useNavigate();
  const [resting, setResting] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const { activeSession, completeSet, nextExercise, previousExercise, endSession } =
    useSessionStore();
  const aiEnabled = useAIStore((s) => s.isEnabled);
  const goal = useProfileStore((s) => s.profile?.goal || 'maintain');
  const { notes, setNote } = useNotesStore();

  const { formatted } = useTimer(activeSession?.startedAt ?? null);

  if (!activeSession) {
    navigate('/dashboard');
    return null;
  }

  const workout = WORKOUT_MAP[activeSession.workoutType];
  const exercises = workout.exercises;
  const currentIndex = activeSession.currentExerciseIndex;
  const exercise = exercises[currentIndex];
  const isLastExercise = currentIndex === exercises.length - 1;

  const completedSets = activeSession.setsCompleted[exercise.id] || 0;
  const allSetsComplete = completedSets >= exercise.sets;

  const totalSetsInWorkout = exercises.reduce((acc, e) => acc + e.sets, 0);
  const completedTotalSets = Object.entries(activeSession.setsCompleted).reduce(
    (acc, [, sets]) => acc + sets,
    0,
  );

  const handleCompleteSet = () => {
    completeSet(exercise.id, exercise.sets);
    const newCompleted = completedSets + 1;
    if (newCompleted < exercise.sets) {
      setResting(true);
    }
  };

  const handleNext = () => {
    if (isLastExercise) {
      navigate('/workout/complete');
    } else {
      nextExercise();
    }
  };

  const handleQuit = () => setShowQuitModal(true);

  const confirmQuit = () => {
    endSession();
    navigate('/dashboard');
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
        <span className="text-white/40 text-sm">
          {currentIndex + 1}/{exercises.length}
        </span>
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
            <p className="text-white/40 text-sm mt-1">
              {exercise.sets} séries × {exercise.repsMin}–{exercise.repsMax} reps
            </p>
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
          <div className="flex gap-3">
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8 }}
                animate={{
                  scale: i < completedSets ? 1.1 : 1,
                  backgroundColor: i < completedSets ? 'rgb(var(--color-primary-rgb))' : 'rgb(var(--color-bg-card-rgb))',
                }}
                className="w-14 h-14 rounded-xl flex items-center justify-center border border-white/10"
              >
                <span className="text-lg font-bold">
                  {i < completedSets ? '✓' : i + 1}
                </span>
              </motion.div>
            ))}
          </div>

          <p className="text-white/30 text-sm">
            {completedSets}/{exercise.sets} séries concluídas
          </p>
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
              Série feita! 💪
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

      <ConfirmModal
        open={showQuitModal}
        title="Sair do treino?"
        message="Seu progresso será perdido se sair agora."
        confirmText="Sair"
        cancelText="Continuar"
        danger
        onConfirm={confirmQuit}
        onCancel={() => setShowQuitModal(false)}
      />
    </div>
  );
}
