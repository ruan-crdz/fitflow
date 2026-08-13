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

  it('bloqueia treino focado com apenas 1 exercício por grupamento principal', () => {
    const errors = validateGeneratedPlan({
      workouts: [
        {
          type: 'A',
          focus: 'Peitoral + Tríceps + Ombros',
          exercises: [
            { name: 'Supino Reto', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Peitoral' },
            { name: 'Tríceps Corda', sets: 3, repsMin: 10, repsMax: 15, muscleGroup: 'Tríceps' },
            { name: 'Elevação Lateral', sets: 3, repsMin: 12, repsMax: 15, muscleGroup: 'Ombros' },
            { name: 'Abdominal Máquina', sets: 2, repsMin: 12, repsMax: 15, muscleGroup: 'Abdômen' },
            { name: 'Prancha', sets: 2, repsMin: 30, repsMax: 45, muscleGroup: 'Abdômen' },
          ],
        },
        {
          type: 'B',
          focus: 'Costas + Bíceps',
          exercises: [
            { name: 'Remada Curvada', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Costas' },
            { name: 'Puxada Aberta', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Costas' },
            { name: 'Rosca Direta', sets: 3, repsMin: 8, repsMax: 12, muscleGroup: 'Bíceps' },
            { name: 'Rosca Martelo', sets: 3, repsMin: 10, repsMax: 12, muscleGroup: 'Bíceps' },
            { name: 'Face Pull', sets: 2, repsMin: 12, repsMax: 15, muscleGroup: 'Ombros' },
          ],
        },
      ],
    }, 4);

    expect(errors.some((error) => error.includes('foco em Peitoral'))).toBe(true);
    expect(errors.some((error) => error.includes('foco em Tríceps'))).toBe(true);
    expect(errors.some((error) => error.includes('foco em Ombros'))).toBe(true);
  });

  it('bloqueia payload com dia inválido', () => {
    const errors = validateReevalPayload({
      removeDays: ['Z'],
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
