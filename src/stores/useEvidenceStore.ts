import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CURATED_EVIDENCE, type EvidenceItem } from '@/constants/evidence';

interface EvidenceState {
  evidenceVersion: number;
  evidence: EvidenceItem[];
  setEvidence: (items: EvidenceItem[], version?: number) => void;
  resetEvidence: () => void;
}

export const EVIDENCE_BASE_VERSION = 1;

export const useEvidenceStore = create<EvidenceState>()(
  persist(
    (set) => ({
      evidenceVersion: EVIDENCE_BASE_VERSION,
      evidence: CURATED_EVIDENCE,
      setEvidence: (items, version = EVIDENCE_BASE_VERSION) =>
        set({
          evidence: items,
          evidenceVersion: version,
        }),
      resetEvidence: () =>
        set({
          evidenceVersion: EVIDENCE_BASE_VERSION,
          evidence: CURATED_EVIDENCE,
        }),
    }),
    {
      name: 'fitflow-evidence',
      version: EVIDENCE_BASE_VERSION,
    },
  ),
);
