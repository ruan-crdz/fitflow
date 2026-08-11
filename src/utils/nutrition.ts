import { NUTRITION_TABLE, type NutritionFood } from '@/constants/nutritionTable';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  ml: 1,
  un: 100,
  colher_sopa: 15,
  colher_cha: 5,
  copo: 240,
  xicara: 200,
};

export function normalizeFoodName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findFoodInTable(name: string): NutritionFood | null {
  const normalized = normalizeFoodName(name);
  const exact = NUTRITION_TABLE.find((food) => food.aliases.some((alias) => normalizeFoodName(alias) === normalized));
  if (exact) return exact;

  const partial = NUTRITION_TABLE.find((food) => food.aliases.some((alias) => normalized.includes(normalizeFoodName(alias)) || normalizeFoodName(alias).includes(normalized)));
  return partial || null;
}

export function toGrams(amount: number | null | undefined, unit: string | undefined, fallback: number): number {
  if (!amount || amount <= 0) return fallback;
  const factor = UNIT_TO_GRAMS[unit || 'g'] || 1;
  return amount * factor;
}

export function macrosForFood(food: NutritionFood, grams: number): MacroTotals {
  const ratio = grams / 100;
  return {
    calories: Math.round(food.per100g.calories * ratio),
    protein: Math.round(food.per100g.protein * ratio),
    carbs: Math.round(food.per100g.carbs * ratio),
    fat: Math.round(food.per100g.fat * ratio),
  };
}

export function addMacros(base: MacroTotals, increment: MacroTotals): MacroTotals {
  return {
    calories: base.calories + increment.calories,
    protein: base.protein + increment.protein,
    carbs: base.carbs + increment.carbs,
    fat: base.fat + increment.fat,
  };
}
