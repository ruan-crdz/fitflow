import { useState } from 'react';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { formatDuration, formatDate } from '@/utils/date';
import { WORKOUT_MAP } from '@/constants/workouts';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkoutSession } from '@/types';

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

function CalendarHeatmap({ sessions, onSelectDate }: { sessions: WorkoutSession[]; onSelectDate: (date: string) => void }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const { firstDay, daysInMonth } = getMonthDays(year, month);

  const trainedDates = new Set(sessions.filter((s) => s.completedAt).map((s) => s.date));
  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonthOffset((o) => o - 1)} className="text-white/40 px-2 py-1">←</button>
        <span className="text-sm font-medium capitalize">{monthName}</span>
        <button onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))} disabled={monthOffset >= 0} className="text-white/40 px-2 py-1 disabled:opacity-20">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[10px] text-white/30 font-medium">{d}</span>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const trained = trainedDates.has(dateStr);
          const isToday = dateStr === now.toISOString().slice(0, 10);
          return (
            <button
              key={day}
              onClick={() => trained && onSelectDate(dateStr)}
              className={`w-8 h-8 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                trained
                  ? 'bg-primary-500 text-white'
                  : isToday
                  ? 'bg-white/10 text-white'
                  : 'text-white/30'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-3 pt-1">
        <span className="flex items-center gap-1 text-[10px] text-white/30">
          <span className="w-3 h-3 rounded bg-primary-500" /> Treinou
        </span>
        <span className="flex items-center gap-1 text-[10px] text-white/30">
          <span className="w-3 h-3 rounded bg-white/10" /> Hoje
        </span>
      </div>
    </div>
  );
}

function SessionDetail({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const workout = WORKOUT_MAP[session.workoutType];
  const completedExercises = Object.entries(session.exercisesCompleted);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="card space-y-3 border-primary-500/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <span className="font-bold text-primary-400">{session.workoutType}</span>
          </div>
          <div>
            <p className="font-semibold text-sm">{workout.label}</p>
            <p className="text-white/30 text-xs">{formatDate(session.date)}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/30 text-sm">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-white/5">
        <div className="text-center">
          <p className="text-sm font-bold">{formatDuration(session.durationMs || 0)}</p>
          <p className="text-[10px] text-white/30">Duração</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">{completedExercises.length}</p>
          <p className="text-[10px] text-white/30">Exercícios</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">{session.rating ? '⭐'.repeat(session.rating) : '—'}</p>
          <p className="text-[10px] text-white/30">Avaliação</p>
        </div>
      </div>
      <div className="space-y-1">
        {workout.exercises.map((ex) => {
          const sets = session.exercisesCompleted[ex.id] || 0;
          return (
            <div key={ex.id} className="flex items-center justify-between text-xs py-1">
              <span className="text-white/60">{ex.name}</span>
              <span className={sets >= ex.sets ? 'text-green-400' : 'text-white/30'}>
                {sets}/{ex.sets} séries
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function History() {
  const sessions = useHistoryStore((s) => s.sessions);
  const completedSessions = sessions.filter((s) => s.completedAt);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedSessions = selectedDate
    ? completedSessions.filter((s) => s.date === selectedDate)
    : [];

  return (
    <div className="px-5 pt-12 pb-6 space-y-5">
      <h1 className="text-2xl font-bold">Histórico 📊</h1>

      <CalendarHeatmap sessions={completedSessions} onSelectDate={setSelectedDate} />

      {/* Selected date detail */}
      <AnimatePresence>
        {selectedDate && selectedSessions.length > 0 && (
          <div className="space-y-3">
            {selectedSessions.map((session) => (
              <SessionDetail key={session.id} session={session} onClose={() => setSelectedDate(null)} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-primary-400">{completedSessions.length}</p>
          <p className="text-xs text-white/40">Total de treinos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-400">
            {completedSessions.length > 0
              ? Math.round(completedSessions.reduce((a, s) => a + (s.durationMs || 0), 0) / completedSessions.length / 60000)
              : 0}min
          </p>
          <p className="text-xs text-white/40">Duração média</p>
        </div>
      </div>

      {/* Recent list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-white/50">Recentes</h2>
        {completedSessions.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl">📋</span>
            <p className="text-white/40 mt-4">Nenhum treino registrado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedSessions.slice(0, 10).map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card flex items-center gap-4 py-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-400">{session.workoutType}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{WORKOUT_MAP[session.workoutType].label}</p>
                  <p className="text-white/30 text-xs">
                    {formatDate(session.date)} • {formatDuration(session.durationMs || 0)}
                  </p>
                </div>
                {session.rating && (
                  <span className="text-xs">{'⭐'.repeat(session.rating)}</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
