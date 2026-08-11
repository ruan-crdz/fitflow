import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getToday } from '@/utils/date';

export type HealthPlatform = 'none' | 'apple-health' | 'health-connect' | 'manual';

export interface DailyHealthSummary {
  date: string;
  steps: number;
  activeCalories: number;
  distanceMeters?: number;
  source: HealthPlatform;
  syncedAt: number;
}

interface HealthIntegrationState {
  platform: HealthPlatform;
  isConnected: boolean;
  daily: Record<string, DailyHealthSummary>;
  connect: (platform: HealthPlatform) => void;
  disconnect: () => void;
  setTodayManual: (steps: number, activeCalories: number) => void;
  setDailySummary: (summary: DailyHealthSummary) => void;
  getTodaySummary: () => DailyHealthSummary;
}

function todayKey() {
  return getToday();
}

function emptyToday(): DailyHealthSummary {
  return {
    date: todayKey(),
    steps: 0,
    activeCalories: 0,
    source: 'none',
    syncedAt: 0,
  };
}

export const useHealthIntegrationStore = create<HealthIntegrationState>()(
  persist(
    (set, get) => ({
      platform: 'none',
      isConnected: false,
      daily: {},

      connect: (platform) => set({ platform, isConnected: platform !== 'none' }),

      disconnect: () => set({ platform: 'none', isConnected: false }),

      setTodayManual: (steps, activeCalories) => {
        const date = todayKey();
        set((state) => ({
          platform: 'manual',
          isConnected: true,
          daily: {
            ...state.daily,
            [date]: {
              date,
              steps: Math.max(0, Math.round(steps || 0)),
              activeCalories: Math.max(0, Math.round(activeCalories || 0)),
              source: 'manual',
              syncedAt: Date.now(),
            },
          },
        }));
      },

      setDailySummary: (summary) =>
        set((state) => ({
          platform: summary.source,
          isConnected: summary.source !== 'none',
          daily: {
            ...state.daily,
            [summary.date]: {
              ...summary,
              steps: Math.max(0, Math.round(summary.steps || 0)),
              activeCalories: Math.max(0, Math.round(summary.activeCalories || 0)),
              syncedAt: summary.syncedAt || Date.now(),
            },
          },
        })),

      getTodaySummary: () => get().daily[todayKey()] || emptyToday(),
    }),
    { name: 'fitflow-health-integration' },
  ),
);
