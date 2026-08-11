import { useNotesStore } from '@/stores/useNotesStore';
import { WORKOUT_MAP } from '@/constants/workouts';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export function LoadProgression({ onHistory }: { onHistory?: () => void }) {
  const notes = useNotesStore((s) => s.notes);

  const allExercises = Object.values(WORKOUT_MAP).flatMap((w) => w.exercises);
  const exercisesWithNotes = allExercises.filter((ex) => notes[ex.id]);

  const extractLoad = (note: string): string | null => {
    const match = note.match(/(\d+[\.,]?\d*)\s*(kg|KG|Kg)?/);
    return match ? match[0] : null;
  };

  if (exercisesWithNotes.length === 0) {
    return (
      <div className="card space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-white/80 flex items-center gap-2">
          <MaterialIcon name="trending_up" className="text-primary-300" />
          Progressão de carga
        </h2>
          {onHistory && (
            <button onClick={onHistory} className="w-8 h-8 rounded-full bg-white/5 text-white/45 flex items-center justify-center" aria-label="Histórico de progressão de carga">
              <MaterialIcon name="history" className="text-base" />
            </button>
          )}
        </div>
        <p className="text-xs text-white/30">Anote suas cargas durante o treino para ver a progressão aqui.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white/80 flex items-center gap-2">
          <MaterialIcon name="trending_up" className="text-primary-300" />
          Progressão de carga
        </h2>
        {onHistory && (
          <button onClick={onHistory} className="w-8 h-8 rounded-full bg-white/5 text-white/45 flex items-center justify-center" aria-label="Histórico de progressão de carga">
            <MaterialIcon name="history" className="text-base" />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {exercisesWithNotes.slice(0, 6).map((ex) => {
          const load = extractLoad(notes[ex.id] || '');
          return (
            <div key={ex.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
              <span className="text-xs text-white/60 truncate flex-1">{ex.name}</span>
              <span className="text-xs font-bold text-primary-300 ml-2">
                {load || notes[ex.id]?.slice(0, 15)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/20">Baseado nas suas anotações durante os treinos</p>
    </div>
  );
}
