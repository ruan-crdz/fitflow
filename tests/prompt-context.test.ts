import { describe, expect, it } from 'vitest';
import { buildProfilePromptLines } from '../src/utils/promptContext';

describe('prompt context builder', () => {
  it('gera linhas com sexo não informado e campos de personalização', () => {
    const lines = buildProfilePromptLines({
      name: 'Ruan',
      age: 28,
      weight: 82,
      height: 178,
      goal: 'gain',
      trainingDays: ['seg', 'qua', 'sex'],
      sex: 'undisclosed',
      sessionDurationMin: 55,
      trainingLocation: 'casa',
      equipmentAccess: ['halteres'],
      preferredExercises: ['supino'],
      dislikedExercises: ['burpee'],
      limitations: ['lombar'],
      trainingAgeMonths: 10,
    });

    expect(lines.some((line) => line.includes('Sexo biológico: não informado'))).toBe(true);
    expect(lines.some((line) => line.includes('Tempo por sessão: 55 min'))).toBe(true);
    expect(lines.some((line) => line.includes('Local de treino: casa'))).toBe(true);
  });
});
