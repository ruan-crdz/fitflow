import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WORKOUTS } from '@/constants/workouts';
import type { Exercise, WorkoutType } from '@/types';

interface CustomExercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  muscleGroup: string;
  image?: string;
}

interface CustomWorkoutState {
  customWorkouts: Record<WorkoutType, CustomExercise[] | null>;
  getExercises: (type: WorkoutType) => Exercise[];
  setExercises: (type: WorkoutType, exercises: CustomExercise[]) => void;
  resetWorkout: (type: WorkoutType) => void;
  swapExercise: (type: WorkoutType, oldId: string, newExercise: CustomExercise) => void;
}

export const useCustomWorkoutStore = create<CustomWorkoutState>()(
  persist(
    (set, get) => ({
      customWorkouts: { A: null, B: null, C: null },

      getExercises: (type) => {
        const custom = get().customWorkouts[type];
        if (custom && custom.length > 0) {
          return custom.map((e) => ({
            ...e,
            info: '',
            source: '',
          }));
        }
        return WORKOUTS.find((w) => w.type === type)?.exercises || [];
      },

      setExercises: (type, exercises) =>
        set((state) => ({
          customWorkouts: { ...state.customWorkouts, [type]: exercises },
        })),

      resetWorkout: (type) =>
        set((state) => ({
          customWorkouts: { ...state.customWorkouts, [type]: null },
        })),

      swapExercise: (type, oldId, newExercise) =>
        set((state) => {
          const current = state.customWorkouts[type]
            || WORKOUTS.find((w) => w.type === type)!.exercises.map((e) => ({
              id: e.id, name: e.name, sets: e.sets, repsMin: e.repsMin,
              repsMax: e.repsMax, muscleGroup: e.muscleGroup, image: e.image,
            }));
          const updated = current.map((e) => (e.id === oldId ? newExercise : e));
          return { customWorkouts: { ...state.customWorkouts, [type]: updated } };
        }),
    }),
    {
      name: 'fitflow-custom-workouts',
      version: 1,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        if (state?.customWorkouts) {
          const cw = state.customWorkouts as Record<string, unknown[] | null>;
          for (const key of Object.keys(cw)) {
            if (Array.isArray(cw[key]) && cw[key]!.length === 0) cw[key] = null;
          }
        }
        return state as unknown as CustomWorkoutState;
      },
    },
  ),
);
