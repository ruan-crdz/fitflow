import type { Goal, BiologicalSex } from '@/types';

interface CalorieInput {
  weight: number;
  height: number;
  age: number;
  goal: Goal;
  sex?: BiologicalSex;
}

/** Mifflin-St Jeor: male = +5, female = -161, não informado = média (-78) */
function basalMetabolicRate({ weight, height, age, sex }: Omit<CalorieInput, 'goal'>): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78;
}

/** TDEE com fator de atividade moderado (treina 3x/semana) */
export function calculateTDEE(input: CalorieInput): number {
  const bmr = basalMetabolicRate(input);
  const activityFactor = 1.375;
  const tdee = bmr * activityFactor;

  switch (input.goal) {
    case 'lose':
      return Math.round(tdee - 400);
    case 'gain':
      return Math.round(tdee + 300);
    case 'maintain':
    default:
      return Math.round(tdee);
  }
}

export function calculateMacros(calories: number, goal: Goal) {
  let proteinPct: number, fatPct: number, carbPct: number;

  switch (goal) {
    case 'lose':
      proteinPct = 0.35;
      fatPct = 0.3;
      carbPct = 0.35;
      break;
    case 'gain':
      proteinPct = 0.25;
      fatPct = 0.25;
      carbPct = 0.5;
      break;
    default:
      proteinPct = 0.3;
      fatPct = 0.25;
      carbPct = 0.45;
  }

  return {
    protein: Math.round((calories * proteinPct) / 4),
    fat: Math.round((calories * fatPct) / 9),
    carbs: Math.round((calories * carbPct) / 4),
  };
}

export function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return parseFloat((weight / (heightM * heightM)).toFixed(1));
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Abaixo do peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  return 'Obesidade';
}
