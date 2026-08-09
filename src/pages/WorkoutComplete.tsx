import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/stores/useSessionStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { StarRating } from '@/components/ui/StarRating';
import { AIPostWorkout } from '@/components/workout/AIPostWorkout';
import { ShareCard } from '@/components/workout/ShareCard';
import { formatDuration, getToday } from '@/utils/date';
import { WORKOUT_MAP } from '@/constants/workouts';
import { checkBadges } from '@/stores/useBadgeStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import confetti from '@/utils/confetti';

export function WorkoutComplete() {
  const navigate = useNavigate();
  const { activeSession, endSession } = useSessionStore();
  const addSession = useHistoryStore((s) => s.addSession);
  const sessions = useHistoryStore((s) => s.sessions);
  const getCurrentStreak = useHistoryStore((s) => s.getCurrentStreak);
  const customWorkouts = useCustomWorkoutStore((s) => s.customWorkouts);
  const [rating, setRating] = useState(0);
  const [duration] = useState(() => activeSession ? Date.now() - activeSession.startedAt : 0);

  if (!activeSession) {
    navigate('/dashboard');
    return null;
  }

  const workout = WORKOUT_MAP[activeSession.workoutType];

  const handleFinish = () => {
    addSession({
      id: crypto.randomUUID(),
      workoutType: activeSession.workoutType,
      date: getToday(),
      startedAt: activeSession.startedAt,
      completedAt: Date.now(),
      durationMs: duration,
      rating: rating || undefined,
      exercisesCompleted: activeSession.setsCompleted,
    });
    endSession();
    confetti();

    const completedSessions = sessions.filter((s) => s.completedAt);
    const startDate = new Date(activeSession.startedAt);
    const dayOfWeek = startDate.getDay();
    checkBadges({
      totalWorkouts: completedSessions.length + 1,
      streak: getCurrentStreak(),
      workoutTypes: new Set([...completedSessions.map((s) => s.workoutType), activeSession.workoutType]),
      startHour: startDate.getHours(),
      durationMs: duration,
      rating: rating || undefined,
      hasCustomized: Object.values(customWorkouts).some((v) => v !== null && v.length > 0),
      hasUsedAI: false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });

    navigate('/dashboard');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="space-y-8"
      >
        <div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-7xl block mb-4"
          >
            🏆
          </motion.span>
          <h1 className="text-3xl font-bold">Treino Concluído!</h1>
          <p className="text-white/40 mt-2">{workout.label} — {workout.focus}</p>
        </div>

        <div className="card inline-block px-8 py-4">
          <p className="text-sm text-white/40">Duração</p>
          <p className="text-3xl font-bold text-primary-400">{formatDuration(duration)}</p>
        </div>

        <div className="space-y-3">
          <p className="text-white/50 text-sm">Como foi o treino?</p>
          <StarRating value={rating} onChange={setRating} />
          <p className="text-white/20 text-xs">(opcional)</p>
        </div>

        <AIPostWorkout
          workoutType={activeSession.workoutType}
          durationMs={duration}
          setsCompleted={activeSession.setsCompleted}
        />

        <ShareCard
          workoutType={activeSession.workoutType}
          durationMs={duration}
          rating={rating || undefined}
        />

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleFinish}
          className="btn-primary text-xl py-5"
        >
          Concluir 🎉
        </motion.button>
      </motion.div>
    </div>
  );
}
