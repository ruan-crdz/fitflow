import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';

export function AIWeeklyReport() {
  const apiKey = useAIStore((s) => s.apiKey);
  const isEnabled = useAIStore((s) => s.isEnabled);
  const profile = useProfileStore((s) => s.profile);
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show on Sundays
  const isSunday = new Date().getDay() === 0;
  const storageKey = `fitflow-weekly-report-${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    if (!isSunday || !apiKey || !isEnabled || !profile || dismissed) return;

    const cached = localStorage.getItem(storageKey);
    if (cached) {
      setReport(cached);
      return;
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStr = weekAgo.toISOString().slice(0, 10);

    const weekSessions = sessions.filter((s) => s.completedAt && s.date >= weekStr);
    const weekWeight = weightEntries.filter((e) => e.date >= weekStr);

    setLoading(true);

    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é a FlowAI, assistente fitness. Faça um mini relatório semanal motivador (máx 4 linhas) com: resumo da semana, progresso, e 1 recomendação pra semana seguinte. Use emojis. Seja direta e positiva.`,
          },
          {
            role: 'user',
            content: `Perfil: ${profile.name}, ${profile.weight}kg, objetivo: ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manter'}.
Esta semana: ${weekSessions.length} treinos completados.
Peso: ${weekWeight.length > 0 ? `de ${weekWeight[0].weight}kg para ${weekWeight[weekWeight.length - 1].weight}kg` : 'sem registros'}.
Treinos: ${weekSessions.map((s) => s.workoutType).join(', ') || 'nenhum'}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          setReport(text);
          localStorage.setItem(storageKey, text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSunday, apiKey, isEnabled, profile, sessions, weightEntries, dismissed, storageKey]);

  if (!isSunday || !isEnabled || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-xs font-semibold text-amber-300">Relatório Semanal</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-white/30 text-xs">✕</button>
      </div>
      <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
        {loading ? <span className="animate-pulse">Gerando relatório...</span> : report || 'Continue treinando para receber seu relatório!'}
      </p>
    </motion.div>
  );
}
