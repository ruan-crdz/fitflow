import type { WorkoutType } from '@/types';

type PlanExercise = {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  muscleGroup: string;
};

type PlanWorkout = {
  type?: string;
  focus?: string;
  exercises?: PlanExercise[];
};

type PlanCandidate = {
  workouts?: PlanWorkout[];
};

const VALID_TYPES: WorkoutType[] = ['A', 'B', 'C', 'D', 'E'];
const MIN_EXERCISES_PER_WORKOUT = 5;
const MAX_EXERCISES_PER_WORKOUT = 10;
const MIN_EXERCISES_PER_FOCUSED_GROUP = 2;

function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function mapToCanonicalGroup(value: string): string | null {
  const normalized = normalizeText(value);
  if (!normalized.trim()) return null;
  if (normalized.includes('peito') || normalized.includes('peitoral')) return 'Peitoral';
  if (normalized.includes('costa') || normalized.includes('dorsal')) return 'Costas';
  if (normalized.includes('biceps') || normalized.includes('antebraco')) return 'Bíceps';
  if (normalized.includes('triceps')) return 'Tríceps';
  if (normalized.includes('ombro') || normalized.includes('deltoide')) return 'Ombros';
  if (normalized.includes('quadriceps') || normalized.includes('coxa anterior')) return 'Quadríceps';
  if (normalized.includes('posterior') || normalized.includes('isquiotib')) return 'Posterior de Coxa';
  if (normalized.includes('gluteo')) return 'Glúteos';
  if (normalized.includes('panturr')) return 'Panturrilhas';
  if (normalized.includes('abdomen') || normalized.includes('core')) return 'Abdômen';
  return null;
}

function extractFocusGroups(focus?: string): string[] {
  if (!focus) return [];
  const normalized = normalizeText(focus);

  const map: Array<{ keys: string[]; group: string }> = [
    { keys: ['peito', 'peitoral'], group: 'Peitoral' },
    { keys: ['costa', 'costas', 'dorsal'], group: 'Costas' },
    { keys: ['biceps', 'antebraco'], group: 'Bíceps' },
    { keys: ['triceps'], group: 'Tríceps' },
    { keys: ['ombro', 'deltoide'], group: 'Ombros' },
    { keys: ['quadriceps', 'coxa anterior'], group: 'Quadríceps' },
    { keys: ['posterior', 'isquiotib'], group: 'Posterior de Coxa' },
    { keys: ['gluteo'], group: 'Glúteos' },
    { keys: ['panturrilha', 'gemeos'], group: 'Panturrilhas' },
    { keys: ['abdomen', 'core'], group: 'Abdômen' },
  ];

  const groups = map
    .filter((item) => item.keys.some((key) => normalized.includes(key)))
    .map((item) => item.group);

  return Array.from(new Set(groups));
}

export function validateGeneratedPlan(plan: PlanCandidate, trainingDaysPerWeek: number): string[] {
  const errors: string[] = [];
  const workouts = plan.workouts || [];

  if (workouts.length < 2 || workouts.length > 5) {
    errors.push('Plano inválido: número de treinos distintos deve estar entre 2 e 5.');
  }

  const days = Math.max(1, Math.min(7, trainingDaysPerWeek));
  const split = Math.max(1, workouts.length);
  const baseAppearances = Math.floor(days / split);
  const extraAppearances = days % split;
  const weeklySetsByMuscle = new Map<string, number>();

  workouts.forEach((workout, wi) => {
    const exercises = workout.exercises || [];
    if (exercises.length < MIN_EXERCISES_PER_WORKOUT || exercises.length > MAX_EXERCISES_PER_WORKOUT) {
      errors.push(`Plano inválido: treino ${wi + 1} deve ter entre ${MIN_EXERCISES_PER_WORKOUT} e ${MAX_EXERCISES_PER_WORKOUT} exercícios.`);
    }

    let workoutSetSum = 0;
    const groupedExerciseCount = new Map<string, number>();
    exercises.forEach((exercise, ei) => {
      if (!exercise.name?.trim()) errors.push(`Plano inválido: exercício ${ei + 1} do treino ${wi + 1} sem nome.`);
      if (!exercise.muscleGroup?.trim()) errors.push(`Plano inválido: exercício ${exercise.name || ei + 1} sem grupo muscular.`);
      if (!Number.isFinite(exercise.sets) || exercise.sets < 1 || exercise.sets > 8) {
        errors.push(`Plano inválido: ${exercise.name || `exercício ${ei + 1}`} com séries fora do limite (1-8).`);
      }
      if (!Number.isFinite(exercise.repsMin) || !Number.isFinite(exercise.repsMax) || exercise.repsMin < 1 || exercise.repsMax < exercise.repsMin) {
        errors.push(`Plano inválido: ${exercise.name || `exercício ${ei + 1}`} com faixa de repetições inválida.`);
      }

      workoutSetSum += exercise.sets || 0;
      if (exercise.muscleGroup) {
        const appearances = baseAppearances + (wi < extraAppearances ? 1 : 0);
        const prev = weeklySetsByMuscle.get(exercise.muscleGroup) || 0;
        weeklySetsByMuscle.set(exercise.muscleGroup, prev + (exercise.sets || 0) * appearances);

        const canonical = mapToCanonicalGroup(exercise.muscleGroup);
        if (canonical) {
          groupedExerciseCount.set(canonical, (groupedExerciseCount.get(canonical) || 0) + 1);
        }
      }
    });

    const focusGroups = extractFocusGroups(workout.focus);
    if (focusGroups.length > 0 && focusGroups.length <= 3) {
      focusGroups.forEach((group) => {
        const count = groupedExerciseCount.get(group) || 0;
        if (count < MIN_EXERCISES_PER_FOCUSED_GROUP) {
          errors.push(
            `Plano inválido: treino ${wi + 1} com foco em ${group} precisa ter no mínimo ${MIN_EXERCISES_PER_FOCUSED_GROUP} exercícios desse grupamento muscular.`,
          );
        }
      });
    }

    if (workoutSetSum < 8 || workoutSetSum > 40) {
      errors.push(`Plano inválido: treino ${wi + 1} com volume total fora do limite (8-40 séries).`);
    }
  });

  for (const [muscle, sets] of weeklySetsByMuscle.entries()) {
    if (sets > 28) errors.push(`Plano inválido: volume semanal muito alto para ${muscle} (${sets} séries).`);
  }

  return errors;
}

type ReevalPayload = {
  removeDays?: string[];
  exercises?: Record<string, Array<{ name: string; sets: number; repsMin: number; repsMax: number; muscleGroup: string }>>;
};

export function validateReevalPayload(payload: ReevalPayload): string[] {
  const errors: string[] = [];

  if (payload.removeDays) {
    for (const day of payload.removeDays) {
      if (!VALID_TYPES.includes(day as WorkoutType)) {
        errors.push(`removeDays inválido: ${day}`);
      }
    }
  }

  if (payload.exercises) {
    for (const [day, exercises] of Object.entries(payload.exercises)) {
      if (!VALID_TYPES.includes(day as WorkoutType)) {
        errors.push(`Dia inválido em exercises: ${day}`);
        continue;
      }
      if (!Array.isArray(exercises) || exercises.length === 0) {
        errors.push(`Dia ${day} sem exercícios válidos.`);
        continue;
      }
      for (const exercise of exercises) {
        if (!exercise.name?.trim()) errors.push(`Exercício sem nome em ${day}.`);
        if (!exercise.muscleGroup?.trim()) errors.push(`Exercício ${exercise.name || '(sem nome)'} sem muscleGroup em ${day}.`);
        if (!Number.isFinite(exercise.sets) || exercise.sets < 1 || exercise.sets > 8) errors.push(`Séries inválidas para ${exercise.name || '(sem nome)'} em ${day}.`);
        if (!Number.isFinite(exercise.repsMin) || !Number.isFinite(exercise.repsMax) || exercise.repsMin < 1 || exercise.repsMax < exercise.repsMin) {
          errors.push(`Faixa de reps inválida para ${exercise.name || '(sem nome)'} em ${day}.`);
        }
      }
    }
  }

  return errors;
}
