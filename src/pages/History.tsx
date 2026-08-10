import { useState } from 'react';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useToastStore } from '@/stores/useToastStore';
import { formatDuration, formatDate, getToday } from '@/utils/date';
import { WORKOUT_MAP } from '@/constants/workouts';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityIntensity, ActivityLocation, WorkoutSession } from '@/types';

const ACTIVITY_PRESETS = ['Caminhada', 'Esteira', 'Bike', 'Treino em casa', 'Livre'];

const LOCATION_LABELS: Record<ActivityLocation, string> = {
  academia: 'Academia',
  casa: 'Casa',
  rua: 'Rua',
  outro: 'Outro',
};

const INTENSITY_LABELS: Record<ActivityIntensity, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  forte: 'Forte',
};

function isFreeSession(session: WorkoutSession) {
  return session.kind === 'free' || !session.workoutType;
}

function getSessionTitle(session: WorkoutSession) {
  if (isFreeSession(session)) return session.activityName || 'Atividade avulsa';
  return WORKOUT_MAP[session.workoutType!]?.label || `Treino ${session.workoutType}`;
}

function getSessionSubtitle(session: WorkoutSession) {
  if (isFreeSession(session)) {
    const location = session.activityLocation ? LOCATION_LABELS[session.activityLocation] : 'Livre';
    const intensity = session.activityIntensity ? INTENSITY_LABELS[session.activityIntensity] : 'Personalizada';
    return `${location} • ${intensity}`;
  }
  return WORKOUT_MAP[session.workoutType!]?.focus || 'Treino personalizado';
}

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
  const free = isFreeSession(session);
  const workout = session.workoutType ? WORKOUT_MAP[session.workoutType] : null;
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
            <span className="font-bold text-primary-400">{free ? '✓' : session.workoutType}</span>
          </div>
          <div>
            <p className="font-semibold text-sm">{getSessionTitle(session)}</p>
            <p className="text-white/30 text-xs">{formatDate(session.date)} • {getSessionSubtitle(session)}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/30 text-sm">×</button>
      </div>
      <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-white/5">
        <div className="text-center">
          <p className="text-sm font-bold">{formatDuration(session.durationMs || 0)}</p>
          <p className="text-[10px] text-white/30">Duração</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">{free ? INTENSITY_LABELS[session.activityIntensity || 'moderada'] : completedExercises.length}</p>
          <p className="text-[10px] text-white/30">{free ? 'Intensidade' : 'Exercícios'}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">{session.rating ? '★'.repeat(session.rating) : free ? LOCATION_LABELS[session.activityLocation || 'outro'] : '-'}</p>
          <p className="text-[10px] text-white/30">{free ? 'Local' : 'Avaliação'}</p>
        </div>
      </div>
      {free ? (
        <div className="rounded-xl bg-white/5 p-3 text-xs text-white/50">
          {session.notes || 'Atividade avulsa registrada no histórico.'}
        </div>
      ) : (
        <div className="space-y-1">
          {workout?.exercises.map((ex) => {
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
      )}
    </motion.div>
  );
}

function FreeActivityModal({ onClose }: { onClose: () => void }) {
  const addFreeSession = useHistoryStore((s) => s.addFreeSession);
  const toast = useToastStore((s) => s.show);
  const [activityName, setActivityName] = useState('Caminhada');
  const [location, setLocation] = useState<ActivityLocation>('rua');
  const [intensity, setIntensity] = useState<ActivityIntensity>('moderada');
  const [date, setDate] = useState(getToday());
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');

  const durationMinutes = Number(duration);
  const canSave = activityName.trim().length > 0 && Number.isFinite(durationMinutes) && durationMinutes > 0;

  const save = () => {
    if (!canSave) return;
    addFreeSession({
      activityName,
      activityLocation: location,
      activityIntensity: intensity,
      date,
      durationMinutes,
      notes,
    });
    toast('Atividade registrada!', 'success');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end px-4 pb-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        className="w-full max-w-md mx-auto rounded-3xl border border-white/10 bg-background p-4 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Atividade avulsa</h2>
            <p className="text-xs text-white/40">Conta para sua consistência mesmo fora do treino da academia.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 text-white/40">×</button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50">O que você fez?</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ACTIVITY_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setActivityName(preset)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  activityName === preset
                    ? 'bg-primary-500 text-black border-primary-400'
                    : 'bg-white/5 text-white/60 border-white/10'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-400"
            placeholder="Nome da atividade"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-white/50">Minutos</span>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-400"
              placeholder="30"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-white/50">Data</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-primary-400"
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50">Local</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(LOCATION_LABELS) as ActivityLocation[]).map((item) => (
              <button
                key={item}
                onClick={() => setLocation(item)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  location === item ? 'bg-primary-500 text-black border-primary-400' : 'bg-white/5 text-white/60 border-white/10'
                }`}
              >
                {LOCATION_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50">Intensidade</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(INTENSITY_LABELS) as ActivityIntensity[]).map((item) => (
              <button
                key={item}
                onClick={() => setIntensity(item)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  intensity === item ? 'bg-primary-500 text-black border-primary-400' : 'bg-white/5 text-white/60 border-white/10'
                }`}
              >
                {INTENSITY_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none resize-none focus:border-primary-400"
          placeholder="Observação opcional"
        />

        <button
          onClick={save}
          disabled={!canSave}
          className="w-full py-3 rounded-xl bg-primary-500 text-black font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Registrar atividade
        </button>
      </motion.div>
    </motion.div>
  );
}

export function History() {
  const sessions = useHistoryStore((s) => s.sessions);
  const completedSessions = sessions.filter((s) => s.completedAt);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFreeActivity, setShowFreeActivity] = useState(false);

  const selectedSessions = selectedDate
    ? completedSessions.filter((s) => s.date === selectedDate)
    : [];

  return (
    <div className="px-5 pt-12 pb-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Histórico</h1>
        <button
          onClick={() => setShowFreeActivity(true)}
          className="px-3 py-2 rounded-xl bg-primary-500 text-black text-xs font-bold"
        >
          + Atividade
        </button>
      </div>

      <CalendarHeatmap sessions={completedSessions} onSelectDate={setSelectedDate} />

      <AnimatePresence>
        {selectedDate && selectedSessions.length > 0 && (
          <div className="space-y-3">
            {selectedSessions.map((session) => (
              <SessionDetail key={session.id} session={session} onClose={() => setSelectedDate(null)} />
            ))}
          </div>
        )}
      </AnimatePresence>

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
              <motion.button
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedDate(session.date)}
                className="card flex items-center gap-4 py-3 w-full text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-400">{isFreeSession(session) ? '✓' : session.workoutType}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{getSessionTitle(session)}</p>
                  <p className="text-white/30 text-xs">
                    {formatDate(session.date)} • {formatDuration(session.durationMs || 0)} • {getSessionSubtitle(session)}
                  </p>
                </div>
                {session.rating && (
                  <span className="text-xs">{'★'.repeat(session.rating)}</span>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showFreeActivity && <FreeActivityModal onClose={() => setShowFreeActivity(false)} />}
      </AnimatePresence>
    </div>
  );
}
