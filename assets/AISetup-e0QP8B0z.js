import{u as ue,a as le,r as j,B as T,S as me,b as pe,j as i,A as de,m as q}from"./index-TA-8WaDo.js";import{g as fe,b as xe,a as ge}from"./ai-BL5Av_2I.js";import{A as he}from"./aiSchemas-pxeU04mx.js";import"./calories-vWo9U0uR.js";import"./aiPlan-D9lBUIQo.js";const W=5,Q=10,H=2;function Y(r){return r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}function be(r){const e=Y(r);return e.trim()?e.includes("peito")||e.includes("peitoral")?"Peitoral":e.includes("costa")||e.includes("dorsal")?"Costas":e.includes("biceps")||e.includes("antebraco")?"Bíceps":e.includes("triceps")?"Tríceps":e.includes("ombro")||e.includes("deltoide")?"Ombros":e.includes("quadriceps")||e.includes("coxa anterior")?"Quadríceps":e.includes("posterior")||e.includes("isquiotib")?"Posterior de Coxa":e.includes("gluteo")?"Glúteos":e.includes("panturr")?"Panturrilhas":e.includes("abdomen")||e.includes("core")?"Abdômen":null:null}function ve(r){if(!r)return[];const e=Y(r),t=[{keys:["peito","peitoral"],group:"Peitoral"},{keys:["costa","costas","dorsal"],group:"Costas"},{keys:["biceps","antebraco"],group:"Bíceps"},{keys:["triceps"],group:"Tríceps"},{keys:["ombro","deltoide"],group:"Ombros"},{keys:["quadriceps","coxa anterior"],group:"Quadríceps"},{keys:["posterior","isquiotib"],group:"Posterior de Coxa"},{keys:["gluteo"],group:"Glúteos"},{keys:["panturrilha","gemeos"],group:"Panturrilhas"},{keys:["abdomen","core"],group:"Abdômen"}].filter(c=>c.keys.some(m=>e.includes(m))).map(c=>c.group);return Array.from(new Set(t))}function Ae(r,e){const s=[],t=r.workouts||[];(t.length<2||t.length>5)&&s.push("Plano inválido: número de treinos distintos deve estar entre 2 e 5.");const c=Math.max(1,Math.min(7,e)),m=Math.max(1,t.length),p=Math.floor(c/m),v=c%m,d=new Map;t.forEach((A,f)=>{const o=A.exercises||[];(o.length<W||o.length>Q)&&s.push(`Plano inválido: treino ${f+1} deve ter entre ${W} e ${Q} exercícios.`);let l=0;const u=new Map;o.forEach((a,M)=>{var O,n;if((O=a.name)!=null&&O.trim()||s.push(`Plano inválido: exercício ${M+1} do treino ${f+1} sem nome.`),(n=a.muscleGroup)!=null&&n.trim()||s.push(`Plano inválido: exercício ${a.name||M+1} sem grupo muscular.`),(!Number.isFinite(a.sets)||a.sets<1||a.sets>8)&&s.push(`Plano inválido: ${a.name||`exercício ${M+1}`} com séries fora do limite (1-8).`),(!Number.isFinite(a.repsMin)||!Number.isFinite(a.repsMax)||a.repsMin<1||a.repsMax<a.repsMin)&&s.push(`Plano inválido: ${a.name||`exercício ${M+1}`} com faixa de repetições inválida.`),l+=a.sets||0,a.muscleGroup){const x=p+(f<v?1:0),N=d.get(a.muscleGroup)||0;d.set(a.muscleGroup,N+(a.sets||0)*x);const P=be(a.muscleGroup);P&&u.set(P,(u.get(P)||0)+1)}});const h=ve(A.focus);h.length>0&&h.length<=3&&h.forEach(a=>{(u.get(a)||0)<H&&s.push(`Plano inválido: treino ${f+1} com foco em ${a} precisa de pelo menos ${H} exercícios desse grupamento muscular.`)}),(l<8||l>40)&&s.push(`Plano inválido: treino ${f+1} com volume total fora do limite (8-40 séries).`)});for(const[A,f]of d.entries())f>28&&s.push(`Plano inválido: volume semanal muito alto para ${A} (${f} séries).`);return s}const Ee=["A","B","C","D","E"],J=6,F=10;function $(r){return r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}function L(r){const e=$(r);return e.trim()?e.includes("peito")||e.includes("peitoral")?"Peitoral":e.includes("costa")||e.includes("dorsal")?"Costas":e.includes("biceps")||e.includes("antebraco")?"Bíceps":e.includes("triceps")?"Tríceps":e.includes("ombro")||e.includes("deltoide")?"Ombros":e.includes("quadriceps")||e.includes("coxa anterior")?"Quadríceps":e.includes("posterior")||e.includes("isquiotib")?"Posterior de Coxa":e.includes("gluteo")?"Glúteos":e.includes("panturr")?"Panturrilhas":e.includes("abdomen")||e.includes("core")?"Abdômen":null:null}function K(r){if(!r)return[];const e=[{keys:["peito","peitoral"],group:"Peitoral"},{keys:["costa","costas","dorsal"],group:"Costas"},{keys:["biceps","antebraco"],group:"Bíceps"},{keys:["triceps"],group:"Tríceps"},{keys:["ombro","deltoide"],group:"Ombros"},{keys:["quadriceps","coxa anterior"],group:"Quadríceps"},{keys:["posterior","isquiotib"],group:"Posterior de Coxa"},{keys:["gluteo"],group:"Glúteos"},{keys:["panturrilha","gemeos"],group:"Panturrilhas"},{keys:["abdomen","core"],group:"Abdômen"}],s=$(r);return Array.from(new Set(e.filter(t=>t.keys.some(c=>s.includes(c))).map(t=>t.group)))}function Z(r){return r==="Abdômen"?{repsMin:12,repsMax:20}:{repsMin:8,repsMax:12}}function ye(r){const e=$(r);return T.find(s=>$(s.name)===e)||T.find(s=>$(s.name).includes(e)||e.includes($(s.name)))}function Me(r,e,s){var v;const t=K(r.focus),c=K((v=e.customSplit)==null?void 0:v[s]),m=Array.from(new Set((r.exercises||[]).map(d=>L(d.muscleGroup||"")).filter(d=>!!d)));return Array.from(new Set([...t,...c,...m]))}function Se(r,e){var f;const s=new Set,t=[];for(const o of r.exercises||[]){if(!((f=o==null?void 0:o.name)!=null&&f.trim()))continue;const l=$(o.name);if(s.has(l))continue;s.add(l);const u=ye(o.name),h=L(o.muscleGroup||"")||L((u==null?void 0:u.muscleGroup)||"")||o.muscleGroup||"Geral",a=Z(h);t.push({name:(u==null?void 0:u.name)||o.name,sets:Number.isFinite(o.sets)?Math.max(1,Math.min(8,o.sets)):3,repsMin:Number.isFinite(o.repsMin)?Math.max(1,o.repsMin):a.repsMin,repsMax:Number.isFinite(o.repsMax)?Math.max(Number.isFinite(o.repsMin)?Math.max(1,o.repsMin):a.repsMin,o.repsMax):a.repsMax,muscleGroup:(u==null?void 0:u.muscleGroup)||h})}const c=o=>t.filter(l=>l.muscleGroup===o).length,m=o=>{for(const l of T){if(o&&l.muscleGroup!==o)continue;const u=$(l.name);if(s.has(u))continue;s.add(u);const h=Z(l.muscleGroup);return t.push({name:l.name,sets:2,repsMin:h.repsMin,repsMax:h.repsMax,muscleGroup:l.muscleGroup}),!0}return!1},p=e.filter(Boolean),v=p.length>0&&p.length<=3?3:p.length<=5?2:1,d=p.length>0?p.length*v:J,A=Math.min(F,Math.max(J,d));for(const o of p)for(;c(o)<v&&t.length<F&&m(o););if(p.length>0){let o=!0;for(;t.length<A&&o;){o=!1;for(const l of p){if(t.length>=A)break;m(l)&&(o=!0)}}}for(;t.length<A&&m(););return{...r,exercises:t.slice(0,F)}}function Ce(r,e){return Array.isArray(r)?r.map((s,t)=>{if(!s||typeof s!="object")return null;const c=s,m=Ee[t];if(!m)return null;const p={...c,type:m,focus:c.focus||`Treino ${m}`,exercises:Array.isArray(c.exercises)?c.exercises:[]},v=Me(p,e,m);return Se(p,v)}).filter(s=>!!s):[]}function Te(){const r=ue(),e=le(n=>n.profile),[s,t]=j.useState("generating"),[c,m]=j.useState([]),[p,v]=j.useState([]),d=e.trainingDays.length||3,A=e.goal==="lose"?"perder gordura":e.goal==="gain"?"ganhar massa muscular":"manter peso",f=e.experienceLevel==="advanced"?"avançado":e.experienceLevel==="intermediate"?"intermediário":"iniciante";j.useEffect(()=>{s==="generating"&&M()},[]);const o=n=>{m(x=>[...x,n])},[l,u]=j.useState(0),[h,a]=j.useState(!1),M=async()=>{var _,z;a(!1),c.length===0&&(o(`Olá, ${e.name}! `),await C(800),o(`Vi que você treina ${d}x por semana e é ${f}. Deixa eu avaliar a melhor estratégia de divisão pra você...`),await C(1200),o(`Seu objetivo é ${A}. Vou adaptar volume e seleção de exercícios ao seu contexto real de treino.`),await C(1e3),o("Avaliando opções de split (Full Body, Upper/Lower, ABC, ABCD, ABCDE)... "));const n={};for(const b of T)(n[_=b.muscleGroup]??(n[_]=[])).push(b.name);const x=Object.entries(n).map(([b,y])=>`${b}: ${y.join(", ")}`).join(`
`),N=e.trainingFocus==="upper"?"foco em superiores (mais volume de peito/costas/ombros/braços)":e.trainingFocus==="lower"?"foco em inferiores (mais volume de glúteos/quadríceps/posterior)":e.trainingFocus==="custom"?"personalizado (ver divisão abaixo)":"equilibrado (volume igual para todos os grupos)",P=e.trainingLocation==="casa"?"casa":e.trainingLocation==="hibrido"?"híbrido (casa + academia)":"academia",ee=e.sessionDurationMin||60,oe=e.trainingAgeMonths??0,se=(e.equipmentAccess||[]).join(", ")||"não informado",re=(e.preferredExercises||[]).join(", ")||"não informado",ae=(e.dislikedExercises||[]).join(", ")||"não informado",ie=(e.limitations||[]).join(", ")||"não informado",ne=e.trainingFocus==="custom"&&e.customSplit?`
DIVISÃO PERSONALIZADA PELO USUÁRIO:
`+Object.entries(e.customSplit).map(([b,y])=>`- Treino ${b}: ${y}`).join(`
`):"",te=`Você é um preparador físico esportivo com pós-graduação em fisiologia do exercício.

PERFIL DO ALUNO:
  - Sexo biológico informado: ${e.sex==="male"?"masculino":e.sex==="female"?"feminino":"não informado"}
- Idade: ${e.age} anos
- Peso: ${e.weight}kg, Altura: ${e.height}cm
- Objetivo: ${A}
- Dias disponíveis: ${d}x por semana
- Nível: ${f}
- Tempo disponível por sessão: ${ee} min
- Local de treino: ${P}
- Training age: ${oe} meses
- Equipamentos disponíveis: ${se}
- Exercícios preferidos: ${re}
- Exercícios evitados: ${ae}
- Limitações/dor: ${ie}
- Preferência: ${N}
${ne}

DIRETRIZES BASEADAS EM EVIDÊNCIA POR FAIXA ETÁRIA E SEXO:
${e.age>=40?"- Acima de 40 anos: priorizar aquecimento articular, evitar cargas excessivas em compressão vertebral, incluir exercícios de mobilidade e estabilização. Preferir séries moderadas (10-15 reps) em vez de carga máxima. Recuperação entre sessões é mais lenta — evitar treinar o mesmo grupo em dias consecutivos.":""}
${e.age>=50?"- Acima de 50 anos: atenção especial a exercícios de equilíbrio e saúde óssea. Evitar impacto excessivo. Incluir trabalho de core/estabilização em todo treino.":""}
${e.age<25?"- Jovem (<25 anos): pode tolerar maior volume e frequência. Aproveitar janela hormonal para compostos pesados.":""}
${e.sex==="female"?"- Mulher: considerar proporção de fibras tipo I vs II (mais resistência em membros inferiores). Maior volume de glúteo/posterior é fisiológicamente justificado. Se >40 anos, treino de força é essencial para prevenção de osteoporose — priorizar exercícios com carga axial (agachamento, terra).":""}
${e.sex==="male"?"- Homem: distribuição natural de massa favorece tronco superior. Equilibrar com volume adequado de membros inferiores. Se >40 anos, incluir mobilidade de ombro e cuidado com articulações.":""}

SUA TAREFA — AVALIAÇÃO DE SPLIT:
Antes de montar o treino, avalie TODAS estas opções de divisão e classifique cada uma em: recommended, suitable, acceptable ou not_recommended considerando o perfil acima:

1. Full Body (2-3 treinos distintos, rotaciona nos ${d} dias)
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
4. Respeite a preferência do aluno: ${N}
${e.trainingFocus==="custom"?"5. Se o aluno especificou a divisão personalizada, SIGA-A. Monte os exercícios respeitando os grupos que ele pediu.":"5. Priorize músculos e padrões de movimento com base em objetivo declarado, preferências, histórico, limitações e aderência. Nunca inferir preferência muscular por sexo biológico."}
6. Cada exercício DEVE vir da lista abaixo (nome exato)
7. Explique a rotação semanal
8. Cardio é opcional e deve ser distribuído pela semana conforme objetivo, recuperação, preferência, disponibilidade e possível interferência com musculação.
9. Não retorne calorias exatas de treino como fato; se citar gasto, trate como estimativa ampla e com baixa precisão.

Exercícios disponíveis (use nomes EXATOS):
${x}

Responda APENAS JSON puro (sem markdown, sem \`\`\`):
${me}
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
}`;try{const b=fe(`prescrição de treino ${e.goal} ${d} dias por semana`);if(b.length===0){o("Não encontrei evidência suficiente para montar um plano científico com segurança agora."),a(!0);return}const y=`${te}

${xe(b)}

Use APENAS sourceIds do EVIDENCE_CONTEXT no campo evidenceIds.`,B=await ge(null,e,y,{schemaName:"ai_setup_plan",jsonSchema:he},"workout_builder"),S=JSON.parse(B),R=Ce(S.workouts,e),ce={...S,workouts:R},U=Ae(ce,d),X=U.filter(w=>!w.includes("com foco em"));if(X.length>0){o(X[0]),o("Tente novamente para gerar um plano com segurança e consistência."),a(!0);return}if(R.length>0){if(U.length>0&&(o("Ajustei automaticamente o volume por grupamento para entregar um treino mais completo."),await C(500)),v(R),(z=S.evaluation)!=null&&z.length){const G={recommended:4,suitable:3,acceptable:2,not_recommended:1},k=[...S.evaluation].sort((g,I)=>(G[I.tier||"acceptable"]||0)-(G[g.tier||"acceptable"]||0)),E=k[0],D=k.map(g=>`${g.option}: ${g.tier||"acceptable"}`).join(" • ");o(`Avaliação: ${D}`),await C(600),o(`Vencedor: ${S.chosenSplit||(E==null?void 0:E.option)||"divisão sugerida"}`),await C(400)}S.explanation&&o(`${S.explanation}`),await C(400),S.rotation&&o(`Rotação: ${S.rotation}`);const w=[],V={A:null,B:null,C:null,D:null,E:null};R.forEach(G=>{const k=G.type;k&&(w.push(k),V[k]=G.exercises.map((E,D)=>{const g=T.find(I=>I.name.toLowerCase()===E.name.toLowerCase()||I.name.toLowerCase().includes(E.name.toLowerCase().slice(0,12)));return{id:`ai_${k}_${D}_${Date.now()}`,name:(g==null?void 0:g.name)||E.name,sets:E.sets||3,repsMin:E.repsMin||8,repsMax:E.repsMax||12,muscleGroup:(g==null?void 0:g.muscleGroup)||E.muscleGroup,image:g==null?void 0:g.image}}))}),pe.setState({customWorkouts:V,activeSlots:w}),t("summary")}else o("Hmm, não consegui gerar os treinos."),a(!0)}catch(b){const y=b instanceof Error?b.message:"Erro desconhecido";if(y.includes("429")||y.includes("Rate limit"))o("Muitas requisições. Águarde 1 minuto e tente novamente.");else if(y.includes("cortada")){if(l<1)return o("Resposta cortada pela API. Tentando novamente..."),u(B=>B+1),await C(1e3),M();o("Resposta cortada duas vezes. Tente novamente mais tarde.")}else o(` ${y}`);a(!0)}},O=()=>r("/plans");return i.jsx("div",{className:"min-h-[100dvh] flex flex-col px-6 py-12",children:i.jsxs(de,{mode:"wait",children:[s==="generating"&&i.jsx(q.div,{initial:{opacity:0},animate:{opacity:1},className:"flex-1 flex flex-col justify-end pb-8",children:i.jsxs("div",{className:"space-y-3 mb-8",children:[c.map((n,x)=>i.jsx(q.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.1},className:"bg-dark-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]",children:i.jsx("p",{className:"text-sm text-white/80 leading-relaxed",children:n})},x)),!h&&p.length===0&&i.jsxs("div",{className:"flex gap-1.5 px-4 py-3",children:[i.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),i.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),i.jsx("span",{className:"w-2 h-2 bg-primary-400 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]}),h&&i.jsxs("div",{className:"flex gap-3 mt-4",children:[i.jsx("button",{onClick:()=>{u(0),M()},className:"btn-primary flex-1 py-3 text-sm",children:"Rotação: Tentar novamente"}),i.jsx("button",{onClick:()=>r("/plans"),className:"flex-1 py-3 rounded-xl bg-dark-200 text-white/50 text-sm",children:"Pular"})]})]})},"generating"),s==="summary"&&i.jsxs(q.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"flex-1 flex flex-col",children:[i.jsx("h2",{className:"text-xl font-bold mb-1",children:"Seu treino está pronto! "}),i.jsx("p",{className:"text-white/40 text-sm mb-6",children:"Montado com base na ciência pra você"}),i.jsxs("div",{className:"space-y-4 flex-1 overflow-y-auto",children:[p.map(n=>i.jsxs("div",{className:"card",children:[i.jsxs("div",{className:"flex items-center justify-between mb-2",children:[i.jsxs("h3",{className:"font-bold",children:["Treino ",n.type]}),i.jsx("span",{className:"text-primary-400 text-xs",children:n.focus})]}),i.jsx("div",{className:"space-y-1",children:n.exercises.map((x,N)=>i.jsxs("p",{className:"text-xs text-white/60",children:[N+1,". ",x.name," — ",x.sets,"×",x.repsMin,"-",x.repsMax]},N))}),n.cardio&&i.jsxs("div",{className:"mt-2 pt-2 border-t border-white/5 flex items-center gap-2",children:[i.jsx("span",{className:"text-xs"}),i.jsxs("p",{className:"text-xs text-white/50",children:[n.cardio.type," — ",n.cardio.durationMin,"min (",n.cardio.intensity,")"]})]}),n.estimatedCalories&&i.jsxs("p",{className:"text-xs text-orange-400/70 mt-1",children:["~",n.estimatedCalories," kcal estimadas"]})]},n.type)),c.filter(n=>n.length>0).map((n,x)=>i.jsx("p",{className:"text-xs text-white/40 leading-relaxed",children:n},x))]}),i.jsx("button",{className:"btn-primary mt-6",onClick:O,children:"Concluído — ver meus treinos"})]},"summary")]})})}function C(r){return new Promise(e=>setTimeout(e,r))}export{Te as AISetup};
