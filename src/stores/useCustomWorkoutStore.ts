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

export type { CustomExercise };

interface CustomWorkoutState {
  customWorkouts: Record<WorkoutType, CustomExercise[] | null>;
  activeSlots: WorkoutType[];
  getExercises: (type: WorkoutType) => Exercise[];
  setExercises: (type: WorkoutType, exercises: CustomExercise[]) => void;
  resetWorkout: (type: WorkoutType) => void;
  swapExercise: (type: WorkoutType, oldId: string, newExercise: CustomExercise) => void;
  addSlot: () => WorkoutType | null;
  removeSlot: (type: WorkoutType) => void;
  exportWorkout: (type: WorkoutType) => string;
  exportAll: () => string;
  importWorkouts: (data: string) => boolean;
}

export const useCustomWorkoutStore = create<CustomWorkoutState>()(
  persist(
    (set, get) => ({
      customWorkouts: { A: null, B: null, C: null, D: null, E: null },
      activeSlots: ['A', 'B', 'C'] as WorkoutType[],

      getExercises: (type) => {
        const cw = get().customWorkouts || { A: null, B: null, C: null, D: null, E: null };
        const custom = cw[type];
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
        set((state) => {
          const prev = state.customWorkouts || { A: null, B: null, C: null, D: null, E: null };
          return { customWorkouts: { ...prev, [type]: exercises } };
        }),

      resetWorkout: (type) =>
        set((state) => {
          const prev = state.customWorkouts || { A: null, B: null, C: null, D: null, E: null };
          return { customWorkouts: { ...prev, [type]: null } };
        }),

      swapExercise: (type, oldId, newExercise) =>
        set((state) => {
          const prev = state.customWorkouts || { A: null, B: null, C: null, D: null, E: null };
          const current = prev[type]
            || WORKOUTS.find((w) => w.type === type)!.exercises.map((e) => ({
              id: e.id, name: e.name, sets: e.sets, repsMin: e.repsMin,
              repsMax: e.repsMax, muscleGroup: e.muscleGroup, image: e.image,
            }));
          const updated = current.map((e) => (e.id === oldId ? newExercise : e));
          return { customWorkouts: { ...prev, [type]: updated } };
        }),

      addSlot: () => {
        const { activeSlots } = get();
        const all: WorkoutType[] = ['A', 'B', 'C', 'D', 'E'];
        const next = all.find((t) => !activeSlots.includes(t));
        if (!next) return null;
        set({ activeSlots: [...activeSlots, next] });
        return next;
      },

      removeSlot: (type) =>
        set((state) => {
          const slots = state.activeSlots.filter((t) => t !== type);
          const prev = state.customWorkouts || { A: null, B: null, C: null, D: null, E: null };
          return { activeSlots: slots, customWorkouts: { ...prev, [type]: null } };
        }),

      exportWorkout: (type) => {
        const exercises = get().getExercises(type);
        const payload = {
          v: 1,
          type,
          exercises: exercises.map((e) => ({
            name: e.name, sets: e.sets, repsMin: e.repsMin,
            repsMax: e.repsMax, muscleGroup: e.muscleGroup, image: e.image,
          })),
        };
        return btoa(JSON.stringify(payload));
      },

      exportAll: () => {
        const { activeSlots, getExercises } = get();
        const payload = {
          v: 1,
          workouts: activeSlots.map((type) => ({
            type,
            exercises: getExercises(type).map((e) => ({
              name: e.name, sets: e.sets, repsMin: e.repsMin,
              repsMax: e.repsMax, muscleGroup: e.muscleGroup, image: e.image,
            })),
          })),
        };
        return btoa(JSON.stringify(payload));
      },

      importWorkouts: (data) => {
        try {
          const parsed = JSON.parse(atob(data));
          if (parsed.v !== 1) return false;

          if (parsed.workouts) {
            // Full import: replace everything
            const slots: WorkoutType[] = [];
            const cw: Record<string, CustomExercise[] | null> = { A: null, B: null, C: null, D: null, E: null };
            for (const w of parsed.workouts) {
              if (!['A', 'B', 'C', 'D', 'E'].includes(w.type)) continue;
              if (!w.exercises || w.exercises.length === 0) continue;
              slots.push(w.type as WorkoutType);
              cw[w.type] = w.exercises.map((e: CustomExercise, i: number) => ({
                id: `imp_${w.type}_${i}_${Date.now()}`,
                name: e.name || 'Exercício',
                sets: e.sets || 3,
                repsMin: e.repsMin || 8,
                repsMax: e.repsMax || 12,
                muscleGroup: e.muscleGroup || 'Geral',
                image: e.image,
              }));
            }
            if (slots.length === 0) return false;
            set({ activeSlots: slots, customWorkouts: cw as Record<WorkoutType, CustomExercise[] | null> });
          } else if (parsed.type && parsed.exercises) {
            // Single workout import: overwrite that slot
            const type = parsed.type as WorkoutType;
            if (!parsed.exercises.length) return false;
            const exercises = parsed.exercises.map((e: CustomExercise, i: number) => ({
              id: `imp_${type}_${i}_${Date.now()}`,
              name: e.name || 'Exercício',
              sets: e.sets || 3,
              repsMin: e.repsMin || 8,
              repsMax: e.repsMax || 12,
              muscleGroup: e.muscleGroup || 'Geral',
              image: e.image,
            }));
            const prev = get().customWorkouts || { A: null, B: null, C: null, D: null, E: null };
            const currentSlots = get().activeSlots;
            const slots = currentSlots.includes(type) ? currentSlots : [...currentSlots, type];
            set({ customWorkouts: { ...prev, [type]: exercises }, activeSlots: slots });
          } else {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'fitflow-custom-workouts',
      version: 4,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        const base = { A: null, B: null, C: null, D: null, E: null };
        if (state?.customWorkouts) {
          const cw = state.customWorkouts as Record<string, unknown[] | null>;
          for (const key of Object.keys(cw)) {
            if (Array.isArray(cw[key]) && cw[key]!.length === 0) cw[key] = null;
          }
          state.customWorkouts = { ...base, ...cw };
        } else {
          state.customWorkouts = base;
        }
        if (!state.activeSlots) {
          const cw = (state.customWorkouts || base) as Record<string, unknown[] | null>;
          const slots: WorkoutType[] = ['A', 'B', 'C'];
          if (cw.D) slots.push('D');
          if (cw.E) slots.push('E');
          state.activeSlots = slots;
        }
        return state as unknown as CustomWorkoutState;
      },
    },
  ),
);
