import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getToday } from '@/utils/date';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'none';

export const CYCLE_PHASES: { value: CyclePhase; label: string; icon: string; tip: string }[] = [
  { value: 'none', label: 'Não informar', icon: 'remove', tip: '' },
  { value: 'menstrual', label: 'Menstrual', icon: 'opacity', tip: 'Reduza intensidade se sentir desconforto. Treinos leves são ok.' },
  { value: 'follicular', label: 'Folicular', icon: 'eco', tip: 'Energia em alta! Ótimo momento pra puxar mais carga.' },
  { value: 'ovulatory', label: 'Ovulatória', icon: 'star', tip: 'Pico de força e energia. Aproveite pra bater recordes!' },
  { value: 'luteal', label: 'Lútea', icon: 'dark_mode', tip: 'Energia pode cair. Foque em volume moderado e sono.' },
];

interface CycleState {
  phase: CyclePhase;
  lastUpdated: string | null;
  setPhase: (phase: CyclePhase) => void;
}

export const useCycleStore = create<CycleState>()(
  persist(
    (set) => ({
      phase: 'none',
      lastUpdated: null,
      setPhase: (phase) => set({ phase, lastUpdated: getToday() }),
    }),
    { name: 'fitflow-cycle' },
  ),
);
