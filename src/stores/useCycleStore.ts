import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'none';

export const CYCLE_PHASES: { value: CyclePhase; label: string; emoji: string; tip: string }[] = [
  { value: 'none', label: 'Não informar', emoji: '—', tip: '' },
  { value: 'menstrual', label: 'Menstrual', emoji: '🩸', tip: 'Reduza intensidade se sentir desconforto. Treinos leves são ok.' },
  { value: 'follicular', label: 'Folicular', emoji: '🌱', tip: 'Energia em alta! Ótimo momento pra puxar mais carga.' },
  { value: 'ovulatory', label: 'Ovulatória', emoji: '🌟', tip: 'Pico de força e energia. Aproveite pra bater recordes!' },
  { value: 'luteal', label: 'Lútea', emoji: '🌙', tip: 'Energia pode cair. Foque em volume moderado e sono.' },
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
      setPhase: (phase) => set({ phase, lastUpdated: new Date().toISOString().slice(0, 10) }),
    }),
    { name: 'fitflow-cycle' },
  ),
);
