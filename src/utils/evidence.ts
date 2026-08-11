import type { EvidenceItem } from '@/constants/evidence';
import { useEvidenceStore } from '@/stores/useEvidenceStore';

const SCIENCE_KEYWORDS = [
  'proteina', 'hipertrofia', 'forca', 'cardio', 'treino', 'musculo', 'muscular',
  'dieta', 'nutricao', 'caloria', 'hidrata', 'lesao', 'dor', 'sintoma', 'recuperacao',
  'ciclo', 'menstrual', 'rpe', 'rir', 'volume', 'series', 'repeticoes',
];

const normalize = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export function isScientificQuery(query: string): boolean {
  const normalized = normalize(query);
  return SCIENCE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function currentEvidence(): EvidenceItem[] {
  return useEvidenceStore.getState().evidence;
}

export function getEvidenceForQuery(query: string, maxItems = 4): EvidenceItem[] {
  const normalized = normalize(query);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  const scored = currentEvidence().map((item) => {
    const haystack = normalize(`${item.title} ${item.relevantExcerpt} ${item.tags.join(' ')}`);
    let score = 0;
    item.tags.forEach((tag) => {
      if (normalized.includes(normalize(tag))) score += 4;
    });
    tokens.forEach((token) => {
      if (token.length >= 4 && haystack.includes(token)) score += 1;
    });
    return { item, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((entry) => entry.item);

  return scored;
}

export function buildEvidenceContext(evidence: EvidenceItem[]): string {
  if (!evidence.length) return '';
  return `EVIDENCE_CONTEXT:\n${evidence.map((item) => (`- ${item.sourceId} | ${item.sourceType} | nível ${item.evidenceLevel} | ${item.title} (${item.year}) | ${item.url}\n  Trecho: ${item.relevantExcerpt}`)).join('\n')}`;
}

export function extractSourceIds(text: string): string[] {
  const matches = text.match(/\[SRC:([^\]]+)\]/g) || [];
  const ids = matches
    .flatMap((match) => match.replace('[SRC:', '').replace(']', '').split(/[;,]/).map((part) => part.trim()))
    .filter(Boolean);
  return [...new Set(ids)];
}

export function getEvidenceByIds(ids: string[]): EvidenceItem[] {
  const idSet = new Set(ids);
  return currentEvidence().filter((item) => idSet.has(item.sourceId));
}
