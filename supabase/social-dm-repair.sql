-- GymPilot Social DM repair
-- Rode no Supabase SQL Editor se o Direct mostrar erro de schema/cache.

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.social_profiles(id) on delete cascade,
  receiver_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.friendships
  add column if not exists deleted_at timestamptz;

create or replace function public.enforce_friendship_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.social_profiles p where p.id = new.addressee_id and p.is_private = true) then
      new.status := 'pending';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'accepted' and auth.uid() <> old.addressee_id then
      raise exception 'Apenas quem recebeu a solicitação pode aceitar.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_friendship_rules_trigger on public.friendships;
create trigger enforce_friendship_rules_trigger
  before insert or update on public.friendships
  for each row execute function public.enforce_friendship_rules();

alter table public.social_messages
  alter column body set default '',
  add column if not exists media_url text,
  add column if not exists media_type text check (media_type is null or media_type in ('image', 'video')),
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

create table if not exists public.social_chat_preferences (
  user_id uuid not null references public.social_profiles(id) on delete cascade,
  peer_id uuid not null references public.social_profiles(id) on delete cascade,
  is_archived boolean not null default false,
  is_pinned boolean not null default false,
  hidden_before timestamptz,
  last_read_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, peer_id),
  check (user_id <> peer_id)
);

alter table public.social_chat_preferences
  add column if not exists is_archived boolean not null default false,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists hidden_before timestamptz,
  add column if not exists last_read_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.social_chat_preferences'::regclass
      and conname = 'social_chat_preferences_pkey'
  ) then
    alter table public.social_chat_preferences
      add constraint social_chat_preferences_pkey primary key (user_id, peer_id);
  end if;
end $$;

alter table public.social_messages enable row level security;
alter table public.social_chat_preferences enable row level security;

drop policy if exists "messages visible to sender and receiver" on public.social_messages;
drop policy if exists "users send own messages" on public.social_messages;
drop policy if exists "messages visible to both users" on public.social_messages;
drop policy if exists "friends send direct messages" on public.social_messages;
drop policy if exists "users update own messages" on public.social_messages;
drop policy if exists "users read own chat preferences" on public.social_chat_preferences;
drop policy if exists "users upsert own chat preferences" on public.social_chat_preferences;
drop policy if exists "users update own chat preferences" on public.social_chat_preferences;

create policy "messages visible to both users"
  on public.social_messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friends send direct messages"
  on public.social_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and (
      exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (f.deleted_at is null)
          and (
            (f.requester_id = sender_id and f.addressee_id = receiver_id)
            or (f.requester_id = receiver_id and f.addressee_id = sender_id)
          )
      )
      or exists (
        select 1
        from public.social_profiles sender_profile
        join public.social_profiles receiver_profile on receiver_profile.id = receiver_id
        where sender_profile.id = sender_id
          and sender_profile.is_private = false
          and receiver_profile.is_private = false
        )
      )
    )
  );

create policy "users update own messages"
  on public.social_messages for update
  to authenticated
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy "users read own chat preferences"
  on public.social_chat_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users upsert own chat preferences"
  on public.social_chat_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own chat preferences"
  on public.social_chat_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists social_messages_sender_receiver_idx
  on public.social_messages (sender_id, receiver_id, created_at desc);

create index if not exists social_messages_receiver_sender_idx
  on public.social_messages (receiver_id, sender_id, created_at desc);

create index if not exists social_chat_preferences_user_idx
  on public.social_chat_preferences (user_id, is_pinned desc, is_archived, updated_at desc);

notify pgrst, 'reload schema';
