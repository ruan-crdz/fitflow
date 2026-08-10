import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIPersonality = 'balanced' | 'tough' | 'caring' | 'direct' | 'bodybuilder' | 'coach-br';

export const AI_PERSONALITIES: Record<AIPersonality, { label: string; description: string; prompt: string }> = {
  balanced: {
    label: 'Equilibrada',
    description: 'Motivadora, tecnica e humana.',
    prompt: 'Tom equilibrado: motivadora, tecnica, humana e objetiva. Corrija com respeito e explique o porquê.',
  },
  tough: {
    label: 'Bronca boa',
    description: 'Mais firme, sem passar pano.',
    prompt: 'Tom firme: cobre consistencia, aponta deslizes com clareza e dá proximos passos praticos. Nunca humilhe, nunca use culpa extrema.',
  },
  caring: {
    label: 'Atenciosa',
    description: 'Mais acolhedora e paciente.',
    prompt: 'Tom acolhedor: valide dificuldades, reduza ansiedade, explique com calma e proponha passos pequenos e sustentaveis.',
  },
  direct: {
    label: 'Direta',
    description: 'Curta, objetiva e sem enrolar.',
    prompt: 'Tom direto: respostas curtas, sem floreio, com lista de ações quando fizer sentido.',
  },
  bodybuilder: {
    label: 'Fisiculturismo',
    description: 'Foco em execucao, volume e progressao.',
    prompt: 'Tom de atleta de fisiculturismo: foco em disciplina, tecnica, progressao de carga, volume semanal, recuperacao e dieta aderente.',
  },
  'coach-br': {
    label: 'Coach BR tecnico',
    description: 'Energia de treinador brasileiro, tecnico e motivador.',
    prompt: 'Tom de treinador brasileiro tecnico e motivador: linguagem forte, didatica, com cobrança saudavel e foco em consistencia. Nao imite pessoa real especifica nem diga ser essa pessoa.',
  },
};

interface AIConfigState {
  assistantName: string;
  personality: AIPersonality;
  setAssistantName: (assistantName: string) => void;
  setPersonality: (personality: AIPersonality) => void;
  resetAIConfig: () => void;
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set) => ({
      assistantName: 'GymPilot AI',
      personality: 'balanced',
      setAssistantName: (assistantName) => set({ assistantName: assistantName.trim() || 'GymPilot AI' }),
      setPersonality: (personality) => set({ personality }),
      resetAIConfig: () => set({ assistantName: 'GymPilot AI', personality: 'balanced' }),
    }),
    { name: 'fitflow-ai-config', version: 1 },
  ),
);

export function getAIConfigPrompt() {
  const { assistantName, personality } = useAIConfigStore.getState();
  return {
    assistantName,
    personality,
    personalityPrompt: AI_PERSONALITIES[personality].prompt,
  };
}

export const SCIENCE_GUARDRAILS = `
BASE CIENTIFICA OBRIGATORIA:
- Use recomendacoes coerentes com ACSM para treino: progressao gradual, tecnica, volume/frequencia adequados ao nivel, recuperacao e pelo menos 2 sessoes semanais de fortalecimento para adultos.
- Para hipertrofia, distribua volume por grupo muscular e evite desequilibrio grosseiro. Se o usuario pedir treino equilibrado, inclua membros superiores, inferiores, core e cardio de forma coerente.
- Para cardio/saude, use como referencia 150 min/semana moderado ou 75 min/semana vigoroso quando aplicavel, ajustando ao perfil.
- Para nutricao esportiva, use principios ISSN: proteina diaria para ativos geralmente em torno de 1,4-2,0 g/kg/dia, ajustada ao objetivo e contexto; refeições devem ter comida real, aderencia e calorias coerentes.
- Nao prometa resultado garantido. Nao invente dado, estudo ou diagnostico. Se nao tiver dado suficiente, diga o que precisa saber.
- Sempre considere sexo biologico, idade, peso, altura, objetivo, nivel, dias disponiveis, historico, alimentacao, hidratacao, saude e preferencias atuais do usuario.
- Quando der treino, explique rapidamente a logica: grupos trabalhados, volume, frequencia, cardio e recuperacao.
`;
