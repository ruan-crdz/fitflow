import type { RecoveryCheckin } from '@/stores/useRecoveryStore';

export const READINESS_WEIGHTS = {
  energy: 0.35,
  soreness: 0.2,
  stress: 0.2,
  sleep: 0.25,
} as const;

export interface ReadinessBreakdown {
  score: number;
  energy: number;
  soreness: number;
  stress: number;
  sleep: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeReadiness(checkin: RecoveryCheckin | null): ReadinessBreakdown | null {
  if (!checkin) return null;

  const energyNorm = clamp(checkin.energy, 1, 5) / 5;
  const sorenessNorm = (10 - clamp(checkin.soreness, 0, 10)) / 10;
  const stressNorm = (5 - clamp(checkin.stress, 1, 5)) / 5;
  const sleepNorm = clamp(checkin.sleepHours, 0, 10) / 10;

  const energy = energyNorm * READINESS_WEIGHTS.energy * 100;
  const soreness = sorenessNorm * READINESS_WEIGHTS.soreness * 100;
  const stress = stressNorm * READINESS_WEIGHTS.stress * 100;
  const sleep = sleepNorm * READINESS_WEIGHTS.sleep * 100;

  const score = Math.round(energy + soreness + stress + sleep);
  return { score, energy, soreness, stress, sleep };
}
