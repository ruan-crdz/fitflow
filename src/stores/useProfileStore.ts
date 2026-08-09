import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, WeekDay, Goal } from '@/types';

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

export const GOAL_OPTIONS: { value: Goal; label: string; emoji: string }[] = [
  { value: 'lose', label: 'Perder gordura', emoji: '🔥' },
  { value: 'maintain', label: 'Manter', emoji: '⚖️' },
  { value: 'gain', label: 'Ganhar massa', emoji: '💪' },
];
