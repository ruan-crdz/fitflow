import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveSession, WorkoutType } from '@/types';

interface SessionState {
  activeSession: ActiveSession | null;
  startSession: (workoutType: WorkoutType) => void;
  completeSet: (exerciseId: string, totalSets: number) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  endSession: () => void;
  getElapsedMs: () => number;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      activeSession: null,

      startSession: (workoutType) =>
        set({
          activeSession: {
            workoutType,
            startedAt: Date.now(),
            currentExerciseIndex: 0,
            setsCompleted: {},
          },
        }),

      completeSet: (exerciseId, totalSets) =>
        set((state) => {
          if (!state.activeSession) return state;
          const current = state.activeSession.setsCompleted[exerciseId] || 0;
          if (current >= totalSets) return state;
          return {
            activeSession: {
              ...state.activeSession,
              setsCompleted: {
                ...state.activeSession.setsCompleted,
                [exerciseId]: current + 1,
              },
            },
          };
        }),

      nextExercise: () =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              currentExerciseIndex: state.activeSession.currentExerciseIndex + 1,
            },
          };
        }),

      previousExercise: () =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              currentExerciseIndex: Math.max(0, state.activeSession.currentExerciseIndex - 1),
            },
          };
        }),

      endSession: () => set({ activeSession: null }),

      getElapsedMs: () => {
        const session = get().activeSession;
        if (!session) return 0;
        return Date.now() - session.startedAt;
      },
    }),
    { name: 'fitflow-session' },
  ),
);
