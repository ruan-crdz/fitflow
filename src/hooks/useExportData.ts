import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { WORKOUT_MAP } from '@/constants/workouts';
import { formatDuration, getToday } from '@/utils/date';

export function useExportData() {
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);

  const exportCSV = () => {
    const completedSessions = sessions.filter((s) => s.completedAt);

    let csv = 'Data,Treino,Foco,Duração,Avaliação\n';
    completedSessions.forEach((s) => {
      const workout = s.workoutType ? WORKOUT_MAP[s.workoutType] : null;
      const title = workout?.label || s.activityName || 'Atividade avulsa';
      const focus = workout?.focus || [s.activityLocation, s.activityIntensity].filter(Boolean).join(' ');
      csv += `${s.date},${title},${focus},${formatDuration(s.durationMs || 0)},${s.rating || '-'}\n`;
    });

    csv += '\n\nHistórico de Peso\nData,Peso (kg)\n';
    weightEntries.forEach((e) => {
      csv += `${e.date},${e.weight}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gympilot-dados-${getToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { exportCSV };
}
