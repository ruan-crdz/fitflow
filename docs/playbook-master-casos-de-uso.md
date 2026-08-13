# GymPilot - Documento Master para Base de Treino Cientifica no Supabase

Objetivo: permitir que voce use o ChatGPT para gerar uma base de regras de treino totalmente personalizada, com fonte cientifica rastreavel, para a IA do app priorizar seu conhecimento interno.

## 1) Resultado final esperado

Voce tera:
- Uma tabela de regras no Supabase que representa seu playbook tecnico.
- Regras por perfil, objetivo, disponibilidade, experiencia, limitacoes e preferencia.
- Metadados completos de fonte (tipo, titulo, autores, ano, DOI/URL, qualidade).
- Prioridade entre regras para resolver conflitos.
- Cobertura sistematica de casos, sem depender de memoria manual.

## 2) Arquitetura de decisao (ordem de prioridade)

1. Regras do Supabase (playbook interno)
2. Evidencias curadas locais do app
3. Fallback deterministico do codigo (sem IA)

Regra de ouro:
- A IA deve priorizar seu playbook quando houver regra aplicavel.

## 3) Estrutura de dados no banco

Tabela principal: public.ai_knowledge_rules

Campos de regra:
- id
- owner_id
- feature
- title
- rule_condition (jsonb)
- recommendation
- priority
- is_active

Campos de fonte cientifica:
- evidence_ref (resumo textual livre)
- source_type
- source_title
- source_authors
- source_journal
- source_year
- source_url
- source_doi
- source_quality
- source_notes

## 4) Dimensoes de personalizacao (espaco de casos)

Estas dimensoes definem o universo de casos possiveis.

Dimensoes basicas:
- Sexo biologico: male, female, undisclosed
- Idade: faixa continua (ex.: <18, 18-29, 30-39, 40-49, 50-59, 60+)
- Peso: faixa continua (ex.: <50, 50-69, 70-89, 90-109, 110+)
- Altura: faixa continua (ex.: <155, 155-169, 170-184, 185+)
- Objetivo: lose, maintain, gain
- Dias de treino por semana: 1-7
- Experiencia: beginner, intermediate, advanced
- Local: academia, casa, hibrido
- Duracao por sessao: curta, media, longa
- Foco: balanced, upper, lower, custom

Dimensoes tecnicas adicionais:
- Training age em meses
- Equipamentos disponiveis
- Exercicios preferidos
- Exercicios evitados
- Limitacoes/dor/lesao
- Split customizado (A/B/C/D/E)
- Contexto textual da solicitacao

Importante:
- "Todos os casos possiveis" em combinacao total pura e numericamente explosivo.
- A forma correta e cobrir 100% dos caminhos clinicamente relevantes com regras hierarquicas e matriz de interacoes.

## 5) Estrategia para cobrir literalmente todos os caminhos relevantes

Use 4 camadas de regras:

Camada A - Regras universais de seguranca
- Valem para qualquer perfil.
- Exemplo: progressao conservadora inicial, tecnica antes de carga, sinais de risco.

Camada B - Regras por objetivo e nivel
- Combinam objetivo + experiencia + dias de treino.
- Exemplo: beginner + gain + 3-4 dias.

Camada C - Regras por restricao e contexto
- Sobrepoem B quando ha limitacao, dor, equipamento limitado, pouco tempo.
- Exemplo: dor no ombro + casa + halter.

Camada D - Regras de refinamento
- Preferencias pessoais, estilo de comunicacao, detalhes de periodizacao.

Precedencia sugerida:
1. Seguranca/limitacao
2. Objetivo + experiencia
3. Disponibilidade (dias/tempo/local)
4. Preferencias
5. Ajustes finos

## 6) Taxonomia de casos de uso para gerar no ChatGPT

Peca para o ChatGPT gerar regras para cada bloco:

Bloco 1 - Objetivo x experiencia x frequencia:
- gain/maintain/lose x beginner/intermediate/advanced x 1..7 dias

Bloco 2 - Disponibilidade pratica:
- cada combinacao do bloco 1 com sessao curta/media/longa
- cada combinacao com academia/casa/hibrido

Bloco 3 - Foco de treino:
- balanced, upper, lower, custom
- para custom: com e sem restricao por grupamento

Bloco 4 - Restricoes clinicas funcionais:
- ombro, lombar, joelho, cervical, cotovelo, punho
- cada uma com severidade leve/moderada/alta

Bloco 5 - Equipamento:
- sem equipamento
- halter
- barra
- banco
- elastico
- combinacoes comuns

Bloco 6 - Perfil etario:
- 18-29, 30-39, 40-49, 50-59, 60+

Bloco 7 - Regras femininas especificas quando aplicavel:
- fase de ciclo (quando houver dado)
- recomenda-se contextualizar, nao engessar

Bloco 8 - Aderencia e motivacao:
- baixa aderencia historica
- alta aderencia historica

## 7) Como escrever o rule_condition

Formato geral:

```json
{
  "goalIn": ["gain"],
  "experienceIn": ["beginner"],
  "trainingDaysMin": 3,
  "trainingDaysMax": 4,
  "trainingLocationIn": ["academia", "hibrido"],
  "sessionDurationMin": 45,
  "sessionDurationMax": 75,
  "limitationsIncludesAny": ["ombro"],
  "equipmentIncludesAny": ["halter", "banco"]
}
```

Semantica:
- Campo ausente = nao filtra.
- Campo de lista = OR dentro do campo.
- Campos diferentes = AND entre campos.

## 8) Padrao minimo de qualidade por regra

Cada regra deve ter:
- title curto e identificavel
- recommendation especifica e acionavel
- source_type
- source_title
- source_year
- source_quality
- ao menos source_url ou source_doi
- priority coerente com criticidade

## 9) Prompt master para voce colar no ChatGPT

Use este prompt para gerar sua base em lote:

```text
Voce e um especialista em treinamento fisico baseado em evidencia.
Quero que voce gere regras para inserir no Supabase na tabela public.ai_knowledge_rules.

Objetivo:
- Cobrir sistematicamente casos de treino personalizados para meu app.
- Regras devem ser cientificas, praticas e com fonte rastreavel.

Formato de saida:
- Retorne apenas JSON array.
- Cada item deve ter exatamente estes campos:
  feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active.

Regras de modelagem:
- rule_condition deve usar somente as chaves permitidas:
  goalIn, experienceIn, focusIn, trainingLocationIn, sexIn,
  trainingDaysMin, trainingDaysMax,
  ageMin, ageMax, weightMin, weightMax, heightMin, heightMax,
  sessionDurationMin, sessionDurationMax,
  requiresCustomSplit,
  customSplitIncludesAny, preferredIncludesAny, dislikedIncludesAny,
  limitationsIncludesAny, equipmentIncludesAny, promptIncludesAny.
- recommendation deve ser objetiva e prescritiva.
- priority: 1 (maxima prioridade) a 1000 (minima).
- is_active: true.

Cobertura obrigatoria:
1) gain/maintain/lose x beginner/intermediate/advanced x 1..7 dias.
2) local: academia/casa/hibrido.
3) duracao: curta/media/longa.
4) foco: balanced/upper/lower/custom.
5) limitacoes: ombro/lombar/joelho/cervical.
6) faixa etaria: 18-29, 30-39, 40-49, 50-59, 60+.

Regras de evidencia:
- Nao inventar fonte.
- Informar nivel de qualidade em source_quality (high/moderate/low/very_low).
- Preferir guidelines, meta-analises e revisoes sistematicas.

Entregue em blocos de 100 regras por resposta para facilitar importacao.
```

## 10) Conversao de JSON para INSERT SQL

Depois que o ChatGPT gerar o JSON, use este template:

```sql
insert into public.ai_knowledge_rules (
  owner_id,
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
  is_active
)
values
-- repetir para cada item
(
  null,
  'workout_builder',
  'TITULO_DA_REGRA',
  '{"goalIn":["gain"],"experienceIn":["beginner"],"trainingDaysMin":3,"trainingDaysMax":4}'::jsonb,
  'RECOMENDACAO',
  'RESUMO DA EVIDENCIA',
  'guideline',
  'TITULO DA FONTE',
  'AUTORES',
  'JOURNAL',
  2024,
  'https://...',
  '10.xxxx/xxxx',
  'high',
  'OBS',
  20,
  true
);
```

## 11) Checklist de validacao antes de subir

Checklist de dado:
- Regra com recommendation vazia: rejeitar.
- Regra sem fonte estruturada: revisar.
- Prioridade fora da faixa: corrigir.
- Duplicidade sem diferenca de condition: remover.

Checklist de logica:
- Regra especifica deve ter prioridade maior que regra generica.
- Regra de seguranca deve vencer regra de performance.
- Regra de limitacao fisica deve sempre prevalecer.

Checklist de cobertura:
- Todas as 3 metas cobertas.
- Todos os 3 niveis cobertos.
- Frequencias 1..7 cobertas.
- Locais cobertos.
- Faixas etarias cobertas.
- Restricoes principais cobertas.

## 12) Exemplo real de regra premium (com fonte)

```json
{
  "feature": "workout_builder",
  "title": "Hipertrofia iniciante 3-4 dias com foco em aderencia",
  "rule_condition": {
    "goalIn": ["gain"],
    "experienceIn": ["beginner"],
    "trainingDaysMin": 3,
    "trainingDaysMax": 4
  },
  "recommendation": "Priorizar full body ou ABC rotativo, 6-8 exercicios por sessao, progressao de carga semanal conservadora, 1-3 RIR na maior parte das series.",
  "evidence_ref": "Diretrizes de treino de forca para hipertrofia em adultos saudaveis.",
  "source_type": "guideline",
  "source_title": "ACSM Position Stand Resistance Training",
  "source_authors": "American College of Sports Medicine",
  "source_journal": "Medicine and Science in Sports and Exercise",
  "source_year": 2026,
  "source_url": "https://...",
  "source_doi": "10.xxxx/xxxx",
  "source_quality": "high",
  "source_notes": "Aplicar progressao mais conservadora em iniciantes com baixa tecnica.",
  "priority": 20,
  "is_active": true
}
```

## 13) Escalabilidade recomendada

Plano de rollout:
- Fase 1: 50 regras nucleares de alta qualidade.
- Fase 2: 200-400 regras cobrindo variacoes por contexto.
- Fase 3: 1000+ regras com refinamento por preferencias e subcasos.

Operacao:
- Revisao humana em amostra semanal.
- Desativar regras ruins via is_active=false.
- Ajustar prioridade conforme conflito observado.

## 14) Observacao tecnica sobre "todos os casos possiveis"

Matematicamente, o numero de combinacoes completas e quase infinito (faixas continuas + texto livre).
A abordagem correta para "100%" no mundo real e:
- Cobertura total dos caminhos clinicos relevantes.
- Hierarquia de regras para casos fora da malha.
- Fallback deterministico seguro.

Esse documento foi desenhado exatamente para isso.
