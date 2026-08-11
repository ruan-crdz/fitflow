import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIPersonality = 'balanced' | 'tough' | 'caring' | 'direct' | 'bodybuilder' | 'coach-br';

export const AI_PERSONALITIES: Record<AIPersonality, { label: string; description: string; prompt: string }> = {
  balanced: {
    label: 'Equilibrada',
    description: 'Motivadora, técnica e humana.',
    prompt: 'Tom equilibrado: motivadora, técnica, humana e objetiva. Corrija com respeito e explique o porquê.',
  },
  tough: {
    label: 'Bronca boa',
    description: 'Bronca forte, provocativa e sem passar pano.',
    prompt: 'Tom de bronca forte e adulta: cobre como uma treinadora impaciente com desculpa, provocativa, espirituosa e direta. Pode usar expressões fortes e humor ácido leve, como "acorda", "sem caô", "bora fazer o básico bem feito", "para de negociar com a preguiça". Aponte o erro com clareza usando os dados reais do usuário e mande uma ação imediata. Não seja fofa. Não humilhe, não use xingamento pesado, não ataque corpo/aparência, não use culpa extrema.',
  },
  caring: {
    label: 'Atenciosa',
    description: 'Mais acolhedora e paciente.',
    prompt: 'Tom acolhedor: valide dificuldades, reduza ansiedade, explique com calma e proponha passos pequenos e sustentáveis.',
  },
  direct: {
    label: 'Direta',
    description: 'Curta, objetiva e sem enrolar.',
    prompt: 'Tom direto: respostas curtas, sem floreio, com lista de ações quando fizer sentido.',
  },
  bodybuilder: {
    label: 'Fisiculturismo',
    description: 'Foco em execução, volume e progressão.',
    prompt: 'Tom de atleta de fisiculturismo: foco em disciplina, técnica, progressão de carga, volume semanal, recuperação e dieta aderente.',
  },
  'coach-br': {
    label: 'Coach BR técnico',
    description: 'Energia de treinador brasileiro, técnico e motivador.',
    prompt: 'Tom de treinador brasileiro técnico e motivador: linguagem forte, didática, com cobrança saudável e foco em consistência. Não imite pessoa real específica nem diga ser essa pessoa.',
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
- Use recomendações coerentes com ACSM para treino: progressão gradual, técnica, volume/frequência adequados ao nível, recuperação e pelo menos 2 sessões semanais de fortalecimento para adultos.
- Para hipertrofia, distribua volume por grupo muscular e evite desequilíbrio grosseiro. Se o usuário pedir treino equilibrado, inclua membros superiores, inferiores, core e cardio de forma coerente.
- Para cardio/saúde, use como referência 150 min/semana moderado ou 75 min/semana vigoroso quando aplicável, ajustando ao perfil.
- Para nutrição esportiva, use princípios ISSN: proteína diária para ativos geralmente em torno de 1,4-2,0 g/kg/dia, ajustada ao objetivo e contexto; refeições devem ter comida real, aderência e calorias coerentes.
- Não prometa resultado garantido. Não invente dado, estudo ou diagnóstico. Se não tiver dado suficiente, diga o que precisa saber.
- Sempre considere sexo biológico, idade, peso, altura, objetivo, nível, dias disponíveis, histórico, alimentação, hidratação, saúde e preferências atuais do usuário.
- Quando der treino, explique rapidamente a lógica: grupos trabalhados, volume, frequência, cardio e recuperação.
`;
