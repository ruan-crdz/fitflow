import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { useAIStore } from '@/stores/useAIStore';
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
  const aiEnabled = useAIStore((s) => s.isEnabled);
  const [showWeightPrompt, setShowWeightPrompt] = useState(!hasTodayWeight);

  const today = getToday();
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

  const handleStartWorkout = (type: WorkoutType) => {
    startSession(type);
    navigate('/workout');
  };

  const handleResumeWorkout = () => {
    navigate('/workout');
  };

  return (
    <div className="px-5 pt-12 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/40 text-sm">Olá,</p>
          <h1 className="text-2xl font-bold">{profile.name} <span className="text-primary-400">{profile.sex === 'male' ? '💪' : '♥'}</span></h1>
        </div>
        {aiEnabled && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-[10px] font-bold text-black uppercase tracking-wide shadow-lg shadow-amber-500/20"
          >
            ✨ Premium
          </motion.span>
        )}
      </div>

      <MotivationalQuote />

      {/* AI Insight */}
      <AIDashInsight />

      {/* Weekly Report (Sundays) */}
      <AIWeeklyReport />

      {/* Active Session Banner */}
      {activeSession && (
        <motion.button
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={handleResumeWorkout}
          className="w-full p-5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 text-left"
        >
          <p className="text-sm text-white/70">Treino em andamento</p>
          <p className="text-xl font-bold mt-1">
            Continuar {WORKOUT_MAP[activeSession.workoutType].label} →
          </p>
        </motion.button>
      )}

      {/* Today's Training */}
      {!activeSession && (
        <div className="card space-y-4">
          {isTodayTraining && !todayAlreadyDone ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-2xl">
                  🏋️
                </div>
                <div>
                  <p className="text-sm text-white/50">Hoje é dia de</p>
                  <p className="text-lg font-bold">
                    {todayWorkout && WORKOUT_MAP[todayWorkout].label} — {todayWorkout && WORKOUT_MAP[todayWorkout].focus}
                  </p>
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => todayWorkout && handleStartWorkout(todayWorkout)}
              >
                Iniciar Treino 🔥
              </button>
            </>
          ) : todayAlreadyDone ? (
            <div className="text-center py-4">
              <span className="text-4xl">✅</span>
              <p className="text-lg font-semibold mt-2">Treino de hoje concluído!</p>
              <p className="text-white/40 text-sm">Descanse e se recupere</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="text-4xl">😴</span>
              <p className="text-lg font-semibold mt-2">Hoje é dia de descanso</p>
              <p className="text-white/40 text-sm">Aproveite para se recuperar</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Start */}
      {!activeSession && !todayAlreadyDone && (
        <div className="space-y-2">
          <p className="text-sm text-white/30 font-medium">Ou escolha um treino:</p>
          <div className="grid grid-cols-3 gap-3">
            {(['A', 'B', 'C'] as WorkoutType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleStartWorkout(type)}
                className="card text-center py-4 hover:border-primary-400 transition-colors"
              >
                <span className="text-2xl font-bold text-primary-400">{type}</span>
                <p className="text-[10px] text-white/40 mt-1">{WORKOUT_MAP[type].focus}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-400">{totalWorkouts}</p>
          <p className="text-xs text-white/40 mt-1">Treinos feitos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-success">{streak}</p>
          <p className="text-xs text-white/40 mt-1">Semanas seguidas</p>
        </div>
      </div>

      {/* Streak Heatmap */}
      <StreakHeatmap />

      {/* Load Progression */}
      <LoadProgression />

      {/* Nutrition */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white/80">Nutrição diária</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{calories}</p>
            <p className="text-xs text-white/40">kcal/dia</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{water}L</p>
            <p className="text-xs text-white/40">água/dia</p>
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

      {/* BMI */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-white/40">IMC</p>
          <p className="text-xl font-bold">{bmi}</p>
        </div>
        <span className="text-sm px-3 py-1 rounded-full bg-primary-500/10 text-primary-300">
          {bmiCategory(bmi)}
        </span>
      </div>

      {/* Weight Chart */}
      <div className="card space-y-3">
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
      </div>

      {/* Weight Prompt */}
      {showWeightPrompt && <WeightPrompt onClose={() => setShowWeightPrompt(false)} />}
    </div>
  );
}
