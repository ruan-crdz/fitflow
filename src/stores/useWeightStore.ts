import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

interface WeightState {
  entries: WeightEntry[];
  addEntry: (weight: number) => void;
  hasTodayEntry: () => boolean;
}

const getToday = () => new Date().toISOString().slice(0, 10);

export const useWeightStore = create<WeightState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (weight: number) => {
        const today = getToday();
        const existing = get().entries.filter((e) => e.date !== today);
        set({ entries: [...existing, { date: today, weight }].sort((a, b) => a.date.localeCompare(b.date)) });
      },
      hasTodayEntry: () => get().entries.some((e) => e.date === getToday()),
    }),
    { name: 'fitflow-weight' },
  ),
);
