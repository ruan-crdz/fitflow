export type WeekDay = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export type WorkoutType = 'A' | 'B' | 'C' | 'D' | 'E';

export type WorkoutSessionKind = 'structured' | 'free';

export type ActivityLocation = 'academia' | 'casa' | 'rua' | 'outro';

export type ActivityIntensity = 'leve' | 'moderada' | 'forte';

export type Goal = 'lose' | 'maintain' | 'gain';

export type BiologicalSex = 'male' | 'female';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type TrainingFocus = 'upper' | 'lower' | 'balanced' | 'custom';

export type TrainingLocation = 'academia' | 'casa' | 'hibrido';

export interface CustomSplit {
  [key: string]: string; // e.g. "A": "Peito e Tríceps", "B": "Costas e Bíceps"
}

export interface Profile {
  name: string;
  age: number;
  weight: number;
  height: number;
  goal: Goal;
  trainingDays: WeekDay[];
  sex?: BiologicalSex;
  experienceLevel?: ExperienceLevel;
  trainingFocus?: TrainingFocus;
  customSplit?: CustomSplit;
  sessionDurationMin?: number;
  trainingLocation?: TrainingLocation;
  equipmentAccess?: string[];
  trainingAgeMonths?: number;
  preferredExercises?: string[];
  dislikedExercises?: string[];
  limitations?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  muscleGroup: string;
  info: string;
  source: string;
  image?: string;
  setRows?: { reps: number }[];
  cardioBlocks?: { minutes: number; intensity: string }[];
}

export interface Workout {
  type: WorkoutType;
  label: string;
  focus: string;
  exercises: Exercise[];
}

export interface WorkoutSession {
  id: string;
  kind?: WorkoutSessionKind;
  workoutType?: WorkoutType;
  activityName?: string;
  activityLocation?: ActivityLocation;
  activityIntensity?: ActivityIntensity;
  activityDistanceKm?: number;
  notes?: string;
  date: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  rating?: number;
  recovery?: {
    energy: number;
    soreness: number;
    stress: number;
    sleepHours: number;
  };
  exercisesCompleted: Record<string, number>;
}

export interface ActiveSession {
  workoutType: WorkoutType;
  startedAt: number;
  currentExerciseIndex: number;
  setsCompleted: Record<string, number>;
  exerciseStates: Record<string, 'pending' | 'in_progress' | 'completed' | 'skipped_temporarily'>;
}
