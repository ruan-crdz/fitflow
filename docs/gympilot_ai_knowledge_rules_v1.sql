
-- GymPilot AI Knowledge Rules v1
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- A migracao e idempotente para as colunas/indices adicionados aqui.

create extension if not exists pgcrypto;

alter table public.ai_knowledge_rules
  add column if not exists rule_key text,
  add column if not exists source_type text,
  add column if not exists source_title text,
  add column if not exists source_authors text,
  add column if not exists source_journal text,
  add column if not exists source_year int,
  add column if not exists source_url text,
  add column if not exists source_doi text,
  add column if not exists source_quality text,
  add column if not exists source_notes text,
  add column if not exists review_status text not null default 'pending_human_review';

create unique index if not exists ai_knowledge_rules_rule_key_uq
  on public.ai_knowledge_rules(rule_key)
  where rule_key is not null;

create index if not exists ai_knowledge_rules_feature_active_priority_idx
  on public.ai_knowledge_rules(feature, is_active, priority);

create index if not exists ai_knowledge_rules_condition_gin_idx
  on public.ai_knowledge_rules using gin(rule_condition);

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.ai_knowledge_rules'::regclass
      and contype = 'c'
      and conname like 'ai_knowledge_rules_source_type%'
  loop
    execute format('alter table public.ai_knowledge_rules drop constraint %I', v_constraint.conname);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_knowledge_rules_source_type_chk'
      and conrelid = 'public.ai_knowledge_rules'::regclass
  ) then
    alter table public.ai_knowledge_rules
      add constraint ai_knowledge_rules_source_type_chk
      check (source_type is null or source_type in (
        'guideline',
        'meta_analysis',
        'systematic_review',
        'rct',
        'cohort',
        'expert_consensus',
        'internal_protocol',
        'position_stand',
        'position_statement',
        'systematic_review_meta_analysis',
        'meta_regression',
        'umbrella_review'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_knowledge_rules_source_quality_chk'
      and conrelid = 'public.ai_knowledge_rules'::regclass
  ) then
    alter table public.ai_knowledge_rules
      add constraint ai_knowledge_rules_source_quality_chk
      check (source_quality is null or source_quality in ('high','moderate','low','very_low'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_knowledge_rules_review_status_chk'
      and conrelid = 'public.ai_knowledge_rules'::regclass
  ) then
    alter table public.ai_knowledge_rules
      add constraint ai_knowledge_rules_review_status_chk
      check (review_status in ('pending_human_review','approved','rejected'));
  end if;
end $$;

-- IMPORTANTE:
-- As regras entram ativas para reproduzir seu schema atual, mas review_status = pending_human_review.
-- Se quiser impedir uso antes da sua auditoria, rode antes do seed:
--   update public.ai_knowledge_rules set is_active = false where review_status = 'pending_human_review';


-- SEED CIENTIFICO
insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.progressive_rt', 'workout_builder', 'Treino resistido progressivo como base', '{}'::jsonb, 'Usar treino resistido progressivo. Ajustar carga, repeticoes, series ou dificuldade ao longo do tempo conforme desempenho e tolerancia; evitar manter indefinidamente o mesmo estimulo quando a execucao e as repeticoes-alvo ja estao consolidadas.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 10, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.hypertrophy_volume', 'workout_builder', 'Volume semanal para hipertrofia', '{"goalIn":["gain"]}'::jsonb, 'Para hipertrofia, tratar aproximadamente 10 ou mais series semanais por grupamento como faixa em que a evidencia observa maior hipertrofia em media, sem transformar 10 em limiar universal. Comecar no menor volume que produz progresso e aumentar apenas se desempenho, recuperacao e aderencia sustentarem.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 12, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.volume_diminishing_returns', 'workout_builder', 'Volume com retornos decrescentes', '{"goalIn":["gain"]}'::jsonb, 'Nao escalar volume indefinidamente. Aumentos de series podem elevar hipertrofia, mas os retornos tendem a diminuir; usar progressao gradual e resposta individual para decidir se novas series sao justificadas.', 'Meta-regressoes sobre dose-resposta de volume semanal e frequencia para hipertrofia e forca, com retornos decrescentes.', 'meta_regression', 'The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains', 'Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC', 'Sports Medicine', 2026, 'https://pubmed.ncbi.nlm.nih.gov/41343037/', '', 'moderate', 'Util para dose-resposta e retornos decrescentes; nao transforma um numero de series em limiar universal.', 13, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.failure_not_required', 'workout_builder', 'Falha nao obrigatoria', '{}'::jsonb, 'Nao exigir falha muscular momentanea em todas as series. Series sem falha podem produzir ganhos de forca e hipertrofia; reservar falha para contextos em que o custo de fadiga e a tecnica sejam aceitaveis.', 'Revisao sistematica e meta-analise comparando treino ate a falha versus sem falha para forca e hipertrofia.', 'systematic_review_meta_analysis', 'Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: A systematic review and meta-analysis', 'Grgic J, Schoenfeld BJ, Orazem J, Sabol F', 'Journal of Sport and Health Science', 2022, 'https://doi.org/10.1016/j.jshs.2021.01.007', '10.1016/j.jshs.2021.01.007', 'moderate', 'Falha momentanea nao e requisito universal para adaptacao.', 14, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.rir_hypertrophy', 'workout_builder', 'Proximidade da falha para hipertrofia', '{"goalIn":["gain"]}'::jsonb, 'Para series destinadas a hipertrofia, trabalhar suficientemente perto da falha, normalmente com margem pequena de repeticoes em reserva, sem impor 0 RIR em todas as series. Quanto maior a distancia da falha, maior o risco de reduzir o estimulo hipertrofico quando a carga e baixa ou moderada.', 'Meta-regressoes indicam associacao entre maior proximidade da falha e hipertrofia, enquanto ganhos de forca foram semelhantes em ampla faixa de RIR.', 'meta_regression', 'Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions', 'Robinson ZP, Pelland JC, Remmert JF, et al.', 'Sports Medicine', 2024, 'https://doi.org/10.1007/s40279-024-02069-2', '10.1007/s40279-024-02069-2', 'moderate', 'Analise exploratoria; RIR foi estimado em muitos estudos. Nao usar para impor 0 RIR em todas as series.', 15, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.heavy_strength', 'workout_builder', 'Carga alta para forca maxima', '{"promptIncludesAny":["forca","força","1rm","strength"]}'::jsonb, 'Quando a prioridade explicita for forca maxima, incluir trabalho com cargas altas, frequentemente >=80% de 1RM, em exercicios prioritarios, mantendo tecnica e volume recuperavel.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 16, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.hypertrophy_load_range', 'workout_builder', 'Hipertrofia em ampla faixa de cargas', '{"goalIn":["gain"]}'::jsonb, 'Nao limitar hipertrofia a uma unica faixa de repeticoes. Cargas baixas, moderadas e altas podem produzir hipertrofia quando as series sao suficientemente exigentes; usar cargas mais altas quando a especificidade de forca for importante e cargas moderadas/baixas quando ajudarem tecnica, conforto ou distribuicao de fadiga.', 'Revisao sistematica/meta-analise: cargas altas favorecem 1RM; hipertrofia pode ocorrer com ampla faixa de cargas quando o esforco e suficiente.', 'systematic_review_meta_analysis', 'Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis', 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW', 'Journal of Strength and Conditioning Research', 2017, 'https://doi.org/10.1519/JSC.0000000000002200', '10.1519/JSC.0000000000002200', 'moderate', 'Nao reduzir hipertrofia a uma unica faixa de repeticoes.', 17, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.full_rom_default', 'workout_builder', 'ROM completo tolerado como padrao', '{}'::jsonb, 'Usar amplitude completa e controlada como padrao quando for tecnicamente adequada e tolerada. Nao encurtar amplitude apenas para mover mais carga; ROM parcial pode ser usado deliberadamente quando houver objetivo especifico, limitacao de equipamento ou estrategia avancada bem justificada.', 'Revisao sistematica e meta-analise favorecendo ROM completo para forca e hipertrofia de membros inferiores em comparacao com ROM parcial, no conjunto dos estudos.', 'systematic_review_meta_analysis', 'Effects of range of motion on resistance training adaptations: A systematic review and meta-analysis', 'Pallares JG, Cava AM, Courel-Ibanez J, Gonzalez-Badillo JJ, Morán-Navarro R', 'Scandinavian Journal of Medicine & Science in Sports', 2021, 'https://doi.org/10.1111/sms.14006', '10.1111/sms.14006', 'moderate', 'Nao invalida ROM parcial em contextos especificos; regra default favorece ROM completo tolerado.', 18, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.exercise_order', 'workout_builder', 'Prioridade no inicio da sessao', '{}'::jsonb, 'Colocar no inicio da sessao os exercicios ou grupamentos cuja performance/forca e prioridade naquele treino. Para hipertrofia, a ordem pode ser escolhida por prioridade e logistica, pois a evidencia nao mostra superioridade consistente de uma ordem unica para crescimento muscular.', 'Revisao sistematica/meta-analise: exercicios executados no inicio tendem a apresentar maiores ganhos de forca; hipertrofia foi semelhante entre ordens.', 'systematic_review_meta_analysis', 'What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy? A systematic review and meta-analysis', 'Nunes JP, Grgic J, Cunha PM, Ribeiro AS, Schoenfeld BJ', 'European Journal of Sport Science', 2021, 'https://pubmed.ncbi.nlm.nih.gov/32077380/', '', 'moderate', 'Priorizar no inicio o exercicio/objetivo cuja performance e mais importante.', 19, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.rest_hypertrophy', 'workout_builder', 'Descanso suficiente entre series', '{"goalIn":["gain"]}'::jsonb, 'Evitar descansos cronicamente curtos que reduzam muitas repeticoes ou carga nas series seguintes. Como padrao, usar mais de 60 s e ampliar o descanso em exercicios multiarticulares ou series muito exigentes quando isso preservar desempenho.', 'Revisao sistematica com meta-analise Bayesiana sobre descanso entre series; sugere pequeno beneficio hipertrofico para descansos >60 s.', 'systematic_review_meta_analysis', 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy', 'Singer A, Wolf M, Generoso L, et al.', 'Frontiers in Sports and Active Living', 2024, 'https://doi.org/10.3389/fspor.2024.1429789', '10.3389/fspor.2024.1429789', 'moderate', 'Nao implica que um descanso unico seja otimo para todos os exercicios.', 20, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.split_equivalence', 'workout_builder', 'Split nao tem superioridade universal', '{}'::jsonb, 'Nao afirmar que full body, upper/lower, push-pull-legs ou split por grupamento e superior por si so. Selecionar o split que distribui o volume necessario, respeita agenda, preferencia e recuperacao; com volume equiparado, split e full body apresentam resultados semelhantes em media.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 21, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.frequency_distribution', 'workout_builder', 'Frequencia como ferramenta de distribuicao', '{"goalIn":["gain"]}'::jsonb, 'Usar frequencia semanal principalmente para distribuir volume e preservar qualidade das series. Nao aumentar frequencia apenas por acreditar que mais dias por musculo produzira mais hipertrofia quando o volume semanal ja esta equiparado.', 'Revisao sistematica/meta-analise: quando o volume e equiparado, frequencia semanal por musculo nao altera de forma significativa a hipertrofia.', 'systematic_review_meta_analysis', 'How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency', 'Schoenfeld BJ, Grgic J, Krieger J', 'Journal of Sports Sciences', 2019, 'https://doi.org/10.1080/02640414.2018.1555906', '10.1080/02640414.2018.1555906', 'moderate', 'Frequencia e ferramenta de distribuicao de volume; nao um fim em si mesma.', 22, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.home_equipment_valid', 'workout_builder', 'Treino em casa pode ser efetivo', '{"trainingLocationIn":["casa","hibrido"]}'::jsonb, 'Aceitar treino domiciliar com peso corporal, elasticos, halteres ou outros meios de resistencia quando permitirem sobrecarga progressiva e series suficientemente exigentes. Nao classificar automaticamente treino em casa como inferior.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 23, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.power_load', 'workout_builder', 'Potencia com carga moderada e intencao rapida', '{"promptIncludesAny":["potencia","potência","explosao","explosão","power"]}'::jsonb, 'Quando a prioridade for potencia, incluir movimentos apropriados com intencao concentricamente rapida e cargas moderadas, aproximadamente 30-70% de 1RM quando aplicavel, com volume baixo a moderado e tecnica preservada.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 24, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.tempo', 'workout_builder', 'Tempo de repeticao sem dogma', '{}'::jsonb, 'Nao prescrever cadencias extremamente lentas como requisito de hipertrofia. Priorizar controle, amplitude e esforco; usar cadencia que permita execucao consistente e sobrecarga progressiva, sem transformar tempo sob tensao em objetivo isolado.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 25, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.periodization', 'workout_builder', 'Periodizacao como ferramenta, nao requisito magico', '{}'::jsonb, 'Usar periodizacao, variacao de carga/repeticoes e blocos quando ajudarem a organizar fadiga, especificidade e progresso, mas nao afirmar que uma periodizacao especifica e obrigatoriamente superior para todos os desfechos.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 26, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.eccentric', 'workout_builder', 'Componente excentrico controlado', '{"goalIn":["gain"]}'::jsonb, 'Manter fase excentrica controlada e ativa. Estrategias de sobrecarga excentrica podem ser usadas por praticantes experientes quando houver equipamento, tecnica e motivo claro, mas nao sao requisito para hipertrofia.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 27, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'core.not_more_days_more_volume', 'workout_builder', 'Mais dias nao significa mais volume', '{"trainingDaysMin":5}'::jsonb, 'Quando o usuario possui muitos dias disponiveis, distribuir o volume semanal entre sessoes em vez de aumentar automaticamente o numero total de series. Frequencia alta deve melhorar organizacao e qualidade, nao criar volume sem justificativa.', 'Meta-regressoes sobre dose-resposta de volume semanal e frequencia para hipertrofia e forca, com retornos decrescentes.', 'meta_regression', 'The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains', 'Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC', 'Sports Medicine', 2026, 'https://pubmed.ncbi.nlm.nih.gov/41343037/', '', 'moderate', 'Util para dose-resposta e retornos decrescentes; nao transforma um numero de series em limiar universal.', 28, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal.gain', 'workout_builder', 'Objetivo gain: hipertrofia prioritaria', '{"goalIn":["gain"]}'::jsonb, 'Priorizar hipertrofia e progressao de desempenho. Distribuir volume semanal recuperavel entre os grupamentos, manter series suficientemente proximas da falha e preservar alguma exposicao a cargas altas quando for util para forca.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 40, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal.maintain', 'workout_builder', 'Objetivo maintain: preservar massa e forca', '{"goalIn":["maintain"]}'::jsonb, 'Manter treino resistido progressivo e intensidade suficiente para preservar forca e massa muscular. Nao e necessario aumentar volume apenas porque o objetivo e manutencao; usar o menor volume que mantenha desempenho, tecnica e aderencia.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 41, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal.lose', 'workout_builder', 'Objetivo lose: preservar massa magra', '{"goalIn":["lose"]}'::jsonb, 'Durante perda de peso, manter treino resistido como componente central para reduzir perda de massa magra. Evitar transformar todas as sessoes em circuitos exaustivos apenas para aumentar gasto calorico; preservar cargas e desempenho conforme recuperacao.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 30, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal.lose_concurrent', 'workout_builder', 'Lose: combinar cardio sem abandonar resistencia', '{"goalIn":["lose"],"promptIncludesAny":["cardio","aerobico","aeróbico","corrida","bike"]}'::jsonb, 'Cardio pode ser combinado com treino resistido. Se potencia/explosividade for prioridade, evitar concentrar grandes doses de endurance imediatamente junto do treino de potencia; quando possivel, separar modalidades.', 'Revisao sistematica/meta-analise: treino concorrente geralmente nao compromete hipertrofia nem forca maxima; potencia explosiva pode sofrer mais quando modalidades sao feitas na mesma sessao.', 'systematic_review_meta_analysis', 'Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function: An Updated Systematic Review and Meta-Analysis', 'Schumann M, Feuerbacher JF, Sunkeler M, et al.', 'Sports Medicine', 2022, 'https://doi.org/10.1007/s40279-021-01587-7', '10.1007/s40279-021-01587-7', 'high', 'Separar modalidades pode ser relevante quando potencia explosiva e prioridade.', 31, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'level.beginner', 'workout_builder', 'Beginner: simplicidade e tecnica', '{"experienceIn":["beginner"]}'::jsonb, 'Usar programa simples, repetivel e de facil aprendizado, com foco em tecnica, amplitude tolerada e progressao gradual. Evitar tecnicas avancadas de intensificacao como requisito e evitar grande volume inicial.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 45, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'level.intermediate', 'workout_builder', 'Intermediate: volume distribuido e progressao', '{"experienceIn":["intermediate"]}'::jsonb, 'Distribuir volume para manter qualidade de series, usar progressao mensuravel e variar exercicios apenas quando houver motivo de especificidade, conforto, equipamento ou estagnacao. Aumentar volume somente quando a resposta justificar.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 46, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'level.advanced', 'workout_builder', 'Advanced: individualizacao por resposta', '{"experienceIn":["advanced"]}'::jsonb, 'Para praticantes avancados, individualizar volume, frequencia, proximidade da falha e selecao de exercicios com base em desempenho e recuperacao. Nao presumir que tecnicas avancadas, falha constante ou altissimo volume sejam superiores apenas pelo nivel do atleta.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 47, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.beginner.1', 'workout_builder', 'Beginner - 1 dia(s)/semana', '{"experienceIn":["beginner"],"trainingDaysMin":1,"trainingDaysMax":1}'::jsonb, 'Uma sessao full body e a opcao mais direta para cobrir os principais grupamentos. Priorizar movimentos e grupamentos mais importantes no inicio e aceitar que o volume semanal sera limitado pela duracao e tolerancia da sessao.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 71, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.beginner.2', 'workout_builder', 'Beginner - 2 dia(s)/semana', '{"experienceIn":["beginner"],"trainingDaysMin":2,"trainingDaysMax":2}'::jsonb, 'Distribuir o corpo inteiro em duas sessoes A/B ou usar dois treinos full body com variacoes. O objetivo e cobrir os principais grupamentos duas vezes na semana sem duplicar volume desnecessario.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 72, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.beginner.3', 'workout_builder', 'Beginner - 3 dia(s)/semana', '{"experienceIn":["beginner"],"trainingDaysMin":3,"trainingDaysMax":3}'::jsonb, 'Usar full body 3x ou uma distribuicao upper/lower/full conforme preferencia e duracao. Nao afirmar superioridade do nome do split; manter volume semanal equivalente.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 73, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.beginner.4', 'workout_builder', 'Beginner - 4 dia(s)/semana', '{"experienceIn":["beginner"],"trainingDaysMin":4,"trainingDaysMax":4}'::jsonb, 'Upper/lower repetido duas vezes e uma implementacao eficiente; full body ou outras divisoes tambem sao validas. Escolher a opcao que melhor distribui volume e prioridades.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 74, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.beginner.5', 'workout_builder', 'Beginner - 5 dia(s)/semana', '{"experienceIn":["beginner"],"trainingDaysMin":5,"trainingDaysMax":5}'::jsonb, 'Distribuir volume em cinco sessoes usando, por exemplo, upper/lower + tres sessoes de foco ou outra divisao equivalente. Nao elevar o volume semanal apenas por haver um quinto dia. Para iniciante, nao aumentar complexidade nem volume apenas para preencher todos os dias disponiveis.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 75, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.beginner.6', 'workout_builder', 'Beginner - 6 dia(s)/semana', '{"experienceIn":["beginner"],"trainingDaysMin":6,"trainingDaysMax":6}'::jsonb, 'Seis dias podem distribuir o volume em sessoes menores, por exemplo PPL repetido ou outra divisao equivalente. Manter ao menos um desenho de carga/fadiga que permita recuperacao e nao confundir frequencia com necessidade de volume maior. Para iniciante, nao aumentar complexidade nem volume apenas para preencher todos os dias disponiveis.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 76, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.beginner.7', 'workout_builder', 'Beginner - 7 dia(s)/semana', '{"experienceIn":["beginner"],"trainingDaysMin":7,"trainingDaysMax":7}'::jsonb, 'Disponibilidade de sete dias nao obriga sete sessoes duras de resistencia. Manter o volume semanal planejado e usar ao menos um dia de descanso, recuperacao ativa ou sessao de estresse muito baixo quando necessario para sustentar desempenho. Para iniciante, nao aumentar complexidade nem volume apenas para preencher todos os dias disponiveis.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 77, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.intermediate.1', 'workout_builder', 'Intermediate - 1 dia(s)/semana', '{"experienceIn":["intermediate"],"trainingDaysMin":1,"trainingDaysMax":1}'::jsonb, 'Uma sessao full body e a opcao mais direta para cobrir os principais grupamentos. Priorizar movimentos e grupamentos mais importantes no inicio e aceitar que o volume semanal sera limitado pela duracao e tolerancia da sessao.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 81, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.intermediate.2', 'workout_builder', 'Intermediate - 2 dia(s)/semana', '{"experienceIn":["intermediate"],"trainingDaysMin":2,"trainingDaysMax":2}'::jsonb, 'Distribuir o corpo inteiro em duas sessoes A/B ou usar dois treinos full body com variacoes. O objetivo e cobrir os principais grupamentos duas vezes na semana sem duplicar volume desnecessario.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 82, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.intermediate.3', 'workout_builder', 'Intermediate - 3 dia(s)/semana', '{"experienceIn":["intermediate"],"trainingDaysMin":3,"trainingDaysMax":3}'::jsonb, 'Usar full body 3x ou uma distribuicao upper/lower/full conforme preferencia e duracao. Nao afirmar superioridade do nome do split; manter volume semanal equivalente.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 83, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.intermediate.4', 'workout_builder', 'Intermediate - 4 dia(s)/semana', '{"experienceIn":["intermediate"],"trainingDaysMin":4,"trainingDaysMax":4}'::jsonb, 'Upper/lower repetido duas vezes e uma implementacao eficiente; full body ou outras divisoes tambem sao validas. Escolher a opcao que melhor distribui volume e prioridades.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 84, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.intermediate.5', 'workout_builder', 'Intermediate - 5 dia(s)/semana', '{"experienceIn":["intermediate"],"trainingDaysMin":5,"trainingDaysMax":5}'::jsonb, 'Distribuir volume em cinco sessoes usando, por exemplo, upper/lower + tres sessoes de foco ou outra divisao equivalente. Nao elevar o volume semanal apenas por haver um quinto dia.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 85, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.intermediate.6', 'workout_builder', 'Intermediate - 6 dia(s)/semana', '{"experienceIn":["intermediate"],"trainingDaysMin":6,"trainingDaysMax":6}'::jsonb, 'Seis dias podem distribuir o volume em sessoes menores, por exemplo PPL repetido ou outra divisao equivalente. Manter ao menos um desenho de carga/fadiga que permita recuperacao e nao confundir frequencia com necessidade de volume maior.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 86, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.intermediate.7', 'workout_builder', 'Intermediate - 7 dia(s)/semana', '{"experienceIn":["intermediate"],"trainingDaysMin":7,"trainingDaysMax":7}'::jsonb, 'Disponibilidade de sete dias nao obriga sete sessoes duras de resistencia. Manter o volume semanal planejado e usar ao menos um dia de descanso, recuperacao ativa ou sessao de estresse muito baixo quando necessario para sustentar desempenho.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 87, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.advanced.1', 'workout_builder', 'Advanced - 1 dia(s)/semana', '{"experienceIn":["advanced"],"trainingDaysMin":1,"trainingDaysMax":1}'::jsonb, 'Uma sessao full body e a opcao mais direta para cobrir os principais grupamentos. Priorizar movimentos e grupamentos mais importantes no inicio e aceitar que o volume semanal sera limitado pela duracao e tolerancia da sessao.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 91, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.advanced.2', 'workout_builder', 'Advanced - 2 dia(s)/semana', '{"experienceIn":["advanced"],"trainingDaysMin":2,"trainingDaysMax":2}'::jsonb, 'Distribuir o corpo inteiro em duas sessoes A/B ou usar dois treinos full body com variacoes. O objetivo e cobrir os principais grupamentos duas vezes na semana sem duplicar volume desnecessario.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 92, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.advanced.3', 'workout_builder', 'Advanced - 3 dia(s)/semana', '{"experienceIn":["advanced"],"trainingDaysMin":3,"trainingDaysMax":3}'::jsonb, 'Usar full body 3x ou uma distribuicao upper/lower/full conforme preferencia e duracao. Nao afirmar superioridade do nome do split; manter volume semanal equivalente.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 93, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.advanced.4', 'workout_builder', 'Advanced - 4 dia(s)/semana', '{"experienceIn":["advanced"],"trainingDaysMin":4,"trainingDaysMax":4}'::jsonb, 'Upper/lower repetido duas vezes e uma implementacao eficiente; full body ou outras divisoes tambem sao validas. Escolher a opcao que melhor distribui volume e prioridades.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 94, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.advanced.5', 'workout_builder', 'Advanced - 5 dia(s)/semana', '{"experienceIn":["advanced"],"trainingDaysMin":5,"trainingDaysMax":5}'::jsonb, 'Distribuir volume em cinco sessoes usando, por exemplo, upper/lower + tres sessoes de foco ou outra divisao equivalente. Nao elevar o volume semanal apenas por haver um quinto dia. Para avancado, o arranjo pode ser altamente especializado por grupamento, desde que o volume e a recuperacao sejam monitorados.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 95, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.advanced.6', 'workout_builder', 'Advanced - 6 dia(s)/semana', '{"experienceIn":["advanced"],"trainingDaysMin":6,"trainingDaysMax":6}'::jsonb, 'Seis dias podem distribuir o volume em sessoes menores, por exemplo PPL repetido ou outra divisao equivalente. Manter ao menos um desenho de carga/fadiga que permita recuperacao e nao confundir frequencia com necessidade de volume maior. Para avancado, o arranjo pode ser altamente especializado por grupamento, desde que o volume e a recuperacao sejam monitorados.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 96, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'days.advanced.7', 'workout_builder', 'Advanced - 7 dia(s)/semana', '{"experienceIn":["advanced"],"trainingDaysMin":7,"trainingDaysMax":7}'::jsonb, 'Disponibilidade de sete dias nao obriga sete sessoes duras de resistencia. Manter o volume semanal planejado e usar ao menos um dia de descanso, recuperacao ativa ou sessao de estresse muito baixo quando necessario para sustentar desempenho. Para avancado, o arranjo pode ser altamente especializado por grupamento, desde que o volume e a recuperacao sejam monitorados.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 97, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'focus.balanced', 'workout_builder', 'Foco balanced', '{"focusIn":["balanced"]}'::jsonb, 'Distribuir o volume entre grandes grupamentos sem criar prioridade artificial. Ajustar apenas por lacunas observadas, preferencia, tecnica, equipamento e recuperacao.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 110, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'focus.upper', 'workout_builder', 'Foco upper', '{"focusIn":["upper"]}'::jsonb, 'Priorizar membros superiores colocando seus exercicios-chave mais cedo e/ou alocando maior parte do volume recuperavel a esses grupamentos, sem eliminar treino de membros inferiores.', 'Revisao sistematica/meta-analise: exercicios executados no inicio tendem a apresentar maiores ganhos de forca; hipertrofia foi semelhante entre ordens.', 'systematic_review_meta_analysis', 'What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy? A systematic review and meta-analysis', 'Nunes JP, Grgic J, Cunha PM, Ribeiro AS, Schoenfeld BJ', 'European Journal of Sport Science', 2021, 'https://pubmed.ncbi.nlm.nih.gov/32077380/', '', 'moderate', 'Priorizar no inicio o exercicio/objetivo cuja performance e mais importante.', 105, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'focus.lower', 'workout_builder', 'Foco lower', '{"focusIn":["lower"]}'::jsonb, 'Priorizar membros inferiores colocando seus exercicios-chave mais cedo e/ou alocando maior parte do volume recuperavel a esses grupamentos, sem eliminar treino de membros superiores.', 'Revisao sistematica/meta-analise: exercicios executados no inicio tendem a apresentar maiores ganhos de forca; hipertrofia foi semelhante entre ordens.', 'systematic_review_meta_analysis', 'What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy? A systematic review and meta-analysis', 'Nunes JP, Grgic J, Cunha PM, Ribeiro AS, Schoenfeld BJ', 'European Journal of Sport Science', 2021, 'https://pubmed.ncbi.nlm.nih.gov/32077380/', '', 'moderate', 'Priorizar no inicio o exercicio/objetivo cuja performance e mais importante.', 105, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'focus.custom', 'workout_builder', 'Foco custom', '{"focusIn":["custom"],"requiresCustomSplit":true}'::jsonb, 'Respeitar o split customizado do usuario quando ele permitir distribuicao coerente de volume e recuperacao. Nao substituir automaticamente por PPL, upper/lower ou full body apenas por preferencia do sistema.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 115, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'location.gym', 'workout_builder', 'Treino em academia', '{"trainingLocationIn":["academia"]}'::jsonb, 'Selecionar exercicios por adequacao ao objetivo e ao usuario, sem preferencia dogmatica por maquina ou peso livre. Usar o equipamento que permita boa tecnica, amplitude, progressao e esforco alvo.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 120, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'location.home', 'workout_builder', 'Treino em casa', '{"trainingLocationIn":["casa"]}'::jsonb, 'Construir sessoes com os meios disponiveis e garantir progressao por carga, repeticoes, amplitude, alavanca ou dificuldade. Peso corporal, elasticos e halteres podem ser utilizados como resistencia valida.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 120, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'location.hybrid', 'workout_builder', 'Treino hibrido', '{"trainingLocationIn":["hibrido"]}'::jsonb, 'Distribuir exercicios conforme o equipamento de cada ambiente, preservando o mesmo objetivo semanal de volume, esforco e progressao. Nao duplicar trabalho apenas porque ha dois locais.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 120, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'duration.short', 'workout_builder', 'Sessao curta ate 45 min', '{"sessionDurationMax":45}'::jsonb, 'Priorizar exercicios e grupamentos de maior importancia, reduzir redundancias e distribuir volume em mais sessoes quando possivel. Nao encurtar descanso a ponto de derrubar desnecessariamente desempenho apenas para caber no relogio.', 'Revisao sistematica com meta-analise Bayesiana sobre descanso entre series; sugere pequeno beneficio hipertrofico para descansos >60 s.', 'systematic_review_meta_analysis', 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy', 'Singer A, Wolf M, Generoso L, et al.', 'Frontiers in Sports and Active Living', 2024, 'https://doi.org/10.3389/fspor.2024.1429789', '10.3389/fspor.2024.1429789', 'moderate', 'Nao implica que um descanso unico seja otimo para todos os exercicios.', 125, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'duration.medium', 'workout_builder', 'Sessao media 46-75 min', '{"sessionDurationMin":46,"sessionDurationMax":75}'::jsonb, 'Usar a duracao para acomodar aquecimento especifico, exercicios prioritarios, volume planejado e descansos suficientes. Evitar adicionar exercicios apenas para preencher tempo.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 126, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'duration.long', 'workout_builder', 'Sessao longa 76+ min', '{"sessionDurationMin":76}'::jsonb, 'Sessao longa nao exige volume maior. Manter apenas series e exercicios que contribuam ao objetivo; usar tempo extra para descansos, aquecimento e distribuicao de prioridades, evitando volume sem retorno claro.', 'Meta-regressoes sobre dose-resposta de volume semanal e frequencia para hipertrofia e forca, com retornos decrescentes.', 'meta_regression', 'The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains', 'Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC', 'Sports Medicine', 2026, 'https://pubmed.ncbi.nlm.nih.gov/41343037/', '', 'moderate', 'Util para dose-resposta e retornos decrescentes; nao transforma um numero de series em limiar universal.', 127, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'age.18_29', 'workout_builder', 'Faixa etaria 18-29', '{"ageMin":18,"ageMax":29}'::jsonb, 'Nao alterar automaticamente split, faixa de repeticoes ou selecao de exercicios apenas pela idade cronologica. Individualizar por experiencia, desempenho, recuperacao, historico e limitacoes reais.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 130, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'age.30_39', 'workout_builder', 'Faixa etaria 30-39', '{"ageMin":30,"ageMax":39}'::jsonb, 'Nao alterar automaticamente split, faixa de repeticoes ou selecao de exercicios apenas pela idade cronologica. Individualizar por experiencia, desempenho, recuperacao, historico e limitacoes reais.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 130, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'age.40_49', 'workout_builder', 'Faixa etaria 40-49', '{"ageMin":40,"ageMax":49}'::jsonb, 'Nao alterar automaticamente split, faixa de repeticoes ou selecao de exercicios apenas pela idade cronologica. Individualizar por experiencia, desempenho, recuperacao, historico e limitacoes reais.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 130, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'age.50_59', 'workout_builder', 'Faixa etaria 50-59', '{"ageMin":50,"ageMax":59}'::jsonb, 'Nao alterar automaticamente split, faixa de repeticoes ou selecao de exercicios apenas pela idade cronologica. Individualizar por experiencia, desempenho, recuperacao, historico e limitacoes reais.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 130, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'age.60plus', 'workout_builder', 'Faixa etaria 60+', '{"ageMin":60}'::jsonb, 'Treino resistido continua indicado e pode melhorar forca, massa e funcao. Comecar/ajustar volume e intensidade de forma individualizada, usar tecnica adequada e considerar fragilidade, comorbidades, medicacoes e limitacoes antes de aumentar a exigencia.', 'Position Statement NSCA sobre treino resistido em adultos mais velhos, incluindo desenho de programa, adaptacoes e consideracoes de fragilidade/sarcopenia.', 'position_statement', 'Resistance Training for Older Adults: Position Statement From the National Strength and Conditioning Association', 'Fragala MS, Cadore EL, Dorgo S, et al.', 'Journal of Strength and Conditioning Research', 2019, 'https://doi.org/10.1519/JSC.0000000000003230', '10.1519/JSC.0000000000003230', 'high', 'Aplicar com individualizacao; fragilidade, doenca e lesao exigem avaliacao apropriada.', 35, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'sex.male', 'workout_builder', 'Sexo male sem regra artificial', '{"sexIn":["male"]}'::jsonb, 'Nao alterar o programa apenas por sexo biologico. Prescrever por objetivo, experiencia, resposta, preferencias e limitacoes.', 'Revisao sistematica/meta-analise encontrou adaptacoes relativas semelhantes entre sexos para hipertrofia e forca de membros inferiores, sem justificar programas completamente distintos apenas por sexo.', 'systematic_review_meta_analysis', 'Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis', 'Roberts BM, Nuckols G, Krieger JW', 'Journal of Strength and Conditioning Research', 2020, 'https://pubmed.ncbi.nlm.nih.gov/32218059/', '', 'moderate', 'Sexo biologico sozinho nao determina split, volume ou selecao de exercicios.', 150, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'sex.female', 'workout_builder', 'Sexo female sem regra artificial', '{"sexIn":["female"]}'::jsonb, 'Nao reduzir carga, volume ou complexidade apenas por sexo biologico. Prescrever por objetivo, experiencia, resposta, preferencias e limitacoes.', 'Revisao sistematica/meta-analise encontrou adaptacoes relativas semelhantes entre sexos para hipertrofia e forca de membros inferiores, sem justificar programas completamente distintos apenas por sexo.', 'systematic_review_meta_analysis', 'Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis', 'Roberts BM, Nuckols G, Krieger JW', 'Journal of Strength and Conditioning Research', 2020, 'https://pubmed.ncbi.nlm.nih.gov/32218059/', '', 'moderate', 'Sexo biologico sozinho nao determina split, volume ou selecao de exercicios.', 150, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'sex.undisclosed', 'workout_builder', 'Sexo undisclosed', '{"sexIn":["undisclosed"]}'::jsonb, 'Nao inferir sexo nem criar diferencas de prescricao. Usar os demais dados disponiveis.', 'Revisao sistematica/meta-analise encontrou adaptacoes relativas semelhantes entre sexos para hipertrofia e forca de membros inferiores, sem justificar programas completamente distintos apenas por sexo.', 'systematic_review_meta_analysis', 'Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis', 'Roberts BM, Nuckols G, Krieger JW', 'Journal of Strength and Conditioning Research', 2020, 'https://pubmed.ncbi.nlm.nih.gov/32218059/', '', 'moderate', 'Sexo biologico sozinho nao determina split, volume ou selecao de exercicios.', 150, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'female.cycle', 'workout_builder', 'Ciclo menstrual: nao periodizar rigidamente por fase', '{"sexIn":["female"],"promptIncludesAny":["ciclo","menstrual","menstruacao","menstruação","folicular","lutea","lútea"]}'::jsonb, 'Nao periodizar carga ou volume rigidamente apenas pela fase do ciclo menstrual. Se a usuaria relatar sintomas que alterem prontidao, conforto ou desempenho, ajustar a sessao pela resposta individual daquele dia.', 'Umbrella review: evidencia atual nao sustenta prescricao rigida de treino resistido por fase do ciclo menstrual.', 'umbrella_review', 'Current evidence shows no influence of women''s menstrual cycle phase on acute strength performance or adaptations to resistance exercise training', 'Colenso-Semple LM, D''Souza AC, Elliott-Sale KJ, Phillips SM', 'Frontiers in Sports and Active Living', 2023, 'https://doi.org/10.3389/fspor.2023.1054542', '10.3389/fspor.2023.1054542', 'moderate', 'Sintomas individuais podem justificar ajuste; fase do ciclo isoladamente nao deve engessar o programa.', 50, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'limitation.ombro', 'workout_builder', 'Limitacao relatada: Ombro', '{"limitationsIncludesAny":["ombro"]}'::jsonb, 'Tratar ''ombro'' como sinal de individualizacao, nao como diagnostico. Nao prescrever automaticamente exercicios de reabilitacao nem insistir em movimentos que reproduzam dor relevante. Selecionar apenas variacoes toleradas e, se houver dor aguda, piora progressiva, trauma recente, deficit neurologico ou limitacao funcional importante, bloquear a progressao automatica e recomendar avaliacao profissional antes de intensificar.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao. Guardrail de seguranca do app. A fonte principal cobre adultos saudaveis; sintomas/lesoes especificas ficam fora do escopo de uma prescricao automatica generica.', 2, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'limitation.lombar', 'workout_builder', 'Limitacao relatada: Lombar', '{"limitationsIncludesAny":["lombar"]}'::jsonb, 'Tratar ''lombar'' como sinal de individualizacao, nao como diagnostico. Nao prescrever automaticamente exercicios de reabilitacao nem insistir em movimentos que reproduzam dor relevante. Selecionar apenas variacoes toleradas e, se houver dor aguda, piora progressiva, trauma recente, deficit neurologico ou limitacao funcional importante, bloquear a progressao automatica e recomendar avaliacao profissional antes de intensificar.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao. Guardrail de seguranca do app. A fonte principal cobre adultos saudaveis; sintomas/lesoes especificas ficam fora do escopo de uma prescricao automatica generica.', 3, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'limitation.joelho', 'workout_builder', 'Limitacao relatada: Joelho', '{"limitationsIncludesAny":["joelho"]}'::jsonb, 'Tratar ''joelho'' como sinal de individualizacao, nao como diagnostico. Nao prescrever automaticamente exercicios de reabilitacao nem insistir em movimentos que reproduzam dor relevante. Selecionar apenas variacoes toleradas e, se houver dor aguda, piora progressiva, trauma recente, deficit neurologico ou limitacao funcional importante, bloquear a progressao automatica e recomendar avaliacao profissional antes de intensificar.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao. Guardrail de seguranca do app. A fonte principal cobre adultos saudaveis; sintomas/lesoes especificas ficam fora do escopo de uma prescricao automatica generica.', 4, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'limitation.cervical', 'workout_builder', 'Limitacao relatada: Cervical', '{"limitationsIncludesAny":["cervical"]}'::jsonb, 'Tratar ''cervical'' como sinal de individualizacao, nao como diagnostico. Nao prescrever automaticamente exercicios de reabilitacao nem insistir em movimentos que reproduzam dor relevante. Selecionar apenas variacoes toleradas e, se houver dor aguda, piora progressiva, trauma recente, deficit neurologico ou limitacao funcional importante, bloquear a progressao automatica e recomendar avaliacao profissional antes de intensificar.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao. Guardrail de seguranca do app. A fonte principal cobre adultos saudaveis; sintomas/lesoes especificas ficam fora do escopo de uma prescricao automatica generica.', 5, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'limitation.cotovelo', 'workout_builder', 'Limitacao relatada: Cotovelo', '{"limitationsIncludesAny":["cotovelo"]}'::jsonb, 'Tratar ''cotovelo'' como sinal de individualizacao, nao como diagnostico. Nao prescrever automaticamente exercicios de reabilitacao nem insistir em movimentos que reproduzam dor relevante. Selecionar apenas variacoes toleradas e, se houver dor aguda, piora progressiva, trauma recente, deficit neurologico ou limitacao funcional importante, bloquear a progressao automatica e recomendar avaliacao profissional antes de intensificar.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao. Guardrail de seguranca do app. A fonte principal cobre adultos saudaveis; sintomas/lesoes especificas ficam fora do escopo de uma prescricao automatica generica.', 6, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'limitation.punho', 'workout_builder', 'Limitacao relatada: Punho', '{"limitationsIncludesAny":["punho"]}'::jsonb, 'Tratar ''punho'' como sinal de individualizacao, nao como diagnostico. Nao prescrever automaticamente exercicios de reabilitacao nem insistir em movimentos que reproduzam dor relevante. Selecionar apenas variacoes toleradas e, se houver dor aguda, piora progressiva, trauma recente, deficit neurologico ou limitacao funcional importante, bloquear a progressao automatica e recomendar avaliacao profissional antes de intensificar.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao. Guardrail de seguranca do app. A fonte principal cobre adultos saudaveis; sintomas/lesoes especificas ficam fora do escopo de uma prescricao automatica generica.', 7, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'equipment.halter', 'workout_builder', 'Equipamento: halteres', '{"equipmentIncludesAny":["halter"]}'::jsonb, 'Usar halteres para presses, remadas, agachamentos/variacoes, hinges e isoladores conforme tolerancia. Progressao pode ocorrer por carga, repeticoes, amplitude e dificuldade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 160, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'equipment.barra', 'workout_builder', 'Equipamento: barra', '{"equipmentIncludesAny":["barra"]}'::jsonb, 'Usar barra quando houver tecnica, espaco e seguranca adequados. Nao priorizar barra sobre outras resistencias apenas por tradicao.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 161, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'equipment.elastico', 'workout_builder', 'Equipamento: elasticos', '{"equipmentIncludesAny":["elastico"]}'::jsonb, 'Elasticos sao resistencia valida. Escolher variacoes que mantenham tensao e amplitude adequadas e progredir a resistencia/dificuldade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 162, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'equipment.banco', 'workout_builder', 'Equipamento: banco', '{"equipmentIncludesAny":["banco"]}'::jsonb, 'Usar banco para ampliar opcoes de press, remada apoiada, split squat e outras variacoes, sem criar exercicios redundantes apenas porque o equipamento existe.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 163, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'equipment.maquina', 'workout_builder', 'Equipamento: maquinas', '{"equipmentIncludesAny":["maquina"]}'::jsonb, 'Maquinas podem ser usadas normalmente para hipertrofia e forca. Nao tratar peso livre como obrigatoriamente superior.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 164, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'equipment.peso_corporal', 'workout_builder', 'Equipamento: peso corporal', '{"equipmentIncludesAny":["peso corporal"]}'::jsonb, 'Usar peso corporal quando a dificuldade puder ser ajustada para manter series desafiadoras e progressivas.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 165, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'preference.preferred', 'workout_builder', 'Exercicios preferidos', '{"preferredIncludesAny":["supino","agachamento"]}'::jsonb, 'Quando um exercicio preferido for adequado ao objetivo, equipamento e limitacoes, mante-lo como opcao para favorecer aderencia e consistencia. Preferencia nao deve vencer uma limitacao de seguranca.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 210, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'preference.disliked', 'workout_builder', 'Exercicios evitados', '{"dislikedIncludesAny":["burpee","afundo"]}'::jsonb, 'Nao forcar exercicio evitado quando existem alternativas que treinam o mesmo padrao/grupamento. Substituir por variacao equivalente em objetivo, amplitude, estabilidade e capacidade de progressao.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 205, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'custom.peito', 'workout_builder', 'Custom split inclui peito', '{"requiresCustomSplit":true,"customSplitIncludesAny":["peito"]}'::jsonb, 'Preservar o dia/bloco de peito do split customizado e distribuir o volume semanal de peitoral sem concentrar series demais em uma unica sessao quando isso reduzir qualidade.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 190, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'custom.costas', 'workout_builder', 'Custom split inclui costas', '{"requiresCustomSplit":true,"customSplitIncludesAny":["costas"]}'::jsonb, 'Preservar o dia/bloco de costas do split customizado e distribuir puxadas/remadas conforme o volume semanal e a tolerancia, evitando redundancia desnecessaria.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 190, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'custom.perna', 'workout_builder', 'Custom split inclui perna', '{"requiresCustomSplit":true,"customSplitIncludesAny":["perna"]}'::jsonb, 'Preservar o dia/bloco de pernas do split customizado e distribuir padroes dominantes de joelho/quadril e isoladores conforme objetivo, equipamento e tolerancia.', 'Revisao sistematica e meta-analise: split e full-body apresentaram resultados semelhantes de forca e hipertrofia quando o volume foi equiparado.', 'systematic_review_meta_analysis', 'Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth: A Systematic Review With Meta-Analysis', 'Ramos-Campo DJ, Benito-Peinado PJ, Caravaca LA, Rojo-Tirado MA, Rubio-Arias JA', 'Journal of Strength and Conditioning Research', 2024, 'https://doi.org/10.1519/JSC.0000000000004774', '10.1519/JSC.0000000000004774', 'moderate', 'Split deve ser escolhido por distribuicao de volume, preferencia, recuperacao e agenda, nao por suposta superioridade universal.', 190, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.gain.beginner', 'workout_builder', 'Gain + beginner', '{"goalIn":["gain"],"experienceIn":["beginner"]}'::jsonb, 'Hipertrofia de iniciante: priorizar consistencia, tecnica e volume inicial moderado; nao usar grande numero de tecnicas de intensificacao. Progredir primeiro por desempenho e so depois por mais volume.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 55, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.gain.intermediate', 'workout_builder', 'Gain + intermediate', '{"goalIn":["gain"],"experienceIn":["intermediate"]}'::jsonb, 'Hipertrofia intermediaria: manter volume semanal recuperavel, series suficientemente proximas da falha e distribuicao que preserve qualidade; usar aumento de volume apenas quando o progresso estagnar e a recuperacao permitir.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 56, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.gain.advanced', 'workout_builder', 'Gain + advanced', '{"goalIn":["gain"],"experienceIn":["advanced"]}'::jsonb, 'Hipertrofia avancada: individualizar volume por grupamento, usar frequencia para distribuir series e controlar fadiga; nao assumir que falha constante ou altissimo volume seja necessario.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 57, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.maintain.beginner', 'workout_builder', 'Maintain + beginner', '{"goalIn":["maintain"],"experienceIn":["beginner"]}'::jsonb, 'Ensinar tecnica e manter um programa simples de resistencia. O objetivo de manutencao nao elimina a necessidade de progressao inicial do iniciante; estabilizar depois que desempenho e rotina estiverem consolidados.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 58, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.maintain.intermediate', 'workout_builder', 'Maintain + intermediate', '{"goalIn":["maintain"],"experienceIn":["intermediate"]}'::jsonb, 'Preservar exposicao a cargas e volume suficientes para manter desempenho, reduzindo series redundantes quando tempo/recuperacao forem prioridade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 59, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.maintain.advanced', 'workout_builder', 'Maintain + advanced', '{"goalIn":["maintain"],"experienceIn":["advanced"]}'::jsonb, 'Manter especificidade dos principais exercicios e volume minimo efetivo individual; evitar acumular fadiga sem necessidade competitiva ou hipertrofica.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 60, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.lose.beginner', 'workout_builder', 'Lose + beginner', '{"goalIn":["lose"],"experienceIn":["beginner"]}'::jsonb, 'Durante perda de peso em iniciante, manter treino resistido simples e progressivo, evitando usar fadiga extrema como proxy de eficacia.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 32, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.lose.intermediate', 'workout_builder', 'Lose + intermediate', '{"goalIn":["lose"],"experienceIn":["intermediate"]}'::jsonb, 'Durante perda de peso, preservar movimentos e cargas de referencia quando possivel e ajustar primeiro volume acessorio se a recuperacao cair.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 33, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'interaction.lose.advanced', 'workout_builder', 'Lose + advanced', '{"goalIn":["lose"],"experienceIn":["advanced"]}'::jsonb, 'Durante perda de peso em avancado, preservar intensidade/especificidade dos levantamentos e reduzir volume de forma seletiva quando recuperacao ou performance piorarem; nao transformar toda sessao em circuito metabolico.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 34, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'topic.strength', 'workout_builder', 'Solicitacao explicita de forca', '{"promptIncludesAny":["forca","força","strength","1rm"]}'::jsonb, 'Priorizar especificidade do(s) exercicio(s)-alvo, cargas altas e colocacao desses exercicios no inicio da sessao; complementar com volume que nao prejudique a qualidade do trabalho principal.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 36, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'topic.hypertrophy', 'workout_builder', 'Solicitacao explicita de hipertrofia', '{"promptIncludesAny":["hipertrofia","massa muscular","crescer","bodybuilding","fisiculturismo"]}'::jsonb, 'Priorizar volume semanal recuperavel, amplitude tolerada, progressao e series suficientemente exigentes. Nao restringir a uma unica faixa de repeticoes nem exigir falha em todas as series.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 37, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'topic.power', 'workout_builder', 'Solicitacao explicita de potencia', '{"promptIncludesAny":["potencia","potência","power","explosivo","explosiva"]}'::jsonb, 'Priorizar intencao de velocidade, tecnica e cargas apropriadas; manter baixo a moderado numero de repeticoes totais por exercicio de potencia e evitar fadiga que degrade velocidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 38, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'topic.adherence', 'workout_builder', 'Solicitacao de aderencia/rotina', '{"promptIncludesAny":["aderencia","aderência","consistencia","consistência","rotina","motivacao","motivação"]}'::jsonb, 'Simplificar o programa, reduzir redundancias e escolher split/local/exercicios que o usuario consiga repetir com regularidade. Um programa sustentavel e preferivel a um desenho teoricamente complexo sem aderencia.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 140, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.gain.1', 'workout_builder', 'Gain - 1 dia(s)/semana', '{"goalIn":["gain"],"trainingDaysMin":1,"trainingDaysMax":1}'::jsonb, 'Com 1 dia(s) disponiveis e objetivo gain, distribuir o volume hipertrofico semanal sem aumentar automaticamente o total de series. Usar o split correspondente a agenda e manter series de qualidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 171, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.gain.2', 'workout_builder', 'Gain - 2 dia(s)/semana', '{"goalIn":["gain"],"trainingDaysMin":2,"trainingDaysMax":2}'::jsonb, 'Com 2 dia(s) disponiveis e objetivo gain, distribuir o volume hipertrofico semanal sem aumentar automaticamente o total de series. Usar o split correspondente a agenda e manter series de qualidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 172, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.gain.3', 'workout_builder', 'Gain - 3 dia(s)/semana', '{"goalIn":["gain"],"trainingDaysMin":3,"trainingDaysMax":3}'::jsonb, 'Com 3 dia(s) disponiveis e objetivo gain, distribuir o volume hipertrofico semanal sem aumentar automaticamente o total de series. Usar o split correspondente a agenda e manter series de qualidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 173, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.gain.4', 'workout_builder', 'Gain - 4 dia(s)/semana', '{"goalIn":["gain"],"trainingDaysMin":4,"trainingDaysMax":4}'::jsonb, 'Com 4 dia(s) disponiveis e objetivo gain, distribuir o volume hipertrofico semanal sem aumentar automaticamente o total de series. Usar o split correspondente a agenda e manter series de qualidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 174, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.gain.5', 'workout_builder', 'Gain - 5 dia(s)/semana', '{"goalIn":["gain"],"trainingDaysMin":5,"trainingDaysMax":5}'::jsonb, 'Com 5 dia(s) disponiveis e objetivo gain, distribuir o volume hipertrofico semanal sem aumentar automaticamente o total de series. Usar o split correspondente a agenda e manter series de qualidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 175, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.gain.6', 'workout_builder', 'Gain - 6 dia(s)/semana', '{"goalIn":["gain"],"trainingDaysMin":6,"trainingDaysMax":6}'::jsonb, 'Com 6 dia(s) disponiveis e objetivo gain, distribuir o volume hipertrofico semanal sem aumentar automaticamente o total de series. Usar o split correspondente a agenda e manter series de qualidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 176, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.gain.7', 'workout_builder', 'Gain - 7 dia(s)/semana', '{"goalIn":["gain"],"trainingDaysMin":7,"trainingDaysMax":7}'::jsonb, 'Com 7 dia(s) disponiveis e objetivo gain, distribuir o volume hipertrofico semanal sem aumentar automaticamente o total de series. Usar o split correspondente a agenda e manter series de qualidade.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 177, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.maintain.1', 'workout_builder', 'Maintain - 1 dia(s)/semana', '{"goalIn":["maintain"],"trainingDaysMin":1,"trainingDaysMax":1}'::jsonb, 'Com 1 dia(s) disponiveis e objetivo maintain, usar apenas a frequencia necessaria para preservar desempenho e aderencia; dias extras nao exigem volume adicional.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 181, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.maintain.2', 'workout_builder', 'Maintain - 2 dia(s)/semana', '{"goalIn":["maintain"],"trainingDaysMin":2,"trainingDaysMax":2}'::jsonb, 'Com 2 dia(s) disponiveis e objetivo maintain, usar apenas a frequencia necessaria para preservar desempenho e aderencia; dias extras nao exigem volume adicional.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 182, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.maintain.3', 'workout_builder', 'Maintain - 3 dia(s)/semana', '{"goalIn":["maintain"],"trainingDaysMin":3,"trainingDaysMax":3}'::jsonb, 'Com 3 dia(s) disponiveis e objetivo maintain, usar apenas a frequencia necessaria para preservar desempenho e aderencia; dias extras nao exigem volume adicional.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 183, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.maintain.4', 'workout_builder', 'Maintain - 4 dia(s)/semana', '{"goalIn":["maintain"],"trainingDaysMin":4,"trainingDaysMax":4}'::jsonb, 'Com 4 dia(s) disponiveis e objetivo maintain, usar apenas a frequencia necessaria para preservar desempenho e aderencia; dias extras nao exigem volume adicional.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 184, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.maintain.5', 'workout_builder', 'Maintain - 5 dia(s)/semana', '{"goalIn":["maintain"],"trainingDaysMin":5,"trainingDaysMax":5}'::jsonb, 'Com 5 dia(s) disponiveis e objetivo maintain, usar apenas a frequencia necessaria para preservar desempenho e aderencia; dias extras nao exigem volume adicional.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 185, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.maintain.6', 'workout_builder', 'Maintain - 6 dia(s)/semana', '{"goalIn":["maintain"],"trainingDaysMin":6,"trainingDaysMax":6}'::jsonb, 'Com 6 dia(s) disponiveis e objetivo maintain, usar apenas a frequencia necessaria para preservar desempenho e aderencia; dias extras nao exigem volume adicional.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 186, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.maintain.7', 'workout_builder', 'Maintain - 7 dia(s)/semana', '{"goalIn":["maintain"],"trainingDaysMin":7,"trainingDaysMax":7}'::jsonb, 'Com 7 dia(s) disponiveis e objetivo maintain, usar apenas a frequencia necessaria para preservar desempenho e aderencia; dias extras nao exigem volume adicional.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 187, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.lose.1', 'workout_builder', 'Lose - 1 dia(s)/semana', '{"goalIn":["lose"],"trainingDaysMin":1,"trainingDaysMax":1}'::jsonb, 'Com 1 dia(s) disponiveis e objetivo lose, manter treino resistido suficiente para preservar massa magra e usar dias extras apenas quando recuperacao e plano global justificarem.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 166, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.lose.2', 'workout_builder', 'Lose - 2 dia(s)/semana', '{"goalIn":["lose"],"trainingDaysMin":2,"trainingDaysMax":2}'::jsonb, 'Com 2 dia(s) disponiveis e objetivo lose, manter treino resistido suficiente para preservar massa magra e usar dias extras apenas quando recuperacao e plano global justificarem.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 167, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.lose.3', 'workout_builder', 'Lose - 3 dia(s)/semana', '{"goalIn":["lose"],"trainingDaysMin":3,"trainingDaysMax":3}'::jsonb, 'Com 3 dia(s) disponiveis e objetivo lose, manter treino resistido suficiente para preservar massa magra e usar dias extras apenas quando recuperacao e plano global justificarem.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 168, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.lose.4', 'workout_builder', 'Lose - 4 dia(s)/semana', '{"goalIn":["lose"],"trainingDaysMin":4,"trainingDaysMax":4}'::jsonb, 'Com 4 dia(s) disponiveis e objetivo lose, manter treino resistido suficiente para preservar massa magra e usar dias extras apenas quando recuperacao e plano global justificarem.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 169, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.lose.5', 'workout_builder', 'Lose - 5 dia(s)/semana', '{"goalIn":["lose"],"trainingDaysMin":5,"trainingDaysMax":5}'::jsonb, 'Com 5 dia(s) disponiveis e objetivo lose, manter treino resistido suficiente para preservar massa magra e usar dias extras apenas quando recuperacao e plano global justificarem.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 170, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.lose.6', 'workout_builder', 'Lose - 6 dia(s)/semana', '{"goalIn":["lose"],"trainingDaysMin":6,"trainingDaysMax":6}'::jsonb, 'Com 6 dia(s) disponiveis e objetivo lose, manter treino resistido suficiente para preservar massa magra e usar dias extras apenas quando recuperacao e plano global justificarem.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 171, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'goal_days.lose.7', 'workout_builder', 'Lose - 7 dia(s)/semana', '{"goalIn":["lose"],"trainingDaysMin":7,"trainingDaysMax":7}'::jsonb, 'Com 7 dia(s) disponiveis e objetivo lose, manter treino resistido suficiente para preservar massa magra e usar dias extras apenas quando recuperacao e plano global justificarem.', 'Overview de 12 revisoes sistematicas/149 estudos: treino resistido durante emagrecimento reduz perda de massa magra.', 'umbrella_review', 'Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies', 'Bellicha A, van Baak MA, Battista F, et al.', 'Obesity Reviews', 2021, 'https://doi.org/10.1111/obr.13256', '10.1111/obr.13256', 'high', 'Suporta manutencao de treino resistido durante perda de peso; nao define dieta individual.', 172, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'gain_focus.balanced', 'workout_builder', 'Gain com foco balanced', '{"goalIn":["gain"],"focusIn":["balanced"]}'::jsonb, 'Manter a meta hipertrofica semanal e usar o foco para redistribuir prioridade/volume, nao para abandonar os demais grupamentos. Aumentar o foco apenas ate o ponto em que recuperacao e qualidade das series permaneçam adequadas.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 200, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'gain_focus.upper', 'workout_builder', 'Gain com foco upper', '{"goalIn":["gain"],"focusIn":["upper"]}'::jsonb, 'Manter a meta hipertrofica semanal e usar o foco para redistribuir prioridade/volume, nao para abandonar os demais grupamentos. Aumentar o foco apenas ate o ponto em que recuperacao e qualidade das series permaneçam adequadas.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 195, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'gain_focus.lower', 'workout_builder', 'Gain com foco lower', '{"goalIn":["gain"],"focusIn":["lower"]}'::jsonb, 'Manter a meta hipertrofica semanal e usar o foco para redistribuir prioridade/volume, nao para abandonar os demais grupamentos. Aumentar o foco apenas ate o ponto em que recuperacao e qualidade das series permaneçam adequadas.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 195, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'gain_focus.custom', 'workout_builder', 'Gain com foco custom', '{"goalIn":["gain"],"focusIn":["custom"]}'::jsonb, 'Manter a meta hipertrofica semanal e usar o foco para redistribuir prioridade/volume, nao para abandonar os demais grupamentos. Aumentar o foco apenas ate o ponto em que recuperacao e qualidade das series permaneçam adequadas.', 'Position Stand ACSM 2026; umbrella review de 137 revisoes sistematicas (>30.000 participantes) sobre prescricao de treino resistido em adultos saudaveis.', 'position_stand', 'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews', 'Currier BS, D''Souza AC, Fiatarone Singh MA, et al.', 'Medicine & Science in Sports & Exercise', 2026, 'https://doi.org/10.1249/MSS.0000000000003897', '10.1249/MSS.0000000000003897', 'high', 'Fonte principal. Atualiza o Position Stand ACSM 2009. Aplicavel a adultos saudaveis; nao e protocolo de reabilitacao.', 205, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'short.academia', 'workout_builder', 'Sessao curta em academia', '{"trainingLocationIn":["academia"],"sessionDurationMax":45}'::jsonb, 'Em sessao curta, reduzir redundancias, escolher exercicios com boa relacao entre objetivo e tempo e manter descansos suficientes para preservar desempenho. Se o volume semanal necessario nao couber, distribui-lo em outra sessao.', 'Revisao sistematica com meta-analise Bayesiana sobre descanso entre series; sugere pequeno beneficio hipertrofico para descansos >60 s.', 'systematic_review_meta_analysis', 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy', 'Singer A, Wolf M, Generoso L, et al.', 'Frontiers in Sports and Active Living', 2024, 'https://doi.org/10.3389/fspor.2024.1429789', '10.3389/fspor.2024.1429789', 'moderate', 'Nao implica que um descanso unico seja otimo para todos os exercicios.', 220, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'short.casa', 'workout_builder', 'Sessao curta em casa', '{"trainingLocationIn":["casa"],"sessionDurationMax":45}'::jsonb, 'Em sessao curta, reduzir redundancias, escolher exercicios com boa relacao entre objetivo e tempo e manter descansos suficientes para preservar desempenho. Se o volume semanal necessario nao couber, distribui-lo em outra sessao.', 'Revisao sistematica com meta-analise Bayesiana sobre descanso entre series; sugere pequeno beneficio hipertrofico para descansos >60 s.', 'systematic_review_meta_analysis', 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy', 'Singer A, Wolf M, Generoso L, et al.', 'Frontiers in Sports and Active Living', 2024, 'https://doi.org/10.3389/fspor.2024.1429789', '10.3389/fspor.2024.1429789', 'moderate', 'Nao implica que um descanso unico seja otimo para todos os exercicios.', 220, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();

insert into public.ai_knowledge_rules (owner_id, rule_key, feature, title, rule_condition, recommendation, evidence_ref, source_type, source_title, source_authors, source_journal, source_year, source_url, source_doi, source_quality, source_notes, priority, is_active, review_status)
values (null, 'short.hibrido', 'workout_builder', 'Sessao curta em hibrido', '{"trainingLocationIn":["hibrido"],"sessionDurationMax":45}'::jsonb, 'Em sessao curta, reduzir redundancias, escolher exercicios com boa relacao entre objetivo e tempo e manter descansos suficientes para preservar desempenho. Se o volume semanal necessario nao couber, distribui-lo em outra sessao.', 'Revisao sistematica com meta-analise Bayesiana sobre descanso entre series; sugere pequeno beneficio hipertrofico para descansos >60 s.', 'systematic_review_meta_analysis', 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy', 'Singer A, Wolf M, Generoso L, et al.', 'Frontiers in Sports and Active Living', 2024, 'https://doi.org/10.3389/fspor.2024.1429789', '10.3389/fspor.2024.1429789', 'moderate', 'Nao implica que um descanso unico seja otimo para todos os exercicios.', 220, true, 'pending_human_review')
on conflict (rule_key) where rule_key is not null
do update set
  feature = excluded.feature,
  title = excluded.title,
  rule_condition = excluded.rule_condition,
  recommendation = excluded.recommendation,
  evidence_ref = excluded.evidence_ref,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_authors = excluded.source_authors,
  source_journal = excluded.source_journal,
  source_year = excluded.source_year,
  source_url = excluded.source_url,
  source_doi = excluded.source_doi,
  source_quality = excluded.source_quality,
  source_notes = excluded.source_notes,
  priority = excluded.priority,
  updated_at = now();


-- AUDITORIA RAPIDA
select count(*) as total_rules
from public.ai_knowledge_rules
where feature = 'workout_builder';

select source_quality, count(*) as total
from public.ai_knowledge_rules
where feature = 'workout_builder'
group by source_quality
order by source_quality;

select review_status, count(*) as total
from public.ai_knowledge_rules
where feature = 'workout_builder'
group by review_status
order by review_status;

select rule_key, title, priority, source_title, source_year, source_doi, review_status
from public.ai_knowledge_rules
where feature = 'workout_builder'
order by priority asc, rule_key asc;
