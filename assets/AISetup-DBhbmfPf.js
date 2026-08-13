import{u as Y,a as ee,r as S,H as G,S as oe,b as ae,j as o,A as se,m as L}from"./index-CX8ne9vz.js";import{g as ie,b as te,a as re}from"./ai-kr9Jbph4.js";import{A as ne}from"./aiSchemas-BbNQ6iSo.js";import"./calories-vWo9U0uR.js";import"./aiPlan-D9lBUIQo.js";function ce(h,e){const t=[],A=h.workouts||[];(A.length<2||A.length>5)&&t.push("Plano inválido: número de treinos distintos deve estar entre 2 e 5.");const b=Math.max(1,Math.min(7,e)),M=Math.max(1,A.length),w=Math.floor(b/M),I=b%M,p=new Map;A.forEach((E,m)=>{const i=E.exercises||[];(i.length<3||i.length>10)&&t.push(`Plano inválido: treino ${m+1} deve ter entre 3 e 10 exercícios.`);let j=0;i.forEach((s,v)=>{var f,y;if((f=s.name)!=null&&f.trim()||t.push(`Plano inválido: exercício ${v+1} do treino ${m+1} sem nome.`),(y=s.muscleGroup)!=null&&y.trim()||t.push(`Plano inválido: exercício ${s.name||v+1} sem grupo muscular.`),(!Number.isFinite(s.sets)||s.sets<1||s.sets>8)&&t.push(`Plano inválido: ${s.name||`exercício ${v+1}`} com séries fora do limite (1-8).`),(!Number.isFinite(s.repsMin)||!Number.isFinite(s.repsMax)||s.repsMin<1||s.repsMax<s.repsMin)&&t.push(`Plano inválido: ${s.name||`exercício ${v+1}`} com faixa de repetições inválida.`),j+=s.sets||0,s.muscleGroup){const P=w+(m<I?1:0),a=p.get(s.muscleGroup)||0;p.set(s.muscleGroup,a+(s.sets||0)*P)}}),(j<8||j>40)&&t.push(`Plano inválido: treino ${m+1} com volume total fora do limite (8-40 séries).`)});for(const[E,m]of p.entries())m>28&&t.push(`Plano inválido: volume semanal muito alto para ${E} (${m} séries).`);return t}function fe(){const h=Y(),e=ee(a=>a.profile),[t,A]=S.useState("generating"),[b,M]=S.useState([]),[w,I]=S.useState([]),p=e.trainingDays.length||3,E=e.goal==="lose"?"perder gordura":e.goal==="gain"?"ganhar massa muscular":"manter peso",m=e.experienceLevel==="advanced"?"avançado":e.experienceLevel==="intermediate"?"intermediário":"iniciante";S.useEffect(()=>{t==="generating"&&y()},[]);const i=a=>{M(r=>[...r,a])},[j,s]=S.useState(0),[v,f]=S.useState(!1),y=async()=>{var T,B,O;f(!1),b.length===0&&(i(`Olá, ${e.name}! `),await g(800),i(`Vi que você treina ${p}x por semana e é ${m}. Deixa eu avaliar a melhor estratégia de divisão pra você...`),await g(1200),i(`Seu objetivo é ${E}. Vou adaptar volume e seleção de exercícios ao seu contexto real de treino.`),await g(1e3),i("Avaliando opções de split (Full Body, Upper/Lower, ABC, ABCD, ABCDE)... "));const a={};for(const n of G)(a[T=n.muscleGroup]??(a[T]=[])).push(n.name);const r=Object.entries(a).map(([n,d])=>`${n}: ${d.join(", ")}`).join(`
`),C=e.trainingFocus==="upper"?"foco em superiores (mais volume de peito/costas/ombros/braços)":e.trainingFocus==="lower"?"foco em inferiores (mais volume de glúteos/quadríceps/posterior)":e.trainingFocus==="custom"?"personalizado (ver divisão abaixo)":"equilibrado (volume igual para todos os grupos)",_=e.trainingLocation==="casa"?"casa":e.trainingLocation==="hibrido"?"híbrido (casa + academia)":"academia",U=e.sessionDurationMin||60,V=e.trainingAgeMonths??0,X=(e.equipmentAccess||[]).join(", ")||"não informado",H=(e.preferredExercises||[]).join(", ")||"não informado",J=(e.dislikedExercises||[]).join(", ")||"não informado",W=(e.limitations||[]).join(", ")||"não informado",Z=e.trainingFocus==="custom"&&e.customSplit?`
DIVISÃO PERSONALIZADA PELO USUÁRIO:
`+Object.entries(e.customSplit).map(([n,d])=>`- Treino ${n}: ${d}`).join(`
`):"",Q=`Você é um preparador físico esportivo com pós-graduação em fisiologia do exercício.

PERFIL DO ALUNO:
  - Sexo biológico informado: ${e.sex==="male"?"masculino":e.sex==="female"?"feminino":"não informado"}
- Idade: ${e.age} anos
- Peso: ${e.weight}kg, Altura: ${e.height}cm
- Objetivo: ${E}
- Dias disponíveis: ${p}x por semana
- Nível: ${m}
- Tempo disponível por sessão: ${U} min
- Local de treino: ${_}
- Training age: ${V} meses
- Equipamentos disponíveis: ${X}
- Exercícios preferidos: ${H}
- Exercícios evitados: ${J}
- Limitações/dor: ${W}
- Preferência: ${C}
${Z}

DIRETRIZES BASEADAS EM EVIDÊNCIA POR FAIXA ETÁRIA E SEXO:
${e.age>=40?"- Acima de 40 anos: priorizar aquecimento articular, evitar cargas excessivas em compressão vertebral, incluir exercícios de mobilidade e estabilização. Preferir séries moderadas (10-15 reps) em vez de carga máxima. Recuperação entre sessões é mais lenta — evitar treinar o mesmo grupo em dias consecutivos.":""}
${e.age>=50?"- Acima de 50 anos: atenção especial a exercícios de equilíbrio e saúde óssea. Evitar impacto excessivo. Incluir trabalho de core/estabilização em todo treino.":""}
${e.age<25?"- Jovem (<25 anos): pode tolerar maior volume e frequência. Aproveitar janela hormonal para compostos pesados.":""}
${e.sex==="female"?"- Mulher: considerar proporção de fibras tipo I vs II (mais resistência em membros inferiores). Maior volume de glúteo/posterior é fisiológicamente justificado. Se >40 anos, treino de força é essencial para prevenção de osteoporose — priorizar exercícios com carga axial (agachamento, terra).":""}
${e.sex==="male"?"- Homem: distribuição natural de massa favorece tronco superior. Equilibrar com volume adequado de membros inferiores. Se >40 anos, incluir mobilidade de ombro e cuidado com articulações.":""}

SUA TAREFA — AVALIAÇÃO DE SPLIT:
Antes de montar o treino, avalie TODAS estas opções de divisão e classifique cada uma em: recommended, suitable, acceptable ou not_recommended considerando o perfil acima:

1. Full Body (2-3 treinos distintos, rotaciona nos ${p} dias)
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
3. Respeite a preferência do aluno: ${C}
${e.trainingFocus==="custom"?"4. Se o aluno especificou a divisão personalizada, SIGA-A. Monte os exercícios respeitando os grupos que ele pediu.":"4. Priorize músculos e padrões de movimento com base em objetivo declarado, preferências, histórico, limitações e aderência. Nunca inferir preferência muscular por sexo biológico."}
5. Cada exercício DEVE vir da lista abaixo (nome exato)
6. Explique a rotação semanal
7. Cardio é opcional e deve ser distribuído pela semana conforme objetivo, recuperação, preferência, disponibilidade e possível interferência com musculação.
8. Não retorne calorias exatas de treino como fato; se citar gasto, trate como estimativa ampla e com baixa precisão.

Exercícios disponíveis (use nomes EXATOS):
${r}

Responda APENAS JSON puro (sem markdown, sem \`\`\`):
${oe}
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
}`;try{const n=ie(`prescrição de treino ${e.goal} ${p} dias por semana`);if(n.length===0){i("Não encontrei evidência suficiente para montar um plano científico com segurança agora."),f(!0);return}const d=`${Q}

${te(n)}

Use APENAS sourceIds do EVIDENCE_CONTEXT no campo evidenceIds.`,R=await re(null,e,d,{schemaName:"ai_setup_plan",jsonSchema:ne},"workout_builder"),c=JSON.parse(R),k=ce(c,p);if(k.length>0){i(k[0]),i("Tente novamente para gerar um plano com segurança e consistência."),f(!0);return}if(((B=c.workouts)==null?void 0:B.length)>0){if(I(c.workouts),(O=c.evaluation)!=null&&O.length){const N={recommended:4,suitable:3,acceptable:2,not_recommended:1},D=[...c.evaluation].sort(($,l)=>(N[l.tier||"acceptable"]||0)-(N[$.tier||"acceptable"]||0)),u=D[0],x=D.map($=>`${$.option}: ${$.tier||"acceptable"}`).join(" • ");i(`Avaliação: ${x}`),await g(600),i(`Vencedor: ${c.chosenSplit||(u==null?void 0:u.option)||"divisão sugerida"}`),await g(400)}c.explanation&&i(`${c.explanation}`),await g(400),c.rotation&&i(`Rotação: ${c.rotation}`);const K=["A","B","C","D","E"],q=[],F={A:null,B:null,C:null,D:null,E:null};c.workouts.forEach((N,D)=>{const u=K[D];u&&(N.type=u,q.push(u),F[u]=N.exercises.map((x,$)=>{const l=G.find(z=>z.name.toLowerCase()===x.name.toLowerCase()||z.name.toLowerCase().includes(x.name.toLowerCase().slice(0,12)));return{id:`ai_${u}_${$}_${Date.now()}`,name:(l==null?void 0:l.name)||x.name,sets:x.sets||3,repsMin:x.repsMin||8,repsMax:x.repsMax||12,muscleGroup:(l==null?void 0:l.muscleGroup)||x.muscleGroup,image:l==null?void 0:l.image}}))}),ae.setState({customWorkouts:F,activeSlots:q}),A("summary")}else i("Hmm, não consegui gerar os treinos."),f(!0)}catch(n){const d=n instanceof Error?n.message:"Erro desconhecido";if(d.includes("429")||d.includes("Rate limit"))i("Muitas requisições. Águarde 1 minuto e tente novamente.");else if(d.includes("cortada")){if(j<1)return i("Resposta cortada pela API. Tentando novamente..."),s(R=>R+1),await g(1e3),y();i("Resposta cortada duas vezes. Tente novamente mais tarde.")}else i(` ${d}`);f(!0)}},P=()=>h("/plans");return o.jsx("div",{className:"min-h-[100dvh] flex flex-col px-6 py-12",children:o.jsxs(se,{mode:"wait",children:[t==="generating"&&o.jsx(L.div,{initial:{opacity:0},animate:{opacity:1},className:"flex-1 flex flex-col justify-end pb-8",children:o.jsxs("div",{className:"space-y-3 mb-8",children:[b.map((a,r)=>o.jsx(L.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1},className:"bg-dark-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]",children:o.jsx("p",{className:"text-sm text-white/80 leading-relaxed",children:a})},r)),!v&&w.length===0&&o.jsxs("div",{className:"flex gap-1.5 px-4 py-3",children:[o.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),o.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),o.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]}),v&&o.jsxs("div",{className:"flex gap-3 mt-4",children:[o.jsx("button",{onClick:()=>{s(0),y()},className:"btn-primary flex-1 py-3 text-sm",children:"Rotação: Tentar novamente"}),o.jsx("button",{onClick:()=>h("/plans"),className:"flex-1 py-3 rounded-xl bg-dark-200 text-white/50 text-sm",children:"Pular"})]})]})},"generating"),t==="summary"&&o.jsxs(L.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"flex-1 flex flex-col",children:[o.jsx("h2",{className:"text-xl font-bold mb-1",children:"Seu treino está pronto! "}),o.jsx("p",{className:"text-white/40 text-sm mb-6",children:"Montado com base na ciência pra você"}),o.jsxs("div",{className:"space-y-4 flex-1 overflow-y-auto",children:[w.map(a=>o.jsxs("div",{className:"card",children:[o.jsxs("div",{className:"flex items-center justify-between mb-2",children:[o.jsxs("h3",{className:"font-bold",children:["Treino ",a.type]}),o.jsx("span",{className:"text-primary-400 text-xs",children:a.focus})]}),o.jsx("div",{className:"space-y-1",children:a.exercises.map((r,C)=>o.jsxs("p",{className:"text-xs text-white/60",children:[C+1,". ",r.name," — ",r.sets,"×",r.repsMin,"-",r.repsMax]},C))}),a.cardio&&o.jsxs("div",{className:"mt-2 pt-2 border-t border-white/5 flex items-center gap-2",children:[o.jsx("span",{className:"text-xs"}),o.jsxs("p",{className:"text-xs text-white/50",children:[a.cardio.type," — ",a.cardio.durationMin,"min (",a.cardio.intensity,")"]})]}),a.estimatedCalories&&o.jsxs("p",{className:"text-xs text-orange-400/70 mt-1",children:["~",a.estimatedCalories," kcal estimadas"]})]},a.type)),b.filter(a=>a.length>0).map((a,r)=>o.jsx("p",{className:"text-xs text-white/40 leading-relaxed",children:a},r))]}),o.jsx("button",{className:"btn-primary mt-6",onClick:P,children:"Concluído — ver meus treinos"})]},"summary")]})})}function g(h){return new Promise(e=>setTimeout(e,h))}export{fe as AISetup};
