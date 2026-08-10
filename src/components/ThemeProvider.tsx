import { useLayoutEffect } from 'react';
import { useThemeStore, THEMES } from '@/stores/useThemeStore';
import { useAccessibilityStore } from '@/stores/useAccessibilityStore';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}

function mixColors(hex1: string, hex2: string, weight: number): string {
  const h1 = hex1.replace('#', '');
  const h2 = hex2.replace('#', '');
  const r = Math.round(parseInt(h1.slice(0, 2), 16) * weight + parseInt(h2.slice(0, 2), 16) * (1 - weight));
  const g = Math.round(parseInt(h1.slice(2, 4), 16) * weight + parseInt(h2.slice(2, 4), 16) * (1 - weight));
  const b = Math.round(parseInt(h1.slice(4, 6), 16) * weight + parseInt(h2.slice(4, 6), 16) * (1 - weight));
  return `${r} ${g} ${b}`;
}

function applyTheme(themeId: string) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  root.style.setProperty('--color-primary-rgb', hexToRgb(theme.colors.primary));
  root.style.setProperty('--color-primary-light-rgb', hexToRgb(theme.colors.primaryLight));
  root.style.setProperty('--color-primary-mid-rgb', mixColors(theme.colors.primary, theme.colors.primaryLight, 0.7));
  root.style.setProperty('--color-primary-dark-rgb', mixColors(theme.colors.primary, '#000000', 0.8));
  root.style.setProperty('--color-primary-darker-rgb', hexToRgb(theme.colors.primaryDark));
  root.style.setProperty('--color-bg-rgb', hexToRgb(theme.colors.bg));
  root.style.setProperty('--color-bg-card-rgb', hexToRgb(theme.colors.bgCard));
  root.style.setProperty('--color-bg-mid-rgb', mixColors(theme.colors.bg, theme.colors.bgCard, 0.5));

  document.body.style.backgroundColor = `rgb(${hexToRgb(theme.colors.bg)})`;

  // Wallpaper for special themes (darkened overlay for readability)
  if (theme.wallpaper) {
    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${theme.wallpaper})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.backgroundImage = 'none';
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.colors.primary);

  if (theme.font) {
    root.style.setProperty('--font-family', theme.font);
    const fontName = theme.font.replace(/'/g, '').split(',')[0].trim();
    const linkId = `theme-font-${themeId}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
    document.body.style.fontFamily = theme.font;
  } else {
    root.style.setProperty('--font-family', "'Inter', system-ui, sans-serif");
    document.body.style.fontFamily = "'Inter', system-ui, sans-serif";
  }
}

// Apply theme immediately on module load (before React renders)
applyTheme(useThemeStore.getState().themeId);

function applyAccessibility() {
  const settings = useAccessibilityStore.getState();
  const root = document.documentElement;

  root.dataset.fontScale = settings.fontScale;
  root.classList.toggle('a11y-high-contrast', settings.highContrast);
  root.classList.toggle('a11y-reduce-motion', settings.reduceMotion);
  root.classList.toggle('a11y-screen-reader', settings.screenReaderMode);
}

applyAccessibility();

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((s) => s.themeId);
  const fontScale = useAccessibilityStore((s) => s.fontScale);
  const highContrast = useAccessibilityStore((s) => s.highContrast);
  const reduceMotion = useAccessibilityStore((s) => s.reduceMotion);
  const screenReaderMode = useAccessibilityStore((s) => s.screenReaderMode);

  useLayoutEffect(() => {
    applyTheme(themeId);
    applyAccessibility();
  }, [themeId]);

  useLayoutEffect(() => {
    applyAccessibility();
  }, [fontScale, highContrast, reduceMotion, screenReaderMode]);

  return <>{children}</>;
}
