import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise } from '@/types';

interface ExerciseInfoProps {
  exercise: Exercise;
}

export function ExerciseInfo({ exercise }: ExerciseInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
        aria-label="Informações do exercício"
      >
        ℹ️
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass rounded-3xl p-6 max-w-lg w-full max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <span className="inline-block px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-xs font-medium mb-4">
                {exercise.muscleGroup}
              </span>

              <p className="text-white/70 text-sm leading-relaxed mb-4">
                {exercise.info}
              </p>

              <div className="border-t border-white/10 pt-3">
                <p className="text-[11px] text-white/30 leading-relaxed">
                  📚 {exercise.source}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
