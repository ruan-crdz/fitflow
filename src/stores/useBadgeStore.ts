import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlockedAt?: number;
}

const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt'>[] = [
  { id: 'first_workout', icon: '🎯', name: 'Primeira Vez', description: 'Complete seu primeiro treino' },
  { id: 'streak_3', icon: '🔥', name: 'Esquentando', description: 'Treine 3 semanas seguidas' },
  { id: 'streak_7', icon: '💥', name: 'Imparável', description: 'Treine 7 semanas seguidas' },
  { id: 'total_10', icon: '💪', name: 'Dedicada', description: 'Complete 10 treinos' },
  { id: 'total_25', icon: '🏋️', name: 'Consistente', description: 'Complete 25 treinos' },
  { id: 'total_50', icon: '👑', name: 'Rainha do Treino', description: 'Complete 50 treinos' },
  { id: 'total_100', icon: '🏆', name: 'Lendária', description: 'Complete 100 treinos' },
  { id: 'all_types', icon: '🔄', name: 'Completa', description: 'Faça treino A, B e C' },
  { id: 'early_bird', icon: '🌅', name: 'Madrugadora', description: 'Treine antes das 7h' },
  { id: 'night_owl', icon: '🦉', name: 'Coruja', description: 'Treine depois das 21h' },
  { id: 'marathon', icon: '⏱️', name: 'Maratonista', description: 'Treine por mais de 60 minutos' },
  { id: 'speed_run', icon: '⚡', name: 'Raio', description: 'Complete um treino em menos de 30 min' },
  { id: 'customizer', icon: '✏️', name: 'Personalizada', description: 'Edite um treino pela primeira vez' },
  { id: 'ai_user', icon: '🤖', name: 'Tech Fitness', description: 'Use a IA para montar um treino' },
  { id: 'five_star', icon: '⭐', name: 'Nota Máxima', description: 'Dê 5 estrelas para um treino' },
  { id: 'weekend', icon: '🏖️', name: 'Sem Desculpa', description: 'Treine no fim de semana' },
];

interface BadgeState {
  unlockedBadges: Record<string, number>;
  lastUnlocked: string | null;
  getAllBadges: () => Badge[];
  getUnlockedCount: () => number;
  unlock: (id: string) => boolean;
  isUnlocked: (id: string) => boolean;
  clearLastUnlocked: () => void;
}

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      unlockedBadges: {},
      lastUnlocked: null,

      getAllBadges: () =>
        BADGE_DEFINITIONS.map((b) => ({
          ...b,
          unlockedAt: get().unlockedBadges[b.id],
        })),

      getUnlockedCount: () => Object.keys(get().unlockedBadges).length,

      unlock: (id) => {
        if (get().unlockedBadges[id]) return false;
        set((s) => ({
          unlockedBadges: { ...s.unlockedBadges, [id]: Date.now() },
          lastUnlocked: id,
        }));
        return true;
      },

      isUnlocked: (id) => !!get().unlockedBadges[id],

      clearLastUnlocked: () => set({ lastUnlocked: null }),
    }),
    { name: 'fitflow-badges' },
  ),
);

export function checkBadges(stats: {
  totalWorkouts: number;
  streak: number;
  workoutTypes: Set<string>;
  startHour: number;
  durationMs: number;
  rating?: number;
  hasCustomized: boolean;
  hasUsedAI: boolean;
  isWeekend: boolean;
}) {
  const store = useBadgeStore.getState();
  const newlyUnlocked: Badge[] = [];

  const tryUnlock = (id: string) => {
    if (store.unlock(id)) {
      const badge = BADGE_DEFINITIONS.find((b) => b.id === id);
      if (badge) newlyUnlocked.push({ ...badge, unlockedAt: Date.now() });
    }
  };

  if (stats.totalWorkouts >= 1) tryUnlock('first_workout');
  if (stats.totalWorkouts >= 10) tryUnlock('total_10');
  if (stats.totalWorkouts >= 25) tryUnlock('total_25');
  if (stats.totalWorkouts >= 50) tryUnlock('total_50');
  if (stats.totalWorkouts >= 100) tryUnlock('total_100');
  if (stats.streak >= 3) tryUnlock('streak_3');
  if (stats.streak >= 7) tryUnlock('streak_7');
  if (stats.workoutTypes.size >= 3) tryUnlock('all_types');
  if (stats.startHour < 7) tryUnlock('early_bird');
  if (stats.startHour >= 21) tryUnlock('night_owl');
  if (stats.durationMs > 60 * 60 * 1000) tryUnlock('marathon');
  if (stats.durationMs > 0 && stats.durationMs < 30 * 60 * 1000) tryUnlock('speed_run');
  if (stats.rating === 5) tryUnlock('five_star');
  if (stats.hasCustomized) tryUnlock('customizer');
  if (stats.hasUsedAI) tryUnlock('ai_user');
  if (stats.isWeekend) tryUnlock('weekend');

  return newlyUnlocked;
}
