import{u as ce,a as le,f as me,r as v,H as J,S as de,b as pe,j as e,A as ue,m as P,M as xe}from"./index-CVr8w-9k.js";import{g as fe,b as ve,a as he}from"./ai-CUUL8dO1.js";import{A as ge}from"./aiSchemas-BbNQ6iSo.js";import"./calories-vWo9U0uR.js";import"./water-BSM1bDNo.js";function Ae(h,a){const c=[],u=h.workouts||[];(u.length<2||u.length>5)&&c.push("Plano inválido: número de treinos distintos deve estar entre 2 e 5.");const g=Math.max(1,Math.min(7,a)),N=Math.max(1,u.length),S=Math.floor(g/N),O=g%N,b=new Map;u.forEach((y,l)=>{const $=y.exercises||[];($.length<3||$.length>10)&&c.push(`Plano inválido: treino ${l+1} deve ter entre 3 e 10 exercícios.`);let E=0;$.forEach((s,p)=>{var C,k;if((C=s.name)!=null&&C.trim()||c.push(`Plano inválido: exercício ${p+1} do treino ${l+1} sem nome.`),(k=s.muscleGroup)!=null&&k.trim()||c.push(`Plano inválido: exercício ${s.name||p+1} sem grupo muscular.`),(!Number.isFinite(s.sets)||s.sets<1||s.sets>8)&&c.push(`Plano inválido: ${s.name||`exercício ${p+1}`} com séries fora do limite (1-8).`),(!Number.isFinite(s.repsMin)||!Number.isFinite(s.repsMax)||s.repsMin<1||s.repsMax<s.repsMin)&&c.push(`Plano inválido: ${s.name||`exercício ${p+1}`} com faixa de repetições inválida.`),E+=s.sets||0,s.muscleGroup){const R=S+(l<O?1:0),L=b.get(s.muscleGroup)||0;b.set(s.muscleGroup,L+(s.sets||0)*R)}}),(E<8||E>40)&&c.push(`Plano inválido: treino ${l+1} com volume total fora do limite (8-40 séries).`)});for(const[y,l]of b.entries())l>28&&c.push(`Plano inválido: volume semanal muito alto para ${y} (${l} séries).`);return c}function $e(){const h=ce(),a=le(o=>o.profile),{setApiKey:c,apiKey:u}=me(),[g,N]=v.useState(u?"generating":"token"),[S,O]=v.useState(""),[b,y]=v.useState(""),[l,$]=v.useState([]),[E,s]=v.useState([]),p=a.trainingDays.length||3,C=a.goal==="lose"?"perder gordura":a.goal==="gain"?"ganhar massa muscular":"manter peso",k=a.experienceLevel==="advanced"?"avançado":a.experienceLevel==="intermediate"?"intermediário":"iniciante";v.useEffect(()=>{u&&g==="generating"&&w(u)},[]);const R=async()=>{const o=S.trim();if(!o.startsWith("sk-")){y('Token inválido. Deve começar com "sk-"');return}y(""),c(o),N("generating"),await w(o)},L=()=>{h("/plans")},i=o=>{$(t=>[...t,o])},[K,q]=v.useState(0),[F,I]=v.useState(!1),w=async o=>{var G,_,V;I(!1),l.length===0&&(i(`Olá, ${a.name}! `),await A(800),i(`Vi que você treina ${p}x por semana e é ${k}. Deixa eu avaliar a melhor estratégia de divisão pra você...`),await A(1200),i(`Seu objetivo é ${C}. Vou adaptar volume e seleção de exercícios ao seu contexto real de treino.`),await A(1e3),i("Avaliando opções de split (Full Body, Upper/Lower, ABC, ABCD, ABCDE)... "));const t={};for(const r of J)(t[G=r.muscleGroup]??(t[G]=[])).push(r.name);const T=Object.entries(t).map(([r,n])=>`${r}: ${n.join(", ")}`).join(`
`),z=a.trainingFocus==="upper"?"foco em superiores (mais volume de peito/costas/ombros/braços)":a.trainingFocus==="lower"?"foco em inferiores (mais volume de glúteos/quadríceps/posterior)":a.trainingFocus==="custom"?"personalizado (ver divisão abaixo)":"equilibrado (volume igual para todos os grupos)",Q=a.trainingLocation==="casa"?"casa":a.trainingLocation==="hibrido"?"híbrido (casa + academia)":"academia",Y=a.sessionDurationMin||60,ee=a.trainingAgeMonths??0,ae=(a.equipmentAccess||[]).join(", ")||"não informado",oe=(a.preferredExercises||[]).join(", ")||"não informado",se=(a.dislikedExercises||[]).join(", ")||"não informado",ie=(a.limitations||[]).join(", ")||"não informado",te=a.trainingFocus==="custom"&&a.customSplit?`
DIVISÃO PERSONALIZADA PELO USUÁRIO:
`+Object.entries(a.customSplit).map(([r,n])=>`- Treino ${r}: ${n}`).join(`
`):"",ne=`Você é um preparador físico esportivo com pós-graduação em fisiologia do exercício.

PERFIL DO ALUNO:
  - Sexo biológico informado: ${a.sex==="male"?"masculino":a.sex==="female"?"feminino":"não informado"}
- Idade: ${a.age} anos
- Peso: ${a.weight}kg, Altura: ${a.height}cm
- Objetivo: ${C}
- Dias disponíveis: ${p}x por semana
- Nível: ${k}
- Tempo disponível por sessão: ${Y} min
- Local de treino: ${Q}
- Training age: ${ee} meses
- Equipamentos disponíveis: ${ae}
- Exercícios preferidos: ${oe}
- Exercícios evitados: ${se}
- Limitações/dor: ${ie}
- Preferência: ${z}
${te}

DIRETRIZES BASEADAS EM EVIDÊNCIA POR FAIXA ETÁRIA E SEXO:
${a.age>=40?"- Acima de 40 anos: priorizar aquecimento articular, evitar cargas excessivas em compressão vertebral, incluir exercícios de mobilidade e estabilização. Preferir séries moderadas (10-15 reps) em vez de carga máxima. Recuperação entre sessões é mais lenta — evitar treinar o mesmo grupo em dias consecutivos.":""}
${a.age>=50?"- Acima de 50 anos: atenção especial a exercícios de equilíbrio e saúde óssea. Evitar impacto excessivo. Incluir trabalho de core/estabilização em todo treino.":""}
${a.age<25?"- Jovem (<25 anos): pode tolerar maior volume e frequência. Aproveitar janela hormonal para compostos pesados.":""}
${a.sex==="female"?"- Mulher: considerar proporção de fibras tipo I vs II (mais resistência em membros inferiores). Maior volume de glúteo/posterior é fisiológicamente justificado. Se >40 anos, treino de força é essencial para prevenção de osteoporose — priorizar exercícios com carga axial (agachamento, terra).":""}
${a.sex==="male"?"- Homem: distribuição natural de massa favorece tronco superior. Equilibrar com volume adequado de membros inferiores. Se >40 anos, incluir mobilidade de ombro e cuidado com articulações.":""}

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
3. Respeite a preferência do aluno: ${z}
${a.trainingFocus==="custom"?"4. Se o aluno especificou a divisão personalizada, SIGA-A. Monte os exercícios respeitando os grupos que ele pediu.":"4. Priorize músculos e padrões de movimento com base em objetivo declarado, preferências, histórico, limitações e aderência. Nunca inferir preferência muscular por sexo biológico."}
5. Cada exercício DEVE vir da lista abaixo (nome exato)
6. Explique a rotação semanal
7. Cardio é opcional e deve ser distribuído pela semana conforme objetivo, recuperação, preferência, disponibilidade e possível interferência com musculação.
8. Não retorne calorias exatas de treino como fato; se citar gasto, trate como estimativa ampla e com baixa precisão.

Exercícios disponíveis (use nomes EXATOS):
${T}

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
}`;try{const r=fe(`prescrição de treino ${a.goal} ${p} dias por semana`);if(r.length===0){i("Não encontrei evidência suficiente para montar um plano científico com segurança agora."),I(!0);return}const n=`${ne}

${ve(r)}

Use APENAS sourceIds do EVIDENCE_CONTEXT no campo evidenceIds.`,B=await he(o,a,n,{schemaName:"ai_setup_plan",jsonSchema:ge}),m=JSON.parse(B),U=Ae(m,p);if(U.length>0){i(U[0]),i("Tente novamente para gerar um plano com segurança e consistência."),I(!0);return}if(((_=m.workouts)==null?void 0:_.length)>0){if(s(m.workouts),(V=m.evaluation)!=null&&V.length){const M={recommended:4,suitable:3,acceptable:2,not_recommended:1},D=[...m.evaluation].sort((j,d)=>(M[d.tier||"acceptable"]||0)-(M[j.tier||"acceptable"]||0)),x=D[0],f=D.map(j=>`${j.option}: ${j.tier||"acceptable"}`).join(" • ");i(`Avaliação: ${f}`),await A(600),i(`Vencedor: ${m.chosenSplit||(x==null?void 0:x.option)||"divisão sugerida"}`),await A(400)}m.explanation&&i(`${m.explanation}`),await A(400),m.rotation&&i(`Rotação: ${m.rotation}`);const re=["A","B","C","D","E"],X=[],H={A:null,B:null,C:null,D:null,E:null};m.workouts.forEach((M,D)=>{const x=re[D];x&&(M.type=x,X.push(x),H[x]=M.exercises.map((f,j)=>{const d=J.find(W=>W.name.toLowerCase()===f.name.toLowerCase()||W.name.toLowerCase().includes(f.name.toLowerCase().slice(0,12)));return{id:`ai_${x}_${j}_${Date.now()}`,name:(d==null?void 0:d.name)||f.name,sets:f.sets||3,repsMin:f.repsMin||8,repsMax:f.repsMax||12,muscleGroup:(d==null?void 0:d.muscleGroup)||f.muscleGroup,image:d==null?void 0:d.image}}))}),pe.setState({customWorkouts:H,activeSlots:X}),N("summary")}else i("Hmm, não consegui gerar os treinos."),I(!0)}catch(r){const n=r instanceof Error?r.message:"Erro desconhecido";if(n.includes("401")||n.includes("Incorrect API"))i(" Token inválido ou expirado. Verifique no site da OpenAI.");else if(n.includes("429")||n.includes("Rate limit"))i("Muitas requisições. Águarde 1 minuto e tente novamente.");else if(n.includes("insufficient_quota"))i("Sem créditos na conta OpenAI. Adicione saldo em platform.openai.com.");else if(n.includes("cortada")){if(K<1)return i("Resposta cortada pela API. Tentando novamente..."),q(B=>B+1),await A(1e3),w(o);i("Resposta cortada duas vezes. Tente novamente mais tarde.")}else i(` ${n}`);I(!0)}},Z=()=>h("/plans");return e.jsx("div",{className:"min-h-[100dvh] flex flex-col px-6 py-12",children:e.jsxs(ue,{mode:"wait",children:[g==="token"&&e.jsxs(P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},className:"flex-1 flex flex-col justify-center space-y-6",children:[e.jsxs("div",{className:"text-center",children:[e.jsx(xe,{name:"smart_toy",className:"text-5xl block mb-4 text-primary-300 mx-auto"}),e.jsx("h1",{className:"text-2xl font-bold mb-2",children:"Inteligência Artificial"}),e.jsx("p",{className:"text-white/50 text-sm leading-relaxed",children:"Para montar seu treino personalizado, precisamos de um token da OpenAI (ChatGPT)."})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("input",{type:"password",value:S,onChange:o=>O(o.target.value),placeholder:"sk-...",className:"input-field text-sm",autoFocus:!0}),b&&e.jsx("p",{className:"text-red-400 text-xs",children:b}),e.jsx("p",{className:"text-[11px] text-white/30 leading-relaxed",children:"Acesse platform.openai.com → API Keys → Create new key. Seu token fica salvo apenas no seu celular."})]}),e.jsx("button",{className:"btn-primary",disabled:!S.trim(),onClick:R,children:"Gerar meu treino"}),e.jsx("button",{onClick:L,className:"text-white/40 text-sm py-2",children:"Não tenho token — montar manualmente"})]},"token"),g==="generating"&&e.jsx(P.div,{initial:{opacity:0},animate:{opacity:1},className:"flex-1 flex flex-col justify-end pb-8",children:e.jsxs("div",{className:"space-y-3 mb-8",children:[l.map((o,t)=>e.jsx(P.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1},className:"bg-dark-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]",children:e.jsx("p",{className:"text-sm text-white/80 leading-relaxed",children:o})},t)),!F&&E.length===0&&e.jsxs("div",{className:"flex gap-1.5 px-4 py-3",children:[e.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),e.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),e.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]}),F&&e.jsxs("div",{className:"flex gap-3 mt-4",children:[e.jsx("button",{onClick:()=>{q(0),w(u)},className:"btn-primary flex-1 py-3 text-sm",children:"Rotação: Tentar novamente"}),e.jsx("button",{onClick:()=>h("/plans"),className:"flex-1 py-3 rounded-xl bg-dark-200 text-white/50 text-sm",children:"Pular"})]})]})},"generating"),g==="summary"&&e.jsxs(P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"flex-1 flex flex-col",children:[e.jsx("h2",{className:"text-xl font-bold mb-1",children:"Seu treino está pronto! "}),e.jsx("p",{className:"text-white/40 text-sm mb-6",children:"Montado com base na ciência pra você"}),e.jsxs("div",{className:"space-y-4 flex-1 overflow-y-auto",children:[E.map(o=>e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsxs("h3",{className:"font-bold",children:["Treino ",o.type]}),e.jsx("span",{className:"text-primary-400 text-xs",children:o.focus})]}),e.jsx("div",{className:"space-y-1",children:o.exercises.map((t,T)=>e.jsxs("p",{className:"text-xs text-white/60",children:[T+1,". ",t.name," — ",t.sets,"×",t.repsMin,"-",t.repsMax]},T))}),o.cardio&&e.jsxs("div",{className:"mt-2 pt-2 border-t border-white/5 flex items-center gap-2",children:[e.jsx("span",{className:"text-xs"}),e.jsxs("p",{className:"text-xs text-white/50",children:[o.cardio.type," — ",o.cardio.durationMin,"min (",o.cardio.intensity,")"]})]}),o.estimatedCalories&&e.jsxs("p",{className:"text-xs text-orange-400/70 mt-1",children:["~",o.estimatedCalories," kcal estimadas"]})]},o.type)),l.filter(o=>o.length>0).map((o,t)=>e.jsx("p",{className:"text-xs text-white/40 leading-relaxed",children:o},t))]}),e.jsx("button",{className:"btn-primary mt-6",onClick:Z,children:"Concluído — ver meus treinos"})]},"summary")]})})}function A(h){return new Promise(a=>setTimeout(a,h))}export{$e as AISetup};
