import { useProfileStore } from '@/stores/useProfileStore';
import { useCycleStore, CYCLE_PHASES } from '@/stores/useCycleStore';
import { useFoodStore } from '@/stores/useFoodStore';
import { useWaterStore } from '@/stores/useWaterStore';
import { useWeightStore } from '@/stores/useWeightStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useHealthIntegrationStore } from '@/stores/useHealthIntegrationStore';
import { calculateTDEE, calculateMacros } from '@/utils/calories';
import { calculateWaterIntake } from '@/utils/water';
import type { Profile } from '@/types';

const SYSTEM_PROMPT = `Você é a GymPilot AI, assistente fitness pessoal integrada ao app GymPilot.
Você é direta, motivadora e científica. Responde em português brasileiro.
Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.

Você tem acesso em TEMPO REAL a TODOS os dados do aluno:
- Perfil completo (peso, altura, idade, objetivo, nível)
- Alimentação do dia (tudo que comeu, calorias, macros)
- Hidratação do dia (copos de água)
- Programa de treino atual (exercícios por treino)
- Histórico de treinos (frequência, sequência)
- Evolução de peso
- Fase do ciclo menstrual (se aplicável)

USE ESSES DADOS ATIVAMENTE nas respostas. Se perguntarem sobre mal-estar, analise o que foi comido.
Se perguntarem sobre desempenho, correlacione com nutrição e hidratação.
Dê alertas proativos (ex: "você só tomou 500ml de água, beba mais antes do treino").

Regras:
- Respostas curtas e práticas (máximo 3 parágrafos)
- Quando falar de nutrição/treino, seja baseada em evidências
- Use emojis com moderação
- Nunca invente dados ou números sem base — use os dados reais fornecidos
- Se não souber algo, diga que não sabe
- Adapte conselhos ao perfil do aluno
- Se a fase do ciclo menstrual estiver informada, considere-a nas recomendações
- Quando o aluno reportar sintomas (mal-estar, dor de cabeça, fraqueza), analise os dados nutricionais e de hidratação para dar contexto`;

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
    ? lastSessions.map((s) => `  • ${s.date} — Treino ${s.workoutType} (${s.durationMs ? Math.round(s.durationMs / 60000) + 'min' : '?'}${s.completedAt ? ', completo' : ', incompleto'})`).join('\n')
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
- TDEE estimado: ${tdee} kcal/dia
- Atividade hoje: ${health.steps} passos, ${health.activeCalories} kcal ativas, fonte ${health.source}
${weightTrend ? `- ${weightTrend}` : ''}

ALIMENTAÇÃO HOJE:
${foodList}
  TOTAL: ${todayTotals.calories}kcal consumidas (meta: ${tdee}kcal) | P:${todayTotals.protein}g/${macroGoals.protein}g | C:${todayTotals.carbs}g/${macroGoals.carbs}g | G:${todayTotals.fat}g/${macroGoals.fat}g
  Restante: ${tdee - todayTotals.calories}kcal

HIDRATAÇÃO HOJE:
  ${waterMl}ml / ${waterGoalMl}ml (${waterGlasses}/${waterGoalGlasses} copos)${waterGlasses >= waterGoalGlasses ? ' ✅ Meta atingida' : ` — faltam ${waterGoalMl - waterMl}ml`}

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

export async function sendMessage(
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error('Perfil não encontrado');

  const systemMessage = SYSTEM_PROMPT + ACTION_PROMPT + '\n' + buildContext(profile);

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
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro na API');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function askAI(
  apiKey: string,
  profile: Profile,
  question: string,
  jsonMode = false,
): Promise<string> {
  const systemMessage = SYSTEM_PROMPT + ACTION_PROMPT + '\n' + buildContext(profile);
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
      max_tokens: 4000,
      temperature: 0.7,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
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
