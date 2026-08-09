import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WaterState {
  logs: Record<string, number>; // date -> glasses drunk
  addGlass: () => void;
  removeGlass: () => void;
  getToday: () => number;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set, get) => ({
      logs: {},
      addGlass: () => set((state) => {
        const key = todayKey();
        return { logs: { ...state.logs, [key]: (state.logs[key] || 0) + 1 } };
      }),
      removeGlass: () => set((state) => {
        const key = todayKey();
        const current = state.logs[key] || 0;
        if (current <= 0) return state;
        return { logs: { ...state.logs, [key]: current - 1 } };
      }),
      getToday: () => get().logs[todayKey()] || 0,
    }),
    { name: 'fitflow-water' },
  ),
);
