import { describe, expect, it } from 'vitest';
import { useCustomWorkoutStore } from '../src/stores/useCustomWorkoutStore';
import type { WorkoutType } from '../src/types';

const EMPTY = { A: null, B: null, C: null, D: null, E: null } as const;

function resetWorkoutStore() {
  (useCustomWorkoutStore as unknown as { persist?: { clearStorage?: () => void } }).persist?.clearStorage?.();
  useCustomWorkoutStore.setState({
    activeSlots: ['A', 'B', 'C'],
    customWorkouts: { ...EMPTY },
  });
}

function expectVisibleWorkoutsNonEmpty(types: WorkoutType[]) {
  const state = useCustomWorkoutStore.getState();
  for (const type of types) {
    const list = state.getExercises(type);
    expect(list.length, `Treino ${type} deveria ter exercicios visiveis`).toBeGreaterThan(0);
  }
}

describe('workout store regression - editar/add/remove/salvar', () => {
  it('mantem A/B/C visiveis apos add + remove + applySlotOrder', () => {
    resetWorkoutStore();

    const before = useCustomWorkoutStore.getState();
    expectVisibleWorkoutsNonEmpty(before.activeSlots);

    const added = before.addSlot();
    expect(added).toBe('D');

    useCustomWorkoutStore.getState().removeSlot('C');

    // Simula salvar com a ordem draft atual (A, B, D)
    useCustomWorkoutStore.getState().applySlotOrder(['A', 'B', 'D']);

    const after = useCustomWorkoutStore.getState();
    expect(after.activeSlots).toEqual(['A', 'B', 'C']);
    expectVisibleWorkoutsNonEmpty(after.activeSlots);
  });

  it('se remover e readicionar slot, fallback padrao continua visivel', () => {
    resetWorkoutStore();

    useCustomWorkoutStore.getState().removeSlot('C');
    const readded = useCustomWorkoutStore.getState().addSlot();
    expect(readded).toBe('C');

    const after = useCustomWorkoutStore.getState();
    expect(after.activeSlots).toEqual(['A', 'B', 'C']);
    expectVisibleWorkoutsNonEmpty(['A', 'B', 'C']);
  });
});
