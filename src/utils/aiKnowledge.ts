import type { AIFeature } from '@/constants/aiPlan';
import { supabase } from '@/lib/supabase';
import type { BiologicalSex, ExperienceLevel, Goal, Profile, TrainingFocus, TrainingLocation } from '@/types';

type KnowledgeFeature = AIFeature | 'all';

interface AIKnowledgeRuleRow {
  id: string;
  feature: KnowledgeFeature;
  title: string;
  rule_condition: unknown;
  recommendation: string;
  evidence_ref: string | null;
  source_type: string | null;
  source_title: string | null;
  source_authors: string | null;
  source_journal: string | null;
  source_year: number | null;
  source_url: string | null;
  source_doi: string | null;
  source_quality: string | null;
  source_notes: string | null;
  priority: number;
}

interface RuleCondition {
  goalIn?: string[];
  experienceIn?: string[];
  focusIn?: string[];
  trainingLocationIn?: string[];
  sexIn?: string[];
  trainingDaysMin?: number;
  trainingDaysMax?: number;
  ageMin?: number;
  ageMax?: number;
  weightMin?: number;
  weightMax?: number;
  heightMin?: number;
  heightMax?: number;
  sessionDurationMin?: number;
  sessionDurationMax?: number;
  requiresCustomSplit?: boolean;
  customSplitIncludesAny?: string[];
  preferredIncludesAny?: string[];
  dislikedIncludesAny?: string[];
  limitationsIncludesAny?: string[];
  equipmentIncludesAny?: string[];
  promptIncludesAny?: string[];
}

interface RuleRuntimeContext {
  goal: Goal;
  experienceLevel: ExperienceLevel;
  trainingFocus: TrainingFocus;
  trainingLocation: TrainingLocation;
  sex: BiologicalSex;
  trainingDays: number;
  age: number;
  weight: number;
  height: number;
  sessionDurationMin: number;
  hasCustomSplit: boolean;
  customSplitText: string;
  preferredText: string;
  dislikedText: string;
  limitationsText: string;
  equipmentText: string;
  promptText: string;
}

interface MatchedRule {
  row: AIKnowledgeRuleRow;
  specificity: number;
}

const DEFAULT_SESSION_DURATION = 60;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function includesAnyToken(haystack: string, needles: string[]): boolean {
  const normalizedHaystack = normalizeText(haystack);
  return needles.some((needle) => {
    const normalizedNeedle = normalizeText(needle);
    return normalizedNeedle.length > 0 && normalizedHaystack.includes(normalizedNeedle);
  });
}

function includesNormalizedValue(value: string, options: string[]): boolean {
  const normalizedValue = normalizeText(value);
  const normalizedOptions = options.map((option) => normalizeText(option));
  return normalizedOptions.includes(normalizedValue);
}

function toRuleCondition(value: unknown): RuleCondition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as RuleCondition;
}

function buildRuntimeContext(profile: Profile, prompt: string): RuleRuntimeContext {
  return {
    goal: profile.goal,
    experienceLevel: profile.experienceLevel || 'beginner',
    trainingFocus: profile.trainingFocus || 'balanced',
    trainingLocation: profile.trainingLocation || 'academia',
    sex: profile.sex || 'undisclosed',
    trainingDays: profile.trainingDays.length,
    age: profile.age,
    weight: profile.weight,
    height: profile.height,
    sessionDurationMin: profile.sessionDurationMin || DEFAULT_SESSION_DURATION,
    hasCustomSplit: Boolean(profile.customSplit && Object.keys(profile.customSplit).length > 0),
    customSplitText: Object.values(profile.customSplit || {}).join(' | '),
    preferredText: (profile.preferredExercises || []).join(' | '),
    dislikedText: (profile.dislikedExercises || []).join(' | '),
    limitationsText: (profile.limitations || []).join(' | '),
    equipmentText: (profile.equipmentAccess || []).join(' | '),
    promptText: prompt,
  };
}

function matchesRuleCondition(condition: RuleCondition, context: RuleRuntimeContext): { matches: boolean; specificity: number } {
  let checks = 0;
  let matched = 0;

  const addCheck = (ok: boolean) => {
    checks += 1;
    if (ok) matched += 1;
  };

  if (condition.goalIn !== undefined) {
    const values = asStringArray(condition.goalIn);
    addCheck(values.length > 0 && includesNormalizedValue(context.goal, values));
  }

  if (condition.experienceIn !== undefined) {
    const values = asStringArray(condition.experienceIn);
    addCheck(values.length > 0 && includesNormalizedValue(context.experienceLevel, values));
  }

  if (condition.focusIn !== undefined) {
    const values = asStringArray(condition.focusIn);
    addCheck(values.length > 0 && includesNormalizedValue(context.trainingFocus, values));
  }

  if (condition.trainingLocationIn !== undefined) {
    const values = asStringArray(condition.trainingLocationIn);
    addCheck(values.length > 0 && includesNormalizedValue(context.trainingLocation, values));
  }

  if (condition.sexIn !== undefined) {
    const values = asStringArray(condition.sexIn);
    addCheck(values.length > 0 && includesNormalizedValue(context.sex, values));
  }

  if (condition.trainingDaysMin !== undefined) {
    const min = asNumber(condition.trainingDaysMin);
    addCheck(min !== null && context.trainingDays >= min);
  }

  if (condition.trainingDaysMax !== undefined) {
    const max = asNumber(condition.trainingDaysMax);
    addCheck(max !== null && context.trainingDays <= max);
  }

  if (condition.ageMin !== undefined) {
    const min = asNumber(condition.ageMin);
    addCheck(min !== null && context.age >= min);
  }

  if (condition.ageMax !== undefined) {
    const max = asNumber(condition.ageMax);
    addCheck(max !== null && context.age <= max);
  }

  if (condition.weightMin !== undefined) {
    const min = asNumber(condition.weightMin);
    addCheck(min !== null && context.weight >= min);
  }

  if (condition.weightMax !== undefined) {
    const max = asNumber(condition.weightMax);
    addCheck(max !== null && context.weight <= max);
  }

  if (condition.heightMin !== undefined) {
    const min = asNumber(condition.heightMin);
    addCheck(min !== null && context.height >= min);
  }

  if (condition.heightMax !== undefined) {
    const max = asNumber(condition.heightMax);
    addCheck(max !== null && context.height <= max);
  }

  if (condition.sessionDurationMin !== undefined) {
    const min = asNumber(condition.sessionDurationMin);
    addCheck(min !== null && context.sessionDurationMin >= min);
  }

  if (condition.sessionDurationMax !== undefined) {
    const max = asNumber(condition.sessionDurationMax);
    addCheck(max !== null && context.sessionDurationMin <= max);
  }

  if (condition.requiresCustomSplit !== undefined) {
    addCheck(typeof condition.requiresCustomSplit === 'boolean' && context.hasCustomSplit === condition.requiresCustomSplit);
  }

  if (condition.customSplitIncludesAny !== undefined) {
    const values = asStringArray(condition.customSplitIncludesAny);
    addCheck(values.length > 0 && includesAnyToken(context.customSplitText, values));
  }

  if (condition.preferredIncludesAny !== undefined) {
    const values = asStringArray(condition.preferredIncludesAny);
    addCheck(values.length > 0 && includesAnyToken(context.preferredText, values));
  }

  if (condition.dislikedIncludesAny !== undefined) {
    const values = asStringArray(condition.dislikedIncludesAny);
    addCheck(values.length > 0 && includesAnyToken(context.dislikedText, values));
  }

  if (condition.limitationsIncludesAny !== undefined) {
    const values = asStringArray(condition.limitationsIncludesAny);
    addCheck(values.length > 0 && includesAnyToken(context.limitationsText, values));
  }

  if (condition.equipmentIncludesAny !== undefined) {
    const values = asStringArray(condition.equipmentIncludesAny);
    addCheck(values.length > 0 && includesAnyToken(context.equipmentText, values));
  }

  if (condition.promptIncludesAny !== undefined) {
    const values = asStringArray(condition.promptIncludesAny);
    addCheck(values.length > 0 && includesAnyToken(context.promptText, values));
  }

  if (checks === 0) {
    return { matches: true, specificity: 0 };
  }

  return {
    matches: matched === checks,
    specificity: checks,
  };
}

function rulePriority(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 100;
}

function buildPromptContext(rules: MatchedRule[]): string {
  if (!rules.length) return '';

  const lines = rules.map(({ row }, index) => {
    const evidenceLine = row.evidence_ref ? `\n  Evidencia: ${row.evidence_ref}` : '';
    const sourceParts = [
      row.source_type ? `tipo=${row.source_type}` : null,
      row.source_title ? `titulo=${row.source_title}` : null,
      row.source_authors ? `autores=${row.source_authors}` : null,
      row.source_journal ? `journal=${row.source_journal}` : null,
      row.source_year ? `ano=${row.source_year}` : null,
      row.source_quality ? `qualidade=${row.source_quality}` : null,
      row.source_doi ? `doi=${row.source_doi}` : null,
      row.source_url ? `url=${row.source_url}` : null,
      row.source_notes ? `obs=${row.source_notes}` : null,
    ].filter(Boolean);
    const sourceLine = sourceParts.length > 0 ? `\n  Fonte: ${sourceParts.join(' | ')}` : '';
    return `- Regra ${index + 1} (${row.id}) | ${row.title}\n  Recomendacao: ${row.recommendation}${evidenceLine}${sourceLine}`;
  });

  return `PLAYBOOK_SUPABASE (fonte primária interna):\n${lines.join('\n')}`;
}

export async function buildKnowledgeContextForAI(
  profile: Profile,
  feature: AIFeature,
  latestUserPrompt: string,
  maxRules = 8,
): Promise<{ context: string; matchedRules: number }> {
  if (!supabase) return { context: '', matchedRules: 0 };

  const { data, error } = await supabase
    .from('ai_knowledge_rules')
    .select('id, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority')
    .eq('is_active', true)
    .in('feature', ['all', feature])
    .order('priority', { ascending: true })
    .limit(120);

  if (error || !Array.isArray(data) || data.length === 0) {
    return { context: '', matchedRules: 0 };
  }

  const runtime = buildRuntimeContext(profile, latestUserPrompt);
  const rows = data as AIKnowledgeRuleRow[];
  const matched: MatchedRule[] = rows
    .map((row) => {
      const condition = toRuleCondition(row.rule_condition);
      const result = matchesRuleCondition(condition, runtime);
      return result.matches
        ? {
            row,
            specificity: result.specificity,
          }
        : null;
    })
    .filter((item): item is MatchedRule => Boolean(item))
    .sort((a, b) => {
      const priorityDelta = rulePriority(a.row.priority) - rulePriority(b.row.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return b.specificity - a.specificity;
    })
    .slice(0, maxRules);

  return {
    context: buildPromptContext(matched),
    matchedRules: matched.length,
  };
}