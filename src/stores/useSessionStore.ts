import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveSession, WorkoutType } from '@/types';

interface SessionState {
  activeSession: ActiveSession | null;
  startSession: (workoutType: WorkoutType) => void;
  completeSet: (exerciseId: string, totalSets: number) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  goToExercise: (index: number) => void;
  markExerciseSkipped: (exerciseId: string) => void;
  syncExerciseStates: (exerciseIds: string[]) => void;
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
            exerciseStates: {},
          },
        }),

      completeSet: (exerciseId, totalSets) =>
        set((state) => {
          if (!state.activeSession) return state;
          const current = state.activeSession.setsCompleted[exerciseId] || 0;
          if (current >= totalSets) return state;
          const newCount = current + 1;
          const nextState = newCount >= totalSets ? 'completed' : (state.activeSession.exerciseStates[exerciseId] || 'in_progress');
          return {
            activeSession: {
              ...state.activeSession,
              setsCompleted: {
                ...state.activeSession.setsCompleted,
                [exerciseId]: newCount,
              },
              exerciseStates: {
                ...state.activeSession.exerciseStates,
                [exerciseId]: nextState,
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

      goToExercise: (index) =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              currentExerciseIndex: Math.max(0, index),
            },
          };
        }),

      markExerciseSkipped: (exerciseId) =>
        set((state) => {
          if (!state.activeSession) return state;
          const current = state.activeSession.exerciseStates[exerciseId];
          if (current === 'completed') return state;
          return {
            activeSession: {
              ...state.activeSession,
              exerciseStates: {
                ...state.activeSession.exerciseStates,
                [exerciseId]: 'skipped_temporarily',
              },
            },
          };
        }),

      syncExerciseStates: (exerciseIds) =>
        set((state) => {
          if (!state.activeSession) return state;
          const prev = state.activeSession.exerciseStates || {};
          const next: Record<string, 'pending' | 'in_progress' | 'completed' | 'skipped_temporarily'> = {};

          exerciseIds.forEach((id, index) => {
            const prevState = prev[id];
            const sets = state.activeSession!.setsCompleted[id] || 0;
            const isCurrent = index === state.activeSession!.currentExerciseIndex;

            if (sets > 0 && prevState !== 'completed') {
              next[id] = isCurrent ? 'in_progress' : 'skipped_temporarily';
              return;
            }

            if (prevState === 'completed') {
              next[id] = 'completed';
              return;
            }

            if (isCurrent) {
              next[id] = 'in_progress';
              return;
            }

            next[id] = prevState || 'pending';
          });

          const sameLength = Object.keys(prev).length === Object.keys(next).length;
          const unchanged = sameLength && exerciseIds.every((id) => prev[id] === next[id]);
          if (unchanged) return state;

          return {
            activeSession: {
              ...state.activeSession,
              exerciseStates: next,
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
