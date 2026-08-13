import{u as se,a as ie,r as N,B as F,S as re,b as te,j as o,A as ne,m as D}from"./index-CVoJBnl4.js";import{g as ce,b as le,a as me}from"./ai-CT_IBQld.js";import{A as ue}from"./aiSchemas-pxeU04mx.js";import"./calories-vWo9U0uR.js";import"./aiPlan-D9lBUIQo.js";const U=5,X=10,V=2;function W(n){return n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}function de(n){const e=W(n);return e.trim()?e.includes("peito")||e.includes("peitoral")?"Peitoral":e.includes("costa")||e.includes("dorsal")?"Costas":e.includes("biceps")||e.includes("antebraco")?"Bíceps":e.includes("triceps")?"Tríceps":e.includes("ombro")||e.includes("deltoide")?"Ombros":e.includes("quadriceps")||e.includes("coxa anterior")?"Quadríceps":e.includes("posterior")||e.includes("isquiotib")?"Posterior de Coxa":e.includes("gluteo")?"Glúteos":e.includes("panturr")?"Panturrilhas":e.includes("abdomen")||e.includes("core")?"Abdômen":null:null}function pe(n){if(!n)return[];const e=W(n),h=[{keys:["peito","peitoral"],group:"Peitoral"},{keys:["costa","costas","dorsal"],group:"Costas"},{keys:["biceps","antebraco"],group:"Bíceps"},{keys:["triceps"],group:"Tríceps"},{keys:["ombro","deltoide"],group:"Ombros"},{keys:["quadriceps","coxa anterior"],group:"Quadríceps"},{keys:["posterior","isquiotib"],group:"Posterior de Coxa"},{keys:["gluteo"],group:"Glúteos"},{keys:["panturrilha","gemeos"],group:"Panturrilhas"},{keys:["abdomen","core"],group:"Abdômen"}].filter(d=>d.keys.some(y=>e.includes(y))).map(d=>d.group);return Array.from(new Set(h))}function fe(n,e){const r=[],h=n.workouts||[];(h.length<2||h.length>5)&&r.push("Plano inválido: número de treinos distintos deve estar entre 2 e 5.");const d=Math.max(1,Math.min(7,e)),y=Math.max(1,h.length),P=Math.floor(d/y),k=d%y,f=new Map;h.forEach((b,l)=>{const i=b.exercises||[];(i.length<U||i.length>X)&&r.push(`Plano inválido: treino ${l+1} deve ter entre ${U} e ${X} exercícios.`);let M=0;const S=new Map;i.forEach((a,x)=>{var R,s;if((R=a.name)!=null&&R.trim()||r.push(`Plano inválido: exercício ${x+1} do treino ${l+1} sem nome.`),(s=a.muscleGroup)!=null&&s.trim()||r.push(`Plano inválido: exercício ${a.name||x+1} sem grupo muscular.`),(!Number.isFinite(a.sets)||a.sets<1||a.sets>8)&&r.push(`Plano inválido: ${a.name||`exercício ${x+1}`} com séries fora do limite (1-8).`),(!Number.isFinite(a.repsMin)||!Number.isFinite(a.repsMax)||a.repsMin<1||a.repsMax<a.repsMin)&&r.push(`Plano inválido: ${a.name||`exercício ${x+1}`} com faixa de repetições inválida.`),M+=a.sets||0,a.muscleGroup){const t=P+(l<k?1:0),A=f.get(a.muscleGroup)||0;f.set(a.muscleGroup,A+(a.sets||0)*t);const j=de(a.muscleGroup);j&&S.set(j,(S.get(j)||0)+1)}});const $=pe(b.focus);$.length>0&&$.length<=3&&$.forEach(a=>{(S.get(a)||0)<V&&r.push(`Plano inválido: treino ${l+1} com foco em ${a} precisa de ao menos ${V} exercícios desse grupamento.`)}),(M<8||M>40)&&r.push(`Plano inválido: treino ${l+1} com volume total fora do limite (8-40 séries).`)});for(const[b,l]of f.entries())l>28&&r.push(`Plano inválido: volume semanal muito alto para ${b} (${l} séries).`);return r}function Ee(){const n=se(),e=ie(s=>s.profile),[r,h]=N.useState("generating"),[d,y]=N.useState([]),[P,k]=N.useState([]),f=e.trainingDays.length||3,b=e.goal==="lose"?"perder gordura":e.goal==="gain"?"ganhar massa muscular":"manter peso",l=e.experienceLevel==="advanced"?"avançado":e.experienceLevel==="intermediate"?"intermediário":"iniciante";N.useEffect(()=>{r==="generating"&&x()},[]);const i=s=>{y(t=>[...t,s])},[M,S]=N.useState(0),[$,a]=N.useState(!1),x=async()=>{var w,B,L;a(!1),d.length===0&&(i(`Olá, ${e.name}! `),await E(800),i(`Vi que você treina ${f}x por semana e é ${l}. Deixa eu avaliar a melhor estratégia de divisão pra você...`),await E(1200),i(`Seu objetivo é ${b}. Vou adaptar volume e seleção de exercícios ao seu contexto real de treino.`),await E(1e3),i("Avaliando opções de split (Full Body, Upper/Lower, ABC, ABCD, ABCDE)... "));const s={};for(const c of F)(s[w=c.muscleGroup]??(s[w]=[])).push(c.name);const t=Object.entries(s).map(([c,p])=>`${c}: ${p.join(", ")}`).join(`
`),A=e.trainingFocus==="upper"?"foco em superiores (mais volume de peito/costas/ombros/braços)":e.trainingFocus==="lower"?"foco em inferiores (mais volume de glúteos/quadríceps/posterior)":e.trainingFocus==="custom"?"personalizado (ver divisão abaixo)":"equilibrado (volume igual para todos os grupos)",j=e.trainingLocation==="casa"?"casa":e.trainingLocation==="hibrido"?"híbrido (casa + academia)":"academia",H=e.sessionDurationMin||60,J=e.trainingAgeMonths??0,Q=(e.equipmentAccess||[]).join(", ")||"não informado",K=(e.preferredExercises||[]).join(", ")||"não informado",Z=(e.dislikedExercises||[]).join(", ")||"não informado",Y=(e.limitations||[]).join(", ")||"não informado",ee=e.trainingFocus==="custom"&&e.customSplit?`
DIVISÃO PERSONALIZADA PELO USUÁRIO:
`+Object.entries(e.customSplit).map(([c,p])=>`- Treino ${c}: ${p}`).join(`
`):"",oe=`Você é um preparador físico esportivo com pós-graduação em fisiologia do exercício.

PERFIL DO ALUNO:
  - Sexo biológico informado: ${e.sex==="male"?"masculino":e.sex==="female"?"feminino":"não informado"}
- Idade: ${e.age} anos
- Peso: ${e.weight}kg, Altura: ${e.height}cm
- Objetivo: ${b}
- Dias disponíveis: ${f}x por semana
- Nível: ${l}
- Tempo disponível por sessão: ${H} min
- Local de treino: ${j}
- Training age: ${J} meses
- Equipamentos disponíveis: ${Q}
- Exercícios preferidos: ${K}
- Exercícios evitados: ${Z}
- Limitações/dor: ${Y}
- Preferência: ${A}
${ee}

DIRETRIZES BASEADAS EM EVIDÊNCIA POR FAIXA ETÁRIA E SEXO:
${e.age>=40?"- Acima de 40 anos: priorizar aquecimento articular, evitar cargas excessivas em compressão vertebral, incluir exercícios de mobilidade e estabilização. Preferir séries moderadas (10-15 reps) em vez de carga máxima. Recuperação entre sessões é mais lenta — evitar treinar o mesmo grupo em dias consecutivos.":""}
${e.age>=50?"- Acima de 50 anos: atenção especial a exercícios de equilíbrio e saúde óssea. Evitar impacto excessivo. Incluir trabalho de core/estabilização em todo treino.":""}
${e.age<25?"- Jovem (<25 anos): pode tolerar maior volume e frequência. Aproveitar janela hormonal para compostos pesados.":""}
${e.sex==="female"?"- Mulher: considerar proporção de fibras tipo I vs II (mais resistência em membros inferiores). Maior volume de glúteo/posterior é fisiológicamente justificado. Se >40 anos, treino de força é essencial para prevenção de osteoporose — priorizar exercícios com carga axial (agachamento, terra).":""}
${e.sex==="male"?"- Homem: distribuição natural de massa favorece tronco superior. Equilibrar com volume adequado de membros inferiores. Se >40 anos, incluir mobilidade de ombro e cuidado com articulações.":""}

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
2. Cada treino de musculação deve ter entre 5 e 10 exercícios.
3. Se o foco de um treino tiver até 3 grupamentos principais (ex.: peito + tríceps + ombros), distribua no mínimo 2 exercícios por grupamento (evite 1 exercício isolado por grupo).
4. Respeite a preferência do aluno: ${A}
${e.trainingFocus==="custom"?"5. Se o aluno especificou a divisão personalizada, SIGA-A. Monte os exercícios respeitando os grupos que ele pediu.":"5. Priorize músculos e padrões de movimento com base em objetivo declarado, preferências, histórico, limitações e aderência. Nunca inferir preferência muscular por sexo biológico."}
6. Cada exercício DEVE vir da lista abaixo (nome exato)
7. Explique a rotação semanal
8. Cardio é opcional e deve ser distribuído pela semana conforme objetivo, recuperação, preferência, disponibilidade e possível interferência com musculação.
9. Não retorne calorias exatas de treino como fato; se citar gasto, trate como estimativa ampla e com baixa precisão.

Exercícios disponíveis (use nomes EXATOS):
${t}

Responda APENAS JSON puro (sem markdown, sem \`\`\`):
${re}
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
      "exercises": [
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"},
        {"name": "NOME EXATO", "sets": 3, "repsMin": 8, "repsMax": 12, "muscleGroup": "grupo"}
      ]
    }
  ],
  "evidenceIds": ["SRC-ACSM-RT-2026"]
}`;try{const c=ce(`prescrição de treino ${e.goal} ${f} dias por semana`);if(c.length===0){i("Não encontrei evidência suficiente para montar um plano científico com segurança agora."),a(!0);return}const p=`${oe}

${le(c)}

Use APENAS sourceIds do EVIDENCE_CONTEXT no campo evidenceIds.`,I=await me(null,e,p,{schemaName:"ai_setup_plan",jsonSchema:ue},"workout_builder"),m=JSON.parse(I),q=fe(m,f);if(q.length>0){i(q[0]),i("Tente novamente para gerar um plano com segurança e consistência."),a(!0);return}if(((B=m.workouts)==null?void 0:B.length)>0){if(k(m.workouts),(L=m.evaluation)!=null&&L.length){const O={recommended:4,suitable:3,acceptable:2,not_recommended:1},T=[...m.evaluation].sort((C,u)=>(O[u.tier||"acceptable"]||0)-(O[C.tier||"acceptable"]||0)),g=T[0],v=T.map(C=>`${C.option}: ${C.tier||"acceptable"}`).join(" • ");i(`Avaliação: ${v}`),await E(600),i(`Vencedor: ${m.chosenSplit||(g==null?void 0:g.option)||"divisão sugerida"}`),await E(400)}m.explanation&&i(`${m.explanation}`),await E(400),m.rotation&&i(`Rotação: ${m.rotation}`);const ae=["A","B","C","D","E"],G=[],_={A:null,B:null,C:null,D:null,E:null};m.workouts.forEach((O,T)=>{const g=ae[T];g&&(O.type=g,G.push(g),_[g]=O.exercises.map((v,C)=>{const u=F.find(z=>z.name.toLowerCase()===v.name.toLowerCase()||z.name.toLowerCase().includes(v.name.toLowerCase().slice(0,12)));return{id:`ai_${g}_${C}_${Date.now()}`,name:(u==null?void 0:u.name)||v.name,sets:v.sets||3,repsMin:v.repsMin||8,repsMax:v.repsMax||12,muscleGroup:(u==null?void 0:u.muscleGroup)||v.muscleGroup,image:u==null?void 0:u.image}}))}),te.setState({customWorkouts:_,activeSlots:G}),h("summary")}else i("Hmm, não consegui gerar os treinos."),a(!0)}catch(c){const p=c instanceof Error?c.message:"Erro desconhecido";if(p.includes("429")||p.includes("Rate limit"))i("Muitas requisições. Águarde 1 minuto e tente novamente.");else if(p.includes("cortada")){if(M<1)return i("Resposta cortada pela API. Tentando novamente..."),S(I=>I+1),await E(1e3),x();i("Resposta cortada duas vezes. Tente novamente mais tarde.")}else i(` ${p}`);a(!0)}},R=()=>n("/plans");return o.jsx("div",{className:"min-h-[100dvh] flex flex-col px-6 py-12",children:o.jsxs(ne,{mode:"wait",children:[r==="generating"&&o.jsx(D.div,{initial:{opacity:0},animate:{opacity:1},className:"flex-1 flex flex-col justify-end pb-8",children:o.jsxs("div",{className:"space-y-3 mb-8",children:[d.map((s,t)=>o.jsx(D.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1},className:"bg-dark-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]",children:o.jsx("p",{className:"text-sm text-white/80 leading-relaxed",children:s})},t)),!$&&P.length===0&&o.jsxs("div",{className:"flex gap-1.5 px-4 py-3",children:[o.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),o.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),o.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]}),$&&o.jsxs("div",{className:"flex gap-3 mt-4",children:[o.jsx("button",{onClick:()=>{S(0),x()},className:"btn-primary flex-1 py-3 text-sm",children:"Rotação: Tentar novamente"}),o.jsx("button",{onClick:()=>n("/plans"),className:"flex-1 py-3 rounded-xl bg-dark-200 text-white/50 text-sm",children:"Pular"})]})]})},"generating"),r==="summary"&&o.jsxs(D.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"flex-1 flex flex-col",children:[o.jsx("h2",{className:"text-xl font-bold mb-1",children:"Seu treino está pronto! "}),o.jsx("p",{className:"text-white/40 text-sm mb-6",children:"Montado com base na ciência pra você"}),o.jsxs("div",{className:"space-y-4 flex-1 overflow-y-auto",children:[P.map(s=>o.jsxs("div",{className:"card",children:[o.jsxs("div",{className:"flex items-center justify-between mb-2",children:[o.jsxs("h3",{className:"font-bold",children:["Treino ",s.type]}),o.jsx("span",{className:"text-primary-400 text-xs",children:s.focus})]}),o.jsx("div",{className:"space-y-1",children:s.exercises.map((t,A)=>o.jsxs("p",{className:"text-xs text-white/60",children:[A+1,". ",t.name," — ",t.sets,"×",t.repsMin,"-",t.repsMax]},A))}),s.cardio&&o.jsxs("div",{className:"mt-2 pt-2 border-t border-white/5 flex items-center gap-2",children:[o.jsx("span",{className:"text-xs"}),o.jsxs("p",{className:"text-xs text-white/50",children:[s.cardio.type," — ",s.cardio.durationMin,"min (",s.cardio.intensity,")"]})]}),s.estimatedCalories&&o.jsxs("p",{className:"text-xs text-orange-400/70 mt-1",children:["~",s.estimatedCalories," kcal estimadas"]})]},s.type)),d.filter(s=>s.length>0).map((s,t)=>o.jsx("p",{className:"text-xs text-white/40 leading-relaxed",children:s},t))]}),o.jsx("button",{className:"btn-primary mt-6",onClick:R,children:"Concluído — ver meus treinos"})]},"summary")]})})}function E(n){return new Promise(e=>setTimeout(e,n))}export{Ee as AISetup};
