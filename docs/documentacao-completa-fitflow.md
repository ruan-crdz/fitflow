# Documentação Completa do FitFlow

## 1) Visão geral
O FitFlow é uma aplicação web de acompanhamento fitness com foco em execução prática de treino, acompanhamento de progresso corporal, nutrição, hidratação e camada social.

Pilares principais:
- Jornada rápida para começar a treinar.
- Execução de treino com baixa fricção.
- Personalização por perfil e histórico.
- Recursos de IA com saídas estruturadas e validações.
- Persistência local robusta e backend Supabase para o módulo Social.


## 2) Stack e arquitetura
Frontend:
- React + TypeScript + Vite.
- Zustand para estado global com persistência local.
- Framer Motion para transições/efeitos de interface.
- Tailwind para estilo.

Navegação:
- HashRouter com roteamento por páginas em src/App.tsx.
- Shell com barra de navegação inferior em src/components/layout/AppShell.tsx.

Persistência:
- Dados de produto e rotina em localStorage via stores Zustand.
- Social conectado no Supabase (auth, feed, comentários, DMs, amizades).

IA:
- Camada central em src/utils/ai.ts.
- Structured outputs via JSON Schema strict.
- Function calling em fluxos críticos.
- Grounding científico com evidências curadas.
- Nutrição determinística para reduzir alucinação em macros.


## 3) Mapa de rotas e quando aparecem
Entrada e gate:
- Splash screen inicial (aprox. 1.8s).
- Se usuário não onboarded: fluxo Backup/Restore ou Onboarding.
- Se usuário onboarded: navegação principal liberada.

Rotas:
- /dashboard: Dashboard principal.
- /plans: gestão de treinos/plano.
- /workout: sessão de treino ativa.
- /workout/complete: fechamento e check-in pós-treino.
- /health: nutrição e hidratação.
- /social: feed/comunidade/chat.
- /profile: configurações gerais e integrações.
- /setup-ai: geração de plano inicial com IA.
- /ai/intro: introdução da assistente.
- /ai: chat principal com IA.
- /plans/reeval: reavaliação guiada por IA.

Observações:
- A barra de abas é ocultada em telas imersivas como treino, setup IA, intro IA e reavaliação.
- A aba IA aparece somente se IA estiver habilitada no estado da aplicação.


## 4) Jornada completa do usuário
### 4.1 Primeiro acesso
1. Splash.
2. Escolha entre restaurar backup existente ou iniciar do zero.
3. Em novo cadastro, passa pelo onboarding em etapas.

### 4.2 Onboarding
Coleta e define:
- Sexo biológico informado.
- Nome.
- Idade, peso e altura.
- Objetivo (ex.: perder gordura, ganhar massa, manter).
- Nível de experiência.
- Dias de treino na semana.
- Tempo disponível por sessão.
- Local de treino (academia/casa/híbrido).
- Equipamentos disponíveis.
- Training age (meses de consistência).
- Preferências e aversões de exercícios.
- Limitações/dor relatadas pelo aluno.
- Preferência de foco muscular.
- Opcional: divisão customizada por dias A/B/C/D/E.

Finalização:
- Opção 1: seguir com treino base/manual.
- Opção 2: montar plano com IA (vai para setup IA).

### 4.3 Dia a dia de treino
1. Dashboard mostra treino do dia e contexto semanal.
2. Usuário inicia treino.
3. Sessão ativa controla exercícios, séries, descanso e progresso.
4. Pode substituir exercício manualmente ou via IA.
5. Finaliza e cai no pós-treino.

### 4.4 Pós-treino
- Registro no histórico com resumo da sessão.
- Check-in de recuperação (energia, estresse, dor/soreness, sono).
- Possível feedback e sugestão de refeição via IA.

### 4.5 Acompanhamento contínuo
- Histórico contextual por indicador direto na Dashboard (sem aba global de histórico).
- Ajustes de plano e exercícios em Plans.
- Registro de nutrição e água em Health.
- Interações sociais (feed, comentários, chat).
- Ajustes de perfil, tema, acessibilidade e export/backup.


## 5) Abas principais e funcionalidades
## Dashboard
- Card do treino do dia e ação rápida para iniciar/retomar sessão.
- Progresso semanal (concluídos x planejados).
- Indicadores de prontidão de treino.
- Streak e componentes motivacionais.
- Widgets de macros, água, peso e evolução.
- Histórico por card com botão de relógio para os 6 indicadores: consistência, progressão de carga, calorias, água, IMC e evolução de peso.
- Ação contextual + Registrar atividade avulsa (com tipo, data, duração, local, distância opcional e notas).

## Treino (Plans + Workout)
Plans:
- Editar treinos A-E.
- Adicionar/remover/ordenar exercícios.
- Import/export de configuração de treino.
- Ajustes por presets e sugestões IA.

Workout:
- Execução da sessão ativa com navegação flexível (ordem sugerida, não obrigatória).
- Controle de séries e descanso (timer).
- Notas por exercício.
- Botão de pular/escolher exercício com acesso à lista completa do treino.
- Substituição de exercício por similaridade e via IA.

## Saúde
- Lançamento de refeições/alimentos.
- Cálculo de macros e calorias com base em tabela local.
- Registro de hidratação diária.
- Entrada por texto e apoio por foto com IA.
- IA na foto detecta itens/porções; cálculo final prioriza pipeline determinístico.

## Social
- Autenticação de usuário social.
- State machine de entrada para evitar flicker: loading, unauthenticated, profile_incomplete, ready, error.
- Header com acesso rápido ao perfil (avatar) e ação de sair da conta.
- Barra de pesquisa de pessoas no topo do fluxo de feed.
- Tabs de feed: Geral e Amigos.
- FEED com botão de criação via FAB central acima da navbar.
- Fluxo explícito de amizade: Adicionar (conta pública) ou Solicitar (conta privada), com respostas Aceitar/Recusar para solicitações pendentes.
- Feed com posts, curtidas, comentários e menções.
- Rede de amizade/conexões.
- Mensagens diretas e preferências de chat.
- Compartilhamento/importação de treino entre usuários.
- Atualização com realtime + sincronizações periódicas.
- Edição de perfil social com privacidade granular de métricas (controle individual por indicador).

Modal de publicação:
- Campo de texto da publicação.
- Seleção visual de mídia com ações Galeria e Câmera.
- Pré-visualização das imagens selecionadas com remoção individual.

## IA
- Setup de plano inicial com avaliação de split e justificativa.
- Chat contínuo contextualizado com dados do usuário.
- Reavaliação de plano por function calling.
- Apoio de substituição de exercício no treino e no chat geral.
- Prompts usam contexto de personalização (tempo por sessão, local, equipamento, limitações e preferências) para melhorar aderência e prescrição.

## Perfil
- Dados físicos e objetivo.
- Edição de contexto de treino (tempo por sessão, local, equipamentos, training age, preferidos, evita e limitações).
- Configurações de IA e persona.
- Tema/acessibilidade.
- Integrações de saúde.
- Backup, exportação e reset de dados locais.


## 6) Fluxo de treino em detalhe
Estrutura operacional:
1. Seleção automática de treino do dia (A/B/C... conforme agenda/ciclo).
2. Criação de sessão ativa com timestamp de início.
3. Execução com ordem sugerida e possibilidade de alternar entre exercícios conforme disponibilidade de equipamento.
4. Atualização de progresso em tempo real.
5. Possibilidade de pular/selecionar exercício e trocar exercício mantendo coerência do treino.
6. Encerramento com cálculo de estatísticas da sessão.
7. Persistência em histórico e atualização de métricas derivadas.

Complementos:
- Descanso guiado por timer.
- Notas por exercício para progressão futura.
- Share card para resumo pós-treino.


## 7) IA: desenho funcional e garantias
## 7.1 Setup inicial de treino
- Usa contexto de perfil, disponibilidade semanal, foco e catálogo de exercícios.
- Avalia alternativas de split (ex.: full body, upper/lower, ABC...) antes de montar plano.
- Resposta estruturada por JSON Schema strict.
- Exige evidências/sources válidas para justificativas científicas quando aplicável.

## 7.2 Chat IA
- Conversa com contexto de treino, histórico e estado atual.
- Pode acionar funções de ação (tool/function calling), como substituição de exercício.
- Evita protocolos frágeis baseados em marcadores de texto livres.

## 7.3 Reavaliação
- Fluxo conversacional para entender mudança de cenário.
- Aplica plano recomendado por função específica (apply_reevaluation_plan).
- Validação de payload antes de alterar plano do usuário.

## 7.4 Substituição de exercício
- Durante treino, usa função dedicada para sugerir troca consistente.
- Valida IDs/itens no catálogo antes de aplicar a mudança.
- Mantém segurança funcional para evitar substituições inválidas.

## 7.5 Nutrição por IA com cálculo determinístico
- Foto/texto podem passar por IA para identificação ou mapeamento de alimentos desconhecidos.
- Cálculo de macros/calorias é feito localmente por tabela nutricional quando possível.
- Objetivo: reduzir dependência de estimativas improvisadas do modelo.


## 8) Grounding científico (evidências)
Componentes:
- Base curada de evidências (constantes + store versionada).
- Busca por relevância para anexar contexto ao prompt.
- Extração e validação de source IDs no retorno IA.

Efeito prático:
- Menos afirmações soltas sem referência.
- Melhora de rastreabilidade das recomendações da IA.
- Possibilidade de evoluir a base de evidências por versão.


## 9) Persistência de dados por domínio
Stores locais (Zustand persist):
- Perfil do usuário e onboarding.
- Sessão de treino ativa.
- Plano de treino customizado.
- Histórico de treinos/atividades.
- Nutrição, água, peso e refeições.
- Configurações de IA, tema e acessibilidade.
- Recuperação pós-treino.
- Evidências científicas versionadas.
- Widgets/configurações da dashboard.

Backup local:
- Exportação/importação do estado local para recuperação rápida.

Supabase (Social):
- Perfis sociais.
- Relações de amizade.
- Posts, curtidas, comentários.
- Mensagens diretas e preferências de chat.
- Compartilhamento de treinos.
- Scripts SQL de schema/upgrade em pasta supabase.


## 10) Arquivos-chave para auditoria por IA externa
Core app:
- src/App.tsx
- src/components/layout/AppShell.tsx

Páginas:
- src/pages/Onboarding.tsx
- src/pages/BackupRestore.tsx
- src/pages/Dashboard.tsx
- src/pages/Workout.tsx
- src/pages/WorkoutComplete.tsx
- src/pages/WorkoutPlans.tsx
- src/pages/Health.tsx
- src/pages/Social.tsx
- src/pages/Profile.tsx
- src/pages/AISetup.tsx
- src/pages/AIChat.tsx
- src/pages/AIReeval.tsx

IA e ciência:
- src/utils/ai.ts
- src/utils/evidence.ts
- src/constants/evidence.ts
- src/stores/useEvidenceStore.ts

Nutrição determinística:
- src/utils/nutrition.ts
- src/constants/nutritionTable.ts

Social/backend:
- src/lib/supabase.ts
- supabase/social-schema.sql
- supabase/social-feed-upgrade.sql
- supabase/social-dm-repair.sql


## 11) Estado atual de robustez
Implementado:
- Structured outputs em fluxos principais de IA.
- Function calling para ações críticas.
- Grounding com evidências e validação de fontes.
- Pipeline de nutrição determinística com IA assistiva.
- Suíte de validação automatizada para checkpoints críticos de arquitetura IA.

Ganhos:
- Menor fragilidade operacional.
- Menor risco de ação indevida por parsing textual frágil.
- Melhor previsibilidade de resultado.


## 12) Limitações e riscos técnicos observáveis
- Token/chave de IA no cliente implica risco local de exposição no dispositivo.
- Social depende de migrações SQL corretas no Supabase para operar plenamente.
- Realtime + polling pode escalar com custo em cenários de alto volume.
- Ausência de bateria ampla de testes automatizados de integração ponta a ponta.


## 13) Resumo executivo para outra IA
O FitFlow é um app fitness com foco em execução de treino e acompanhamento integral (treino, nutrição, hidratação, histórico, social), usando arquitetura React + Zustand + Supabase. A camada de IA foi endurecida para produção com JSON Schema strict, function calling, grounding por evidências curadas e cálculo nutricional determinístico quando aplicável. O fluxo cobre desde onboarding até reavaliação contínua do plano, com persistência local robusta e recursos sociais em backend dedicado.


## 14) Status da auditoria (P0/P1) para continuidade
Objetivo desta seção:
- Deixar explícito o que já foi implementado.
- Separar o que ainda é pendência real (para não confundir análise externa).

Entregue (confirmado no código):
- P0 IA: structured output strict em fluxos críticos e function calling para ações de treino.
- P0 IA: grounding científico com source IDs e validação.
- P0 Saúde: pipeline determinístico de nutrição com IA assistiva.
- P0 UX treino: execução flexível por exercício (pular, voltar, escolher próximo incompleto).
- P0 Dashboard: histórico contextual por indicador e atividade avulsa contextual.
- P0 Social: state machine de entrada, fluxo explícito de amizade, privacidade de métricas mais clara.
- P1 Perfil/Onboarding: coleta de contexto avançado (tempo, local, equipamentos, training age, preferências e limitações) integrada nos prompts de IA.

Pendente (próximos passos recomendados):
- P0 IA: validador formal de plano (plan validator) com regras de volume/frequência/recuperação antes de aplicar recomendações.
- P0 Dashboard: explicação transparente do cálculo de prontidão (readiness) com fatores, pesos e histórico comparável.
- P1 QA: bateria de testes de integração ponta a ponta para fluxos críticos (onboarding, setup IA, treino, social).
- P1 IA Safety: evals adversariais adicionais (prompts de confusão, payloads parcialmente válidos, negação de schema).
- P1 Produto: paridade completa entre personalização do perfil e sugestões de treino não-IA (heurística local/manual).

Critérios de aceite sugeridos para encerrar auditoria:
1. Plan validator bloqueando aplicação de plano inválido com mensagens claras de correção.
2. Readiness exibindo fórmula resumida e fatores do dia na interface.
3. Fluxos críticos cobertos por testes automatizados reproduzíveis em CI.
4. Evals adversariais passando com taxa alvo definida (ex.: >= 95%).
