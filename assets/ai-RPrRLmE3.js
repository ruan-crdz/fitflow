import{a as O,i as R,S as M,P as q,Q as D,s as G,q as F,v as H,d as B,g as Q,w as W}from"./index-CYROSrGN.js";import{c as U,a as V}from"./calories-vWo9U0uR.js";import{i as z,g as J,b as Y,e as X,a as K}from"./evidence-ChQtjloK.js";import{c as Z}from"./water-BSM1bDNo.js";function ee(o){const t=o.sex==="male"?"masculino":o.sex==="female"?"feminino":"não informado",c=o.trainingLocation==="casa"?"casa":o.trainingLocation==="hibrido"?"híbrido (casa + academia)":"academia";return[`Nome: ${o.name}`,`Sexo biológico: ${t}`,`Idade: ${o.age} anos`,`Peso: ${o.weight}kg`,`Altura: ${o.height}cm`,`Dias de treino: ${o.trainingDays.length}x por semana`,`Tempo por sessão: ${o.sessionDurationMin||60} min`,`Local de treino: ${c}`,`Training age: ${o.trainingAgeMonths??0} meses`,`Equipamentos disponíveis: ${(o.equipmentAccess||[]).join(", ")||"não informado"}`,`Exercícios preferidos: ${(o.preferredExercises||[]).join(", ")||"não informado"}`,`Exercícios que evita: ${(o.dislikedExercises||[]).join(", ")||"não informado"}`,`Limitações/dor: ${(o.limitations||[]).join(", ")||"não informado"}`]}const oe=`Você é a GymPilot AI, assistente fitness pessoal integrada ao app GymPilot.
Você é direta, motivadora e científica. Responde em português brasileiro.
Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.

Você recebeu um snapshot recente dos dados do aluno:
- Perfil completo (peso, altura, idade, objetivo, nível)
- Alimentação do dia (tudo que comeu, calorias, macros)
- Hidratação do dia (copos de água)
- Programa de treino atual (exercícios por treino)
- Histórico de treinos (frequência, sequência)
- Evolução de peso
- Fase do ciclo menstrual (se aplicável)

USE ESSES DADOS ATIVAMENTE nas respostas. Se perguntarem sobre mal-estar, trate alimentação e hidratação apenas como possíveis fatores.
Se perguntarem sobre desempenho, correlacione com nutrição e hidratação.
Dê alertas proativos (ex: "você só tomou 500ml de água, beba mais antes do treino").

Regras:
- Respostas curtas e práticas: no chat, responda em no máximo 2 parágrafos curtos ou 4 bullets.
- Quando falar de nutrição/treino, seja baseada em evidências
- Use emojis com moderação
- Nunca invente dados ou números sem base — use os dados reais fornecidos
- Se não souber algo, diga que não sabe
- Adapte conselhos ao perfil do aluno
- Se a fase do ciclo menstrual estiver informada, use como contexto e não como regra automática
- Quando o aluno reportar sintomas (mal-estar, dor de cabeça, fraqueza), analise os dados para contexto sem afirmar diagnóstico ou causalidade como certeza`;function _(){const{assistantName:o,personalityPrompt:t,personality:c}=R(),i=c==="tough"?"Seu tom é de bronca forte, cobrança prática e energia de acordar o aluno para agir agora. Mesmo dando bronca, seja curto: 1 chamada de atenção + 2 passos práticos.":"Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.";return oe.replace("GymPilot AI",o).replace("Você é direta, motivadora e científica.",`Personalidade configurada: ${t}`).replace("Seu tom é como uma personal trainer amiga: próxima, encorajadora, mas embasada.",i)+`
- Sempre que precisar falar seu nome, use exatamente: ${o}.
`+M}const ae=`

AÇÕES NO APP:
- Se o aluno pedir para trocar, substituir ou renomear exercício no treino, confirme a intenção em texto curto e inclua no FINAL um bloco de ação oculto.
- Formato exato: [ACTION:{"type":"replace_exercise","scope":"all|workout","workoutType":"A|B|C|D|E","fromName":"nome atual","toName":"nome exato do catálogo"}]
- Use scope "workout" quando o aluno citar treino A/B/C/D/E; use scope "all" quando pedir troca geral.
- O toName deve existir exatamente no catálogo. Não inclua ACTION se não houver pedido claro de alteração.`;function L(o){var A,a;const t=q.getState(),c=t.phase!=="none"?`
- Fase do ciclo: ${(A=D.find(e=>e.value===t.phase))==null?void 0:A.label} (${(a=D.find(e=>e.value===t.phase))==null?void 0:a.tip})`:"",i=o.experienceLevel==="advanced"?"avançado":o.experienceLevel==="intermediate"?"intermediário":"iniciante",n=o.goal==="lose"?"perder gordura":o.goal==="gain"?"ganhar massa":"manter peso",E=ee(o),p=G.getState(),h=p.getTodayEntries(),r=p.getTodayTotals(),m=U(o),u=V(m,o.goal),$=h.length>0?h.map(e=>`  • ${e.time} — ${e.name} (${e.calories}kcal, P:${e.protein}g C:${e.carbs}g G:${e.fat}g)`).join(`
`):"  Nenhuma refeição registrada hoje",d=F.getState().getToday(),v=Math.round(Z(o.weight)*4),g=d*250,f=v*250,s=H.getState().getTodaySummary(),x=B.getState().entries.slice(-5),b=x.length>1?`Últimos pesos: ${x.map(e=>`${e.date.slice(5)}: ${e.weight}kg`).join(", ")}`:"",S=Q.getState(),w=S.getTotalWorkouts(),I=S.getCurrentStreak(),T=S.sessions.slice(0,3),j=T.length>0?T.map(e=>{const l=e.workoutType?`Treino ${e.workoutType}`:e.activityName||"Atividade avulsa";return`  • ${e.date} — ${l} (${e.durationMs?Math.round(e.durationMs/6e4)+"min":"?"}${e.completedAt?", completo":", incompleto"})`}).join(`
`):"  Nenhum treino registrado",N=W.getState(),P=N.activeSlots.map(e=>{const l=N.getExercises(e);return`  Treino ${e}: ${l.length} exercícios (${l.map(y=>y.name).join(", ")})`}).join(`
`);return`
Dados do aluno:
- Objetivo: ${n}
- Nível: ${i}${c}
${E.map(e=>`- ${e}`).join(`
`)}
- TDEE estimado: ${m} kcal/dia
- Atividade hoje: ${s.steps} passos, ${s.activeCalories} kcal ativas, fonte ${s.source}
${b?`- ${b}`:""}

ALIMENTAÇÃO HOJE:
${$}
  TOTAL: ${r.calories}kcal consumidas (meta: ${m}kcal) | P:${r.protein}g/${u.protein}g | C:${r.carbs}g/${u.carbs}g | G:${r.fat}g/${u.fat}g
  Restante: ${m-r.calories}kcal

HIDRATAÇÃO HOJE:
  ${g}ml / ${f}ml (${d}/${v} copos)${d>=v?"  Meta atingida":` — faltam ${f-g}ml`}

PROGRAMA DE TREINO ATUAL:
${P}

HISTÓRICO RECENTE:
${j}
  Total: ${w} treinos | Sequência atual: ${I} semanas`}async function ie(o,t){var k,x,b,S,w,I,T,j,N,C,P,A;const c=O.getState().profile;if(!c)throw new Error("Perfil não encontrado");const i=((k=[...t].reverse().find(a=>a.role==="user"))==null?void 0:k.content)||"",n=z(i),E=n?J(i):[],p=n?Y(E):"",h=n?`

INSTRUÇÕES DE EVIDÊNCIA:
- Para recomendações científicas/prescritivas, cite apenas IDs do EVIDENCE_CONTEXT no formato [SRC:ID1,ID2].
- Não invente fontes.
- Se não houver evidência suficiente no contexto, responda explicitamente: "Não encontrei evidência suficiente para afirmar isso com segurança."`:"",r=`${_()}
${L(c)}${p?`

${p}`:""}${h}

Quando o usuário pedir troca/substituição de exercício, use a função replace_exercise. Se não houver pedido claro de alteração, responda apenas em texto.`,m=(a,e)=>fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"system",content:r},...a],tools:[{type:"function",function:{name:"replace_exercise",description:"Solicita substituição de exercício no app quando o usuário pede para trocar/substituir exercício.",parameters:{type:"object",additionalProperties:!1,required:["scope","fromName","toName"],properties:{scope:{type:"string",enum:["all","workout"]},workoutType:{type:"string",enum:["A","B","C","D","E"]},fromName:{type:"string"},toName:{type:"string"}}}}}],tool_choice:"auto",max_tokens:e,temperature:.7})}),u=await m(t,700);if(!u.ok){const a=await u.json().catch(()=>({}));throw new Error(((x=a.error)==null?void 0:x.message)||"Erro na API")}const $=await u.json();if($.choices[0].finish_reason==="length"){const a=await m([...t,{role:"user",content:"Sua resposta anterior ficou grande e foi cortada. Refaça em ate 500 caracteres, com objetividade."}],300);if(!a.ok){const y=await a.json().catch(()=>({}));throw new Error(((b=y.error)==null?void 0:b.message)||"Erro na API")}return{reply:((T=(I=(w=(S=(await a.json()).choices)==null?void 0:S[0])==null?void 0:w.message)==null?void 0:I.content)==null?void 0:T.trim())||"",action:null}}const d=(j=$.choices)==null?void 0:j[0],v=((C=(N=d==null?void 0:d.message)==null?void 0:N.content)==null?void 0:C.trim())||"",g=(P=d==null?void 0:d.message)==null?void 0:P.tool_calls;let f=null;if(g!=null&&g.length){const a=g.find(e=>{var l;return((l=e.function)==null?void 0:l.name)==="replace_exercise"});if((A=a==null?void 0:a.function)!=null&&A.arguments)try{const e=JSON.parse(a.function.arguments);e.scope&&e.fromName&&e.toName&&(f={type:"replace_exercise",scope:e.scope,workoutType:e.workoutType,fromName:e.fromName,toName:e.toName})}catch{f=null}}let s=v||(f?"Posso aplicar essa substituição no app. Quer que eu confirme agora?":"Não consegui responder com clareza. Tente reformular.");if(n)if(!E.length)s=`${s}

Não encontrei evidência suficiente para afirmar isso com segurança.`;else{const a=X(s),e=K(a);if(!e.length)s=`${s}

Não encontrei evidência suficiente para afirmar isso com segurança.`;else{const l=e.map(y=>`${y.sourceId} (${y.year})`).join(", ");s.includes("Fontes usadas:")||(s=`${s}

Fontes usadas: ${l}`)}}return{reply:s,action:f}}async function ce(o,t,c,i=!1){var u;const n=typeof i=="boolean"?{}:i,p=(typeof i=="boolean"?i:!!n.jsonSchema)?{response_format:{type:"json_schema",json_schema:{name:n.schemaName||"fitflow_structured_response",strict:!0,schema:n.jsonSchema||{type:"object",additionalProperties:!0}}}}:{},h=_()+ae+`
`+L(t),r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"system",content:h},{role:"user",content:c}],max_tokens:n.maxTokens??4e3,temperature:n.temperature??.7,...p})});if(!r.ok){const $=await r.json().catch(()=>({}));throw new Error(((u=$.error)==null?void 0:u.message)||`Erro ${r.status}`)}const m=await r.json();if(m.choices[0].finish_reason==="length")throw new Error("Resposta cortada — tente novamente");return m.choices[0].message.content}export{ce as a,ie as s};
