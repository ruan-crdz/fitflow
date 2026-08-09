import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { useNotesStore } from '@/stores/useNotesStore';
import { WORKOUT_MAP } from '@/constants/workouts';
import { formatDuration } from '@/utils/date';

export function ExportData() {
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);
  const notes = useNotesStore((s) => s.notes);

  const exportCSV = () => {
    const completedSessions = sessions.filter((s) => s.completedAt);
    const lines = ['Data,Treino,Foco,Duração,Avaliação'];

    completedSessions.forEach((s) => {
      const workout = WORKOUT_MAP[s.workoutType];
      lines.push(
        `${s.date},${workout.label},${workout.focus},${formatDuration(s.durationMs || 0)},${s.rating || '-'}`
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
    a.download = `fitflow-dados-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={exportCSV} className="card flex items-center gap-3 w-full text-left">
      <span className="text-2xl">📥</span>
      <div>
        <p className="font-medium text-sm">Exportar dados</p>
        <p className="text-[10px] text-white/30">Baixar treinos, peso e anotações (CSV)</p>
      </div>
    </button>
  );
}
