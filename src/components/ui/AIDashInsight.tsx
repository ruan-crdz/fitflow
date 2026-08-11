import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { getAIConfigPrompt, SCIENCE_GUARDRAILS, useAIConfigStore } from '@/stores/useAIConfigStore';
import { getToday } from '@/utils/date';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { RichText } from '@/components/ui/RichText';

export function AIDashInsight() {
  const apiKey = useAIStore((s) => s.apiKey);
  const isEnabled = useAIStore((s) => s.isEnabled);
  const profile = useProfileStore((s) => s.profile);
  const assistantName = useAIConfigStore((s) => s.assistantName);
  const personality = useAIConfigStore((s) => s.personality);
  const sessions = useHistoryStore((s) => s.sessions);
  const weightEntries = useWeightStore((s) => s.entries);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiKey || !isEnabled || !profile) return;

    const completedSessions = sessions.filter((s) => s.completedAt);
    if (completedSessions.length === 0) return;

    const storageKey = `fitflow-ai-insight-${assistantName}-${personality}-${getToday()}`;
    const cached = sessionStorage.getItem(storageKey);
    if (cached) {
      setInsight(cached);
      return;
    }

    setLoading(true);

    const recentWeight = weightEntries.slice(-7);
    const weightTrend = recentWeight.length >= 2
      ? `Peso: de ${recentWeight[0].weight}kg para ${recentWeight[recentWeight.length - 1].weight}kg nos últimos ${recentWeight.length} dias`
      : 'Sem dados de peso suficientes';
    const aiConfig = getAIConfigPrompt();

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
            content: `Você é ${aiConfig.assistantName}. Sempre use esse nome se falar de você. ${aiConfig.personalityPrompt} Dê UM insight personalizado e motivador, máximo 2 frases curtas, baseado apenas nos dados reais. ${SCIENCE_GUARDRAILS}`,
          },
          {
            role: 'user',
            content: `Perfil: ${profile.name}, ${profile.age} anos, ${profile.weight}kg, objetivo: ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manter'}. Treinos completos: ${completedSessions.length} total. ${weightTrend}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.75,
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
  }, [apiKey, isEnabled, profile, sessions, weightEntries, assistantName, personality]);

  if (!isEnabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-primary-500/10 to-primary-900/10 border-primary-500/20 space-y-2"
    >
      <div className="flex items-center gap-2">
        <MaterialIcon name="smart_toy" className="text-primary-300" />
        <span className="text-xs font-semibold text-primary-300">{assistantName} Insight</span>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">
        {loading ? (
          <span className="animate-pulse">Analisando seus dados...</span>
        ) : insight ? (
          <RichText text={insight} />
        ) : (
          'Continue treinando para receber insights personalizados!'
        )}
      </p>
    </motion.div>
  );
}
