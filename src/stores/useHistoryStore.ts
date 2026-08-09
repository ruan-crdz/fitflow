import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkoutSession } from '@/types';

interface HistoryState {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  getSessionsByDate: (date: string) => WorkoutSession[];
  getTotalWorkouts: () => number;
  getCurrentStreak: () => number;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],
      addSession: (session) =>
        set((state) => ({ sessions: [session, ...state.sessions] })),
      getSessionsByDate: (date) =>
        get().sessions.filter((s) => s.date === date),
      getTotalWorkouts: () => get().sessions.filter((s) => s.completedAt).length,
      getCurrentStreak: () => {
        const completed = get()
          .sessions.filter((s) => s.completedAt)
          .map((s) => s.date);
        const uniqueDates = [...new Set(completed)].sort().reverse();

        if (uniqueDates.length === 0) return 0;

        let streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prev = new Date(uniqueDates[i - 1]);
          const curr = new Date(uniqueDates[i]);
          const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },
    }),
    { name: 'fitflow-history' },
  ),
);
