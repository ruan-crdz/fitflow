import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORKOUTS } from '@/constants/workouts';
import { ExerciseInfo } from '@/components/workout/ExerciseInfo';
import type { WorkoutType } from '@/types';

export function WorkoutPlans() {
  const [selected, setSelected] = useState<WorkoutType>('A');
  const workout = WORKOUTS.find((w) => w.type === selected)!;

  return (
    <div className="px-5 pt-12 pb-6">
      <h1 className="text-2xl font-bold mb-2">Seus Treinos 📋</h1>
      <p className="text-white/40 text-sm mb-6">Toque no ℹ️ para entender cada exercício</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['A', 'B', 'C'] as WorkoutType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              selected === type
                ? 'bg-primary-500 text-white'
                : 'bg-dark-200 text-white/40'
            }`}
          >
            Treino {type}
          </button>
        ))}
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
            <h2 className="text-lg font-bold">{workout.label}</h2>
            <p className="text-primary-400 text-sm">{workout.focus}</p>
            <p className="text-white/30 text-xs mt-1">
              {workout.exercises.reduce((acc, e) => acc + e.sets, 0)} séries totais • ~40-50 min
            </p>
          </div>

          {workout.exercises.map((exercise, i) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center text-xs font-bold text-primary-300">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{exercise.name}</p>
                <p className="text-white/30 text-xs">
                  {exercise.sets}×{exercise.repsMin}-{exercise.repsMax} • {exercise.muscleGroup}
                </p>
              </div>
              <ExerciseInfo exercise={exercise} />
            </motion.div>
          ))}

          <div className="card mt-4 border-primary-500/20">
            <p className="text-xs text-white/40 leading-relaxed">
              💡 <strong>RIR 2-3</strong> — Termine cada série sentindo que poderia fazer mais 2-3 reps.
              Não precisa falhar. Progressão dupla: quando atingir o topo da faixa de reps com boa forma,
              aumente a carga em ~5% e volte ao limite inferior.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
