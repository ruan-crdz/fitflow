import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useCustomWorkoutStore, type CustomExercise } from '@/stores/useCustomWorkoutStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useToastStore } from '@/stores/useToastStore';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';
import type { WorkoutType } from '@/types';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { RichText } from '@/components/ui/RichText';
import { buildEvidenceContext, getEvidenceByIds, getEvidenceForQuery } from '@/utils/evidence';

interface Message {
  role: 'ai' | 'user' | 'system';
  content: string;
  options?: string[];
}

interface ReevalExerciseSuggestion {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  muscleGroup: string;
}

interface ReevalActionPayload {
  recommendation: string;
  newSplit?: string;
  removeDays?: string[];
  exercises?: Record<string, ReevalExerciseSuggestion[]>;
  evidenceIds?: string[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Falha desconhecida';
}

export function AIReeval() {
  const navigate = useNavigate();
  const apiKey = useAIStore((s) => s.apiKey);
  const profile = useProfileStore((s) => s.profile)!;
  const sessions = useHistoryStore((s) => s.sessions);
  const { activeSlots, getExercises } = useCustomWorkoutStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'chat' | 'done'>('chat');
  const [inputText, setInputText] = useState('');

  const totalWorkouts = sessions.filter((s) => s.completedAt).length;
  const recentSessions = sessions.filter((s) => s.completedAt).slice(-20);
  const avgRating = recentSessions.length > 0
    ? (recentSessions.reduce((a, s) => a + (s.rating || 3), 0) / recentSessions.length).toFixed(1)
    : 'N/A';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!apiKey) {
      setMessages([{ role: 'ai', content: 'Configure sua chave IA no Perfil para usar a reavaliação.' }]);
      return;
    }
    startConversation();
  }, []);

  const buildSystemPrompt = () => {
    const workoutSummary = activeSlots.map((type) => {
      const exs = getExercises(type);
      return `Treino ${type}: ${exs.map((e) => e.name).join(', ')} (${exs.length} exercícios, ${exs.reduce((a, e) => a + e.sets, 0)} séries)`;
    }).join('\n');
    const locationLabel = profile.trainingLocation === 'casa'
      ? 'Casa'
      : profile.trainingLocation === 'hibrido'
        ? 'Híbrido'
        : 'Academia';
    const equipmentText = (profile.equipmentAccess || []).join(', ') || 'não informado';
    const preferredText = (profile.preferredExercises || []).join(', ') || 'não informado';
    const dislikedText = (profile.dislikedExercises || []).join(', ') || 'não informado';
    const limitationsText = (profile.limitations || []).join(', ') || 'não informado';

    return `Você é um assistente de reavaliação de treino baseado em evidências. Seu papel é conduzir uma reavaliação profunda e responsável do programa de treino do aluno.

O aluno se chama ${profile.name}. Use o nome dele naturalmente na conversa.

PERFIL DO ALUNO:
- Nome: ${profile.name}
- Sexo: ${profile.sex === 'male' ? 'Masculino' : 'Feminino'}
- Idade: ${profile.age} anos
- Peso: ${profile.weight}kg, Altura: ${profile.height}cm
- Nível: ${profile.experienceLevel || 'intermediário'}
- Objetivo: ${profile.goal === 'lose' ? 'emagrecer' : profile.goal === 'gain' ? 'hipertrofia' : 'manutenção'}
- Dias de treino/semana: ${profile.trainingDays.length}
- Tempo por sessão: ${profile.sessionDurationMin || 60} min
- Local de treino: ${locationLabel}
- Training age: ${profile.trainingAgeMonths || 0} meses
- Equipamentos: ${equipmentText}
- Preferidos: ${preferredText}
- Evita: ${dislikedText}
- Limitações: ${limitationsText}
- Total de treinos realizados: ${totalWorkouts}
- Avaliação média dos treinos: ${avgRating}/5
- Treinos ativos: ${activeSlots.join(', ')} (${activeSlots.length} divisões)

TREINO ATUAL:
${workoutSummary}

COMO CONDUZIR A CONVERSA:
1. Seja empático, caloroso e profissional. Aja como alguém que realmente se importa.
2. Faça UMA pergunta por vez. Espere a resposta antes de prosseguir.
3. Investigue: disposição, recuperação, dores, motivação, objetivos mudaram?, quer mais desafio? quer algo mais leve?
4. Faça apenas as perguntas necessárias para completar os dados críticos: aderência, recuperação, dor, desempenho, preferência e objetivo.
5. Assim que houver dados suficientes, dê sua avaliação com recomendações concretas.
6. Se recomendar mudanças no app, chame a função apply_reevaluation_plan com payload estruturado.

REGRAS DE INTELIGÊNCIA:
- Iniciante com <20 treinos: NÃO recomende 5x. Sugira melhorias na execução.
- Intermediário (20-60 treinos): Pode considerar 4x se o aluno relata boa recuperação.
- Avançado (60+ treinos): Pode recomendar até 5x com periodização adequada.
- NUNCA recomende mais dias sem evidências de boa recuperação.
- Se o aluno pede algo mais leve/rápido, REDUZA os dias (ex: ABCD → ABC).
- Se o aluno está satisfeito e progredindo, valide isso! Não force mudanças.
- Use linguagem motivacional mas honesta. Não faça promessas irrealistas.
- É TOTALMENTE VÁLIDO reduzir de 4-5 dias pra 3. Menos com qualidade > mais sem consistência.

EXERCÍCIOS DISPONÍVEIS NO APP (use APENAS estes nomes):
${EXERCISE_CATALOG.map((e) => `${e.name} (${e.muscleGroup})`).join(', ')}

Comece cumprimentando ${profile.name} pelo nome e fazendo sua primeira pergunta investigativa.
NUNCA use placeholders como [nome], [seu nome] etc. Use o nome real: ${profile.name}.
Responda em texto natural no chat. Use a função apenas quando decidir aplicar alterações de treino.`;
  };

  const callAI = async (conversationMessages: { role: string; content: string }[]): Promise<{ reply: string; action: ReevalActionPayload | null }> => {
    const latestUser = [...conversationMessages].reverse().find((m) => m.role === 'user')?.content || '';
    const evidence = getEvidenceForQuery(`reavaliacao treino ${latestUser}`);
    const evidenceContext = evidence.length ? `\n\n${buildEvidenceContext(evidence)}\nUse apenas sourceIds desse contexto quando recomendar mudanças.` : '';
    const groundedMessages = conversationMessages.map((message, index) => (
      index === 0 && message.role === 'system'
        ? { ...message, content: `${message.content}${evidenceContext}` }
        : message
    ));

    const requestBody = {
      messages: groundedMessages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'apply_reevaluation_plan',
            description: 'Aplica ajustes de divisão e exercícios quando a reavaliação estiver concluída.',
            parameters: {
              type: 'object',
              additionalProperties: false,
              required: ['recommendation', 'evidenceIds'],
              properties: {
                recommendation: { type: 'string' },
                newSplit: { type: 'string', enum: ['ABC', 'ABCD', 'ABCDE'] },
                evidenceIds: {
                  type: 'array',
                  minItems: 1,
                  items: { type: 'string' },
                },
                removeDays: {
                  type: 'array',
                  items: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'] },
                },
                exercises: {
                  type: 'object',
                  additionalProperties: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['name', 'sets', 'repsMin', 'repsMax', 'muscleGroup'],
                      properties: {
                        name: { type: 'string' },
                        sets: { type: 'number' },
                        repsMin: { type: 'number' },
                        repsMax: { type: 'number' },
                        muscleGroup: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
      tool_choice: 'auto',
      max_tokens: 800,
      temperature: 0.8,
    };

    const callModel = async (model: 'gpt-4o-mini' | 'gpt-4o') => fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, ...requestBody }),
    });

    let response = await callModel('gpt-4o-mini');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `Erro ${response.status}`;
      if (response.status === 404 || response.status === 429 || msg.toLowerCase().includes('model')) {
        response = await callModel('gpt-4o');
      } else {
        throw new Error(msg);
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const content = (choice?.message?.content || '').trim();
    const toolCalls = choice?.message?.tool_calls as Array<{ function?: { name?: string; arguments?: string } }> | undefined;

    let action: ReevalActionPayload | null = null;
    if (toolCalls?.length) {
      const call = toolCalls.find((toolCall) => toolCall.function?.name === 'apply_reevaluation_plan');
      if (call?.function?.arguments) {
        try {
          action = JSON.parse(call.function.arguments) as ReevalActionPayload;
        } catch {
          action = null;
        }
      }
    }

    return {
      reply: content,
      action,
    };
  };

  const startConversation = async () => {
    setLoading(true);
    try {
      const systemMsg = buildSystemPrompt();
      const { reply } = await callAI([{ role: 'system', content: systemMsg }, { role: 'user', content: 'Oi, quero fazer uma reavaliação do meu treino.' }]);
      setMessages([{ role: 'ai', content: reply }]);
    } catch (error) {
      const message = getErrorMessage(error);
      setMessages([{ role: 'ai', content: `Desculpa, não consegui iniciar agora. Detalhe: ${message}` }]);
    }
    setLoading(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const systemMsg = buildSystemPrompt();
      const apiMessages = [
        { role: 'system', content: systemMsg },
        { role: 'user', content: 'Oi, quero fazer uma reavaliação do meu treino.' },
        ...newMessages.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
      ];

      const { reply, action } = await callAI(apiMessages);

      if (action) {
        const finalReply = reply || action.recommendation || 'Reavaliação concluída. Apliquei as alterações sugeridas.';
        setMessages([...newMessages, { role: 'ai', content: finalReply }]);
        await applyRecommendation(action);
        setPhase('done');
      } else {
        setMessages([...newMessages, { role: 'ai', content: reply }]);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setMessages([...newMessages, { role: 'ai', content: `Falhou ao responder agora. Detalhe: ${message}` }]);
    }
    setLoading(false);
  };

  const applyRecommendation = async (result: ReevalActionPayload) => {
    const toast = useToastStore.getState().show;
    const validEvidence = getEvidenceByIds(result.evidenceIds || []);
    if ((result.evidenceIds || []).length > 0 && validEvidence.length === 0) {
      toast('Não encontrei evidência válida para aplicar essa reavaliação com segurança.', 'error');
      return;
    }

    if (result.exercises) {
      const neededTypes = Object.keys(result.exercises).filter((t) => ['A', 'B', 'C', 'D', 'E'].includes(t)) as WorkoutType[];

      // Build new customWorkouts and set activeSlots in one atomic update
      const prev = useCustomWorkoutStore.getState().customWorkouts || { A: null, B: null, C: null, D: null, E: null };
      const newCw = { ...prev };

      for (const [type, exercises] of Object.entries(result.exercises)) {
        if (!['A', 'B', 'C', 'D', 'E'].includes(type)) continue;
        newCw[type as WorkoutType] = exercises.map((ex, i) => {
          const catalogItem = EXERCISE_CATALOG.find(
            (c) => c.name.toLowerCase() === ex.name.toLowerCase()
              || c.name.toLowerCase().includes(ex.name.toLowerCase().slice(0, 12)),
          );
          return {
            id: `reeval_${type}_${i}_${Date.now()}`,
            name: catalogItem?.name || ex.name,
            sets: ex.sets || 3,
            repsMin: ex.repsMin || 8,
            repsMax: ex.repsMax || 12,
            muscleGroup: catalogItem?.muscleGroup || ex.muscleGroup,
            image: catalogItem?.image,
          };
        });
      }

      // Remove days not in the new split
      if (result.removeDays) {
        for (const day of result.removeDays) {
          if (['A', 'B', 'C', 'D', 'E'].includes(day)) {
            newCw[day as WorkoutType] = null;
          }
        }
      }

      // Determine final active slots from what the AI recommended
      const finalSlots = neededTypes.length > 0 ? neededTypes : useCustomWorkoutStore.getState().activeSlots;

      useCustomWorkoutStore.setState({ customWorkouts: newCw as Record<WorkoutType, CustomExercise[] | null>, activeSlots: finalSlots });
      toast('Treinos atualizados!', 'success');
    } else if (result.removeDays && result.removeDays.length > 0) {
      // Only removing days without new exercises
      const store = useCustomWorkoutStore.getState();
      const slotsToRemove = result.removeDays.filter((d) => ['A', 'B', 'C', 'D', 'E'].includes(d)) as WorkoutType[];
      const newSlots = store.activeSlots.filter((s) => !slotsToRemove.includes(s));
      const prev = store.customWorkouts || { A: null, B: null, C: null, D: null, E: null };
      const newCw = { ...prev };
      for (const d of slotsToRemove) newCw[d] = null;
      useCustomWorkoutStore.setState({ customWorkouts: newCw as Record<WorkoutType, CustomExercise[] | null>, activeSlots: newSlots.length >= 2 ? newSlots : newSlots });
      toast('Treinos reduzidos conforme recomendação!', 'success');
    }
  };

  const quickOptions = [
    'Tô me sentindo forte, quero mais desafio',
    'Minha recuperação tá boa, durmo bem',
    'Quero adicionar mais um dia de treino',
    'Não mudou nada, só quero validar',
    'Tô com algumas dores, preciso adaptar',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[rgb(var(--color-bg-rgb))] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <MaterialIcon name="psychology" className="text-lg text-primary-300" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Reavaliação IA</h1>
              <p className="text-[10px] text-white/30">Reavaliação baseada em dados</p>
            </div>
          </div>
          <button onClick={() => navigate('/plans')} className="text-white/40 text-sm px-3 py-1"><MaterialIcon name="close" /></button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-[rgb(var(--color-bg-card-rgb))] border border-white/5 text-white/80 rounded-bl-sm'
                }`}
              >
                {msg.role === 'ai' ? <RichText text={msg.content} /> : msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[rgb(var(--color-bg-card-rgb))] border border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick options when conversation starts */}
        {messages.length === 1 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 pt-2"
          >
            {quickOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => sendMessage(opt)}
                className="px-3 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300 font-medium"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <MaterialIcon name="check_circle" className="text-4xl text-green-400 mx-auto mb-3" />
            <p className="text-sm text-white/60">Reavaliação concluída!</p>
            <button
              onClick={() => navigate('/plans')}
              className="mt-4 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm"
            >
              Ver meus treinos
            </button>
          </motion.div>
        )}
      </div>

      {/* Input */}
      {phase === 'chat' && (
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)}
              placeholder="Conte como você está..."
              className="input-field flex-1 py-3 text-sm"
              disabled={loading}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || loading}
              className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center disabled:opacity-30"
            >
              <span className="text-lg">↑</span>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
