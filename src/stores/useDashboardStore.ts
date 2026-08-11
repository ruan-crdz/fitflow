import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DashboardWidget =
  | 'quote'
  | 'aiInsight'
  | 'weeklyReport'
  | 'todayWorkout'
  | 'quickStart'
  | 'stats'
  | 'readiness'
  | 'weeklyGoal'
  | 'streak'
  | 'load'
  | 'calories'
  | 'water'
  | 'bmi'
  | 'weight';

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidget, string> = {
  quote: 'Mensagem do dia',
  aiInsight: 'Insights da IA',
  weeklyReport: 'Relatório semanal',
  todayWorkout: 'Treino de hoje',
  quickStart: 'Escolher treino',
  stats: 'Resumo',
  readiness: 'Prontidão de treino',
  weeklyGoal: 'Meta semanal',
  streak: 'Sequência',
  load: 'Progressão de carga',
  calories: 'Calorias do dia',
  water: 'Água',
  bmi: 'IMC',
  weight: 'Peso',
};

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  'quote',
  'aiInsight',
  'weeklyReport',
  'todayWorkout',
  'quickStart',
  'stats',
  'readiness',
  'weeklyGoal',
  'streak',
  'load',
  'calories',
  'water',
  'bmi',
  'weight',
];

interface DashboardState {
  widgets: DashboardWidget[];
  toggleWidget: (widget: DashboardWidget) => void;
  resetWidgets: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: DEFAULT_DASHBOARD_WIDGETS,
      toggleWidget: (widget) =>
        set((state) => ({
          widgets: state.widgets.includes(widget)
            ? state.widgets.filter((w) => w !== widget)
            : [...state.widgets, widget],
        })),
      resetWidgets: () => set({ widgets: DEFAULT_DASHBOARD_WIDGETS }),
    }),
    {
      name: 'fitflow-dashboard',
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as { widgets?: DashboardWidget[] } | null;
        const current = state?.widgets ?? DEFAULT_DASHBOARD_WIDGETS;
        const merged = Array.from(new Set([...current, 'readiness', 'weeklyGoal'])) as DashboardWidget[];
        return { widgets: merged };
      },
    },
  ),
);
