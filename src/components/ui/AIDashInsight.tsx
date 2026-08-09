import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';

export function AIDashInsight() {
  const apiKey = useAIStore((s) => s.apiKey);
  const isEnabled = useAIStore((s) => s.isEnabled);
  const profile = useProfileStore((s) => s.profile);
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiKey || !isEnabled || !profile) return;

    const storageKey = `fitflow-ai-insight-${new Date().toISOString().slice(0, 10)}`;
    const cached = sessionStorage.getItem(storageKey);
    if (cached) {
      setInsight(cached);
      return;
    }

    setLoading(true);

    const completedSessions = sessions.filter((s) => s.completedAt);
    const recentWeight = weightEntries.slice(-7);
    const weightTrend = recentWeight.length >= 2
      ? `Peso: de ${recentWeight[0].weight}kg para ${recentWeight[recentWeight.length - 1].weight}kg nos últimos ${recentWeight.length} dias`
      : 'Sem dados de peso suficientes';

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
            content: 'Você é a FlowAI, assistente fitness. Dê UM insight personalizado e motivador (máx 2 frases curtas) baseado nos dados. Use 1 emoji. Seja direta e positiva.',
          },
          {
            role: 'user',
            content: `Perfil: ${profile.name}, ${profile.age} anos, ${profile.weight}kg, objetivo: ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manter'}. Treinos completos: ${completedSessions.length} total. ${weightTrend}`,
          },
        ],
        max_tokens: 80,
        temperature: 0.8,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          setInsight(text);
          sessionStorage.setItem(storageKey, text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiKey, isEnabled, profile, sessions, weightEntries]);

  if (!isEnabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-primary-500/10 to-primary-900/10 border-primary-500/20 space-y-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">🤖</span>
        <span className="text-xs font-semibold text-primary-300">FlowAI Insight</span>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">
        {loading ? (
          <span className="animate-pulse">Analisando seus dados...</span>
        ) : insight ? (
          insight
        ) : (
          'Continue treinando para receber insights personalizados!'
        )}
      </p>
    </motion.div>
  );
}
