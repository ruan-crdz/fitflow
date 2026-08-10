import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontScale = 'normal' | 'large' | 'extra-large';

interface AccessibilityState {
  fontScale: FontScale;
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderMode: boolean;
  setFontScale: (fontScale: FontScale) => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  toggleScreenReaderMode: () => void;
  resetAccessibility: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      fontScale: 'normal',
      highContrast: false,
      reduceMotion: false,
      screenReaderMode: false,
      setFontScale: (fontScale) => set({ fontScale }),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
      toggleReduceMotion: () => set((state) => ({ reduceMotion: !state.reduceMotion })),
      toggleScreenReaderMode: () => set((state) => ({ screenReaderMode: !state.screenReaderMode })),
      resetAccessibility: () =>
        set({
          fontScale: 'normal',
          highContrast: false,
          reduceMotion: false,
          screenReaderMode: false,
        }),
    }),
    { name: 'fitflow-accessibility', version: 1 },
  ),
);
