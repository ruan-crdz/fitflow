import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';
import { askAI } from '@/utils/ai';
import { SCIENCE_GUARDRAILS } from '@/stores/useAIConfigStore';
import { buildEvidenceContext, getEvidenceForQuery } from '@/utils/evidence';
import { AI_SETUP_SCHEMA } from '@/constants/aiSchemas';
import { validateGeneratedPlan } from '@/utils/planValidator';

type Phase = 'generating' | 'summary';

interface GeneratedWorkout {
  type: string;
  focus: string;
  cardio?: { type: string; durationMin: number; intensity: string };
  estimatedCalories?: number;
  exercises: { name: string; sets: number; repsMin: number; repsMax: number; muscleGroup: string }[];
}

export function AISetup() {
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.profile)!;

  const [phase, setPhase] = useState<Phase>('generating');
  const [messages, setMessages] = useState<string[]>([]);
  const [workouts, setWorkouts] = useState<GeneratedWorkout[]>([]);

  const trainingDays = profile.trainingDays.length || 3;
  const goalLabel = profile.goal === 'lose' ? 'perder gordura' : profile.goal === 'gain' ? 'ganhar massa muscular' : 'manter peso';
  const levelLabel = profile.experienceLevel === 'advanced' ? 'avançado' : profile.experienceLevel === 'intermediate' ? 'intermediário' : 'iniciante';

  useEffect(() => {
    if (phase === 'generating') void generateWorkout();
  }, []);

  const addMessage = (msg: string) => {
    setMessages((prev) => [...prev, msg]);
  };

  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  const generateWorkout = async () => {
    setHasError(false);
    if (messages.length === 0) {
      addMessage(`Olá, ${profile.name}! `);
      await delay(800);
      addMessage(`Vi que você treina ${trainingDays}x por semana e é ${levelLabel}. Deixa eu avaliar a melhor estratégia de divisão pra você...`);
      await delay(1200);
      addMessage(`Seu objetivo é ${goalLabel}. Vou adaptar volume e seleção de exercícios ao seu contexto real de treino.`);
      await delay(1000);
      addMessage(`Avaliando opções de split (Full Body, Upper/Lower, ABC, ABCD, ABCDE)... `);
    }

    const grouped: Record<string, string[]> = {};
    for (const e of EXERCISE_CATALOG) {
      (grouped[e.muscleGroup] ??= []).push(e.name);
    }
    const catalogCompact = Object.entries(grouped)
      .map(([g, names]) => `${g}: ${names.join(', ')}`)
      .join('\n');

    const focusLabel = profile.trainingFocus === 'upper' ? 'foco em superiores (mais volume de peito/costas/ombros/braços)'
      : profile.trainingFocus === 'lower' ? 'foco em inferiores (mais volume de glúteos/quadríceps/posterior)'
      : profile.trainingFocus === 'custom' ? 'personalizado (ver divisão abaixo)'
      : 'equilibrado (volume igual para todos os grupos)';
    const locationLabel = profile.trainingLocation === 'casa'
      ? 'casa'
      : profile.trainingLocation === 'hibrido'
        ? 'híbrido (casa + academia)'
        : 'academia';
    const sessionDuration = profile.sessionDurationMin || 60;
    const trainingAgeMonths = profile.trainingAgeMonths ?? 0;
    const equipmentText = (profile.equipmentAccess || []).join(', ') || 'não informado';
    const preferredText = (profile.preferredExercises || []).join(', ') || 'não informado';
    const dislikedText = (profile.dislikedExercises || []).join(', ') || 'não informado';
    const limitationsText = (profile.limitations || []).join(', ') || 'não informado';

    const customSplitInfo = profile.trainingFocus === 'custom' && profile.customSplit
      ? '\nDIVISÃO PERSONALIZADA PELO USUÁRIO:\n' + Object.entries(profile.customSplit).map(([k, v]) => `- Treino ${k}: ${v}`).join('\n')
      : '';

    const sexLabel = profile.sex === 'male' ? 'masculino' : profile.sex === 'female' ? 'feminino' : 'não informado';

    const prompt = `Você é um preparador físico esportivo com pós-graduação em fisiologia do exercício.

PERFIL DO ALUNO:
  - Sexo biológico informado: ${sexLabel}
- Idade: ${profile.age} anos
- Peso: ${profile.weight}kg, Altura: ${profile.height}cm
- Objetivo: ${goalLabel}
- Dias disponíveis: ${trainingDays}x por semana
- Nível: ${levelLabel}
- Tempo disponível por sessão: ${sessionDuration} min
- Local de treino: ${locationLabel}
- Training age: ${trainingAgeMonths} meses
- Equipamentos disponíveis: ${equipmentText}
- Exercícios preferidos: ${preferredText}
- Exercícios evitados: ${dislikedText}
- Limitações/dor: ${limitationsText}
- Preferência: ${focusLabel}
${customSplitInfo}

DIRETRIZES BASEADAS EM EVIDÊNCIA POR FAIXA ETÁRIA E SEXO:
${profile.age >= 40 ? `- Acima de 40 anos: priorizar aquecimento articular, evitar cargas excessivas em compressão vertebral, incluir exercícios de mobilidade e estabilização. Preferir séries moderadas (10-15 reps) em vez de carga máxima. Recuperação entre sessões é mais lenta — evitar treinar o mesmo grupo em dias consecutivos.` : ''}
${profile.age >= 50 ? `- Acima de 50 anos: atenção especial a exercícios de equilíbrio e saúde óssea. Evitar impacto excessivo. Incluir trabalho de core/estabilização em todo treino.` : ''}
${profile.age < 25 ? `- Jovem (<25 anos): pode tolerar maior volume e frequência. Aproveitar janela hormonal para compostos pesados.` : ''}
${profile.sex === 'female' ? `- Mulher: considerar proporção de fibras tipo I vs II (mais resistência em membros inferiores). Maior volume de glúteo/posterior é fisiológicamente justificado. Se >40 anos, treino de força é essencial para prevenção de osteoporose — priorizar exercícios com carga axial (agachamento, terra).` : ''}
${profile.sex === 'male' ? `- Homem: distribuição natural de massa favorece tronco superior. Equilibrar com volume adequado de membros inferiores. Se >40 anos, incluir mobilidade de ombro e cuidado com articulações.` : ''}

SUA TAREFA — AVALIAÇÃO DE SPLIT:
Antes de montar o treino, avalie TODAS estas opções de divisão e classifique cada uma em: recommended, suitable, acceptable ou not_recommended considerando o perfil acima:

1. Full Body (2-3 treinos distintos, rotaciona nos ${trainingDays} dias)
2. Upper/Lower (2 treinos + possível Full Body no 5º dia)
3. ABC (3 treinos, rotaciona se >3 dias)
4. ABCD (4 treinos, sobram dias para repetir se >4 dias)
5. ABCDE (5 treinos distintos)

CRITÉRIOS DE AVALIAÇÃO:
- Recuperação adequada entre sessões do mesmo grupo muscular (48-72h)
- Volume total semanal adequado ao nível (iniciante: 10-12 séries/grupo/semana; intermediário: 12-16; avançado: 16-20)
- Frequência de estímulo por grupo muscular (2x/semana é ótimo para hipertrofia)
- Complexidade proporcional à experiência (iniciante não precisa de divisão ultra-específica)
- Aproveitamento dos dias disponíveis sem overtraining
- Para iniciantes: full body ou ABC rotativo geralmente ganha porque permite maior frequência de estímulo por grupo

IMPORTANTE: O número de treinos distintos NÃO precisa ser igual ao número de dias. Um iniciante que treina 5x pode fazer ABC rotativo (Sem1: A,B,C,A,B / Sem2: C,A,B,C,A). A IA DEVE escolher o split que maximize resultados, não o que "preenche" os dias.

REGRAS DE MONTAGEM:
1. Após escolher o split vencedor, monte os treinos
2. Cada treino de musculação deve ter entre 5 e 10 exercícios.
3. Se o foco de um treino tiver até 3 grupamentos principais (ex.: peito + tríceps + ombros), distribua no mínimo 2 exercícios por grupamento (evite 1 exercício isolado por grupo).
4. Respeite a preferência do aluno: ${focusLabel}
${profile.trainingFocus === 'custom' ? '5. Se o aluno especificou a divisão personalizada, SIGA-A. Monte os exercícios respeitando os grupos que ele pediu.' : '5. Priorize músculos e padrões de movimento com base em objetivo declarado, preferências, histórico, limitações e aderência. Nunca inferir preferência muscular por sexo biológico.'}
6. Cada exercício DEVE vir da lista abaixo (nome exato)
7. Explique a rotação semanal
8. Cardio é opcional e deve ser distribuído pela semana conforme objetivo, recuperação, preferência, disponibilidade e possível interferência com musculação.
9. Não retorne calorias exatas de treino como fato; se citar gasto, trate como estimativa ampla e com baixa precisão.

Exercícios disponíveis (use nomes EXATOS):
${catalogCompact}

Responda APENAS JSON puro (sem markdown, sem \`\`\`):
${SCIENCE_GUARDRAILS}
{
  "evaluation": [
    {"option": "Full Body", "tier": "recommended", "reason": "razão curta"},
    {"option": "Upper/Lower", "tier": "suitable", "reason": "razão curta"},
    {"option": "ABC", "tier": "recommended", "reason": "razão curta"},
    {"option": "ABCD", "tier": "acceptable", "reason": "razão curta"},
    {"option": "ABCDE", "tier": "not_recommended", "reason": "razão curta"}
  ],
  "chosenSplit": "ABC",
  "explanation": "Justificativa de por que este split venceu (2-3 frases)",
  "rotation": "Como rotacionar na semana (ex: Sem1: A,B,C,A,B / Sem2: C,A,B,C,A)",
  "workouts": [
    {
      "type": "A",
      "focus": "foco do treino",
      "cardio": {"type": "Esteira", "durationMin": 20, "intensity": "moderado"},
      "exercises": [
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"}
      ]
    }
  ],
  "evidenceIds": ["SRC-ACSM-RT-2026"]
}`;

    try {
      const evidence = getEvidenceForQuery(`prescrição de treino ${profile.goal} ${trainingDays} dias por semana`);
      if (evidence.length === 0) {
        addMessage('Não encontrei evidência suficiente para montar um plano científico com segurança agora.');
        setHasError(true);
        return;
      }
      const groundedPrompt = `${prompt}\n\n${buildEvidenceContext(evidence)}\n\nUse APENAS sourceIds do EVIDENCE_CONTEXT no campo evidenceIds.`;
      const response = await askAI(null, profile, groundedPrompt, {
        schemaName: 'ai_setup_plan',
        jsonSchema: AI_SETUP_SCHEMA,
      }, 'workout_builder');
      const parsed = JSON.parse(response);
      const planErrors = validateGeneratedPlan(parsed, trainingDays);
      if (planErrors.length > 0) {
        addMessage(planErrors[0]);
        addMessage('Tente novamente para gerar um plano com segurança e consistência.');
        setHasError(true);
        return;
      }
      if (parsed.workouts?.length > 0) {
        setWorkouts(parsed.workouts);

          // Show evaluation scores
          if (parsed.evaluation?.length) {
            const tierRank: Record<string, number> = {
              recommended: 4,
              suitable: 3,
              acceptable: 2,
              not_recommended: 1,
            };
            const sortedEval = [...parsed.evaluation].sort((a: { tier?: string }, b: { tier?: string }) => (tierRank[b.tier || 'acceptable'] || 0) - (tierRank[a.tier || 'acceptable'] || 0));
            const winner = sortedEval[0];
            const scoreBoard = sortedEval
              .map((e: { option: string; tier?: string }) => `${e.option}: ${e.tier || 'acceptable'}`)
              .join(' • ');
      addMessage(`Avaliação: ${scoreBoard}`);
            await delay(600);
            addMessage(`Vencedor: ${parsed.chosenSplit || winner?.option || 'divisão sugerida'}`);
            await delay(400);
          }

          if (parsed.explanation) addMessage(`${parsed.explanation}`);
          await delay(400);
          if (parsed.rotation) addMessage(`Rotação: ${parsed.rotation}`);

          // Save workouts to store and update activeSlots atomically
          const typeLetters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
          const generatedSlots: ('A' | 'B' | 'C' | 'D' | 'E')[] = [];
          const newCw: Record<string, unknown> = { A: null, B: null, C: null, D: null, E: null };
          parsed.workouts.forEach((w: GeneratedWorkout, wi: number) => {
            const type = typeLetters[wi];
            if (!type) return;
            w.type = type;
            generatedSlots.push(type);
            newCw[type] = w.exercises.map((ex: { name: string; sets: number; repsMin: number; repsMax: number; muscleGroup: string }, i: number) => {
              const catalogItem = EXERCISE_CATALOG.find(
                (c) => c.name.toLowerCase() === ex.name.toLowerCase()
                  || c.name.toLowerCase().includes(ex.name.toLowerCase().slice(0, 12)),
              );
              return {
                id: `ai_${type}_${i}_${Date.now()}`,
                name: catalogItem?.name || ex.name,
                sets: ex.sets || 3,
                repsMin: ex.repsMin || 8,
                repsMax: ex.repsMax || 12,
                muscleGroup: catalogItem?.muscleGroup || ex.muscleGroup,
                image: catalogItem?.image,
              };
            });
          });
          useCustomWorkoutStore.setState({ customWorkouts: newCw as any, activeSlots: generatedSlots });

          setPhase('summary');
        } else {
          addMessage('Hmm, não consegui gerar os treinos.');
          setHasError(true);
        }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      if (msg.includes('429') || msg.includes('Rate limit')) {
        addMessage('Muitas requisições. Águarde 1 minuto e tente novamente.');
      } else if (msg.includes('cortada')) {
        if (retryCount < 1) {
          addMessage('Resposta cortada pela API. Tentando novamente...');
          setRetryCount((c) => c + 1);
          await delay(1000);
          return generateWorkout();
        }
        addMessage('Resposta cortada duas vezes. Tente novamente mais tarde.');
      } else {
        addMessage(` ${msg}`);
      }
      setHasError(true);
    }
  };

  const handleDone = () => navigate('/plans');

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 py-12">
      <AnimatePresence mode="wait">
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
              {!hasError && workouts.length === 0 && (
                <div className="flex gap-1.5 px-4 py-3">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              {hasError && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setRetryCount(0); void generateWorkout(); }}
                    className="btn-primary flex-1 py-3 text-sm"
                  >
                    Rotação: Tentar novamente
                  </button>
                  <button
                    onClick={() => navigate('/plans')}
                    className="flex-1 py-3 rounded-xl bg-dark-200 text-white/50 text-sm"
                  >
                    Pular
                  </button>
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
            <h2 className="text-xl font-bold mb-1">Seu treino está pronto! </h2>
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
                  {w.cardio && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                      <span className="text-xs"></span>
                      <p className="text-xs text-white/50">
                        {w.cardio.type} — {w.cardio.durationMin}min ({w.cardio.intensity})
                      </p>
                    </div>
                  )}
                  {w.estimatedCalories && (
                    <p className="text-xs text-orange-400/70 mt-1">~{w.estimatedCalories} kcal estimadas</p>
                  )}
                </div>
              ))}

              {messages.filter((m) => m.length > 0).map((m, i) => (
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
