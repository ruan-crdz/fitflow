import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/stores/useSessionStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useRecoveryStore } from '@/stores/useRecoveryStore';
import { StarRating } from '@/components/ui/StarRating';
import { AIPostWorkout } from '@/components/workout/AIPostWorkout';
import { ShareCard } from '@/components/workout/ShareCard';
import { formatDuration, getToday } from '@/utils/date';
import { WORKOUT_MAP } from '@/constants/workouts';
import confetti from '@/utils/confetti';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export function WorkoutComplete() {
  const navigate = useNavigate();
  const { activeSession, endSession } = useSessionStore();
  const addSession = useHistoryStore((s) => s.addSession);
  const saveCheckin = useRecoveryStore((s) => s.saveCheckin);
  const [rating, setRating] = useState(0);
  const [duration] = useState(() => activeSession ? Date.now() - activeSession.startedAt : 0);
  const [energy, setEnergy] = useState(4);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(2);
  const [sleepHours, setSleepHours] = useState(7);

  if (!activeSession) {
    navigate('/dashboard');
    return null;
  }

  const workout = WORKOUT_MAP[activeSession.workoutType];

  const handleFinish = () => {
    const today = getToday();
    addSession({
      id: crypto.randomUUID(),
      kind: 'structured',
      workoutType: activeSession.workoutType,
      date: today,
      startedAt: activeSession.startedAt,
      completedAt: Date.now(),
      durationMs: duration,
      rating: rating || undefined,
      recovery: {
        energy,
        soreness,
        stress,
        sleepHours,
      },
      exercisesCompleted: activeSession.setsCompleted,
    });
    saveCheckin({
      date: today,
      energy,
      soreness,
      stress,
      sleepHours,
    });
    endSession();
    confetti();

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
          ><MaterialIcon name="emoji_events" className="text-7xl text-primary-300" /></motion.span>
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

        <div className="card text-left space-y-3">
          <h2 className="text-sm font-bold text-white/80">Check-in de recuperação</h2>
          <MetricSlider label="Energia" value={energy} min={1} max={5} onChange={setEnergy} />
          <MetricSlider label="Dor muscular" value={soreness} min={0} max={10} onChange={setSoreness} />
          <MetricSlider label="Estresse" value={stress} min={1} max={5} onChange={setStress} />
          <MetricSlider label="Sono (horas)" value={sleepHours} min={3} max={10} onChange={setSleepHours} />
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
          Concluir
        </motion.button>
      </motion.div>
    </div>
  );
}

function MetricSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="font-bold text-primary-300">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-yellow-400"
      />
    </label>
  );
}
