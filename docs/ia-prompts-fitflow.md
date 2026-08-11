# Documentacao Completa de Prompts de IA - FitFlow

Este documento lista TODOS os prompts usados no app para chamadas de IA (OpenAI), com origem, objetivo, payload e observacoes.

## 1) Camada base de IA (central)

Origem: src/utils/ai.ts

### 1.1 Prompt base de sistema (BASE_SYSTEM_PROMPT)

Texto base (resumo literal):
- Identidade: GymPilot AI, assistente fitness pessoal.
- Idioma: portugues brasileiro.
- Tom: personal trainer amiga, encorajadora e embasada.
- Diz que tem acesso em tempo real a:
  - perfil completo
  - alimentacao do dia
  - hidratacao do dia
  - programa de treino
  - historico de treinos
  - evolucao de peso
  - fase do ciclo menstrual
- Regras:
  - respostas curtas (ate 2 paragrafos curtos ou 4 bullets)
  - base em evidencias
  - sem inventar dados
  - adaptar ao perfil
  - considerar ciclo menstrual quando houver
  - ao relatar sintomas, correlacionar nutricao/hidratacao

### 1.2 Prompt dinamico de personalidade (getSystemPrompt)

Tambem em src/utils/ai.ts, com dados de src/stores/useAIConfigStore.ts:
- assistantName (nome configuravel)
- personalityPrompt (perfil de personalidade)
- personality special case para mode tough
- adiciona linha obrigatoria de nome:
  - Sempre que precisar falar seu nome, use exatamente: {assistantName}
- concatena SCIENCE_GUARDRAILS.

### 1.3 Guardrails cientificos (SCIENCE_GUARDRAILS)

Origem: src/stores/useAIConfigStore.ts

Inclui diretrizes obrigatorias com referencias de principios ACSM/ISSN, sem promessa de resultado, sem invencao de dados, e obrigatoriedade de considerar:
- sexo biologico
- idade
- peso
- altura
- objetivo
- nivel
- dias disponiveis
- historico
- alimentacao
- hidratacao
- saude
- preferencias

### 1.4 Prompt de acoes no app (ACTION_PROMPT)

Origem: src/utils/ai.ts

Instrui a IA a devolver acao oculta quando usuario pedir troca/substituicao de exercicio:

[ACTION:{"type":"replace_exercise","scope":"all|workout","workoutType":"A|B|C|D|E","fromName":"nome atual","toName":"nome exato do catalogo"}]

Regras:
- scope workout se citar treino especifico
- scope all se troca geral
- toName deve existir no catalogo

### 1.5 Contexto dinamico injetado em TODAS as chamadas centrais (buildContext)

Origem: src/utils/ai.ts

Campos inseridos no prompt:
- Nome
- Sexo biologico
- Idade
- Peso
- Altura
- Objetivo
- Dias de treino
- Nivel
- Fase do ciclo (se houver)
- TDEE
- Atividade hoje (passos, calorias ativas, fonte)
- Tendencia de peso recente
- Alimentacao do dia (itens + totais)
- Hidratacao do dia (ml, meta, faltante)
- Programa de treino atual (A-E com exercicios)
- Historico recente de treino
- Total de treinos e streak

### 1.6 API usada na camada central

Origem: src/utils/ai.ts

Endpoint: https://api.openai.com/v1/chat/completions

Modelos:
- gpt-4o-mini

Metodos:
- sendMessage(apiKey, messages)
  - max_tokens: 700
  - temperature: 0.7
  - fallback se truncar: manda novo prompt curto pedindo resposta <= 500 caracteres
- askAI(apiKey, profile, question, jsonMode)
  - max_tokens: 4000
  - temperature: 0.7
  - jsonMode: response_format json_object

Prompt extra de retry de truncamento (sendMessage):
- "Sua resposta anterior ficou grande e foi cortada. Refaça em ate 500 caracteres, sem markdown quebrado, com no maximo 2 paragrafos curtos."

## 2) Prompts por feature

## 2.1 Chat IA principal

Origem: src/pages/AIChat.tsx

Nao cria prompt proprio principal. Usa sendMessage() da camada central.

Prompt adicional de refacao por feedback negativo:
- "Feedback negativo: o usuario nao gostou da ultima resposta. Refaça a resposta anterior com mais precisao, mais alinhada ao perfil, sem inventar dados, usando base cientifica e respeitando a personalidade configurada."

Tambem interpreta bloco ACTION para aplicar troca de exercicio no app.

## 2.2 Setup IA para gerar divisao/treinos

Origem: src/pages/AISetup.tsx
Chamada: askAI(..., jsonMode=true)

Prompt enviado (estrutura completa):
- Papel: preparador fisico esportivo com pos em fisiologia
- Perfil do aluno:
  - sexo biologico
  - idade
  - peso/altura
  - objetivo
  - dias disponiveis
  - nivel
  - preferencia de foco
  - divisao customizada (se houver)
- Diretrizes por idade/sexo (blocos condicionais):
  - >=40
  - >=50
  - <25
  - sexo feminino
  - sexo masculino
- Pede avaliacao de split com score 0-10 para:
  - Full Body
  - Upper/Lower
  - ABC
  - ABCD
  - ABCDE
- Criterios de scoring:
  - recuperacao
  - volume semanal por nivel
  - frequencia por grupo
  - complexidade proporcional
  - aproveitamento dos dias
- Regras de montagem:
  - 5-8 exercicios por treino
  - respeitar preferencia
  - exercicios devem vir da lista exata
  - explicar rotacao semanal
  - incluir cardio por treino
  - estimar calorias por treino
- Injeta catalogo completo compactado por grupo
- Exige JSON puro com schema:
  - evaluation[]
  - chosenSplit
  - explanation
  - rotation
  - workouts[]

## 2.3 Reavaliacao IA conversacional

Origem: src/pages/AIReeval.tsx
Chamada direta via fetch (nao usa askAI)

System prompt (buildSystemPrompt):
- Papel: psicologo esportivo + personal trainer elite
- Obriga uso do nome real do aluno (sem placeholders)
- Injeta perfil e historico:
  - sexo, idade, peso/altura, nivel, objetivo
  - dias de treino
  - total de treinos
  - media de avaliacao
  - treinos ativos
  - resumo de exercicios por treino
- Guia de conversa:
  - empatia
  - 1 pergunta por vez
  - investigar disposicao/recuperacao/dores/motivacao
  - apos 3-5 trocas, entregar avaliacao
- Quando fechar recomendacao, deve devolver:
  - [REEVAL_RESULT:{...json...}]
- Regras de inteligencia por nivel/volume de historico
- Obriga usar APENAS exercicios do catalogo
- "Responda APENAS texto puro (sem markdown, sem JSON) ate a recomendacao final"

Mensagem inicial de usuario forcada:
- "Oi, quero fazer uma reavaliação do meu treino."

Parametros:
- modelo: gpt-4o-mini
- max_tokens: 800
- temperature: 0.8

## 2.4 Dica de execucao no treino (AIWorkoutTip)

Origem: src/components/workout/AIWorkoutTip.tsx
Chamada direta via fetch

System prompt:
- "Voce e {assistantName}. {personalityPrompt} De UMA dica curta (max 15 palavras) de execucao segura ou motivacao para o exercicio. So a dica, sem explicacao. {SCIENCE_GUARDRAILS}"

User prompt:
- "Exercicio: {exerciseName} ({muscleGroup}). Objetivo: {lose|gain|maintain}"

Parametros:
- modelo: gpt-4o-mini
- max_tokens: 60
- temperature: 0.9

## 2.5 Feedback e refeicao pos-treino (AIPostWorkout)

Origem: src/components/workout/AIPostWorkout.tsx
Chamada direta via fetch

Prompt 1 (feedback):
- "Voce e personal trainer. De um feedback curto (2 frases max, sem emoji) sobre este treino concluido. Seja motivadora e especifica sobre os exercicios.
Perfil: {nome}, objetivo {goal}.
Treino: {label} ({focus}), duracao {min}min.
Exercicios: {summary}"

Prompt 2 (refeicao):
- "Voce e nutricionista esportiva. Sugira UMA refeicao pos-treino rapida e pratica (1-2 frases, com quantidades aproximadas). Nao use emoji de comida.
Perfil: {nome}, {peso}kg, objetivo {goal}.
Acabou de treinar: {focus}, {min}min."

Parametros:
- modelo: gpt-4o-mini
- max_tokens: 120
- temperature: 0.8

## 2.6 Insight IA no dashboard (AIDashInsight)

Origem: src/components/ui/AIDashInsight.tsx
Chamada direta via fetch

System prompt:
- "Voce e {assistantName}. Sempre use esse nome se falar de voce. {personalityPrompt} De UM insight personalizado e motivador, maximo 2 frases curtas, baseado apenas nos dados reais. {SCIENCE_GUARDRAILS}"

User prompt:
- "Perfil: {nome}, {idade} anos, {peso}kg, objetivo: {goal}. Treinos completos: {n} total. {weightTrend}"

Parametros:
- modelo: gpt-4o-mini
- max_tokens: 100
- temperature: 0.75

## 2.7 Relatorio semanal IA (AIWeeklyReport)

Origem: src/components/ui/AIWeeklyReport.tsx
Chamada direta via fetch

System prompt:
- "Voce e {assistantName}. {personalityPrompt} Faca um mini relatorio semanal motivador (max 4 linhas). Celebre conquistas reais, destaque progresso se existir e de 1 meta especifica para a proxima semana. Nunca invente dados. {SCIENCE_GUARDRAILS}"

User prompt:
- "Perfil: {nome}, {peso}kg, objetivo: {goal}.
Esta semana: {n} treinos completados ({nomes}).
Peso: {variacao ou sem registros}."

Parametros:
- modelo: gpt-4o-mini
- max_tokens: 150
- temperature: 0.8

## 2.8 Pergunta IA durante treino (Workout - chat inline)

Origem: src/pages/Workout.tsx
Chamada: askAI(...)

Prompt de contexto local enviado antes da pergunta da usuaria:
- Exercicio atual: nome, grupo, series/reps
- Treino: label/focus
- Equipamento: academia completa
- Regra de substituicao:
  - se usuario pedir substituicao, incluir bloco
  - [SWAP:{"name":"...","muscleGroup":"...","image":"..."}]
  - substituto deve ser da lista com foto do app

User final:
- "Pergunta da usuaria: {texto_digitado}"

## 2.9 IA para melhorar plano do treino (WorkoutPlans - builder)

Origem: src/pages/WorkoutPlans.tsx
Chamada: askAI(..., jsonMode=true)

Prompt principal do builder:
- Contexto por sexo:
  - homem: volume maior, compostos pesados
  - mulher: priorizar gluteos/posterior em pernas
- Guia por treino A/B/C/D/E
- Treino atual + foco
- Objetivo
- Decide entre:
  - add (faltou grupo muscular)
  - swap (treino completo, mas trocar para melhorar)
- Regras biomecanicas criticas:
  - respeitar padrao de movimento
  - nao trocar vertical por horizontal etc.
  - nao trocar composto por isolamento sem justificativa
- Maximo 4 trocas
- Substituto deve vir de lista disponivel e nao estar no treino
- Exige JSON puro

Schemas pedidos:
- add:
  - {"action":"add","name":"NOME EXATO","muscleGroup":"grupo","reason":"frase curta"}
- swap:
  - {"action":"swap","swaps":[{"currentName":"...","name":"...","muscleGroup":"...","reason":"..."}]}

## 2.10 IA para trocar um exercicio especifico (WorkoutPlans - per exercise swap)

Origem: src/pages/WorkoutPlans.tsx
Chamada: askAI(..., jsonMode=true)

Prompt:
- Papel: biomecanico esportivo
- Objetivo: sugerir UM substituto para exercicio especifico
- Regra critica: mesmo padrao de movimento
- Lista exemplos de padrao:
  - puxada vertical -> puxada vertical
  - puxada horizontal -> puxada horizontal
  - empurrar vertical -> empurrar vertical
  - empurrar horizontal -> empurrar horizontal
  - extensao de quadril -> extensao de quadril
  - flexao de joelho -> flexao de joelho
  - extensao de joelho -> extensao de joelho
  - abducao -> abducao
  - isolamento -> isolamento do mesmo musculo
- Exige JSON:
  - {"name":"NOME EXATO da lista","reason":"frase curta biomecanica"}
- Obriga escolha dentro da lista de opcoes disponiveis

## 2.11 IA para calcular macros de refeicao textual (Health)

Origem: src/pages/Health.tsx
Chamada: askAI(..., jsonMode=true)

Prompt:
- "Calcule macros e calorias APENAS dos itens sem kcal manual"
- Lista:
  - itens para calcular
  - itens com kcal manual para nao recalcular
- Regras:
  - somar kcal manuais + estimativa IA
  - nao alterar kcal manuais
  - usar TACO
  - considerar pesos informados
  - arredondar inteiros
- Exige JSON:
  - {"name":"nome curto do prato","calories":numero,"protein":gramas,"carbs":gramas,"fat":gramas}

## 2.12 IA para identificar comida por foto (Health - camera)

Origem: src/pages/Health.tsx
Chamada direta via fetch

Modelo primario:
- gpt-4o

System prompt:
- "Voce e um nutricionista esportivo. Sempre responda em JSON valido."

User prompt (multimodal):
- instrucoes detalhadas para identificar todos os itens visiveis
- regra para embalagem/produto industrializado
- estimativa de porcao
- considerar preparo
- inclui exemplos de alimentos e macros aproximadas
- exige JSON:
  - {"name":"descricao curta","calories":numero,"protein":gramas,"carbs":gramas,"fat":gramas}
- opcional: descricao do usuario para ajudar

Parametros primarios:
- max_tokens: 300
- response_format: json_object
- image detail: high

Fallback automatico (se modelo indisponivel):
- modelo: gpt-4o-mini
- system prompt:
  - "Voce e um nutricionista. Responda em JSON valido."
- user prompt curto:
  - identificar alimento/produto e estimar macros
- max_tokens: 200
- response_format: json_object
- image detail: low

## 3) Arquivos que disparam chamadas de IA

- src/utils/ai.ts
- src/pages/AIChat.tsx
- src/pages/AISetup.tsx
- src/pages/AIReeval.tsx
- src/pages/Workout.tsx
- src/pages/WorkoutPlans.tsx
- src/pages/Health.tsx
- src/components/workout/AIWorkoutTip.tsx
- src/components/workout/AIPostWorkout.tsx
- src/components/ui/AIDashInsight.tsx
- src/components/ui/AIWeeklyReport.tsx
- src/stores/useAIConfigStore.ts

## 4) Notas de auditoria rapida (para voce colar no seu GPT)

Checklist sugerido para auditoria dos prompts:
- Coerencia entre regra e output esperado (texto vs JSON)
- Risco de alucinacao em nutricao e diagnostico
- Contradicoes entre temperatura alta e exigencia de precisao
- Risco de instrucoes conflitantes (ex: curto + detalhado + JSON)
- Cobertura de seguranca (saude, dor, sintomas)
- Robustez de parsing dos blocos ACTION/SWAP/REEVAL_RESULT
- Dependencia de matching por nome parcial (potencial troca errada)
- Possivel vazamento de contexto sensivel

Se quiser, no proximo passo eu gero uma segunda doc: matriz de risco por prompt (severidade, impacto, exploit, mitigacao sugerida), pronta para voce me devolver em formato de backlog de correcoes.
