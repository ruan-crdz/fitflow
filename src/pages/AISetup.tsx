import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';
import { askAI } from '@/utils/ai';

type Phase = 'token' | 'generating' | 'summary';

interface GeneratedWorkout {
  type: string;
  focus: string;
  exercises: { name: string; sets: number; repsMin: number; repsMax: number; muscleGroup: string }[];
}

export function AISetup() {
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.profile)!;
  const { setApiKey, apiKey } = useAIStore();
  const { setExercises } = useCustomWorkoutStore();

  const [phase, setPhase] = useState<Phase>(apiKey ? 'generating' : 'token');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [workouts, setWorkouts] = useState<GeneratedWorkout[]>([]);

  const trainingDays = profile.trainingDays.length || 3;
  const sexLabel = profile.sex === 'male' ? 'homem' : 'mulher';
  const goalLabel = profile.goal === 'lose' ? 'perder gordura' : profile.goal === 'gain' ? 'ganhar massa muscular' : 'manter peso';
  const levelLabel = profile.experienceLevel === 'advanced' ? 'avançado' : profile.experienceLevel === 'intermediate' ? 'intermediário' : 'iniciante';

  useEffect(() => {
    if (apiKey && phase === 'generating') generateWorkout(apiKey);
  }, []);

  const handleTokenSubmit = async () => {
    const key = tokenInput.trim();
    if (!key.startsWith('sk-')) {
      setTokenError('Token inválido. Deve começar com "sk-"');
      return;
    }
    setTokenError('');
    setApiKey(key);
    setPhase('generating');
    await generateWorkout(key);
  };

  const handleSkip = () => {
    generateDefaults();
    navigate('/plans');
  };

  const addMessage = (msg: string) => {
    setMessages((prev) => [...prev, msg]);
  };

  const generateDefaults = () => {
    // Smart defaults based on training days - already handled by default workouts in store
    // No need to do anything, the store falls back to WORKOUTS constant
  };

  const generateWorkout = async (key: string) => {
    addMessage(`Olá, ${profile.name}! 👋`);
    await delay(800);
    addMessage(`Vi que você treina ${trainingDays}x por semana e é ${levelLabel}. Deixa eu calcular a melhor separação de treinos pra você...`);
    await delay(1200);
    addMessage(`Seu objetivo é ${goalLabel}, e como ${sexLabel}, vou adaptar volume e seleção de exercícios pra sua fisiologia.`);
    await delay(1000);
    addMessage(`Calculando a divisão ideal com base científica... 🧬`);

    const catalogNames = EXERCISE_CATALOG.map((e) => `${e.name} (${e.muscleGroup})`).join(', ');

    const prompt = `Você é um preparador físico criando um programa de treino.

PERFIL:
- Sexo biológico: ${sexLabel}
- Idade: ${profile.age} anos
- Peso: ${profile.weight}kg, Altura: ${profile.height}cm
- Objetivo: ${goalLabel}
- Dias disponíveis: ${trainingDays}x por semana
- Nível de experiência: ${levelLabel}

REGRA CRÍTICA DE DIVISÃO (número de treinos distintos):
- Iniciante com 1-4 dias → ABC (3 treinos, rotaciona)
- Iniciante com 5+ dias → ABC (3 treinos, repete na semana)
- Intermediário com 1-3 dias → ABC (3 treinos)
- Intermediário com 4 dias → ABCD (4 treinos)
- Intermediário com 5+ dias → ABCDE (5 treinos)
- Avançado com 1-3 dias → ABC (3 treinos)
- Avançado com 4 dias → ABCD (4 treinos)
- Avançado com 5-7 dias → ABCDE (5 treinos)

Use EXATAMENTE a regra acima para decidir quantos treinos criar (3, 4 ou 5).

REGRAS:
1. Cada treino deve ter 6-8 exercícios
2. ${profile.sex === 'male' ? 'Para homem: priorize compostos pesados, mais volume de peito/costas/ombros' : 'Para mulher: priorize glúteos/posterior, volume adequado de superior'}
3. Cada exercício DEVE ser da lista abaixo (nome exato)
4. Justifique a divisão escolhida em 1-2 frases
5. Explique como rotacionar na semana

Exercícios disponíveis: ${catalogNames}

Responda APENAS JSON puro (sem markdown, sem \`\`\`):
{
  "split": "ABC" ou "ABCD" ou "ABCDE",
  "explanation": "Justificativa da divisão em 2 frases",
  "rotation": "Como rotacionar na semana",
  "workouts": [
    {"type": "A", "focus": "foco do treino", "exercises": [{"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"}]},
    {"type": "B", "focus": "...", "exercises": [...]},
    ...
  ]
}`;

    try {
      const response = await askAI(key, profile, prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.workouts?.length > 0) {
          setWorkouts(parsed.workouts);
          addMessage(`Pronto! Montei sua divisão:`);
          await delay(600);
          if (parsed.explanation) addMessage(`📋 ${parsed.explanation}`);
          if (parsed.rotation) addMessage(`🔄 Rotação: ${parsed.rotation}`);

          // Save workouts to store
          for (const w of parsed.workouts) {
            const mapped = w.exercises.map((ex: { name: string; sets: number; repsMin: number; repsMax: number; muscleGroup: string }, i: number) => {
              const catalogItem = EXERCISE_CATALOG.find(
                (c) => c.name.toLowerCase() === ex.name.toLowerCase()
                  || c.name.toLowerCase().includes(ex.name.toLowerCase().slice(0, 12)),
              );
              return {
                id: `ai_${w.type}_${i}_${Date.now()}`,
                name: catalogItem?.name || ex.name,
                sets: ex.sets || 3,
                repsMin: ex.repsMin || 8,
                repsMax: ex.repsMax || 12,
                muscleGroup: catalogItem?.muscleGroup || ex.muscleGroup,
                image: catalogItem?.image,
              };
            });
            const validTypes = ['A', 'B', 'C', 'D', 'E'] as const;
            if (validTypes.includes(w.type)) {
              setExercises(w.type as typeof validTypes[number], mapped);
            }
          }

          setPhase('summary');
        } else {
          addMessage('Hmm, não consegui gerar. Tente novamente ou monte manualmente.');
        }
      }
    } catch {
      addMessage('Erro ao gerar treino. Verifique seu token e tente novamente.');
    }
  };

  const handleDone = () => navigate('/plans');

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 py-12">
      <AnimatePresence mode="wait">
        {/* Token Input */}
        {phase === 'token' && (
          <motion.div
            key="token"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col justify-center space-y-6"
          >
            <div className="text-center">
              <span className="text-5xl block mb-4">🤖</span>
              <h1 className="text-2xl font-bold mb-2">Inteligência Artificial</h1>
              <p className="text-white/50 text-sm leading-relaxed">
                Para montar seu treino personalizado, precisamos de um token da OpenAI (ChatGPT).
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="sk-..."
                className="input-field text-sm"
                autoFocus
              />
              {tokenError && <p className="text-red-400 text-xs">{tokenError}</p>}
              <p className="text-[11px] text-white/30 leading-relaxed">
                Acesse platform.openai.com → API Keys → Create new key.
                Seu token fica salvo apenas no seu celular.
              </p>
            </div>

            <button
              className="btn-primary"
              disabled={!tokenInput.trim()}
              onClick={handleTokenSubmit}
            >
              Gerar meu treino 🚀
            </button>

            <button
              onClick={handleSkip}
              className="text-white/40 text-sm py-2"
            >
              Não tenho token — montar manualmente
            </button>
          </motion.div>
        )}

        {/* Generating */}
        {phase === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col justify-end pb-8"
          >
            <div className="space-y-3 mb-8">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-dark-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]"
                >
                  <p className="text-sm text-white/80 leading-relaxed">{msg}</p>
                </motion.div>
              ))}
              {workouts.length === 0 && (
                <div className="flex gap-1.5 px-4 py-3">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Summary */}
        {phase === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col"
          >
            <h2 className="text-xl font-bold mb-1">Seu treino está pronto! 🎉</h2>
            <p className="text-white/40 text-sm mb-6">Montado com base na ciência pra você</p>

            <div className="space-y-4 flex-1 overflow-y-auto">
              {workouts.map((w) => (
                <div key={w.type} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">Treino {w.type}</h3>
                    <span className="text-primary-400 text-xs">{w.focus}</span>
                  </div>
                  <div className="space-y-1">
                    {w.exercises.map((ex, i) => (
                      <p key={i} className="text-xs text-white/60">
                        {i + 1}. {ex.name} — {ex.sets}×{ex.repsMin}-{ex.repsMax}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              {messages.filter((m) => m.startsWith('📋') || m.startsWith('🔄')).map((m, i) => (
                <p key={i} className="text-xs text-white/40 leading-relaxed">{m}</p>
              ))}
            </div>

            <button className="btn-primary mt-6" onClick={handleDone}>
              Concluído — ver meus treinos
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
