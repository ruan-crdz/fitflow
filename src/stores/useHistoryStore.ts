import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityIntensity, ActivityLocation, WorkoutSession } from '@/types';

interface FreeSessionInput {
  activityName: string;
  activityLocation: ActivityLocation;
  activityIntensity: ActivityIntensity;
  date: string;
  durationMinutes: number;
  notes?: string;
}

interface HistoryState {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  addFreeSession: (activity: FreeSessionInput) => void;
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
      addFreeSession: (activity) =>
        set((state) => {
          const durationMs = Math.max(1, activity.durationMinutes) * 60 * 1000;
          const completedAt = Date.now();
          const session: WorkoutSession = {
            id: `free_${completedAt}`,
            kind: 'free',
            activityName: activity.activityName.trim(),
            activityLocation: activity.activityLocation,
            activityIntensity: activity.activityIntensity,
            notes: activity.notes?.trim() || undefined,
            date: activity.date,
            startedAt: completedAt - durationMs,
            completedAt,
            durationMs,
            exercisesCompleted: {},
          };
          return { sessions: [session, ...state.sessions] };
        }),
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
