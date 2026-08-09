import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Stores notes per exercise keyed by exercise ID
interface NotesState {
  notes: Record<string, string>;
  setNote: (exerciseId: string, note: string) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: {},
      setNote: (exerciseId, note) =>
        set((state) => ({ notes: { ...state.notes, [exerciseId]: note } })),
    }),
    { name: 'fitflow-notes' },
  ),
);
