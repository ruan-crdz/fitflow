/** Recomendação geral: 35ml por kg de peso corporal */
export function calculateWaterIntake(weightKg: number): number {
  return Math.round((weightKg * 35) / 1000 * 10) / 10;
}
