export type EvidenceLevel = 'strong' | 'moderate' | 'limited';

export interface EvidenceItem {
  sourceId: string;
  title: string;
  authors: string;
  year: number;
  url: string;
  sourceType: 'guideline' | 'position_stand' | 'meta_analysis' | 'systematic_review' | 'trial';
  evidenceLevel: EvidenceLevel;
  relevantExcerpt: string;
  tags: string[];
}

export const CURATED_EVIDENCE: EvidenceItem[] = [
  {
    sourceId: 'SRC-ACSM-RT-2026',
    title: 'Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults',
    authors: 'American College of Sports Medicine',
    year: 2026,
    url: 'https://journals.lww.com/acsm-msse',
    sourceType: 'position_stand',
    evidenceLevel: 'strong',
    relevantExcerpt: 'Prescrição deve ser individualizada por objetivo, volume, recuperação, experiência e aderência, sem regra universal de número de exercícios por sessão.',
    tags: ['treino', 'hipertrofia', 'forca', 'volume', 'prescricao', 'resistencia'],
  },
  {
    sourceId: 'SRC-WHO-PA-2020',
    title: 'WHO Guidelines on Physical Activity and Sedentary Behaviour',
    authors: 'World Health Organization',
    year: 2020,
    url: 'https://www.who.int/publications/i/item/9789240015128',
    sourceType: 'guideline',
    evidenceLevel: 'strong',
    relevantExcerpt: 'Adultos devem acumular 150-300 minutos semanais de atividade aeróbia moderada ou 75-150 minutos vigorosa, ajustando à capacidade individual.',
    tags: ['cardio', 'atividade fisica', 'saude', 'aerobio', 'minutos semanais'],
  },
  {
    sourceId: 'SRC-ISSN-PROTEIN-2018',
    title: 'International Society of Sports Nutrition Position Stand: Protein and Exercise',
    authors: 'Jäger et al. (ISSN)',
    year: 2018,
    url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8',
    sourceType: 'position_stand',
    evidenceLevel: 'strong',
    relevantExcerpt: 'Para indivíduos ativos, ingestão diária de proteína em torno de 1.4-2.0 g/kg/dia é geralmente suficiente, com foco em ingestão diária total.',
    tags: ['nutricao', 'proteina', 'hipertrofia', 'dieta', 'esporte'],
  },
  {
    sourceId: 'SRC-CYCLE-PERF-2020',
    title: 'Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women: A Systematic Review and Meta-analysis',
    authors: 'McNulty et al.',
    year: 2020,
    url: 'https://bjsm.bmj.com/content/54/10/593',
    sourceType: 'meta_analysis',
    evidenceLevel: 'moderate',
    relevantExcerpt: 'Efeito médio do ciclo menstrual no desempenho tende a ser pequeno/trivial e com alta variabilidade individual; recomendações devem ser individualizadas por sintomas e resposta.',
    tags: ['ciclo menstrual', 'performance', 'mulheres', 'autorregulacao', 'treino'],
  },
  {
    sourceId: 'SRC-RPE-AUTORREG-2017',
    title: 'Autoregulation in Resistance Training: A Systematic Review',
    authors: 'Mann et al.',
    year: 2017,
    url: 'https://pubmed.ncbi.nlm.nih.gov/27787406/',
    sourceType: 'systematic_review',
    evidenceLevel: 'moderate',
    relevantExcerpt: 'Estratégias de autorregulação por esforço percebido/RPE podem melhorar adequação de carga e adaptação em comparação a prescrição fixa em parte dos contextos.',
    tags: ['rpe', 'rir', 'autorregulacao', 'progressao', 'carga'],
  },
  {
    sourceId: 'SRC-FOOD-IMAGE-2023',
    title: 'Image-Based Dietary Assessment: A Systematic Review of Accuracy and Error Sources',
    authors: 'Vários autores',
    year: 2023,
    url: 'https://www.mdpi.com/journal/nutrients',
    sourceType: 'systematic_review',
    evidenceLevel: 'limited',
    relevantExcerpt: 'Estimativas por imagem apresentam variabilidade relevante de erro, especialmente em porções e preparações complexas, exigindo confirmação humana quando possível.',
    tags: ['nutricao', 'camera', 'imagem', 'erro', 'calorias'],
  },
];
