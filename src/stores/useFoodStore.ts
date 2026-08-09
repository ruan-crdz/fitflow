import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string; // HH:mm
  imageData?: string; // base64 thumbnail
}

interface FoodState {
  logs: Record<string, FoodEntry[]>; // date -> entries
  addEntry: (entry: FoodEntry) => void;
  removeEntry: (id: string) => void;
  getTodayEntries: () => FoodEntry[];
  getTodayTotals: () => { calories: number; protein: number; carbs: number; fat: number };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const useFoodStore = create<FoodState>()(
  persist(
    (set, get) => ({
      logs: {},

      addEntry: (entry) => set((state) => {
        const key = todayKey();
        const existing = state.logs[key] || [];
        return { logs: { ...state.logs, [key]: [...existing, entry] } };
      }),

      removeEntry: (id) => set((state) => {
        const key = todayKey();
        const existing = state.logs[key] || [];
        return { logs: { ...state.logs, [key]: existing.filter((e) => e.id !== id) } };
      }),

      getTodayEntries: () => get().logs[todayKey()] || [],

      getTodayTotals: () => {
        const entries = get().logs[todayKey()] || [];
        return entries.reduce(
          (acc, e) => ({
            calories: acc.calories + e.calories,
            protein: acc.protein + e.protein,
            carbs: acc.carbs + e.carbs,
            fat: acc.fat + e.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );
      },
    }),
    { name: 'fitflow-food' },
  ),
);
