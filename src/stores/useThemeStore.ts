import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  bg: string;
  bgCard: string;
  accent: string;
}

export interface AppTheme {
  id: string;
  name: string;
  icon: string;
  colors: ThemeColors;
  font?: string;
  special?: boolean;
  wallpaper?: string;
}

export const THEMES: AppTheme[] = [
  { id: 'smartfit', name: 'Amarelo (SmartFit)', icon: 'wb_sunny', colors: { primary: '#e5a100', primaryLight: '#fbbf24', primaryDark: '#b45309', bg: '#0d0d0d', bgCard: '#1a1a1a', accent: '#fbbf24' } },
  { id: 'purple', name: 'Roxo', icon: 'palette', colors: { primary: '#7c3aed', primaryLight: '#a78bfa', primaryDark: '#5b21b6', bg: '#0f0f1a', bgCard: '#1a1a2e', accent: '#7c3aed' } },
  { id: 'pink', name: 'Rosa', icon: 'favorite', colors: { primary: '#ec4899', primaryLight: '#f472b6', primaryDark: '#be185d', bg: '#1a0a12', bgCard: '#2d1525', accent: '#ec4899' } },
  { id: 'blue', name: 'Azul', icon: 'opacity', colors: { primary: '#3b82f6', primaryLight: '#60a5fa', primaryDark: '#1d4ed8', bg: '#0a0f1a', bgCard: '#141e30', accent: '#3b82f6' } },
  { id: 'green', name: 'Verde', icon: 'eco', colors: { primary: '#10b981', primaryLight: '#34d399', primaryDark: '#059669', bg: '#0a1a14', bgCard: '#142d22', accent: '#10b981' } },
  { id: 'orange', name: 'Laranja', icon: 'whatshot', colors: { primary: '#f97316', primaryLight: '#fb923c', primaryDark: '#c2410c', bg: '#1a120a', bgCard: '#2d1e14', accent: '#f97316' } },
  { id: 'red', name: 'Vermelho', icon: 'favorite', colors: { primary: '#ef4444', primaryLight: '#f87171', primaryDark: '#b91c1c', bg: '#1a0a0a', bgCard: '#2d1414', accent: '#ef4444' } },
  { id: 'hello-kitty', name: 'Hello Kitty', icon: 'styler', colors: { primary: '#ff69b4', primaryLight: '#ffb6c1', primaryDark: '#ff1493', bg: '#2d0a1a', bgCard: '#3d1530', accent: '#ff69b4' }, font: "'Quicksand', sans-serif", special: true, wallpaper: '/gympilot/assets/wallpaper-hello-kitty.jpg' },
  { id: 'harry-potter', name: 'Harry Potter', icon: 'bolt', colors: { primary: '#d4a017', primaryLight: '#f0c040', primaryDark: '#8b6914', bg: '#1a150a', bgCard: '#2d2510', accent: '#740001' }, font: "'Cinzel', serif", special: true, wallpaper: '/gympilot/assets/wallpaper-harry-potter.jpg' },
];

interface ThemeState {
  themeId: string;
  setTheme: (id: string) => void;
  getTheme: () => AppTheme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: 'smartfit',
      setTheme: (id) => set({ themeId: id }),
      getTheme: () => THEMES.find((t) => t.id === get().themeId) || THEMES[0],
    }),
    {
      name: 'fitflow-theme',
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Partial<ThemeState>;
        return {
          ...state,
          themeId: state.themeId === 'purple' || !state.themeId ? 'smartfit' : state.themeId,
        } as ThemeState;
      },
    },
  ),
);
