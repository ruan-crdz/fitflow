import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecoveryCheckin {
  date: string;
  energy: number;
  soreness: number;
  stress: number;
  sleepHours: number;
}

interface RecoveryState {
  checkins: Record<string, RecoveryCheckin>;
  saveCheckin: (checkin: RecoveryCheckin) => void;
  getCheckin: (date: string) => RecoveryCheckin | null;
}

export const useRecoveryStore = create<RecoveryState>()(
  persist(
    (set, get) => ({
      checkins: {},
      saveCheckin: (checkin) =>
        set((state) => ({
          checkins: {
            ...state.checkins,
            [checkin.date]: checkin,
          },
        })),
      getCheckin: (date) => get().checkins[date] || null,
    }),
    { name: 'fitflow-recovery' },
  ),
);
