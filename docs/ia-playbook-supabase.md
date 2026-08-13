# IA Playbook no Supabase

Este guia define como alimentar uma base propria de regras para a IA usar primeiro.

## Prioridade de fontes

1. Playbook interno no Supabase (fonte primaria)
2. Evidencias curadas locais do app
3. Fallback deterministico do codigo (sem IA)

## Tabela criada

Tabela: public.ai_knowledge_rules

Campos principais:
- id (uuid, pk)
- owner_id (uuid, opcional, referencia auth.users)
- rule_key (text, chave estável para upsert idempotente)
- feature (text)
- title (text)
- rule_condition (jsonb)
- recommendation (text)
- evidence_ref (text, opcional)
- source_type (text)
- source_title (text)
- source_authors (text)
- source_journal (text)
- source_year (int)
- source_url (text)
- source_doi (text)
- source_quality (high|moderate|low|very_low)
- source_notes (text, opcional)
- priority (int, 1-1000, menor = mais prioritario)
- is_active (boolean)
- review_status (pending_human_review|approved|rejected)
- created_at / updated_at

Valores aceitos em source_type (setup atual):
- guideline
- meta_analysis
- systematic_review
- rct
- cohort
- expert_consensus
- internal_protocol
- position_stand
- position_statement
- systematic_review_meta_analysis
- meta_regression
- umbrella_review

## Schema de condition para insert

Use este formato JSON no campo rule_condition:

```json
{
  "goalIn": ["gain", "lose", "maintain"],
  "experienceIn": ["beginner", "intermediate", "advanced"],
  "focusIn": ["balanced", "upper", "lower", "custom"],
  "trainingLocationIn": ["academia", "casa", "hibrido"],
  "sexIn": ["male", "female", "undisclosed"],
  "trainingDaysMin": 3,
  "trainingDaysMax": 6,
  "ageMin": 18,
  "ageMax": 45,
  "weightMin": 50,
  "weightMax": 120,
  "heightMin": 150,
  "heightMax": 200,
  "sessionDurationMin": 45,
  "sessionDurationMax": 90,
  "requiresCustomSplit": true,
  "customSplitIncludesAny": ["peito", "costas", "perna"],
  "preferredIncludesAny": ["supino", "agachamento"],
  "dislikedIncludesAny": ["burpee", "afundo"],
  "limitationsIncludesAny": ["ombro", "lombar", "joelho"],
  "equipmentIncludesAny": ["halter", "barra", "elastico"],
  "promptIncludesAny": ["hipertrofia", "fortalecimento"]
}
```

Regras:
- Todos os campos sao opcionais.
- Dentro de um campo de lista, a regra passa se houver qualquer item compativel.
- Entre campos diferentes, a regra so passa se todos os campos presentes passarem.

## Inserts prontos (exemplos)

### 1) Regra global para iniciantes com foco em hipertrofia

```sql
insert into public.ai_knowledge_rules (
  owner_id,
  rule_key,
  feature,
  title,
  rule_condition,
  recommendation,
  evidence_ref,
  source_type,
  source_title,
  source_authors,
  source_journal,
  source_year,
  source_url,
  source_doi,
  source_quality,
  source_notes,
  priority,
  is_active,
  review_status
)
values (
  null,
  'rule.unique.exemplo.001',
  'workout_builder',
  'Iniciante hipertrofia 3-4 dias',
  jsonb_build_object(
    'goalIn', jsonb_build_array('gain'),
    'experienceIn', jsonb_build_array('beginner'),
    'trainingDaysMin', 3,
    'trainingDaysMax', 4
  ),
  'Priorizar full body ou ABC rotativo, 6-8 exercicios por treino, progressao de carga semanal conservadora, evitando falha total em todos os exercicios.',
  'ACSM 2026; NSCA Hypertrophy Position Stand',
  'position_stand',
  'American College of Sports Medicine Position Stand ...',
  'Currier BS et al.',
  'Medicine & Science in Sports & Exercise',
  2026,
  'https://doi.org/10.1249/MSS.0000000000003897',
  '10.1249/MSS.0000000000003897',
  'high',
  'Fonte principal para adultos saudaveis.',
  20,
  true,
  'pending_human_review'
);
```

### 2) Regra para custom split com limitacao de ombro

```sql
insert into public.ai_knowledge_rules (
  owner_id,
  rule_key,
  feature,
  title,
  rule_condition,
  recommendation,
  evidence_ref,
  source_type,
  source_title,
  source_authors,
  source_journal,
  source_year,
  source_url,
  source_doi,
  source_quality,
  source_notes,
  priority,
  is_active,
  review_status
)
values (
  null,
  'rule.unique.exemplo.002',
  'workout_builder',
  'Custom split com dor no ombro',
  jsonb_build_object(
    'focusIn', jsonb_build_array('custom'),
    'requiresCustomSplit', true,
    'limitationsIncludesAny', jsonb_build_array('ombro')
  ),
  'Reduzir press acima da cabeca e priorizar planos escapulares estaveis; usar variacoes com pegada neutra e progressao por RIR 2-3.',
  'Clinical Shoulder Rehabilitation Review 2024',
  'systematic_review_meta_analysis',
  'Clinical Shoulder Rehabilitation Review 2024',
  'Autores da revisao',
  'Journal X',
  2024,
  'https://...',
  null,
  'moderate',
  'Guardrail de seguranca, nao protocolo de fisioterapia.',
  10,
  true,
  'pending_human_review'
);
```

### 3) Regra pessoal por usuario (owner_id)

```sql
insert into public.ai_knowledge_rules (
  owner_id,
  rule_key,
  feature,
  title,
  rule_condition,
  recommendation,
  source_type,
  source_title,
  source_authors,
  source_journal,
  source_year,
  source_url,
  source_doi,
  source_quality,
  source_notes,
  priority,
  is_active,
  review_status
)
values (
  'COLOQUE_AQUI_O_UUID_DO_USUARIO',
  'rule.unique.exemplo.003',
  'chat',
  'Tom objetivo para acompanhamento diario',
  jsonb_build_object(
    'promptIncludesAny', jsonb_build_array('check-in', 'progresso')
  ),
  'Responder em formato curto: status atual, 2 ajustes praticos e uma acao para hoje.',
  'internal_protocol',
  'Playbook interno de comunicacao',
  'Equipe GymPilot',
  null,
  null,
  null,
  null,
  'moderate',
  'Regra de estilo de resposta.',
  50,
  true,
  'approved'
);
```

## Como salvar em lote

Se voce tiver varias regras, monte um CSV/JSON e rode inserts em lote no SQL Editor.
Recomendacao pratica:
- Comece com 20 a 40 regras de alta prioridade
- Use prioridade 1-30 para regras obrigatorias
- Use prioridade 31-200 para regras de contexto

## Como a IA usa isso hoje

- O app busca regras ativas por feature no Supabase.
- Faz matching das condicoes com o perfil + texto da solicitacao.
- Injeta as regras batidas no prompt como PLAYBOOK_SUPABASE.
- O prompt instrui explicitamente a IA a priorizar essas regras.
