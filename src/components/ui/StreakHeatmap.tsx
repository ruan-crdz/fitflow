import { useHistoryStore } from '@/stores/useHistoryStore';
import { getToday, toLocalDateKey } from '@/utils/date';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export function StreakHeatmap({ onHistory }: { onHistory?: () => void }) {
  const sessions = useHistoryStore((s) => s.sessions);
  const trainedDates = new Set(sessions.filter((s) => s.completedAt).map((s) => s.date));

  const today = new Date();
  const currentMonth = getToday().slice(0, 7);
  const days: { date: string; trained: boolean; dayOfWeek: number }[] = [];

  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateKey(d);
    days.push({ date: dateStr, trained: trainedDates.has(dateStr), dayOfWeek: d.getDay() });
  }

  const weeks: typeof days[] = [];
  let currentWeek: typeof days = [];
  for (const day of days) {
    currentWeek.push(day);
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) weeks.push(currentWeek);

  const totalThisMonth = [...trainedDates].filter((d) => d.startsWith(currentMonth)).length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white/80 flex items-center gap-2">
          <MaterialIcon name="event_available" className="text-primary-300" />
          Consistência
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{totalThisMonth} treinos este mês</span>
          {onHistory && (
            <button onClick={onHistory} className="w-8 h-8 rounded-full bg-white/5 text-white/45 flex items-center justify-center" aria-label="Histórico de consistência">
              <MaterialIcon name="history" className="text-base" />
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-[3px] justify-center">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={day.date}
                className={`w-[10px] h-[10px] rounded-[2px] ${day.trained ? 'bg-primary-500' : 'bg-white/5'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/30">
        <span>12 semanas atrás</span>
        <span>Hoje</span>
      </div>
    </div>
  );
}
