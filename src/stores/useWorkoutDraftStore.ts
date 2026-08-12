import { create } from 'zustand';
import type { WorkoutDraft, DraftStatus } from '@/lib/workoutEngine';

interface WorkoutDraftState {
  draft: WorkoutDraft | null;
  status: DraftStatus;
  lastError: string | null;
  setDraft: (draft: WorkoutDraft) => void;
  setStatus: (status: DraftStatus) => void;
  setError: (message: string | null) => void;
  clear: () => void;
}

export const useWorkoutDraftStore = create<WorkoutDraftState>((set) => ({
  draft: null,
  status: 'DRAFTING',
  lastError: null,
  setDraft: (draft) => set({ draft, status: draft.status, lastError: null }),
  setStatus: (status) => set((state) => ({ ...state, status })),
  setError: (message) => set((state) => ({ ...state, lastError: message, status: message ? 'ERROR' : state.status })),
  clear: () => set({ draft: null, status: 'DRAFTING', lastError: null }),
}));
