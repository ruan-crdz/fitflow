import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, WeekDay, Goal, ExperienceLevel, TrainingFocus } from '@/types';

interface ProfileState {
  profile: Profile | null;
  isOnboarded: boolean;
  setProfile: (profile: Profile) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isOnboarded: false,
      setProfile: (profile: Profile) => set({ profile, isOnboarded: true }),
      updateProfile: (partial: Partial<Profile>) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : null,
        })),
      reset: () => set({ profile: null, isOnboarded: false }),
    }),
    { name: 'fitflow-profile' },
  ),
);

export const WEEKDAY_OPTIONS: { value: WeekDay; label: string }[] = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
  { value: 'sab', label: 'Sáb' },
  { value: 'dom', label: 'Dom' },
];

export const GOAL_OPTIONS: { value: Goal; label: string; icon: string }[] = [
  { value: 'lose', label: 'Perder gordura', icon: 'whatshot' },
  { value: 'maintain', label: 'Manter', icon: 'balance' },
  { value: 'gain', label: 'Ganhar massa', icon: 'fitness_center' },
];

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; icon: string; description: string }[] = [
  { value: 'beginner', label: 'Iniciante', icon: 'eco', description: 'Começando agora ou voltando após muito tempo parado' },
  { value: 'intermediate', label: 'Intermediário', icon: 'fitness_center', description: 'Treino consistente há 6+ meses' },
  { value: 'advanced', label: 'Avançado', icon: 'emoji_events', description: 'Treino sério há 2+ anos' },
];

export const FOCUS_OPTIONS: { value: TrainingFocus; label: string; icon: string; description: string }[] = [
  { value: 'balanced', label: 'Equilibrado', icon: 'balance', description: 'Volume igual pra todos os grupos musculares' },
  { value: 'upper', label: 'Foco em superiores', icon: 'accessibility_new', description: 'Mais volume pra peito, costas, ombros e braços' },
  { value: 'lower', label: 'Foco em inferiores', icon: 'directions_walk', description: 'Mais volume pra glúteos, quadríceps e posterior' },
  { value: 'custom', label: 'Personalizado', icon: 'edit', description: 'Eu escolho o que quero em cada dia' },
];
