export type WeekDay = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export type WorkoutType = 'A' | 'B' | 'C' | 'D' | 'E';

export type Goal = 'lose' | 'maintain' | 'gain';

export type BiologicalSex = 'male' | 'female';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type TrainingFocus = 'upper' | 'lower' | 'balanced' | 'custom';

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
}

export interface Workout {
  type: WorkoutType;
  label: string;
  focus: string;
  exercises: Exercise[];
}

export interface WorkoutSession {
  id: string;
  workoutType: WorkoutType;
  date: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  rating?: number;
  exercisesCompleted: Record<string, number>;
}

export interface ActiveSession {
  workoutType: WorkoutType;
  startedAt: number;
  currentExerciseIndex: number;
  setsCompleted: Record<string, number>;
}
