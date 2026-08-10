import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { getAIConfigPrompt, SCIENCE_GUARDRAILS } from '@/stores/useAIConfigStore';

interface AIWorkoutTipProps {
  exerciseName: string;
  muscleGroup: string;
}

const TIPS_CACHE: Record<string, string> = {};

export function AIWorkoutTip({ exerciseName, muscleGroup }: AIWorkoutTipProps) {
  const apiKey = useAIStore((s) => s.apiKey);
  const profile = useProfileStore((s) => s.profile);
  const [tip, setTip] = useState<string | null>(TIPS_CACHE[exerciseName] || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiKey || !profile || TIPS_CACHE[exerciseName]) return;

    setLoading(true);
    setTip(null);
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
            content: `Voce e ${aiConfig.assistantName}. ${aiConfig.personalityPrompt} De UMA dica curta (max 15 palavras) de execucao segura ou motivacao para o exercicio. So a dica, sem explicacao. ${SCIENCE_GUARDRAILS}`,
          },
          {
            role: 'user',
            content: `Exercício: ${exerciseName} (${muscleGroup}). Objetivo: ${profile.goal === 'lose' ? 'perder gordura' : profile.goal === 'gain' ? 'ganhar massa' : 'manter'}`,
          },
        ],
        max_tokens: 60,
        temperature: 0.9,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          TIPS_CACHE[exerciseName] = text;
          setTip(text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [exerciseName, apiKey, profile, muscleGroup]);

  if (!apiKey) return null;

  return (
    <AnimatePresence mode="wait">
      {(loading || tip) && (
        <motion.div
          key={exerciseName}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20"
        >
          <span className="text-sm">🤖</span>
          <p className="text-xs text-primary-200 leading-relaxed">
            {loading ? (
              <span className="animate-pulse">Pensando...</span>
            ) : (
              tip
            )}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
