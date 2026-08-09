import type { WeekDay, WorkoutType } from '@/types';

const WEEKDAY_MAP: Record<number, WeekDay> = {
  0: 'dom',
  1: 'seg',
  2: 'ter',
  3: 'qua',
  4: 'qui',
  5: 'sex',
  6: 'sab',
};

const WEEKDAY_LABELS: Record<WeekDay, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
};

export function getTodayWeekDay(): WeekDay {
  return WEEKDAY_MAP[new Date().getDay()];
}

export function getWeekDayLabel(day: WeekDay): string {
  return WEEKDAY_LABELS[day];
}

export function isTrainingDay(trainingDays: WeekDay[]): boolean {
  return trainingDays.includes(getTodayWeekDay());
}

export function getTodayWorkoutType(trainingDays: WeekDay[]): WorkoutType | null {
  const today = getTodayWeekDay();
  const index = trainingDays.indexOf(today);
  if (index === -1) return null;

  const types: WorkoutType[] = ['A', 'B', 'C', 'D', 'E'];
  return types[index % types.length];
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }
  return `${minutes}min ${seconds.toString().padStart(2, '0')}s`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}
