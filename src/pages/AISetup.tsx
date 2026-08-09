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

  const [retryCount, setRetryCount] = useState(0);

  const generateWorkout = async (key: string) => {
    if (messages.length === 0) {
      addMessage(`Olá, ${profile.name}! 👋`);
      await delay(800);
      addMessage(`Vi que você treina ${trainingDays}x por semana e é ${levelLabel}. Deixa eu avaliar a melhor estratégia de divisão pra você...`);
      await delay(1200);
      addMessage(`Seu objetivo é ${goalLabel}, e como ${sexLabel}, vou adaptar volume e seleção de exercícios pra sua fisiologia.`);
      await delay(1000);
      addMessage(`Avaliando opções de split (Full Body, Upper/Lower, ABC, ABCD, ABCDE)... 🧬`);
    }

    const grouped: Record<string, string[]> = {};
    for (const e of EXERCISE_CATALOG) {
      (grouped[e.muscleGroup] ??= []).push(e.name);
    }
    const catalogCompact = Object.entries(grouped)
      .map(([g, names]) => `${g}: ${names.join(', ')}`)
      .join('\n');

    const prompt = `Você é um preparador físico esportivo com pós-graduação em fisiologia do exercício.

PERFIL DO ALUNO:
- Sexo biológico: ${sexLabel}
- Idade: ${profile.age} anos
- Peso: ${profile.weight}kg, Altura: ${profile.height}cm
- Objetivo: ${goalLabel}
- Dias disponíveis: ${trainingDays}x por semana
- Nível: ${levelLabel}

SUA TAREFA — AVALIAÇÃO DE SPLIT:
Antes de montar o treino, avalie TODAS estas opções de divisão e dê um score de 0-10 para cada uma considerando o perfil acima:

1. Full Body (2-3 treinos distintos, rotaciona nos ${trainingDays} dias)
2. Upper/Lower (2 treinos + possível Full Body no 5º dia)
3. ABC (3 treinos, rotaciona se >3 dias)
4. ABCD (4 treinos, sobram dias para repetir se >4 dias)
5. ABCDE (5 treinos distintos)

CRITÉRIOS DE SCORING:
- Recuperação adequada entre sessões do mesmo grupo muscular (48-72h)
- Volume total semanal adequado ao nível (iniciante: 10-12 séries/grupo/semana; intermediário: 12-16; avançado: 16-20)
- Frequência de estímulo por grupo muscular (2x/semana é ótimo para hipertrofia)
- Complexidade proporcional à experiência (iniciante não precisa de divisão ultra-específica)
- Aproveitamento dos dias disponíveis sem overtraining
- Para iniciantes: full body ou ABC rotativo geralmente ganha porque permite maior frequência de estímulo por grupo

IMPORTANTE: O número de treinos distintos NÃO precisa ser igual ao número de dias. Um iniciante que treina 5x pode fazer ABC rotativo (Sem1: A,B,C,A,B / Sem2: C,A,B,C,A). A IA DEVE escolher o split que maximize resultados, não o que "preenche" os dias.

REGRAS DE MONTAGEM:
1. Após escolher o split vencedor, monte os treinos
2. Cada treino: 5-8 exercícios (menos para iniciante, mais para avançado)
3. ${profile.sex === 'male' ? 'Para homem: priorize compostos pesados, volume adequado de peito/costas/ombros' : 'Para mulher: priorize glúteos/posterior, volume adequado de superior'}
4. Cada exercício DEVE vir da lista abaixo (nome exato)
5. Explique a rotação semanal

Exercícios disponíveis (use nomes EXATOS):
${catalogCompact}

Responda APENAS JSON puro (sem markdown, sem \`\`\`):
{
  "evaluation": [
    {"option": "Full Body", "score": 8, "reason": "razão curta"},
    {"option": "Upper/Lower", "score": 6, "reason": "razão curta"},
    {"option": "ABC", "score": 9, "reason": "razão curta"},
    {"option": "ABCD", "score": 5, "reason": "razão curta"},
    {"option": "ABCDE", "score": 3, "reason": "razão curta"}
  ],
  "chosenSplit": "ABC",
  "explanation": "Justificativa de por que este split venceu (2-3 frases)",
  "rotation": "Como rotacionar na semana (ex: Sem1: A,B,C,A,B / Sem2: C,A,B,C,A)",
  "workouts": [
    {"type": "A", "focus": "foco", "exercises": [{"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"}]}
  ]
}`;

    try {
      const response = await askAI(key, profile, prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.workouts?.length > 0) {
          setWorkouts(parsed.workouts);

          // Show evaluation scores
          if (parsed.evaluation?.length) {
            const winner = parsed.evaluation.reduce((a: { score: number }, b: { score: number }) => a.score > b.score ? a : b);
            const scoreBoard = parsed.evaluation
              .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
              .map((e: { option: string; score: number }) => `${e.option}: ${e.score}/10`)
              .join(' • ');
            addMessage(`📊 Avaliação: ${scoreBoard}`);
            await delay(600);
            addMessage(`🏆 Vencedor: ${parsed.chosenSplit || winner.option}`);
            await delay(400);
          }

          if (parsed.explanation) addMessage(`📋 ${parsed.explanation}`);
          await delay(400);
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      if (msg.includes('401') || msg.includes('Incorrect API')) {
        addMessage('❌ Token inválido ou expirado. Verifique no site da OpenAI.');
      } else if (msg.includes('429') || msg.includes('Rate limit')) {
        addMessage('⏳ Muitas requisições. Aguarde 1 minuto e tente novamente.');
      } else if (msg.includes('insufficient_quota')) {
        addMessage('💳 Sem créditos na conta OpenAI. Adicione saldo em platform.openai.com.');
      } else if (msg.includes('cortada')) {
        if (retryCount < 1) {
          addMessage('✂️ Resposta cortada pela API. Tentando novamente...');
          setRetryCount((c) => c + 1);
          await delay(1000);
          return generateWorkout(key);
        }
        addMessage('✂️ Resposta cortada duas vezes. Tente novamente mais tarde.');
      } else {
        addMessage(`❌ ${msg}`);
      }
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
