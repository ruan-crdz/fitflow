import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { MotivationalQuote } from '@/components/ui/MotivationalQuote';
import { WeightChart } from '@/components/ui/WeightChart';
import { WeightPrompt } from '@/components/ui/WeightPrompt';
import { AIDashInsight } from '@/components/ui/AIDashInsight';
import { AIWeeklyReport } from '@/components/ui/AIWeeklyReport';
import { StreakHeatmap } from '@/components/ui/StreakHeatmap';
import { LoadProgression } from '@/components/ui/LoadProgression';
import { calculateTDEE, calculateMacros, calculateBMI, bmiCategory } from '@/utils/calories';
import { calculateWaterIntake } from '@/utils/water';
import { getTodayWorkoutType, isTrainingDay, getToday } from '@/utils/date';
import { useTrainingReminder } from '@/hooks/useTrainingReminder';
import { WORKOUT_MAP } from '@/constants/workouts';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useFoodStore } from '@/stores/useFoodStore';
import { DASHBOARD_WIDGET_LABELS, DEFAULT_DASHBOARD_WIDGETS, useDashboardStore } from '@/stores/useDashboardStore';
import { useHealthIntegrationStore } from '@/stores/useHealthIntegrationStore';
import type { WorkoutType } from '@/types';

export function Dashboard() {
  useTrainingReminder();
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.profile)!;
  const activeSession = useSessionStore((s) => s.activeSession);
  const startSession = useSessionStore((s) => s.startSession);
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);
  const hasTodayWeight = useWeightStore((s) => s.hasTodayEntry());
  const waterGlasses = useWaterStore((s) => s.getToday());
  const addGlass = useWaterStore((s) => s.addGlass);
  const removeGlass = useWaterStore((s) => s.removeGlass);
  const foodLogs = useFoodStore((s) => s.logs);
  const healthDaily = useHealthIntegrationStore((s) => s.daily);
  const activeSlots = useCustomWorkoutStore((s) => s.activeSlots);
  const widgets = useDashboardStore((s) => s.widgets);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const resetWidgets = useDashboardStore((s) => s.resetWidgets);
  const [showWeightPrompt, setShowWeightPrompt] = useState(!hasTodayWeight);
  const [showConfetti, setShowConfetti] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(false);

  const today = getToday();
  const todayFoodEntries = foodLogs[today] || [];
  const totals = todayFoodEntries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const healthSummary = healthDaily[today] || {
    date: today,
    steps: 0,
    activeCalories: 0,
    source: 'none' as const,
    syncedAt: 0,
  };
  const totalWorkouts = sessions.filter((s) => s.completedAt).length;
  const todayCompleted = sessions.filter((s) => s.date === today && s.completedAt);
  const todayAlreadyDone = todayCompleted.length > 0;

  const uniqueWeeks = [...new Set(sessions.filter((s) => s.completedAt).map((s) => s.date))].sort().reverse();
  let streak = 0;
  if (uniqueWeeks.length > 0) {
    streak = 1;
    for (let i = 1; i < uniqueWeeks.length; i++) {
      const prev = new Date(uniqueWeeks[i - 1]).getTime();
      const curr = new Date(uniqueWeeks[i]).getTime();
      if ((prev - curr) / (1000 * 60 * 60 * 24) <= 7) streak++;
      else break;
    }
  }

  const todayWorkout = getTodayWorkoutType(profile.trainingDays);
  const isTodayTraining = isTrainingDay(profile.trainingDays);

  const calories = calculateTDEE(profile);
  const macros = calculateMacros(calories, profile.goal);
  const bmi = calculateBMI(profile.weight, profile.height);
  const water = calculateWaterIntake(profile.weight);
  const burned = healthSummary.activeCalories;
  const remaining = calories - (totals.calories - burned);
  const progressCalories = Math.min(totals.calories / calories, 1);
  const isWidgetVisible = (widget: typeof DEFAULT_DASHBOARD_WIDGETS[number]) => widgets.includes(widget);

  const handleStartWorkout = (type: WorkoutType) => {
    startSession(type);
    navigate('/workout');
  };

  const handleResumeWorkout = () => {
    navigate('/workout');
  };

  return (
    <div className="px-5 pt-14 pb-6 space-y-5">
      {/* Header - cleaner, bigger touch target */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-xs font-medium tracking-wide uppercase">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          <h1 className="text-[26px] font-bold mt-0.5 leading-tight">{profile.name} {profile.sex === 'male' ? '💪' : '♥'}</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/profile')}
          className="w-11 h-11 rounded-full bg-primary-500/15 border border-primary-500/20 flex items-center justify-center"
        >
          <span className="text-lg">{profile.sex === 'male' ? '🏋️' : '🧘'}</span>
        </motion.button>
      </div>

      {isWidgetVisible('quote') && <MotivationalQuote />}

      {/* AI Insight */}
      {isWidgetVisible('aiInsight') && <AIDashInsight />}

      {/* Weekly Report (Sundays) */}
      {isWidgetVisible('weeklyReport') && <AIWeeklyReport />}

      {/* Active Session Banner */}
      {activeSession && (
        <motion.button
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleResumeWorkout}
          className="w-full p-5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 text-left shadow-lg shadow-primary-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Treino em andamento</p>
              <p className="text-xl font-bold mt-1">
                Continuar {WORKOUT_MAP[activeSession.workoutType].label}
              </p>
            </div>
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-2xl"
            >→</motion.span>
          </div>
        </motion.button>
      )}

      {/* Today's Training */}
      {!activeSession && isWidgetVisible('todayWorkout') && (
        <div className="card space-y-4 border-primary-500/20">
          {isTodayTraining && !todayAlreadyDone ? (
            <>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center text-2xl">
                  🏋️
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Treino de hoje</p>
                  <p className="text-lg font-bold mt-0.5">
                    {todayWorkout && WORKOUT_MAP[todayWorkout].label}
                  </p>
                  <p className="text-sm text-primary-400">{todayWorkout && WORKOUT_MAP[todayWorkout].focus}</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                className="btn-primary"
                onClick={() => todayWorkout && handleStartWorkout(todayWorkout)}
              >
                Iniciar Treino
              </motion.button>
            </>
          ) : todayAlreadyDone ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center py-6"
            >
              <span className="text-5xl">✅</span>
              <p className="text-lg font-semibold mt-3">Treino concluído!</p>
              <p className="text-white/40 text-sm mt-1">Descanse e se recupere 💤</p>
            </motion.div>
          ) : (
            <div className="text-center py-6">
              <span className="text-5xl">😴</span>
              <p className="text-lg font-semibold mt-3">Dia de descanso</p>
              <p className="text-white/40 text-sm mt-1">Aproveite para se recuperar</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Start */}
      {!activeSession && !todayAlreadyDone && isWidgetVisible('quickStart') && (
        <div className="space-y-2">
          <p className="text-xs text-white/25 font-semibold uppercase tracking-wider">Ou escolha um treino</p>
          <div className="grid grid-cols-3 gap-3">
            {activeSlots.map((type) => (
              <motion.button
                key={type}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleStartWorkout(type)}
                className="card text-center py-4 hover:border-primary-400/40 transition-colors active:bg-primary-500/5"
              >
                <span className="text-2xl font-bold text-primary-400">{type}</span>
                <p className="text-[10px] text-white/40 mt-1">{WORKOUT_MAP[type]?.focus || `Treino ${type}`}</p>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {isWidgetVisible('stats') && <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-400">{totalWorkouts}</p>
          <p className="text-xs text-white/40 mt-1">Treinos feitos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-success">{streak}</p>
          <p className="text-xs text-white/40 mt-1">Semanas seguidas</p>
        </div>
      </div>}

      {/* Streak Heatmap */}
      {isWidgetVisible('streak') && <StreakHeatmap />}

      {/* Load Progression */}
      {isWidgetVisible('load') && <LoadProgression />}

      {/* Calories */}
      {isWidgetVisible('calories') && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white/80">Calorias do dia</h2>
            <span className="text-xs text-white/40">Meta: {calories} kcal</span>
          </div>
          <div className="relative h-4 bg-dark-300 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${progressCalories >= 1 ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressCalories * 100}%` }}
              transition={{ type: 'spring', stiffness: 80 }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-400">{totals.calories}</p>
              <p className="text-[10px] text-white/40">Consumidas</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-400">{burned}</p>
              <p className="text-[10px] text-white/40">Queimadas</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${remaining > 0 ? 'text-blue-400' : 'text-red-400'}`}>{remaining}</p>
              <p className="text-[10px] text-white/40">{remaining > 0 ? 'Restantes' : 'Excedido'}</p>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-white/5">
            <MacroBar label="Proteína" current={totals.protein} goal={macros.protein} color="bg-red-400" />
            <MacroBar label="Carboidratos" current={totals.carbs} goal={macros.carbs} color="bg-yellow-400" />
            <MacroBar label="Gorduras" current={totals.fat} goal={macros.fat} color="bg-green-400" />
          </div>
        </div>
      )}

      {/* Nutrition */}
      {false && (
      <div className="card space-y-4">
        <h2 className="font-semibold text-white/80">Nutrição diária</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{calories}</p>
            <p className="text-xs text-white/40">kcal/dia</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{water}L</p>
            <p className="text-xs text-white/40">meta de água</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
          <div className="text-center">
            <p className="text-lg font-semibold text-red-400">{macros.protein}g</p>
            <p className="text-[10px] text-white/30">Proteína</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-yellow-400">{macros.carbs}g</p>
            <p className="text-[10px] text-white/30">Carboidratos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-400">{macros.fat}g</p>
            <p className="text-[10px] text-white/30">Gorduras</p>
          </div>
        </div>
      </div>
      )}

      {/* Water Tracker */}
      {isWidgetVisible('water') && <WaterTracker
        glasses={waterGlasses}
        goal={Math.round(water * 4)}
        onAdd={() => {
          addGlass();
          const newCount = waterGlasses + 1;
          const goal = Math.round(water * 4);
          if (newCount >= goal && waterGlasses < goal) setShowConfetti(true);
        }}
        onRemove={removeGlass}
        showConfetti={showConfetti}
        onConfettiDone={() => setShowConfetti(false)}
      />}

      {/* BMI */}
      {isWidgetVisible('bmi') && <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-white/40">IMC</p>
          <p className="text-xl font-bold">{bmi}</p>
        </div>
        <span className="text-sm px-3 py-1 rounded-full bg-primary-500/10 text-primary-300">
          {bmiCategory(bmi)}
        </span>
      </div>}

      {/* Weight Chart */}
      {isWidgetVisible('weight') && <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white/80">Evolução do peso</h2>
          <button
            onClick={() => setShowWeightPrompt(true)}
            className="text-xs text-primary-400 font-medium"
          >
            + Registrar
          </button>
        </div>
        <WeightChart entries={weightEntries} />
      </div>}

      {editingDashboard && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white/80">Editar dashboard</h2>
            <button onClick={resetWidgets} className="text-xs text-primary-400 font-medium">Restaurar</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_DASHBOARD_WIDGETS.map((widget) => (
              <button
                key={widget}
                onClick={() => toggleWidget(widget)}
                className={`px-3 py-2 rounded-xl border text-left text-xs font-medium transition-colors ${
                  widgets.includes(widget)
                    ? 'bg-primary-500/15 border-primary-500/30 text-primary-200'
                    : 'bg-white/5 border-white/10 text-white/35'
                }`}
              >
                {widgets.includes(widget) ? '✓ ' : '+ '}{DASHBOARD_WIDGET_LABELS[widget]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center pb-2">
        <button
          onClick={() => setEditingDashboard((value) => !value)}
          className={`px-5 py-3 rounded-full text-sm font-semibold border transition-colors ${
            editingDashboard
              ? 'bg-primary-500 text-white border-primary-400'
              : 'bg-dark-100 text-white/70 border-white/10'
          }`}
        >
          {editingDashboard ? 'Concluir' : 'Editar dashboard'}
        </button>
      </div>

      {/* Weight Prompt */}
      {showWeightPrompt && <WeightPrompt onClose={() => setShowWeightPrompt(false)} />}
    </div>
  );
}

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const progress = Math.min(current / goal, 1);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-white/40 w-20">{label}</span>
      <div className="flex-1 h-2 bg-dark-300 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>
      <span className="text-[10px] text-white/50 w-16 text-right">{current}/{goal}g</span>
    </div>
  );
}

function WaterTracker({ glasses, goal, onAdd, onRemove, showConfetti, onConfettiDone }: {
  glasses: number; goal: number; onAdd: () => void; onRemove: () => void;
  showConfetti: boolean; onConfettiDone: () => void;
}) {
  const progress = Math.min(glasses / goal, 1);
  const ml = glasses * 250;

  useEffect(() => {
    if (showConfetti) {
      const t = setTimeout(onConfettiDone, 3000);
      return () => clearTimeout(t);
    }
  }, [showConfetti]);

  return (
    <div className="card space-y-3 relative overflow-hidden">
      {showConfetti && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <p className="text-4xl animate-bounce">🎉💧🎉</p>
        </motion.div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white/80">💧 Água</h2>
        <p className="text-xs text-white/40 font-mono">{ml}ml / {goal * 250}ml</p>
      </div>
      <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onRemove}
          disabled={glasses <= 0}
          className="w-12 h-12 rounded-full bg-dark-300 flex items-center justify-center text-white/50 text-xl disabled:opacity-30"
        >
          −
        </motion.button>
        <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
          {Array.from({ length: goal }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: i < glasses ? 1.2 : 1, backgroundColor: i < glasses ? 'rgb(96 165 250)' : 'rgb(var(--color-bg-rgb))' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-2.5 h-2.5 rounded-full border border-white/10 ${i < glasses ? '' : 'bg-dark-300'}`}
            />
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onAdd}
          className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl"
        >
          +
        </motion.button>
      </div>
      {glasses >= goal && (
        <p className="text-center text-xs text-green-400 font-medium">✅ Meta atingida! Parabéns!</p>
      )}
    </div>
  );
}
