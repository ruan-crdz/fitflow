import type { Profile, WeekDay } from '@/types';

type ShortcutAction = 'add_water' | 'start_workout' | 'log_weight';

const WEEKDAY_INDEX: Record<WeekDay, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toUtcDateTime(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function toLocalDateStamp(date: Date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function nextDateForWeekday(base: Date, weekDay: WeekDay) {
  const date = new Date(base);
  date.setHours(0, 0, 0, 0);
  const target = WEEKDAY_INDEX[weekDay];
  const diff = (target - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  return date;
}

export function buildShortcutUrl(action: ShortcutAction, params?: Record<string, string | number>) {
  const url = new URL(`${window.location.origin}${import.meta.env.BASE_URL}#/dashboard`);
  url.searchParams.set('ff_action', action);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url.toString();
}

export function buildTrainingCalendarIcs(profile: Profile, weeks = 8) {
  const days = (profile.trainingDays || []).slice(0, 5);
  if (!days.length) return null;

  const now = new Date();
  const dtStamp = toUtcDateTime(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FitFlow//Treinos//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  days.forEach((day, dayIndex) => {
    const first = nextDateForWeekday(now, day);
    for (let week = 0; week < weeks; week += 1) {
      const start = new Date(first);
      start.setDate(first.getDate() + week * 7);
      start.setHours(19, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (profile.sessionDurationMin || 60));

      const dateKey = toLocalDateStamp(start);
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:fitflow-${dayIndex}-${week}-${dateKey}@fitflow`);
      lines.push(`DTSTAMP:${dtStamp}`);
      lines.push(`DTSTART:${toUtcDateTime(start)}`);
      lines.push(`DTEND:${toUtcDateTime(end)}`);
      lines.push('SUMMARY:Treino FitFlow');
      lines.push(`DESCRIPTION:Treino programado no FitFlow para ${profile.name}.`);
      lines.push('END:VEVENT');
    }
  });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
