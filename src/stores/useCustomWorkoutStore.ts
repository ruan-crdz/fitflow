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
  setRows?: { reps: number }[];
  cardioBlocks?: { minutes: number; intensity: string }[];
}

export type { CustomExercise };

export interface WorkoutImportItem {
  originalType?: WorkoutType;
  exercises: CustomExercise[];
}

export interface WorkoutImportPreview {
  kind: 'single' | 'multiple';
  workouts: WorkoutImportItem[];
}

interface CustomWorkoutState {
  customWorkouts: Record<WorkoutType, CustomExercise[] | null>;
  activeSlots: WorkoutType[];
  getExercises: (type: WorkoutType) => Exercise[];
  setExercises: (type: WorkoutType, exercises: CustomExercise[]) => void;
  reorderExercises: (type: WorkoutType, fromIndex: number, toIndex: number) => void;
  reorderSlots: (fromIndex: number, toIndex: number) => void;
  resetWorkout: (type: WorkoutType) => void;
  swapExercise: (type: WorkoutType, oldId: string, newExercise: CustomExercise) => void;
  addSlot: () => WorkoutType | null;
  removeSlot: (type: WorkoutType) => void;
  exportWorkout: (type: WorkoutType) => string;
  exportAll: () => string;
  previewImport: (data: string) => WorkoutImportPreview | null;
  importSingleWorkout: (workout: WorkoutImportItem, target: WorkoutType | 'new') => WorkoutType | null;
  importAllWorkouts: (workouts: WorkoutImportItem[]) => boolean;
  importWorkouts: (data: string) => boolean;
}

const EMPTY_WORKOUTS: Record<WorkoutType, CustomExercise[] | null> = { A: null, B: null, C: null, D: null, E: null };
const WORKOUT_TYPES: WorkoutType[] = ['A', 'B', 'C', 'D', 'E'];

function cloneDefaultWorkout(type: WorkoutType): CustomExercise[] {
  return WORKOUTS.find((w) => w.type === type)?.exercises.map((e) => ({
    id: e.id, name: e.name, sets: e.sets, repsMin: e.repsMin,
    repsMax: e.repsMax, muscleGroup: e.muscleGroup, image: e.image,
    setRows: e.setRows, cardioBlocks: e.cardioBlocks,
  })) || [];
}

function sanitizeExercises(exercises: CustomExercise[] | undefined, prefix: string): CustomExercise[] {
  if (!Array.isArray(exercises)) return [];
  return exercises.map((e, i) => ({
    id: `${prefix}_${i}_${Date.now()}`,
    name: e.name || 'Exercício',
    sets: e.sets || 3,
    repsMin: e.repsMin || 8,
    repsMax: e.repsMax || 12,
    muscleGroup: e.muscleGroup || 'Geral',
    image: e.image,
    setRows: e.setRows,
    cardioBlocks: e.cardioBlocks,
  }));
}

export const useCustomWorkoutStore = create<CustomWorkoutState>()(
  persist(
    (set, get) => ({
      customWorkouts: EMPTY_WORKOUTS,
      activeSlots: ['A', 'B', 'C'] as WorkoutType[],

      getExercises: (type) => {
        const cw = get().customWorkouts || EMPTY_WORKOUTS;
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
          const prev = state.customWorkouts || EMPTY_WORKOUTS;
          return { customWorkouts: { ...prev, [type]: exercises } };
        }),

      reorderExercises: (type, fromIndex, toIndex) =>
        set((state) => {
          if (fromIndex === toIndex) return state;
          const prev = state.customWorkouts || EMPTY_WORKOUTS;
          const base = prev[type] || cloneDefaultWorkout(type);
          const list = [...base];
          const [moved] = list.splice(fromIndex, 1);
          if (!moved) return state;
          list.splice(toIndex, 0, moved);
          return { customWorkouts: { ...prev, [type]: list } };
        }),

      reorderSlots: (fromIndex, toIndex) =>
        set((state) => {
          if (fromIndex === toIndex) return state;
          const oldSlots = [...state.activeSlots];
          const orderedOldSlots = [...oldSlots];
          const [moved] = orderedOldSlots.splice(fromIndex, 1);
          if (!moved) return state;
          orderedOldSlots.splice(toIndex, 0, moved);

          const prev = state.customWorkouts || EMPTY_WORKOUTS;
          const nextWorkouts: Record<WorkoutType, CustomExercise[] | null> = { ...EMPTY_WORKOUTS };
          const nextSlots = orderedOldSlots.map((_, index) => WORKOUT_TYPES[index]);

          orderedOldSlots.forEach((oldType, index) => {
            const newType = WORKOUT_TYPES[index];
            const source = prev[oldType] || cloneDefaultWorkout(oldType);
            nextWorkouts[newType] = source ? source.map((e) => ({ ...e })) : null;
          });

          return { activeSlots: nextSlots, customWorkouts: nextWorkouts };
        }),

      resetWorkout: (type) =>
        set((state) => {
          const prev = state.customWorkouts || EMPTY_WORKOUTS;
          return { customWorkouts: { ...prev, [type]: null } };
        }),

      swapExercise: (type, oldId, newExercise) =>
        set((state) => {
          const prev = state.customWorkouts || EMPTY_WORKOUTS;
          const current = prev[type] || cloneDefaultWorkout(type);
          const updated = current.map((e) => (e.id === oldId ? newExercise : e));
          return { customWorkouts: { ...prev, [type]: updated } };
        }),

      addSlot: () => {
        const { activeSlots } = get();
        const next = WORKOUT_TYPES.find((t) => !activeSlots.includes(t));
        if (!next) return null;
        set({ activeSlots: [...activeSlots, next] });
        return next;
      },

      removeSlot: (type) =>
        set((state) => {
          const slots = state.activeSlots.filter((t) => t !== type);
          const prev = state.customWorkouts || EMPTY_WORKOUTS;
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
            setRows: e.setRows, cardioBlocks: e.cardioBlocks,
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
              setRows: e.setRows, cardioBlocks: e.cardioBlocks,
            })),
          })),
        };
        return btoa(JSON.stringify(payload));
      },

      previewImport: (data) => {
        try {
          const parsed = JSON.parse(atob(data));
          if (parsed.v !== 1) return null;

          if (Array.isArray(parsed.workouts)) {
            const workouts = parsed.workouts
              .filter((w: { type?: WorkoutType; exercises?: CustomExercise[] }) => Array.isArray(w.exercises) && w.exercises.length > 0)
              .map((w: { type?: WorkoutType; exercises?: CustomExercise[] }, index: number) => ({
                originalType: WORKOUT_TYPES.includes(w.type as WorkoutType) ? w.type : undefined,
                exercises: sanitizeExercises(w.exercises, `preview_${w.type || index}`),
              }));
            return workouts.length > 0 ? { kind: workouts.length === 1 ? 'single' : 'multiple', workouts } : null;
          }

          if (parsed.type && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
            return {
              kind: 'single',
              workouts: [{
                originalType: WORKOUT_TYPES.includes(parsed.type) ? parsed.type : undefined,
                exercises: sanitizeExercises(parsed.exercises, `preview_${parsed.type}`),
              }],
            };
          }

          return null;
        } catch {
          return null;
        }
      },

      importSingleWorkout: (workout, target) => {
        const currentSlots = get().activeSlots;
        const finalTarget = target === 'new'
          ? WORKOUT_TYPES.find((type) => !currentSlots.includes(type))
          : target;
        if (!finalTarget) return null;

        const prev = get().customWorkouts || EMPTY_WORKOUTS;
        const nextSlots = currentSlots.includes(finalTarget) ? currentSlots : [...currentSlots, finalTarget];
        set({
          activeSlots: nextSlots,
          customWorkouts: {
            ...prev,
            [finalTarget]: sanitizeExercises(workout.exercises, `imp_${finalTarget}`),
          },
        });
        return finalTarget;
      },

      importAllWorkouts: (workouts) => {
        if (workouts.length === 0) return false;
        const nextWorkouts: Record<WorkoutType, CustomExercise[] | null> = { ...EMPTY_WORKOUTS };
        const slots: WorkoutType[] = [];

        workouts.slice(0, WORKOUT_TYPES.length).forEach((workout, index) => {
          const type = WORKOUT_TYPES[index];
          slots.push(type);
          nextWorkouts[type] = sanitizeExercises(workout.exercises, `imp_all_${type}`);
        });

        set({ activeSlots: slots, customWorkouts: nextWorkouts });
        return true;
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
