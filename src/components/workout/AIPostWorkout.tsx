import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { WORKOUT_MAP } from '@/constants/workouts';
import { useAIConfigStore } from '@/stores/useAIConfigStore';
import type { WorkoutType } from '@/types';

interface AIPostWorkoutProps {
  workoutType: WorkoutType;
  durationMs: number;
  setsCompleted: Record<string, number>;
}

export function AIPostWorkout({ workoutType, durationMs, setsCompleted }: AIPostWorkoutProps) {
  const apiKey = useAIStore((s) => s.apiKey);
  const isEnabled = useAIStore((s) => s.isEnabled);
  const assistantName = useAIConfigStore((s) => s.assistantName);
  const profile = useProfileStore((s) => s.profile);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [meal, setMeal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiKey || !isEnabled || !profile) {
      setLoading(false);
      return;
    }

    const workout = WORKOUT_MAP[workoutType];
    const exercisesSummary = workout.exercises
      .map((ex) => `${ex.name}: ${setsCompleted[ex.id] || 0}/${ex.sets} séries`)
      .join(', ');

    const durationMin = Math.round(durationMs / 60000);

    const fetchAI = async (prompt: string) => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }],
          max_tokens: 120,
          temperature: 0.8,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    };

    Promise.all([
      fetchAI(
        `Você é personal trainer. Dê um feedback curto (2 frases max, use 1 emoji) sobre este treino concluído. Seja motivadora e específica sobre os exercícios.
Perfil: ${profile.name}, objetivo ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manter'}.
Treino: ${workout.label} (${workout.focus}), duração ${durationMin}min.
Exercícios: ${exercisesSummary}`
      ),
      fetchAI(
        `Você é nutricionista esportiva. Sugira UMA refeição pós-treino rápida e prática (1-2 frases, com quantidades aproximadas). Use 1 emoji de comida.
Perfil: ${profile.name}, ${profile.weight}kg, objetivo ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manter'}.
Acabou de treinar: ${workout.focus}, ${durationMin}min.`
      ),
    ])
      .then(([fb, ml]) => {
        setFeedback(fb);
        setMeal(ml);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiKey, isEnabled, profile, workoutType, durationMs, setsCompleted]);

  if (!isEnabled) return null;

  return (
    <div className="space-y-3 w-full max-w-sm">
      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card bg-primary-500/10 border-primary-500/20 space-y-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">🤖</span>
          <span className="text-[10px] font-semibold text-primary-300">{assistantName} Feedback</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          {loading ? <span className="animate-pulse">Analisando treino...</span> : feedback || 'Mandou bem! 💪'}
        </p>
      </motion.div>

      {/* Meal suggestion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card bg-green-500/10 border-green-500/20 space-y-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">🍽️</span>
          <span className="text-[10px] font-semibold text-green-300">Sugestão pós-treino</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          {loading ? <span className="animate-pulse">Pensando na refeição...</span> : meal || 'Capriche na proteína! 🥩'}
        </p>
      </motion.div>
    </div>
  );
}
