import{u as ce,a as le,e as me,r as d,S as de,v as pe,j as e,A as ue,m as j,M as xe}from"./index-FIoUnBzn.js";import{E as G}from"./exerciseCatalog-CPEt03Po.js";import{a as fe}from"./ai-BOW2xqBr.js";import{g as ve,b as ge}from"./evidence-BlSCw7VW.js";import{A as he}from"./aiSchemas-BbNQ6iSo.js";import{v as Ae}from"./planValidator-CHmjkKvn.js";import"./calories-vWo9U0uR.js";import"./water-BSM1bDNo.js";function Ie(){const x=ce(),a=le(o=>o.profile),{setApiKey:V,apiKey:h}=me(),[A,$]=d.useState(h?"generating":"token"),[N,U]=d.useState(""),[k,I]=d.useState(""),[S,X]=d.useState([]),[w,W]=d.useState([]),f=a.trainingDays.length||3,T=a.goal==="lose"?"perder gordura":a.goal==="gain"?"ganhar massa muscular":"manter peso",D=a.experienceLevel==="advanced"?"avançado":a.experienceLevel==="intermediate"?"intermediário":"iniciante";d.useEffect(()=>{h&&A==="generating"&&b(h)},[]);const H=async()=>{const o=N.trim();if(!o.startsWith("sk-")){I('Token inválido. Deve começar com "sk-"');return}I(""),V(o),$("generating"),await b(o)},J=()=>{x("/plans")},s=o=>{X(i=>[...i,o])},[K,O]=d.useState(0),[R,v]=d.useState(!1),b=async o=>{var M,q,B;v(!1),S.length===0&&(s(`Olá, ${a.name}! `),await p(800),s(`Vi que você treina ${f}x por semana e é ${D}. Deixa eu avaliar a melhor estratégia de divisão pra você...`),await p(1200),s(`Seu objetivo é ${T}. Vou adaptar volume e seleção de exercícios ao seu contexto real de treino.`),await p(1e3),s("Avaliando opções de split (Full Body, Upper/Lower, ABC, ABCD, ABCDE)... "));const i={};for(const r of G)(i[M=r.muscleGroup]??(i[M]=[])).push(r.name);const y=Object.entries(i).map(([r,t])=>`${r}: ${t.join(", ")}`).join(`
`),L=a.trainingFocus==="upper"?"foco em superiores (mais volume de peito/costas/ombros/braços)":a.trainingFocus==="lower"?"foco em inferiores (mais volume de glúteos/quadríceps/posterior)":a.trainingFocus==="custom"?"personalizado (ver divisão abaixo)":"equilibrado (volume igual para todos os grupos)",Q=a.trainingLocation==="casa"?"casa":a.trainingLocation==="hibrido"?"híbrido (casa + academia)":"academia",Y=a.sessionDurationMin||60,ee=a.trainingAgeMonths??0,ae=(a.equipmentAccess||[]).join(", ")||"não informado",oe=(a.preferredExercises||[]).join(", ")||"não informado",se=(a.dislikedExercises||[]).join(", ")||"não informado",ie=(a.limitations||[]).join(", ")||"não informado",te=a.trainingFocus==="custom"&&a.customSplit?`
DIVISÃO PERSONALIZADA PELO USUÁRIO:
`+Object.entries(a.customSplit).map(([r,t])=>`- Treino ${r}: ${t}`).join(`
`):"",re=`Você é um preparador físico esportivo com pós-graduação em fisiologia do exercício.

PERFIL DO ALUNO:
  - Sexo biológico informado: ${a.sex==="male"?"masculino":a.sex==="female"?"feminino":"não informado"}
- Idade: ${a.age} anos
- Peso: ${a.weight}kg, Altura: ${a.height}cm
- Objetivo: ${T}
- Dias disponíveis: ${f}x por semana
- Nível: ${D}
- Tempo disponível por sessão: ${Y} min
- Local de treino: ${Q}
- Training age: ${ee} meses
- Equipamentos disponíveis: ${ae}
- Exercícios preferidos: ${oe}
- Exercícios evitados: ${se}
- Limitações/dor: ${ie}
- Preferência: ${L}
${te}

DIRETRIZES BASEADAS EM EVIDÊNCIA POR FAIXA ETÁRIA E SEXO:
${a.age>=40?"- Acima de 40 anos: priorizar aquecimento articular, evitar cargas excessivas em compressão vertebral, incluir exercícios de mobilidade e estabilização. Preferir séries moderadas (10-15 reps) em vez de carga máxima. Recuperação entre sessões é mais lenta — evitar treinar o mesmo grupo em dias consecutivos.":""}
${a.age>=50?"- Acima de 50 anos: atenção especial a exercícios de equilíbrio e saúde óssea. Evitar impacto excessivo. Incluir trabalho de core/estabilização em todo treino.":""}
${a.age<25?"- Jovem (<25 anos): pode tolerar maior volume e frequência. Aproveitar janela hormonal para compostos pesados.":""}
${a.sex==="female"?"- Mulher: considerar proporção de fibras tipo I vs II (mais resistência em membros inferiores). Maior volume de glúteo/posterior é fisiológicamente justificado. Se >40 anos, treino de força é essencial para prevenção de osteoporose — priorizar exercícios com carga axial (agachamento, terra).":""}
${a.sex==="male"?"- Homem: distribuição natural de massa favorece tronco superior. Equilibrar com volume adequado de membros inferiores. Se >40 anos, incluir mobilidade de ombro e cuidado com articulações.":""}

SUA TAREFA — AVALIAÇÃO DE SPLIT:
Antes de montar o treino, avalie TODAS estas opções de divisão e classifique cada uma em: recommended, suitable, acceptable ou not_recommended considerando o perfil acima:

1. Full Body (2-3 treinos distintos, rotaciona nos ${f} dias)
2. Upper/Lower (2 treinos + possível Full Body no 5º dia)
3. ABC (3 treinos, rotaciona se >3 dias)
4. ABCD (4 treinos, sobram dias para repetir se >4 dias)
5. ABCDE (5 treinos distintos)

CRITÉRIOS DE AVALIAÇÃO:
- Recuperação adequada entre sessões do mesmo grupo muscular (48-72h)
- Volume total semanal adequado ao nível (iniciante: 10-12 séries/grupo/semana; intermediário: 12-16; avançado: 16-20)
- Frequência de estímulo por grupo muscular (2x/semana é ótimo para hipertrofia)
- Complexidade proporcional à experiência (iniciante não precisa de divisão ultra-específica)
- Aproveitamento dos dias disponíveis sem overtraining
- Para iniciantes: full body ou ABC rotativo geralmente ganha porque permite maior frequência de estímulo por grupo

IMPORTANTE: O número de treinos distintos NÃO precisa ser igual ao número de dias. Um iniciante que treina 5x pode fazer ABC rotativo (Sem1: A,B,C,A,B / Sem2: C,A,B,C,A). A IA DEVE escolher o split que maximize resultados, não o que "preenche" os dias.

REGRAS DE MONTAGEM:
1. Após escolher o split vencedor, monte os treinos
2. Use o menor número de exercícios necessário para cumprir volume semanal alvo, objetivo, tempo disponível por sessão e recuperação.
3. Respeite a preferência do aluno: ${L}
${a.trainingFocus==="custom"?"4. Se o aluno especificou a divisão personalizada, SIGA-A. Monte os exercícios respeitando os grupos que ele pediu.":"4. Priorize músculos e padrões de movimento com base em objetivo declarado, preferências, histórico, limitações e aderência. Nunca inferir preferência muscular por sexo biológico."}
5. Cada exercício DEVE vir da lista abaixo (nome exato)
6. Explique a rotação semanal
7. Cardio é opcional e deve ser distribuído pela semana conforme objetivo, recuperação, preferência, disponibilidade e possível interferência com musculação.
8. Não retorne calorias exatas de treino como fato; se citar gasto, trate como estimativa ampla e com baixa precisão.

Exercícios disponíveis (use nomes EXATOS):
${y}

Responda APENAS JSON puro (sem markdown, sem \`\`\`):
${de}
{
  "evaluation": [
    {"option": "Full Body", "tier": "recommended", "reason": "razão curta"},
    {"option": "Upper/Lower", "tier": "suitable", "reason": "razão curta"},
    {"option": "ABC", "tier": "recommended", "reason": "razão curta"},
    {"option": "ABCD", "tier": "acceptable", "reason": "razão curta"},
    {"option": "ABCDE", "tier": "not_recommended", "reason": "razão curta"}
  ],
  "chosenSplit": "ABC",
  "explanation": "Justificativa de por que este split venceu (2-3 frases)",
  "rotation": "Como rotacionar na semana (ex: Sem1: A,B,C,A,B / Sem2: C,A,B,C,A)",
  "workouts": [
    {
      "type": "A",
      "focus": "foco do treino",
      "cardio": {"type": "Esteira", "durationMin": 20, "intensity": "moderado"},
      "exercises": [{"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"}]
    }
  ],
  "evidenceIds": ["SRC-ACSM-RT-2026"]
}`;try{const r=ve(`prescrição de treino ${a.goal} ${f} dias por semana`);if(r.length===0){s("Não encontrei evidência suficiente para montar um plano científico com segurança agora."),v(!0);return}const t=`${re}

${ge(r)}

Use APENAS sourceIds do EVIDENCE_CONTEXT no campo evidenceIds.`,C=await fe(o,a,t,{schemaName:"ai_setup_plan",jsonSchema:he}),n=JSON.parse(C),P=Ae(n,f);if(P.length>0){s(P[0]),s("Tente novamente para gerar um plano com segurança e consistência."),v(!0);return}if(((q=n.workouts)==null?void 0:q.length)>0){if(W(n.workouts),(B=n.evaluation)!=null&&B.length){const g={recommended:4,suitable:3,acceptable:2,not_recommended:1},E=[...n.evaluation].sort((u,c)=>(g[c.tier||"acceptable"]||0)-(g[u.tier||"acceptable"]||0)),l=E[0],m=E.map(u=>`${u.option}: ${u.tier||"acceptable"}`).join(" • ");s(`Avaliação: ${m}`),await p(600),s(`Vencedor: ${n.chosenSplit||(l==null?void 0:l.option)||"divisão sugerida"}`),await p(400)}n.explanation&&s(`${n.explanation}`),await p(400),n.rotation&&s(`Rotação: ${n.rotation}`);const ne=["A","B","C","D","E"],z=[],F={A:null,B:null,C:null,D:null,E:null};n.workouts.forEach((g,E)=>{const l=ne[E];l&&(g.type=l,z.push(l),F[l]=g.exercises.map((m,u)=>{const c=G.find(_=>_.name.toLowerCase()===m.name.toLowerCase()||_.name.toLowerCase().includes(m.name.toLowerCase().slice(0,12)));return{id:`ai_${l}_${u}_${Date.now()}`,name:(c==null?void 0:c.name)||m.name,sets:m.sets||3,repsMin:m.repsMin||8,repsMax:m.repsMax||12,muscleGroup:(c==null?void 0:c.muscleGroup)||m.muscleGroup,image:c==null?void 0:c.image}}))}),pe.setState({customWorkouts:F,activeSlots:z}),$("summary")}else s("Hmm, não consegui gerar os treinos."),v(!0)}catch(r){const t=r instanceof Error?r.message:"Erro desconhecido";if(t.includes("401")||t.includes("Incorrect API"))s(" Token inválido ou expirado. Verifique no site da OpenAI.");else if(t.includes("429")||t.includes("Rate limit"))s("Muitas requisições. Águarde 1 minuto e tente novamente.");else if(t.includes("insufficient_quota"))s("Sem créditos na conta OpenAI. Adicione saldo em platform.openai.com.");else if(t.includes("cortada")){if(K<1)return s("Resposta cortada pela API. Tentando novamente..."),O(C=>C+1),await p(1e3),b(o);s("Resposta cortada duas vezes. Tente novamente mais tarde.")}else s(` ${t}`);v(!0)}},Z=()=>x("/plans");return e.jsx("div",{className:"min-h-[100dvh] flex flex-col px-6 py-12",children:e.jsxs(ue,{mode:"wait",children:[A==="token"&&e.jsxs(j.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},className:"flex-1 flex flex-col justify-center space-y-6",children:[e.jsxs("div",{className:"text-center",children:[e.jsx(xe,{name:"smart_toy",className:"text-5xl block mb-4 text-primary-300 mx-auto"}),e.jsx("h1",{className:"text-2xl font-bold mb-2",children:"Inteligência Artificial"}),e.jsx("p",{className:"text-white/50 text-sm leading-relaxed",children:"Para montar seu treino personalizado, precisamos de um token da OpenAI (ChatGPT)."})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("input",{type:"password",value:N,onChange:o=>U(o.target.value),placeholder:"sk-...",className:"input-field text-sm",autoFocus:!0}),k&&e.jsx("p",{className:"text-red-400 text-xs",children:k}),e.jsx("p",{className:"text-[11px] text-white/30 leading-relaxed",children:"Acesse platform.openai.com → API Keys → Create new key. Seu token fica salvo apenas no seu celular."})]}),e.jsx("button",{className:"btn-primary",disabled:!N.trim(),onClick:H,children:"Gerar meu treino"}),e.jsx("button",{onClick:J,className:"text-white/40 text-sm py-2",children:"Não tenho token — montar manualmente"})]},"token"),A==="generating"&&e.jsx(j.div,{initial:{opacity:0},animate:{opacity:1},className:"flex-1 flex flex-col justify-end pb-8",children:e.jsxs("div",{className:"space-y-3 mb-8",children:[S.map((o,i)=>e.jsx(j.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1},className:"bg-dark-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]",children:e.jsx("p",{className:"text-sm text-white/80 leading-relaxed",children:o})},i)),!R&&w.length===0&&e.jsxs("div",{className:"flex gap-1.5 px-4 py-3",children:[e.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),e.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),e.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]}),R&&e.jsxs("div",{className:"flex gap-3 mt-4",children:[e.jsx("button",{onClick:()=>{O(0),b(h)},className:"btn-primary flex-1 py-3 text-sm",children:"Rotação: Tentar novamente"}),e.jsx("button",{onClick:()=>x("/plans"),className:"flex-1 py-3 rounded-xl bg-dark-200 text-white/50 text-sm",children:"Pular"})]})]})},"generating"),A==="summary"&&e.jsxs(j.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"flex-1 flex flex-col",children:[e.jsx("h2",{className:"text-xl font-bold mb-1",children:"Seu treino está pronto! "}),e.jsx("p",{className:"text-white/40 text-sm mb-6",children:"Montado com base na ciência pra você"}),e.jsxs("div",{className:"space-y-4 flex-1 overflow-y-auto",children:[w.map(o=>e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsxs("h3",{className:"font-bold",children:["Treino ",o.type]}),e.jsx("span",{className:"text-primary-400 text-xs",children:o.focus})]}),e.jsx("div",{className:"space-y-1",children:o.exercises.map((i,y)=>e.jsxs("p",{className:"text-xs text-white/60",children:[y+1,". ",i.name," — ",i.sets,"×",i.repsMin,"-",i.repsMax]},y))}),o.cardio&&e.jsxs("div",{className:"mt-2 pt-2 border-t border-white/5 flex items-center gap-2",children:[e.jsx("span",{className:"text-xs"}),e.jsxs("p",{className:"text-xs text-white/50",children:[o.cardio.type," — ",o.cardio.durationMin,"min (",o.cardio.intensity,")"]})]}),o.estimatedCalories&&e.jsxs("p",{className:"text-xs text-orange-400/70 mt-1",children:["~",o.estimatedCalories," kcal estimadas"]})]},o.type)),S.filter(o=>o.length>0).map((o,i)=>e.jsx("p",{className:"text-xs text-white/40 leading-relaxed",children:o},i))]}),e.jsx("button",{className:"btn-primary mt-6",onClick:Z,children:"Concluído — ver meus treinos"})]},"summary")]})})}function p(x){return new Promise(a=>setTimeout(a,x))}export{Ie as AISetup};
