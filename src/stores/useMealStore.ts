import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedMeal {
  id: string;
  name: string;
  description: string; // e.g. "150g arroz, 150g feijão, 150g carne"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealState {
  shortcuts: SavedMeal[];
  recents: SavedMeal[];
  addShortcut: (meal: SavedMeal) => void;
  removeShortcut: (id: string) => void;
  addRecent: (meal: SavedMeal) => void;
}

export const useMealStore = create<MealState>()(
  persist(
    (set) => ({
      shortcuts: [],
      recents: [],

      addShortcut: (meal) => set((s) => ({
        shortcuts: [meal, ...s.shortcuts.filter((m) => m.id !== meal.id)].slice(0, 20),
      })),

      removeShortcut: (id) => set((s) => ({
        shortcuts: s.shortcuts.filter((m) => m.id !== id),
      })),

      addRecent: (meal) => set((s) => ({
        recents: [meal, ...s.recents.filter((m) => m.description !== meal.description)].slice(0, 10),
      })),
    }),
    { name: 'fitflow-meals' },
  ),
);
