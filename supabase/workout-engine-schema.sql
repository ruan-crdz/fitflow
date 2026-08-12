-- FitFlow Workout Engine backend schema
-- Run this in Supabase SQL Editor after existing social scripts.

create extension if not exists pgcrypto;

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'SYSTEM' check (source in ('SYSTEM', 'USER', 'AI')),
  owner_id uuid references auth.users(id) on delete cascade,
  visibility text not null default 'PRIVATE' check (visibility in ('PUBLIC', 'PRIVATE')),
  split text[] not null,
  workouts jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'DRAFTING' check (status in ('DRAFTING', 'READY', 'AWAITING_CONFIRMATION', 'SAVING', 'SAVED', 'ERROR')),
  split text not null check (split in ('ABC', 'ABCD', 'ABCDE')),
  workouts jsonb not null,
  recommendation text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  split text not null check (split in ('ABC', 'ABCD', 'ABCDE')),
  workouts jsonb not null,
  source text not null default 'AI' check (source in ('SYSTEM', 'USER', 'AI')),
  created_from_draft_id uuid references public.workout_drafts(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_replace_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  draft_id uuid references public.workout_drafts(id) on delete set null,
  expected_version int,
  result_program_id uuid references public.user_workout_programs(id) on delete set null,
  status text not null default 'processing' check (status in ('processing', 'success', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

create unique index if not exists user_workout_programs_one_active_idx
  on public.user_workout_programs (user_id)
  where status = 'active';

create index if not exists workout_drafts_user_status_idx
  on public.workout_drafts (user_id, status, updated_at desc);

create index if not exists workout_programs_user_status_idx
  on public.user_workout_programs (user_id, status, updated_at desc);

create index if not exists workout_templates_owner_visibility_idx
  on public.workout_templates (owner_id, visibility, updated_at desc);

create or replace function public.workout_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workout_templates_touch_updated_at on public.workout_templates;
create trigger workout_templates_touch_updated_at
  before update on public.workout_templates
  for each row execute function public.workout_touch_updated_at();

drop trigger if exists workout_drafts_touch_updated_at on public.workout_drafts;
create trigger workout_drafts_touch_updated_at
  before update on public.workout_drafts
  for each row execute function public.workout_touch_updated_at();

drop trigger if exists user_workout_programs_touch_updated_at on public.user_workout_programs;
create trigger user_workout_programs_touch_updated_at
  before update on public.user_workout_programs
  for each row execute function public.workout_touch_updated_at();

drop trigger if exists workout_replace_requests_touch_updated_at on public.workout_replace_requests;
create trigger workout_replace_requests_touch_updated_at
  before update on public.workout_replace_requests
  for each row execute function public.workout_touch_updated_at();

create or replace function public.validate_workout_payload(p_workouts jsonb, p_split text)
returns text
language plpgsql
as $$
declare
  slots text[];
  slot text;
  workout_item jsonb;
  exercises jsonb;
  expected_count int;
begin
  if p_split not in ('ABC', 'ABCD', 'ABCDE') then
    return 'Split inválido.';
  end if;

  slots := case p_split
    when 'ABC' then array['A', 'B', 'C']
    when 'ABCD' then array['A', 'B', 'C', 'D']
    else array['A', 'B', 'C', 'D', 'E']
  end;

  expected_count := array_length(slots, 1);

  if jsonb_typeof(p_workouts) <> 'array' then
    return 'Workouts precisa ser um array JSON.';
  end if;

  if jsonb_array_length(p_workouts) <> expected_count then
    return format('Para split %s é obrigatório enviar %s treinos.', p_split, expected_count);
  end if;

  foreach slot in array slots loop
    workout_item := null;
    select w.value
      into workout_item
      from jsonb_array_elements(p_workouts) as w(value)
      where upper(coalesce(w.value->>'type', '')) = slot
      limit 1;

    if workout_item is null then
      return format('Treino %s ausente no payload.', slot);
    end if;

    exercises := workout_item->'exercises';
    if jsonb_typeof(exercises) <> 'array' or jsonb_array_length(exercises) < 5 then
      return format('Treino %s deve ter no mínimo 5 exercícios.', slot);
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.save_workout_draft(
  p_split text,
  p_workouts jsonb,
  p_recommendation text default null,
  p_draft_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_split text := upper(trim(coalesce(p_split, '')));
  v_error text;
  v_draft_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
  end if;

  v_error := public.validate_workout_payload(p_workouts, v_split);
  if v_error is not null then
    return jsonb_build_object('success', false, 'error', v_error);
  end if;

  if p_draft_id is not null then
    update public.workout_drafts
       set split = v_split,
           workouts = p_workouts,
           recommendation = p_recommendation,
           status = 'AWAITING_CONFIRMATION',
           error_message = null,
           updated_at = now()
     where id = p_draft_id
       and user_id = v_user
     returning id into v_draft_id;
  end if;

  if v_draft_id is null then
    insert into public.workout_drafts (user_id, split, workouts, recommendation, status)
    values (v_user, v_split, p_workouts, p_recommendation, 'AWAITING_CONFIRMATION')
    returning id into v_draft_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'draftId', v_draft_id,
    'status', 'AWAITING_CONFIRMATION'
  );
end;
$$;

create or replace function public.replace_current_workout(
  p_draft_id uuid,
  p_idempotency_key text,
  p_expected_version int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_key text := trim(coalesce(p_idempotency_key, ''));
  v_draft public.workout_drafts%rowtype;
  v_current public.user_workout_programs%rowtype;
  v_new_program_id uuid;
  v_next_version int := 1;
  v_error text;
  v_existing_status text;
  v_existing_program uuid;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
  end if;

  if p_draft_id is null then
    return jsonb_build_object('success', false, 'error', 'draftId é obrigatório.');
  end if;

  if length(v_key) < 8 then
    return jsonb_build_object('success', false, 'error', 'idempotencyKey inválida.');
  end if;

  insert into public.workout_replace_requests (user_id, idempotency_key, draft_id, expected_version, status)
  values (v_user, v_key, p_draft_id, p_expected_version, 'processing')
  on conflict (user_id, idempotency_key) do nothing;

  select status, result_program_id
    into v_existing_status, v_existing_program
    from public.workout_replace_requests
    where user_id = v_user
      and idempotency_key = v_key;

  if v_existing_status = 'success' then
    return jsonb_build_object('success', true, 'idempotent', true, 'programId', v_existing_program);
  end if;

  update public.workout_drafts
     set status = 'SAVING',
         error_message = null,
         updated_at = now()
   where id = p_draft_id
     and user_id = v_user;

  select *
    into v_draft
    from public.workout_drafts
    where id = p_draft_id
      and user_id = v_user
    for update;

  if v_draft.id is null then
    update public.workout_replace_requests
       set status = 'failed', error_message = 'Draft não encontrado.'
     where user_id = v_user and idempotency_key = v_key;
    return jsonb_build_object('success', false, 'error', 'Draft não encontrado.');
  end if;

  v_error := public.validate_workout_payload(v_draft.workouts, v_draft.split);
  if v_error is not null then
    update public.workout_drafts
       set status = 'ERROR', error_message = v_error
     where id = v_draft.id;
    update public.workout_replace_requests
       set status = 'failed', error_message = v_error
     where user_id = v_user and idempotency_key = v_key;
    return jsonb_build_object('success', false, 'error', v_error);
  end if;

  select *
    into v_current
    from public.user_workout_programs
    where user_id = v_user
      and status = 'active'
    order by created_at desc
    limit 1
    for update;

  if p_expected_version is not null then
    if v_current.id is null and p_expected_version <> 0 then
      update public.workout_replace_requests
         set status = 'failed', error_message = 'Versão esperada não confere com estado atual.'
       where user_id = v_user and idempotency_key = v_key;
      return jsonb_build_object('success', false, 'error', 'Versão esperada não confere com estado atual.');
    end if;

    if v_current.id is not null and v_current.version <> p_expected_version then
      update public.workout_replace_requests
         set status = 'failed', error_message = 'Conflito de versão do treino ativo.'
       where user_id = v_user and idempotency_key = v_key;
      return jsonb_build_object('success', false, 'error', 'Conflito de versão do treino ativo.');
    end if;
  end if;

  if v_current.id is not null then
    update public.user_workout_programs
       set status = 'archived', archived_at = now(), updated_at = now()
     where id = v_current.id;
    v_next_version := v_current.version + 1;
  end if;

  insert into public.user_workout_programs (
    user_id,
    version,
    status,
    split,
    workouts,
    source,
    created_from_draft_id
  )
  values (
    v_user,
    v_next_version,
    'active',
    v_draft.split,
    v_draft.workouts,
    'AI',
    v_draft.id
  )
  returning id into v_new_program_id;

  update public.workout_drafts
     set status = 'SAVED', error_message = null, updated_at = now()
   where id = v_draft.id;

  update public.workout_replace_requests
     set status = 'success', result_program_id = v_new_program_id, error_message = null, updated_at = now()
   where user_id = v_user and idempotency_key = v_key;

  return jsonb_build_object(
    'success', true,
    'programId', v_new_program_id,
    'version', v_next_version,
    'draftId', v_draft.id
  );
exception
  when others then
    update public.workout_drafts
       set status = 'ERROR', error_message = left(sqlerrm, 1000), updated_at = now()
     where id = p_draft_id
       and user_id = v_user;

    update public.workout_replace_requests
       set status = 'failed', error_message = left(sqlerrm, 1000), updated_at = now()
     where user_id = v_user and idempotency_key = v_key;

    return jsonb_build_object('success', false, 'error', left(sqlerrm, 1000));
end;
$$;

create or replace function public.get_active_workout_program()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_program public.user_workout_programs%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
  end if;

  select *
    into v_program
    from public.user_workout_programs
    where user_id = v_user
      and status = 'active'
    order by created_at desc
    limit 1;

  if v_program.id is null then
    return jsonb_build_object('success', false, 'error', 'Nenhum treino ativo encontrado.');
  end if;

  return jsonb_build_object(
    'success', true,
    'programId', v_program.id,
    'version', v_program.version,
    'split', v_program.split,
    'workouts', v_program.workouts,
    'updatedAt', v_program.updated_at
  );
end;
$$;

alter table public.workout_templates enable row level security;
alter table public.workout_drafts enable row level security;
alter table public.user_workout_programs enable row level security;
alter table public.workout_replace_requests enable row level security;

drop policy if exists "templates readable by visibility" on public.workout_templates;
drop policy if exists "users manage own templates" on public.workout_templates;
drop policy if exists "users read own drafts" on public.workout_drafts;
drop policy if exists "users create own drafts" on public.workout_drafts;
drop policy if exists "users update own drafts" on public.workout_drafts;
drop policy if exists "users delete own drafts" on public.workout_drafts;
drop policy if exists "users read own programs" on public.user_workout_programs;
drop policy if exists "users read own replace requests" on public.workout_replace_requests;

create policy "templates readable by visibility"
  on public.workout_templates for select
  to authenticated
  using (visibility = 'PUBLIC' or owner_id = auth.uid());

create policy "users manage own templates"
  on public.workout_templates for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "users read own drafts"
  on public.workout_drafts for select
  to authenticated
  using (user_id = auth.uid());

create policy "users create own drafts"
  on public.workout_drafts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update own drafts"
  on public.workout_drafts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete own drafts"
  on public.workout_drafts for delete
  to authenticated
  using (user_id = auth.uid());

create policy "users read own programs"
  on public.user_workout_programs for select
  to authenticated
  using (user_id = auth.uid());

create policy "users read own replace requests"
  on public.workout_replace_requests for select
  to authenticated
  using (user_id = auth.uid());

grant execute on function public.save_workout_draft(text, jsonb, text, uuid) to authenticated;
grant execute on function public.replace_current_workout(uuid, text, int) to authenticated;
grant execute on function public.get_active_workout_program() to authenticated;

notify pgrst, 'reload schema';
