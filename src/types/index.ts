export type WeekDay = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export type WorkoutType = 'A' | 'B' | 'C';

export type Goal = 'lose' | 'maintain' | 'gain';

export interface Profile {
  name: string;
  age: number;
  weight: number;
  height: number;
  goal: Goal;
  trainingDays: WeekDay[];
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
