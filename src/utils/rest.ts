import type { Exercise } from '@/types';
import type { Goal } from '@/types';

// Rest periods based on:
// - Schoenfeld et al. (2016) "Longer inter-set rest periods enhance muscle strength and hypertrophy"
// - de Salles et al. (2009) "Rest interval between sets in strength training"
// - NSCA Essentials of Strength Training & Conditioning (4th Ed.)
//
// Compound heavy: 120-150s (high neural demand, phosphocreatine recovery)
// Compound medium: 90-120s
// Isolation: 60-75s
// Goal adjustment: "lose" = -15s (metabolic stress), "gain" = +10s (full recovery)

const COMPOUND_HEAVY = ['Stiff / RDL', 'Hip Thrust', 'Leg Press Horizontal', 'Agachamento Smith', 'Búlgaro'];
const COMPOUND_MEDIUM = ['Graviton', 'Remada Sentada', 'Supino Máquina', 'Flexora em Pé', 'Panturrilha em Pé'];

export function getRestDuration(exercise: Exercise, goal: Goal): number {
  const name = exercise.name;

  let base: number;
  if (COMPOUND_HEAVY.includes(name)) {
    base = 135; // 2:15
  } else if (COMPOUND_MEDIUM.includes(name)) {
    base = 105; // 1:45
  } else {
    base = 70; // 1:10
  }

  if (goal === 'lose') base -= 15;
  if (goal === 'gain') base += 10;

  return Math.max(45, base);
}
