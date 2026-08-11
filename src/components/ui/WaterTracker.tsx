import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface WaterTrackerProps {
  glasses: number;
  goal: number;
  onAdd: () => void;
  onRemove: () => void;
  showConfetti?: boolean;
  onConfettiDone?: () => void;
}

export function WaterTracker({
  glasses,
  goal,
  onAdd,
  onRemove,
  showConfetti = false,
  onConfettiDone,
}: WaterTrackerProps) {
  const safeGoal = Math.max(goal, 1);
  const progress = Math.min(glasses / safeGoal, 1);
  const ml = glasses * 250;

  useEffect(() => {
    if (showConfetti && onConfettiDone) {
      const t = setTimeout(onConfettiDone, 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [showConfetti, onConfettiDone]);

  return (
    <div className="card space-y-3 relative overflow-hidden">
      {showConfetti && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
 <p className="text-4xl animate-bounce"></p>
        </motion.div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white/80 flex items-center gap-2">
          <MaterialIcon name="water_drop" className="text-primary-300" />
          Água
        </h2>
        <p className="text-xs text-white/40 font-mono">{ml}ml / {safeGoal * 250}ml</p>
      </div>
      <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onRemove}
          disabled={glasses <= 0}
          className="w-12 h-12 rounded-full bg-dark-300 flex items-center justify-center text-white/50 text-xl disabled:opacity-30"
        >
          -
        </motion.button>
        <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
          {Array.from({ length: safeGoal }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: i < glasses ? 1.2 : 1, backgroundColor: i < glasses ? 'rgb(96 165 250)' : 'rgb(var(--color-bg-rgb))' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-2.5 h-2.5 rounded-full border border-white/10 ${i < glasses ? '' : 'bg-dark-300'}`}
            />
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onAdd}
          className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl"
        >
          +
        </motion.button>
      </div>
      {glasses >= safeGoal && (
 <p className="text-center text-xs text-green-400 font-medium"> Meta atingida! Parabéns!</p>
      )}
    </div>
  );
}
