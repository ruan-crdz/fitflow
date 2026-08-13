import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { getAIConfigPrompt, SCIENCE_GUARDRAILS } from '@/stores/useAIConfigStore';
import { getToday, toLocalDateKey } from '@/utils/date';
import { invokeAI } from '@/utils/ai';
import { resolveAIPlan } from '@/constants/aiPlan';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { RichText } from '@/components/ui/RichText';

export function AIWeeklyReport() {
  const navigate = useNavigate();
  const isEnabled = useAIStore((s) => s.isEnabled);
  const profile = useProfileStore((s) => s.profile);
  const plan = resolveAIPlan(profile);
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show on Sundays
  const isSunday = new Date().getDay() === 0;
  const storageKey = `fitflow-weekly-report-${getToday()}`;

  useEffect(() => {
    if (!isSunday || !isEnabled || !profile || dismissed || plan === 'free') return;

    const cached = localStorage.getItem(storageKey);
    if (cached) {
      setReport(cached);
      return;
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStr = toLocalDateKey(weekAgo);

    const weekSessions = sessions.filter((s) => s.completedAt && s.date >= weekStr);
    const weekSessionNames = weekSessions
      .map((s) => (s.workoutType ? s.workoutType : s.activityName || 'atividade avulsa'))
      .join(', ');
    const weekWeight = weightEntries.filter((e) => e.date >= weekStr);

    // Don't show report if no workouts were done this week
    if (weekSessions.length === 0) return;

    setLoading(true);
    const aiConfig = getAIConfigPrompt();

    invokeAI({
      messages: [
        {
          role: 'system',
          content: `Você é ${aiConfig.assistantName}. ${aiConfig.personalityPrompt} Faça um mini relatório semanal motivador (max 4 linhas). Celebre conquistas reais, destaque progresso se existir e dê 1 meta específica para a próxima semana. Nunca invente dados. ${SCIENCE_GUARDRAILS}`,
        },
        {
          role: 'user',
          content: `Perfil: ${profile.name}, ${profile.weight}kg, objetivo: ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manter'}.
Esta semana: ${weekSessions.length} treinos completados (${weekSessionNames}).
Peso: ${weekWeight.length >= 2 ? `de ${weekWeight[0].weight}kg para ${weekWeight[weekWeight.length - 1].weight}kg` : weekWeight.length === 1 ? `${weekWeight[0].weight}kg registrado` : 'sem registros essa semana'}.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.8,
    }, { feature: 'weekly_report' })
      .then((data) => {
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          setReport(text);
          localStorage.setItem(storageKey, text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSunday, isEnabled, profile, sessions, weightEntries, dismissed, storageKey, plan]);

  if (!isSunday || !isEnabled || dismissed) return null;

  if (plan === 'free') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 space-y-2"
      >
        <div className="flex items-center gap-2">
          <MaterialIcon name="lock" className="text-amber-300" />
          <span className="text-xs font-semibold text-amber-300">Relatório Semanal (Ultimate)</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          No plano Free, você recebe insights rápidos. O relatório semanal completo fica no Ultimate.
        </p>
        <button onClick={() => navigate('/profile')} className="btn-secondary py-2 text-xs">
          Fazer upgrade para Ultimate
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name="smart_toy" className="text-primary-300" />
          <span className="text-xs font-semibold text-amber-300">Relatório Semanal</span>
        </div>
 <button onClick={() => setDismissed(true)} className="text-white/30 text-xs"></button>
      </div>
      <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
        {loading ? <span className="animate-pulse">Gerando relatório...</span> : report ? <RichText text={report} /> : 'Continue treinando para receber seu relatório!'}
      </p>
    </motion.div>
  );
}
