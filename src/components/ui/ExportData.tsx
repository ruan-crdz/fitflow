import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { useNotesStore } from '@/stores/useNotesStore';
import { WORKOUT_MAP } from '@/constants/workouts';
import { formatDuration, getToday } from '@/utils/date';
import { downloadBackup } from '@/utils/backup';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export function ExportData() {
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);
  const notes = useNotesStore((s) => s.notes);

  const exportCSV = () => {
    const completedSessions = sessions.filter((s) => s.completedAt);
    const lines = ['Data,Treino,Foco,Duração,Avaliação'];

    completedSessions.forEach((s) => {
      const workout = s.workoutType ? WORKOUT_MAP[s.workoutType] : null;
      const title = workout?.label || s.activityName || 'Atividade avulsa';
      const focus = workout?.focus || [s.activityLocation, s.activityIntensity].filter(Boolean).join(' ');
      lines.push(
        `${s.date},${title},${focus},${formatDuration(s.durationMs || 0)},${s.rating || '-'}`,
      );
    });

    lines.push('', '', 'HISTÓRICO DE PESO', 'Data,Peso (kg)');
    weightEntries.forEach((e) => lines.push(`${e.date},${e.weight}`));

    const notesEntries = Object.entries(notes).filter(([, v]) => v);
    if (notesEntries.length > 0) {
      const allExercises = Object.values(WORKOUT_MAP).flatMap((w) => w.exercises);
      lines.push('', '', 'ANOTAÇÕES', 'Exercício,Nota');
      notesEntries.forEach(([id, note]) => {
        const ex = allExercises.find((e) => e.id === id);
        lines.push(`${ex?.name || id},${note}`);
      });
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gympilot-relatório-${getToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <button onClick={downloadBackup} className="card flex items-center gap-3 w-full text-left border-primary-500/20">
        <MaterialIcon name="star" className="text-primary-300" />
        <div>
          <p className="font-medium text-sm">Baixar backup completo</p>
          <p className="text-[10px] text-white/30">Salva perfil, treinos, histórico, alimentos, água e progresso</p>
        </div>
      </button>

      <button onClick={exportCSV} className="card flex items-center gap-3 w-full text-left">
        <MaterialIcon name="star" className="text-primary-300" />
        <div>
          <p className="font-medium text-sm">Exportar relatório CSV</p>
          <p className="text-[10px] text-white/30">Baixar treinos, peso e anotações para planilha</p>
        </div>
      </button>
    </div>
  );
}
