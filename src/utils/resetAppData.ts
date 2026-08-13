import { useAccessibilityStore } from '@/stores/useAccessibilityStore';
import { useAIConfigStore } from '@/stores/useAIConfigStore';
import { useAIStore } from '@/stores/useAIStore';
import { DEFAULT_DASHBOARD_WIDGETS, useDashboardStore } from '@/stores/useDashboardStore';
import { useCycleStore } from '@/stores/useCycleStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useFoodStore } from '@/stores/useFoodStore';
import { useHealthIntegrationStore } from '@/stores/useHealthIntegrationStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useMealStore } from '@/stores/useMealStore';
import { useNotesStore } from '@/stores/useNotesStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { BACKUP_KEYS } from '@/utils/backup';

const EMPTY_WORKOUTS = { A: null, B: null, C: null, D: null, E: null };

function removeMatchingStorage(storage: Storage, shouldRemove: (key: string) => boolean) {
  Object.keys(storage).forEach((key) => {
    if (shouldRemove(key)) storage.removeItem(key);
  });
}

export function clearGymPilotLocalData() {
  useProfileStore.setState({ profile: null, isOnboarded: false });
  useCustomWorkoutStore.setState({ customWorkouts: EMPTY_WORKOUTS, activeSlots: ['A', 'B', 'C'] });
  useHistoryStore.setState({ sessions: [] });
  useSessionStore.setState({ activeSession: null });
  useWeightStore.setState({ entries: [] });
  useWaterStore.setState({ logs: {} });
  useFoodStore.setState({ logs: {} });
  useMealStore.setState({ shortcuts: [], recents: [] });
  useNotesStore.setState({ notes: {} });
  useCycleStore.setState({ phase: 'none', lastUpdated: null });
  useAIStore.setState({ isEnabled: true, hasSeenIntro: false, messages: [] });
  useAIConfigStore.setState({ assistantName: 'GymPilot AI', personality: 'balanced' });
  useDashboardStore.setState({ widgets: DEFAULT_DASHBOARD_WIDGETS });
  useHealthIntegrationStore.setState({ platform: 'none', isConnected: false, daily: {} });
  useThemeStore.setState({ themeId: 'smartfit' });
  useAccessibilityStore.setState({
    fontScale: 'normal',
    highContrast: false,
    reduceMotion: false,
    screenReaderMode: false,
  });

  const knownKeys = new Set(BACKUP_KEYS);
  removeMatchingStorage(localStorage, (key) =>
    knownKeys.has(key)
    || key.startsWith('fitflow-')
    || key.startsWith('gympilot-')
    || key.startsWith('sb-')
  );
  removeMatchingStorage(sessionStorage, (key) =>
    key.startsWith('fitflow-')
    || key.startsWith('gympilot-')
    || key.startsWith('sb-')
  );
}
