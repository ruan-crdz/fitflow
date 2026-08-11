import { useProfileStore } from '@/stores/useProfileStore';
import { useCycleStore, CYCLE_PHASES } from '@/stores/useCycleStore';
import { useFoodStore } from '@/stores/useFoodStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useHealthIntegrationStore } from '@/stores/useHealthIntegrationStore';
import { getAIConfigPrompt, SCIENCE_GUARDRAILS } from '@/stores/useAIConfigStore';
import { calculateTDEE, calculateMacros } from '@/utils/calories';
import { buildEvidenceContext, extractSourceIds, getEvidenceByIds, getEvidenceForQuery, isScientificQuery } from '@/utils/evidence';
import { calculateWaterIntake } from '@/utils/water';
import type { Profile, WorkoutType } from '@/types';

const BASE_SYSTEM_PROMPT = `Você é a GymPilot AI, assistente fitness pessoal integrada ao app GymPilot.
Você é direta, motivadora e científica. Responde em português brasileiro.
Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.

Você recebeu um snapshot recente dos dados do aluno:
- Perfil completo (peso, altura, idade, objetivo, nível)
- Alimentação do dia (tudo que comeu, calorias, macros)
- Hidratação do dia (copos de água)
- Programa de treino atual (exercícios por treino)
- Histórico de treinos (frequência, sequência)
- Evolução de peso
- Fase do ciclo menstrual (se aplicável)

USE ESSES DADOS ATIVAMENTE nas respostas. Se perguntarem sobre mal-estar, trate alimentação e hidratação apenas como possíveis fatores.
Se perguntarem sobre desempenho, correlacione com nutrição e hidratação.
Dê alertas proativos (ex: "você só tomou 500ml de água, beba mais antes do treino").

Regras:
- Respostas curtas e práticas: no chat, responda em no máximo 2 parágrafos curtos ou 4 bullets.
- Quando falar de nutrição/treino, seja baseada em evidências
- Use emojis com moderação
- Nunca invente dados ou números sem base — use os dados reais fornecidos
- Se não souber algo, diga que não sabe
- Adapte conselhos ao perfil do aluno
- Se a fase do ciclo menstrual estiver informada, use como contexto e não como regra automática
- Quando o aluno reportar sintomas (mal-estar, dor de cabeça, fraqueza), analise os dados para contexto sem afirmar diagnóstico ou causalidade como certeza`;

function getSystemPrompt(): string {
  const { assistantName, personalityPrompt, personality } = getAIConfigPrompt();
  const toneLine = personality === 'tough'
    ? 'Seu tom é de bronca forte, cobrança prática e energia de acordar o aluno para agir agora. Mesmo dando bronca, seja curto: 1 chamada de atenção + 2 passos práticos.'
    : 'Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.';
  return BASE_SYSTEM_PROMPT
    .replace('GymPilot AI', assistantName)
    .replace('Você é direta, motivadora e científica.', `Personalidade configurada: ${personalityPrompt}`)
    .replace('Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.', toneLine)
    + `\n- Sempre que precisar falar seu nome, use exatamente: ${assistantName}.\n`
    + SCIENCE_GUARDRAILS;
}

const ACTION_PROMPT = `

AÇÕES NO APP:
- Se o aluno pedir para trocar, substituir ou renomear exercício no treino, confirme a intenção em texto curto e inclua no FINAL um bloco de ação oculto.
- Formato exato: [ACTION:{"type":"replace_exercise","scope":"all|workout","workoutType":"A|B|C|D|E","fromName":"nome atual","toName":"nome exato do catálogo"}]
- Use scope "workout" quando o aluno citar treino A/B/C/D/E; use scope "all" quando pedir troca geral.
- O toName deve existir exatamente no catálogo. Não inclua ACTION se não houver pedido claro de alteração.`;

function buildContext(profile: Profile): string {
  const cycle = useCycleStore.getState();
  const cycleInfo = cycle.phase !== 'none'
    ? `\n- Fase do ciclo: ${CYCLE_PHASES.find((c) => c.value === cycle.phase)?.label} (${CYCLE_PHASES.find((c) => c.value === cycle.phase)?.tip})`
    : '';

  const sexLabel = profile.sex === 'male' ? 'masculino' : 'feminino';
  const levelLabel = profile.experienceLevel === 'advanced' ? 'avançado'
    : profile.experienceLevel === 'intermediate' ? 'intermediário' : 'iniciante';
  const goalLabel = profile.goal === 'lose' ? 'perder gordura'
    : profile.goal === 'gain' ? 'ganhar massa' : 'manter peso';
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

  // Nutrition context
  const foodStore = useFoodStore.getState();
  const todayEntries = foodStore.getTodayEntries();
  const todayTotals = foodStore.getTodayTotals();
  const tdee = calculateTDEE(profile);
  const macroGoals = calculateMacros(tdee, profile.goal);
  const foodList = todayEntries.length > 0
    ? todayEntries.map((e) => `  • ${e.time} — ${e.name} (${e.calories}kcal, P:${e.protein}g C:${e.carbs}g G:${e.fat}g)`).join('\n')
    : '  Nenhuma refeição registrada hoje';

  // Water context
  const waterGlasses = useWaterStore.getState().getToday();
  const waterGoalGlasses = Math.round(calculateWaterIntake(profile.weight) * 4);
  const waterMl = waterGlasses * 250;
  const waterGoalMl = waterGoalGlasses * 250;
  const health = useHealthIntegrationStore.getState().getTodaySummary();

  // Weight trend
  const weightEntries = useWeightStore.getState().entries;
  const recentWeights = weightEntries.slice(-5);
  const weightTrend = recentWeights.length > 1
    ? `Últimos pesos: ${recentWeights.map((w) => `${w.date.slice(5)}: ${w.weight}kg`).join(', ')}`
    : '';

  // Workout history
  const history = useHistoryStore.getState();
  const totalWorkouts = history.getTotalWorkouts();
  const streak = history.getCurrentStreak();
  const lastSessions = history.sessions.slice(0, 3);
  const historyText = lastSessions.length > 0
    ? lastSessions.map((s) => {
      const label = s.workoutType ? `Treino ${s.workoutType}` : s.activityName || 'Atividade avulsa';
      return `  • ${s.date} — ${label} (${s.durationMs ? Math.round(s.durationMs / 60000) + 'min' : '?'}${s.completedAt ? ', completo' : ', incompleto'})`;
    }).join('\n')
    : '  Nenhum treino registrado';

  // Current program
  const customStore = useCustomWorkoutStore.getState();
  const activeSlots = customStore.activeSlots;
  const programText = activeSlots.map((type) => {
    const exs = customStore.getExercises(type);
    return `  Treino ${type}: ${exs.length} exercícios (${exs.map((e) => e.name).join(', ')})`;
  }).join('\n');

  return `
Dados do aluno:
- Nome: ${profile.name}
- Sexo biológico: ${sexLabel}
- Idade: ${profile.age} anos
- Peso: ${profile.weight}kg
- Altura: ${profile.height}cm
- Objetivo: ${goalLabel}
- Dias de treino: ${profile.trainingDays.length}x por semana
- Nível: ${levelLabel}${cycleInfo}
- Tempo por sessão: ${sessionDuration} min
- Local de treino: ${locationLabel}
- Training age: ${trainingAgeMonths} meses
- Equipamentos disponíveis: ${equipmentText}
- Exercícios preferidos: ${preferredText}
- Exercícios que evita: ${dislikedText}
- Limitações/dor: ${limitationsText}
- TDEE estimado: ${tdee} kcal/dia
- Atividade hoje: ${health.steps} passos, ${health.activeCalories} kcal ativas, fonte ${health.source}
${weightTrend ? `- ${weightTrend}` : ''}

ALIMENTAÇÃO HOJE:
${foodList}
  TOTAL: ${todayTotals.calories}kcal consumidas (meta: ${tdee}kcal) | P:${todayTotals.protein}g/${macroGoals.protein}g | C:${todayTotals.carbs}g/${macroGoals.carbs}g | G:${todayTotals.fat}g/${macroGoals.fat}g
  Restante: ${tdee - todayTotals.calories}kcal

HIDRATAÇÃO HOJE:
  ${waterMl}ml / ${waterGoalMl}ml (${waterGlasses}/${waterGoalGlasses} copos)${waterGlasses >= waterGoalGlasses ? '  Meta atingida' : ` — faltam ${waterGoalMl - waterMl}ml`}

PROGRAMA DE TREINO ATUAL:
${programText}

HISTÓRICO RECENTE:
${historyText}
  Total: ${totalWorkouts} treinos | Sequência atual: ${streak} semanas`;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ReplaceExerciseAction {
  type: 'replace_exercise';
  scope: 'all' | 'workout';
  workoutType?: WorkoutType;
  fromName: string;
  toName: string;
}

export interface AskAIOptions {
  jsonSchema?: Record<string, unknown>;
  schemaName?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function sendMessage(
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error('Perfil não encontrado');

  const systemMessage = getSystemPrompt() + ACTION_PROMPT + '\n' + buildContext(profile);

  const requestChat = (chatMessages: ChatMessage[], maxTokens: number) => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        ...chatMessages,
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  const response = await requestChat(messages, 700);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro na API');
  }

  const data = await response.json();
  if (data.choices[0].finish_reason === 'length') {
    const retryResponse = await requestChat([
      ...messages,
      {
        role: 'user',
        content: 'Sua resposta anterior ficou grande e foi cortada. Refaça em ate 500 caracteres, sem markdown quebrado, com no maximo 2 paragrafos curtos.',
      },
    ], 300);

    if (!retryResponse.ok) {
      const err = await retryResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Erro na API');
    }

    const retryData = await retryResponse.json();
    return retryData.choices[0].message.content;
  }
  return data.choices[0].message.content;
}

export async function sendMessageWithActions(
  apiKey: string,
  messages: ChatMessage[],
): Promise<{ reply: string; action: ReplaceExerciseAction | null }> {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error('Perfil não encontrado');

  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const scientificQuery = isScientificQuery(latestUserMessage);
  const evidenceItems = scientificQuery ? getEvidenceForQuery(latestUserMessage) : [];
  const evidenceContext = scientificQuery ? buildEvidenceContext(evidenceItems) : '';
  const scientificInstruction = scientificQuery
    ? `\n\nINSTRUÇÕES DE EVIDÊNCIA:\n- Para recomendações científicas/prescritivas, cite apenas IDs do EVIDENCE_CONTEXT no formato [SRC:ID1,ID2].\n- Não invente fontes.\n- Se não houver evidência suficiente no contexto, responda explicitamente: "Não encontrei evidência suficiente para afirmar isso com segurança."`
    : '';

  const systemMessage = `${getSystemPrompt()}\n${buildContext(profile)}${evidenceContext ? `\n\n${evidenceContext}` : ''}${scientificInstruction}\n\nQuando o usuário pedir troca/substituição de exercício, use a função replace_exercise. Se não houver pedido claro de alteração, responda apenas em texto.`;

  const requestChat = (chatMessages: ChatMessage[], maxTokens: number) => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        ...chatMessages,
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'replace_exercise',
            description: 'Solicita substituição de exercício no app quando o usuário pede para trocar/substituir exercício.',
            parameters: {
              type: 'object',
              additionalProperties: false,
              required: ['scope', 'fromName', 'toName'],
              properties: {
                scope: { type: 'string', enum: ['all', 'workout'] },
                workoutType: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'] },
                fromName: { type: 'string' },
                toName: { type: 'string' },
              },
            },
          },
        },
      ],
      tool_choice: 'auto',
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  const response = await requestChat(messages, 700);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro na API');
  }

  const data = await response.json();
  if (data.choices[0].finish_reason === 'length') {
    const retryResponse = await requestChat([
      ...messages,
      {
        role: 'user',
        content: 'Sua resposta anterior ficou grande e foi cortada. Refaça em ate 500 caracteres, com objetividade.',
      },
    ], 300);

    if (!retryResponse.ok) {
      const err = await retryResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Erro na API');
    }

    const retryData = await retryResponse.json();
    const retryContent = retryData.choices?.[0]?.message?.content?.trim() || '';
    return { reply: retryContent, action: null };
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content?.trim() || '';
  const toolCalls = choice?.message?.tool_calls as Array<{ function?: { name?: string; arguments?: string } }> | undefined;

  let action: ReplaceExerciseAction | null = null;
  if (toolCalls?.length) {
    const replaceCall = toolCalls.find((toolCall) => toolCall.function?.name === 'replace_exercise');
    if (replaceCall?.function?.arguments) {
      try {
        const args = JSON.parse(replaceCall.function.arguments) as {
          scope?: 'all' | 'workout';
          workoutType?: WorkoutType;
          fromName?: string;
          toName?: string;
        };
        if (args.scope && args.fromName && args.toName) {
          action = {
            type: 'replace_exercise',
            scope: args.scope,
            workoutType: args.workoutType,
            fromName: args.fromName,
            toName: args.toName,
          };
        }
      } catch {
        action = null;
      }
    }
  }

  let reply = content || (action ? 'Posso aplicar essa substituição no app. Quer que eu confirme agora?' : 'Não consegui responder com clareza. Tente reformular.');

  if (scientificQuery) {
    if (!evidenceItems.length) {
      reply = `${reply}\n\nNão encontrei evidência suficiente para afirmar isso com segurança.`;
    } else {
      const citedIds = extractSourceIds(reply);
      const validEvidence = getEvidenceByIds(citedIds);
      if (!validEvidence.length) {
        reply = `${reply}\n\nNão encontrei evidência suficiente para afirmar isso com segurança.`;
      } else {
        const refs = validEvidence.map((item) => `${item.sourceId} (${item.year})`).join(', ');
        if (!reply.includes('Fontes usadas:')) {
          reply = `${reply}\n\nFontes usadas: ${refs}`;
        }
      }
    }
  }

  return { reply, action };
}

export async function askAI(
  apiKey: string,
  profile: Profile,
  question: string,
  jsonModeOrOptions: boolean | AskAIOptions = false,
): Promise<string> {
  const options: AskAIOptions = typeof jsonModeOrOptions === 'boolean' ? {} : jsonModeOrOptions;
  const useStructuredOutput = typeof jsonModeOrOptions === 'boolean' ? jsonModeOrOptions : Boolean(options.jsonSchema);

  const responseFormat = useStructuredOutput
    ? {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: options.schemaName || 'fitflow_structured_response',
          strict: true,
          schema: options.jsonSchema || {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    }
    : {};

  const systemMessage = getSystemPrompt() + ACTION_PROMPT + '\n' + buildContext(profile);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: question },
      ],
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
      ...responseFormat,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ${response.status}`);
  }
  const data = await response.json();
  if (data.choices[0].finish_reason === 'length') {
    throw new Error('Resposta cortada — tente novamente');
  }
  return data.choices[0].message.content;
}
