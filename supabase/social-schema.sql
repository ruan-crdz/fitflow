-- GymPilot Social MVP
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.social_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.social_profiles(id) on delete cascade,
  addressee_id uuid not null references public.social_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.social_profiles(id) on delete cascade,
  receiver_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.social_profiles(id) on delete cascade,
  receiver_id uuid not null references public.social_profiles(id) on delete cascade,
  title text not null,
  message text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  imported_at timestamptz
);

alter table public.social_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.social_messages enable row level security;
alter table public.workout_shares enable row level security;

create policy "profiles are readable by signed users"
  on public.social_profiles for select
  to authenticated
  using (true);

create policy "users insert their own profile"
  on public.social_profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users update their own profile"
  on public.social_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "friendships visible to both users"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users request friendships"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "users update received or sent friendships"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "messages visible to sender and receiver"
  on public.social_messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "users send own messages"
  on public.social_messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "shares visible to sender and receiver"
  on public.workout_shares for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "users send own shares"
  on public.workout_shares for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "receivers mark shares imported"
  on public.workout_shares for update
  to authenticated
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);
