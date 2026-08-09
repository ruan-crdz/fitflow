<div align="center">

# 🏋️ FitFlow

### Treino simples. Progresso visível. Experiência sem distrações.

Aplicação web desenvolvida para tornar o acompanhamento de treinos **rápido, intuitivo e personalizado**, reduzindo ao máximo a necessidade de interação durante a academia.

<br>

<img src="https://img.shields.io/badge/Status-Em%20desenvolvimento-yellow?style=for-the-badge" alt="Status">
<img src="https://img.shields.io/badge/Projeto-Pessoal-blueviolet?style=for-the-badge" alt="Projeto pessoal">
<img src="https://img.shields.io/badge/Foco-Fitness%20%26%20Saúde-success?style=for-the-badge" alt="Fitness">

</div>

---

## 💜 Sobre o projeto

O **FitFlow** nasceu com uma proposta simples:

> A pessoa está na academia para treinar — não para navegar em um sistema complicado.

O projeto foi pensado inicialmente para uma única usuária, permitindo construir uma experiência extremamente personalizada, mas mantendo uma arquitetura preparada para evoluir futuramente para múltiplos usuários.

O sistema organiza automaticamente os treinos da semana, acompanha a execução exercício por exercício e mantém informações relacionadas a progresso corporal, alimentação, hidratação e rotina de treinamento.

---

## ✨ Experiência principal

Ao entrar pela primeira vez, a usuária informa **quais três dias da semana pretende treinar**.

Exemplo:

```text
SEG      TER      QUA      QUI      SEX      SÁB      DOM
 ✓                 ✓                 ✓
```

O FitFlow então distribui automaticamente:

```text
Treino A → Superior completo
Treino B → Posterior + Glúteos
Treino C → Quadríceps + Glúteos
```

Nos dias programados, a dashboard destaca imediatamente:

<div align="center">

### 🔥 Hoje tem treino!

**TREINO B**

Posterior + Glúteos

`INICIAR TREINO`

</div>

Sem menus desnecessários.

Sem precisar procurar o treino.

Um toque e começa.

---

# 🏋️ Modo Treino

O principal diferencial do FitFlow é o **modo treino**, desenvolvido especificamente para utilização dentro da academia.

A interface prioriza:

* botões grandes;
* pouquíssimo texto;
* alto contraste;
* navegação linear;
* acompanhamento visual;
* interação usando poucos toques;
* informações importantes imediatamente visíveis.

---

## Exemplo de exercício

<div align="center">

### Elevação Pélvica

**3 × 8–12**

Glúteo Máximo

<br>

`● ● ○`

**2 de 3 séries concluídas**

<br>

`+ CONCLUIR SÉRIE`

<br>

🔒 Próximo exercício

</div>

Ao completar todas as séries:

```text
● ● ●

3 / 3 séries

✓ EXERCÍCIO CONCLUÍDO
```

O próximo exercício é então liberado.

---

## 📊 Progresso do treino

Durante toda a sessão, uma barra mostra quanto ainda falta:

```text
██████████████░░░░░░  72%
```

Exemplo:

```text
5 de 7 exercícios concluídos
```

A ideia é permitir que a usuária entenda sua situação atual em **menos de um segundo**.

---

# 🎉 Finalização

Depois do último exercício:

<div align="center">

## ✅ Treino concluído!

### Muito bom. Treino de hoje finalizado.

**7 exercícios**

**19 séries**

**52 min**

🔥 Sequência: **3 treinos**

<br>

`VOLTAR PARA O INÍCIO`

</div>

---

# 🏠 Dashboard

A tela inicial concentra somente informações úteis para aquele momento.

### Hoje

```text
🔥 TREINO DE HOJE

Treino B
Posterior + Glúteos

[ INICIAR TREINO ]
```

### Semana

```text
SEG        QUA        SEX
 ✓          ✓          ○

2 / 3 treinos concluídos
```

### Progresso

```text
Peso atual
78,4 kg

Peso inicial
80,0 kg

Progresso
-1,6 kg
```

### Próximo treino

```text
SEXTA-FEIRA

Treino C
Quadríceps + Glúteos
```

---

# 🗓️ Organização semanal

A usuária escolhe exatamente **três dias de treino por semana**.

O sistema associa automaticamente a sequência ABC respeitando a ordem cronológica escolhida.

### Exemplo

Dias escolhidos:

```text
Segunda
Quarta
Sexta
```

Distribuição:

```text
Segunda → Treino A
Quarta   → Treino B
Sexta    → Treino C
```

Na semana seguinte, o ciclo reinicia.

---

# 🧠 Estrutura dos treinos

## A — Superior completo

Foco secundário em costas.

```text
Abdominal máquina
Gráviton
Remada
Supino máquina
Peck Deck
Elevação lateral
Bíceps
Tríceps
Cardio
```

---

## B — Posterior + Glúteos

Foco principal em glúteos e cadeia posterior.

```text
Abdominal máquina
Mesa/Flexora sentada
Stiff / RDL
Elevação pélvica
Búlgaro
Cadeira abdutora
Panturrilha em pé
Cardio
```

---

## C — Quadríceps + Glúteos

Foco principal no quadríceps sem deixar posteriores e glúteos sem estímulo.

```text
Abdominal máquina
Hack Squat
Leg Press
Cadeira extensora
Flexora sentada
Glúteo na polia
Panturrilha em pé
Cardio
```

---

# 📈 Acompanhamento corporal

O FitFlow também poderá armazenar informações como:

```text
Altura
Peso atual
Peso inicial
Meta de peso
Data de nascimento
Objetivo
Nível de atividade
```

Permitindo acompanhar a evolução ao longo do tempo.

Exemplo:

```text
80.0 kg ┤●
79.5 kg ┤ ╲
79.0 kg ┤  ●
78.5 kg ┤    ╲●
78.0 kg ┤
        └──────────────
         Mai Jun Jul
```

---

# 🎯 Objetivos

A usuária poderá selecionar objetivos como:

```text
🔥 Perder gordura
🍑 Desenvolver glúteos
💪 Ganhar massa muscular
❤️ Melhorar condicionamento
⚖️ Manter peso
```

Essas informações poderão influenciar recomendações apresentadas pelo sistema.

---

# 💧 Hidratação

A dashboard também poderá acompanhar ingestão diária de água.

```text
💧 Água

1.600 / 2.500 ml

████████████░░░░░░░░

[ + 250 ml ]
```

O objetivo é registrar água praticamente sem interromper a rotina.

---

# 🍎 Nutrição

Uma futura área nutricional poderá apresentar estimativas como:

```text
Meta energética diária
2.050 kcal

Proteínas
130 g

Carboidratos
245 g

Gorduras
62 g
```

> ⚠️ Valores relacionados a necessidades energéticas, composição corporal e ingestão nutricional devem utilizar métodos validados cientificamente e não substituir avaliação profissional individualizada.

---

# 📐 Indicadores corporais

O sistema poderá calcular indicadores básicos como:

### IMC

```text
IMC = peso / altura²
```

E classificar o resultado utilizando referências reconhecidas.

O IMC será utilizado como **indicador populacional complementar**, e não como diagnóstico isolado de composição corporal.

---

# 🔥 Streak

Para incentivar consistência:

```text
🔥 4 semanas completas
```

ou:

```text
🏆 12 treinos concluídos
```

A proposta não é transformar treino em um jogo complexo.

A gamificação deve existir apenas para reforçar **consistência**.

---

# 🎨 Princípios de UX

O FitFlow segue alguns princípios fundamentais.

### 01. Menos decisões

Durante o treino, a interface deve dizer claramente qual é o próximo passo.

### 02. Um objetivo principal por tela

Cada tela possui uma ação dominante.

```text
INICIAR
CONCLUIR SÉRIE
PRÓXIMO EXERCÍCIO
FINALIZAR
```

### 03. Touch first

A aplicação deve funcionar perfeitamente utilizando apenas o polegar.

### 04. Feedback imediato

Toda ação realizada deve gerar resposta visual.

```text
○ ○ ○
↓
● ○ ○
```

### 05. Informação progressiva

Detalhes técnicos aparecem apenas quando solicitados.

Exemplo:

```text
Elevação Pélvica

Glúteo máximo

[ Como executar? ]
```

---

# 📱 Mobile First

O FitFlow será desenvolvido prioritariamente para smartphones.

Resolução prioritária:

```text
360px+
390px+
430px+
```

Desktop será suportado, mas não será o ambiente principal de utilização.

---

# 🗂️ Estrutura planejada

```text
fitflow/
│
├── src/
│   ├── components/
│   │   ├── workout/
│   │   ├── dashboard/
│   │   ├── progress/
│   │   └── ui/
│   │
│   ├── pages/
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── workout/
│   │   ├── profile/
│   │   └── progress/
│   │
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   └── assets/
│
├── public/
│
└── README.md
```

---

# 🧩 Funcionalidades planejadas

* [ ] Onboarding inicial
* [ ] Seleção dos dias de treino
* [ ] Dashboard
* [ ] Distribuição automática ABC
* [ ] Modo treino
* [ ] Controle individual de séries
* [ ] Barra de progresso
* [ ] Bloqueio do próximo exercício
* [ ] Histórico de treinos
* [ ] Registro de peso
* [ ] Evolução corporal
* [ ] Meta de peso
* [ ] Controle de água
* [ ] Estimativa energética
* [ ] Metas nutricionais
* [ ] Streak semanal
* [ ] Fotos dos exercícios
* [ ] Instruções de execução
* [ ] PWA
* [ ] Funcionamento offline durante o treino

---

# 🗺️ Roadmap

### `v0.1 — Workout`

Primeira experiência funcional.

```text
Onboarding
      ↓
Dashboard
      ↓
Treino do dia
      ↓
Exercícios
      ↓
Séries
      ↓
Treino concluído
```

### `v0.2 — Progress`

```text
Peso
Histórico
Gráficos
Streak
Estatísticas
```

### `v0.3 — Health`

```text
Hidratação
Meta energética
Macronutrientes
Objetivos
```

### `v1.0`

Experiência completa e estável.

---

# 🔬 Base científica

O projeto busca separar claramente três coisas:

**treinamento**,
**composição corporal**,
**saúde**.

As recomendações implementadas deverão ser fundamentadas prioritariamente em:

* consensos e position stands;
* revisões sistemáticas;
* meta-análises;
* ensaios clínicos;
* organizações reconhecidas de saúde e exercício.

Principais referências utilizadas no desenvolvimento conceitual incluem:

* American College of Sports Medicine — recomendações para treinamento resistido;
* World Health Organization — atividade física e indicadores de saúde;
* literatura revisada por pares sobre hipertrofia, volume, frequência e proximidade da falha;
* estudos sobre gasto energético e composição corporal.

---

# ⚠️ Disclaimer

O **FitFlow não é um dispositivo médico**.

Informações apresentadas pelo sistema relacionadas a IMC, gasto energético, hidratação, alimentação ou treinamento possuem caráter informativo e não substituem acompanhamento realizado por médico, nutricionista, fisioterapeuta ou profissional de educação física quando necessário.

---

<div align="center">

## FitFlow

**Train. Track. Progress.**

<br>

Feito para transformar o treino em uma sequência simples:

`abrir → treinar → concluir → evoluir`

</div>
