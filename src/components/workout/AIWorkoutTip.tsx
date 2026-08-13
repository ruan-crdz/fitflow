import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { getAIConfigPrompt, SCIENCE_GUARDRAILS } from '@/stores/useAIConfigStore';
import { invokeAI } from '@/utils/ai';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface AIWorkoutTipProps {
  exerciseName: string;
  muscleGroup: string;
}

const TIPS_CACHE: Record<string, string> = {};

export function AIWorkoutTip({ exerciseName, muscleGroup }: AIWorkoutTipProps) {
  const profile = useProfileStore((s) => s.profile);
  const [tip, setTip] = useState<string | null>(TIPS_CACHE[exerciseName] || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile || TIPS_CACHE[exerciseName]) return;

    setLoading(true);
    setTip(null);
    const aiConfig = getAIConfigPrompt();

    invokeAI({
      messages: [
        {
          role: 'system',
          content: `Você é ${aiConfig.assistantName}. ${aiConfig.personalityPrompt} Dê UMA dica curta (max 15 palavras) de execução segura ou motivação para o exercício. Só a dica, sem explicação. ${SCIENCE_GUARDRAILS}`,
        },
        {
          role: 'user',
          content: `Exercício: ${exerciseName} (${muscleGroup}). Objetivo: ${profile.goal === 'lose' ? 'perder gordura' : profile.goal === 'gain' ? 'ganhar massa' : 'manter'}`,
        },
      ],
      max_tokens: 60,
      temperature: 0.9,
    }, { feature: 'workout_tip' })
      .then((data) => {
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        if (text) {
          TIPS_CACHE[exerciseName] = text;
          setTip(text);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [exerciseName, profile, muscleGroup]);

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
          <MaterialIcon name="smart_toy" className="text-primary-300" />
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
