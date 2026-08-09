import { useHistoryStore } from '@/stores/useHistoryStore';

export function StreakHeatmap() {
  const sessions = useHistoryStore((s) => s.sessions);
  const trainedDates = new Set(sessions.filter((s) => s.completedAt).map((s) => s.date));

  // Last 12 weeks (84 days)
  const today = new Date();
  const days: { date: string; trained: boolean; dayOfWeek: number }[] = [];

  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, trained: trainedDates.has(dateStr), dayOfWeek: d.getDay() });
  }

  // Group by week
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

  const totalThisMonth = [...trainedDates].filter((d) => d.startsWith(today.toISOString().slice(0, 7))).length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white/80">Consistência</h2>
        <span className="text-xs text-white/40">{totalThisMonth} treinos este mês</span>
      </div>
      <div className="flex gap-[3px] justify-center">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={day.date}
                className={`w-[10px] h-[10px] rounded-[2px] ${
                  day.trained
                    ? 'bg-primary-500'
                    : 'bg-white/5'
                }`}
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
