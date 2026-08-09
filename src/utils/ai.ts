import { useProfileStore } from '@/stores/useProfileStore';
import { useCycleStore, CYCLE_PHASES } from '@/stores/useCycleStore';
import type { Profile } from '@/types';

const SYSTEM_PROMPT = `Você é a FlowAI, assistente fitness pessoal integrada ao app FitFlow.
Você é direta, motivadora e científica. Responde em português brasileiro.
Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.

Regras:
- Respostas curtas e práticas (máximo 3 parágrafos)
- Quando falar de nutrição/treino, seja baseada em evidências
- Use emojis com moderação
- Nunca invente dados ou números sem base
- Se não souber algo, diga que não sabe
- Adapte conselhos ao perfil da usuária
- Se a fase do ciclo menstrual estiver informada, considere-a nas recomendações de intensidade e recuperação`;

function buildContext(profile: Profile): string {
  const cycle = useCycleStore.getState();
  const cycleInfo = cycle.phase !== 'none'
    ? `\n- Fase do ciclo: ${CYCLE_PHASES.find((c) => c.value === cycle.phase)?.label} (${CYCLE_PHASES.find((c) => c.value === cycle.phase)?.tip})`
    : '';

  return `
Dados da usuária:
- Nome: ${profile.name}
- Idade: ${profile.age} anos
- Peso: ${profile.weight}kg
- Altura: ${profile.height}cm
- Objetivo: ${profile.goal === 'lose' ? 'perder gordura' : profile.goal === 'gain' ? 'ganhar massa' : 'manter peso'}
- Treina 3x/semana (ABC: Superior, Posterior+Glúteos, Quad+Glúteos)
- Nível: iniciante retornando à academia${cycleInfo}`;
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

  const systemMessage = SYSTEM_PROMPT + '\n' + buildContext(profile);

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
): Promise<string> {
  const systemMessage = SYSTEM_PROMPT + '\n' + buildContext(profile);
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
