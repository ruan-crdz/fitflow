import { WORKOUTS } from '@/constants/workouts';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';
import { useCustomWorkoutStore, type CustomExercise } from '@/stores/useCustomWorkoutStore';
import type { WorkoutType } from '@/types';
import type { ApplyWorkoutPlanAction } from '@/utils/ai';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type DraftStatus = 'DRAFTING' | 'READY' | 'AWAITING_CONFIRMATION' | 'SAVING' | 'SAVED' | 'ERROR';
const MIN_EXERCISES_PER_WORKOUT = 5;

export interface WorkoutDraft {
  id: string;
  status: DraftStatus;
  split: 'ABC' | 'ABCD' | 'ABCDE';
  workouts: ApplyWorkoutPlanAction['workouts'];
  recommendation?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutTemplateItem {
  id: string;
  name: string;
  source: 'SYSTEM' | 'USER' | 'AI';
  visibility: 'PUBLIC' | 'PRIVATE';
  split: WorkoutType[];
  workouts: ApplyWorkoutPlanAction['workouts'];
}

export interface ApplyDraftResult {
  success: boolean;
  message: string;
  persistence: 'backend' | 'local';
  draftId?: string;
  programId?: string;
  version?: number;
}

function normalizeName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readNumber(data: Record<string, unknown>, key: string): number | undefined {
  const value = data[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

async function hasAuthenticatedSupabaseSession(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase.auth.getSession();
  if (error) return false;
  return Boolean(data.session?.user?.id);
}

function buildIdempotencyKey(draftId: string): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `replace_${draftId}_${random}`;
}

export function splitToSlots(split: 'ABC' | 'ABCD' | 'ABCDE'): WorkoutType[] {
  if (split === 'ABCDE') return ['A', 'B', 'C', 'D', 'E'];
  if (split === 'ABCD') return ['A', 'B', 'C', 'D'];
  return ['A', 'B', 'C'];
}

function isValidSplit(value: unknown): value is 'ABC' | 'ABCD' | 'ABCDE' {
  return value === 'ABC' || value === 'ABCD' || value === 'ABCDE';
}

function parseWorkoutsFromUnknown(raw: unknown): ApplyWorkoutPlanAction['workouts'] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as {
        type?: unknown;
        focus?: unknown;
        exercises?: unknown;
      };

      const type = typeof candidate.type === 'string' ? candidate.type.toUpperCase() : '';
      if (!['A', 'B', 'C', 'D', 'E'].includes(type)) return null;

      const exercisesRaw = Array.isArray(candidate.exercises) ? candidate.exercises : [];
      const exercises = exercisesRaw
        .map((exercise) => {
          if (!exercise || typeof exercise !== 'object') return null;
          const parsed = exercise as {
            name?: unknown;
            sets?: unknown;
            repsMin?: unknown;
            repsMax?: unknown;
            muscleGroup?: unknown;
          };

          if (typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
          const sets = Number(parsed.sets);
          const repsMin = Number(parsed.repsMin);
          const repsMax = Number(parsed.repsMax);

          if (!Number.isFinite(sets) || !Number.isFinite(repsMin) || !Number.isFinite(repsMax)) {
            return null;
          }

          return {
            name: parsed.name,
            sets,
            repsMin,
            repsMax,
            muscleGroup: typeof parsed.muscleGroup === 'string' && parsed.muscleGroup.trim() ? parsed.muscleGroup : 'Geral',
          };
        })
        .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise));

      return {
        type: type as WorkoutType,
        focus: typeof candidate.focus === 'string' ? candidate.focus : undefined,
        exercises,
      };
    })
    .filter((workout): workout is NonNullable<typeof workout> => Boolean(workout));
}

export function getWorkoutTemplates(): WorkoutTemplateItem[] {
  const systemTemplates: WorkoutTemplateItem[] = [
    {
      id: 'system_default_abc',
      name: 'ABC Base FitFlow',
      source: 'SYSTEM',
      visibility: 'PUBLIC',
      split: ['A', 'B', 'C'],
      workouts: WORKOUTS.slice(0, 3).map((workout) => ({
        type: workout.type,
        focus: workout.focus,
        exercises: workout.exercises.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets,
          repsMin: exercise.repsMin,
          repsMax: exercise.repsMax,
          muscleGroup: exercise.muscleGroup,
        })),
      })),
    },
  ];

  const customStore = useCustomWorkoutStore.getState();
  const customTemplates: WorkoutTemplateItem[] = customStore.activeSlots.length > 0
    ? [{
        id: 'user_current_active',
        name: 'Treino atual do usuário',
        source: 'USER',
        visibility: 'PRIVATE',
        split: [...customStore.activeSlots],
        workouts: customStore.activeSlots.map((slot) => ({
          type: slot,
          focus: `Treino ${slot}`,
          exercises: customStore.getExercises(slot).map((exercise) => ({
            name: exercise.name,
            sets: exercise.sets,
            repsMin: exercise.repsMin,
            repsMax: exercise.repsMax,
            muscleGroup: exercise.muscleGroup,
          })),
        })),
      }]
    : [];

  return [...systemTemplates, ...customTemplates];
}

function toCustomExercises(workoutType: WorkoutType, exercises: ApplyWorkoutPlanAction['workouts'][number]['exercises']): CustomExercise[] {
  return exercises.map((exercise, index) => {
    const normalized = normalizeName(exercise.name);
    const catalog = EXERCISE_CATALOG.find((item) => normalizeName(item.name) === normalized)
      || EXERCISE_CATALOG.find((item) => normalizeName(item.name).includes(normalized) || normalized.includes(normalizeName(item.name)));

    const repsMin = Number.isFinite(exercise.repsMin) ? Math.max(1, exercise.repsMin) : 8;
    const repsMax = Number.isFinite(exercise.repsMax) ? Math.max(repsMin, exercise.repsMax) : 12;

    return {
      id: `draft_${workoutType}_${index}_${Date.now()}`,
      name: catalog?.name || exercise.name,
      sets: Number.isFinite(exercise.sets) ? Math.max(1, Math.min(8, exercise.sets)) : 3,
      repsMin,
      repsMax,
      muscleGroup: catalog?.muscleGroup || exercise.muscleGroup || 'Geral',
      image: catalog?.image,
    };
  });
}

export function createDraftFromAction(action: ApplyWorkoutPlanAction): WorkoutDraft {
  return {
    id: `draft_${Date.now()}`,
    status: 'READY',
    split: action.split,
    workouts: action.workouts,
    recommendation: action.recommendation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function validateDraft(draft: WorkoutDraft): string[] {
  const errors: string[] = [];
  const expectedSlots = splitToSlots(draft.split);

  if (draft.workouts.length !== expectedSlots.length) {
    errors.push('Quantidade de treinos não bate com a divisão informada.');
  }

  for (const slot of expectedSlots) {
    const workout = draft.workouts.find((item) => item.type === slot);
    if (!workout) {
      errors.push(`Treino ${slot} ausente no plano.`);
      continue;
    }
    if (!Array.isArray(workout.exercises) || workout.exercises.length < MIN_EXERCISES_PER_WORKOUT) {
      errors.push(`Treino ${slot} precisa de ao menos ${MIN_EXERCISES_PER_WORKOUT} exercícios.`);
      continue;
    }

    for (const exercise of workout.exercises) {
      if (!exercise.name?.trim()) errors.push(`Treino ${slot} contém exercício sem nome.`);
      if (!Number.isFinite(exercise.sets) || exercise.sets < 1) errors.push(`Treino ${slot} contém séries inválidas.`);
      if (!Number.isFinite(exercise.repsMin) || !Number.isFinite(exercise.repsMax)) errors.push(`Treino ${slot} contém repetições inválidas.`);
    }
  }

  return errors;
}

function applyDraftLocally(draft: WorkoutDraft): { success: boolean; message: string } {
  const errors = validateDraft(draft);
  if (errors.length > 0) {
    return { success: false, message: errors[0] };
  }

  const store = useCustomWorkoutStore.getState();
  const prevSlots = [...store.activeSlots];
  const prevWorkouts = { ...store.customWorkouts };

  try {
    const slots = splitToSlots(draft.split);
    const next: Record<WorkoutType, CustomExercise[] | null> = { A: null, B: null, C: null, D: null, E: null };

    for (const slot of slots) {
      const workout = draft.workouts.find((item) => item.type === slot);
      if (!workout) continue;
      next[slot] = toCustomExercises(slot, workout.exercises);
    }

    useCustomWorkoutStore.setState({
      activeSlots: slots,
      customWorkouts: next,
    });

    const after = useCustomWorkoutStore.getState();
    const applied = slots.every((slot) => Array.isArray(after.customWorkouts[slot]) && (after.customWorkouts[slot] || []).length >= 3);

    if (!applied) {
      throw new Error('Pós-condição falhou ao aplicar o treino.');
    }

    return { success: true, message: 'Treino aplicado com sucesso.' };
  } catch (error) {
    useCustomWorkoutStore.setState({
      activeSlots: prevSlots,
      customWorkouts: prevWorkouts,
    });
    return { success: false, message: error instanceof Error ? error.message : 'Falha ao aplicar treino.' };
  }
}

async function saveDraftInBackend(draft: WorkoutDraft): Promise<{ success: boolean; message: string; draftId?: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase indisponível.' };
  }

  const { data, error } = await supabase.rpc('save_workout_draft', {
    p_split: draft.split,
    p_workouts: draft.workouts,
    p_recommendation: draft.recommendation ?? null,
    p_draft_id: isUuid(draft.id) ? draft.id : null,
  });

  if (error) {
    return { success: false, message: error.message || 'Falha ao salvar draft no backend.' };
  }

  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const success = payload.success === true;
  if (!success) {
    return { success: false, message: readString(payload, 'error') || 'Backend rejeitou o draft do treino.' };
  }

  const draftId = readString(payload, 'draftId');
  if (!draftId) {
    return { success: false, message: 'Backend não retornou draftId.' };
  }

  return { success: true, message: 'Draft salvo no backend.', draftId };
}

async function replaceDraftInBackend(draftId: string): Promise<{ success: boolean; message: string; programId?: string; version?: number }> {
  if (!supabase) {
    return { success: false, message: 'Supabase indisponível.' };
  }

  const { data, error } = await supabase.rpc('replace_current_workout', {
    p_draft_id: draftId,
    p_idempotency_key: buildIdempotencyKey(draftId),
    p_expected_version: null,
  });

  if (error) {
    return { success: false, message: error.message || 'Falha ao substituir treino no backend.' };
  }

  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const success = payload.success === true;
  if (!success) {
    return { success: false, message: readString(payload, 'error') || 'Backend rejeitou a substituição do treino.' };
  }

  const programId = readString(payload, 'programId') || undefined;
  const version = readNumber(payload, 'version');
  return { success: true, message: 'Treino substituído no backend.', programId, version };
}

export async function syncActiveWorkoutFromBackend(): Promise<ApplyDraftResult> {
  const canUseBackend = await hasAuthenticatedSupabaseSession();
  if (!canUseBackend || !supabase) {
    return {
      success: false,
      message: 'Backend indisponível ou sem sessão autenticada.',
      persistence: 'local',
    };
  }

  const { data, error } = await supabase.rpc('get_active_workout_program');
  if (error) {
    return {
      success: false,
      message: error.message || 'Falha ao buscar treino ativo no backend.',
      persistence: 'backend',
    };
  }

  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (payload.success !== true) {
    return {
      success: false,
      message: readString(payload, 'error') || 'Nenhum treino ativo no backend.',
      persistence: 'backend',
    };
  }

  const split = payload.split;
  if (!isValidSplit(split)) {
    return {
      success: false,
      message: 'Split inválido retornado pelo backend.',
      persistence: 'backend',
    };
  }

  const workouts = parseWorkoutsFromUnknown(payload.workouts);
  const draft: WorkoutDraft = {
    id: readString(payload, 'programId') || `backend_program_${Date.now()}`,
    status: 'SAVED',
    split,
    workouts,
    recommendation: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const localSync = applyDraftLocally(draft);
  if (!localSync.success) {
    return {
      success: false,
      message: localSync.message,
      persistence: 'backend',
      draftId: draft.id,
    };
  }

  return {
    success: true,
    message: 'Treino ativo sincronizado do backend.',
    persistence: 'backend',
    draftId: draft.id,
    version: readNumber(payload, 'version'),
  };
}

export async function saveDraftForConfirmation(draft: WorkoutDraft): Promise<ApplyDraftResult> {
  const errors = validateDraft(draft);
  if (errors.length > 0) {
    return {
      success: false,
      message: errors[0],
      persistence: 'local',
    };
  }

  const canUseBackend = await hasAuthenticatedSupabaseSession();
  if (!canUseBackend) {
    return {
      success: true,
      message: 'Draft preparado localmente.',
      persistence: 'local',
      draftId: draft.id,
    };
  }

  const savedDraft = await saveDraftInBackend(draft);
  if (!savedDraft.success || !savedDraft.draftId) {
    return {
      success: false,
      message: savedDraft.message,
      persistence: 'backend',
    };
  }

  return {
    success: true,
    message: 'Draft preparado no backend.',
    persistence: 'backend',
    draftId: savedDraft.draftId,
  };
}

export async function applyDraftTransactionally(draft: WorkoutDraft): Promise<ApplyDraftResult> {
  const errors = validateDraft(draft);
  if (errors.length > 0) {
    return {
      success: false,
      message: errors[0],
      persistence: 'local',
    };
  }

  const canUseBackend = await hasAuthenticatedSupabaseSession();
  if (!canUseBackend) {
    const local = applyDraftLocally(draft);
    return {
      success: local.success,
      message: local.message,
      persistence: 'local',
      draftId: draft.id,
    };
  }

  const savedDraft = await saveDraftInBackend(draft);
  if (!savedDraft.success || !savedDraft.draftId) {
    return {
      success: false,
      message: savedDraft.message,
      persistence: 'backend',
    };
  }

  const replaced = await replaceDraftInBackend(savedDraft.draftId);
  if (!replaced.success) {
    return {
      success: false,
      message: replaced.message,
      persistence: 'backend',
      draftId: savedDraft.draftId,
    };
  }

  const localSync = applyDraftLocally({
    ...draft,
    id: savedDraft.draftId,
    updatedAt: Date.now(),
  });

  if (!localSync.success) {
    return {
      success: true,
      message: 'Treino salvo no backend. Atualize a tela de treinos para sincronizar.',
      persistence: 'backend',
      draftId: savedDraft.draftId,
      programId: replaced.programId,
      version: replaced.version,
    };
  }

  return {
    success: true,
    message: 'Treino aplicado com sucesso.',
    persistence: 'backend',
    draftId: savedDraft.draftId,
    programId: replaced.programId,
    version: replaced.version,
  };
}

export function createDraftFromSplitAndWorkouts(
  split: 'ABC' | 'ABCD' | 'ABCDE',
  workouts: ApplyWorkoutPlanAction['workouts'],
  recommendation?: string,
): WorkoutDraft {
  return {
    id: `draft_${Date.now()}`,
    status: 'AWAITING_CONFIRMATION',
    split,
    workouts,
    recommendation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
