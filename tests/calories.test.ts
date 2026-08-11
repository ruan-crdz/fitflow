import { describe, expect, it } from 'vitest';
import { calculateTDEE } from '../src/utils/calories';

const baseInput = {
  weight: 80,
  height: 180,
  age: 30,
} as const;

describe('calories', () => {
  it('usa fallback neutro quando sexo não informado', () => {
    const neutral = calculateTDEE({ ...baseInput, goal: 'maintain', sex: 'undisclosed' });
    const male = calculateTDEE({ ...baseInput, goal: 'maintain', sex: 'male' });
    const female = calculateTDEE({ ...baseInput, goal: 'maintain', sex: 'female' });
    expect(neutral).toBeGreaterThan(female);
    expect(neutral).toBeLessThan(male);
  });

  it('aplica ajuste por objetivo corretamente', () => {
    const maintain = calculateTDEE({ ...baseInput, goal: 'maintain', sex: 'undisclosed' });
    const lose = calculateTDEE({ ...baseInput, goal: 'lose', sex: 'undisclosed' });
    const gain = calculateTDEE({ ...baseInput, goal: 'gain', sex: 'undisclosed' });
    expect(lose).toBeLessThan(maintain);
    expect(gain).toBeGreaterThan(maintain);
  });
});
