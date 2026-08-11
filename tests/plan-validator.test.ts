import { describe, expect, it } from 'vitest';
import { validateGeneratedPlan, validateReevalPayload } from '../src/utils/planValidator';

describe('plan validator and payload guards', () => {
  it('bloqueia plano com volume absurdo', () => {
    const errors = validateGeneratedPlan({
      workouts: [
        {
          type: 'A',
          focus: 'peito',
          exercises: [
            { name: 'Supino Reto com Barra', sets: 10, repsMin: 8, repsMax: 12, muscleGroup: 'Peito' },
            { name: 'Supino Inclinado com Halteres', sets: 10, repsMin: 8, repsMax: 12, muscleGroup: 'Peito' },
            { name: 'Crucifixo com Halteres', sets: 10, repsMin: 10, repsMax: 15, muscleGroup: 'Peito' },
          ],
        },
        {
          type: 'B',
          focus: 'costas',
          exercises: [
            { name: 'Puxada Frontal', sets: 10, repsMin: 8, repsMax: 12, muscleGroup: 'Costas' },
            { name: 'Remada Curvada', sets: 10, repsMin: 8, repsMax: 12, muscleGroup: 'Costas' },
            { name: 'Pulldown com Corda', sets: 10, repsMin: 10, repsMax: 15, muscleGroup: 'Costas' },
          ],
        },
      ],
    }, 5);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('aceita payload simples válido de reavaliação', () => {
    const errors = validateReevalPayload({
      removeDays: ['D'],
      exercises: {
        A: [{ name: 'Supino Reto com Barra', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Peito' }],
      },
    });
    expect(errors).toEqual([]);
  });

  it('bloqueia payload com dia inválido', () => {
    const errors = validateReevalPayload({
      removeDays: ['Z'],
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
