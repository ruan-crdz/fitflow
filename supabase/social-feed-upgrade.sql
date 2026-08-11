-- GymPilot Social upgrade: auth trigger, profiles, posts, likes, comments and images.
-- Run this after social-schema.sql.

alter table public.social_profiles
  add column if not exists bio text,
  add column if not exists login_email text,
  add column if not exists is_private boolean not null default false,
  add column if not exists show_consistency boolean not null default true,
  add column if not exists show_load_progression boolean not null default true,
  add column if not exists show_daily_calories boolean not null default false,
  add column if not exists show_water boolean not null default false,
  add column if not exists show_bmi boolean not null default false,
  add column if not exists show_weight_progress boolean not null default false,
  add column if not exists show_today_workout boolean not null default true;

alter table public.friendships
  add column if not exists deleted_at timestamptz;

drop policy if exists "friendships visible to both users" on public.friendships;
drop policy if exists "users request friendships" on public.friendships;
drop policy if exists "users update received or sent friendships" on public.friendships;

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

create or replace function public.handle_new_social_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 3 then
    base_username := 'user_' || substr(new.id::text, 1, 8);
  end if;
  base_username := substr(base_username, 1, 20);
  final_username := base_username;

  while exists (select 1 from public.social_profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := substr(base_username, 1, greatest(3, 20 - length(suffix::text) - 1)) || '_' || suffix::text;
  end loop;

  insert into public.social_profiles (id, username, display_name, login_email)
  values (
    new.id,
    final_username,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), final_username),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_social_profile on auth.users;
create trigger on_auth_user_created_social_profile
  after insert on auth.users
  for each row execute function public.handle_new_social_user();

insert into public.social_profiles (id, username, display_name, login_email)
select
  u.id,
  substr(lower(regexp_replace(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g')), 1, 11) || '_' || substr(u.id::text, 1, 8),
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), split_part(u.email, '@', 1), 'Usuario'),
  u.email
from auth.users u
where not exists (
  select 1 from public.social_profiles p where p.id = u.id
)
on conflict (id) do nothing;

create or replace function public.get_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select login_email
  from public.social_profiles
  where username = lower(regexp_replace(p_username, '[^a-z0-9_]', '', 'g'))
  limit 1
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;

create table if not exists public.social_profile_stats (
  user_id uuid primary key references public.social_profiles(id) on delete cascade,
  consistency_count int not null default 0,
  load_progression text,
  daily_calories int not null default 0,
  daily_calorie_goal int not null default 0,
  water_glasses int not null default 0,
  bmi numeric,
  weight_start numeric,
  weight_latest numeric,
  today_workout text,
  updated_at timestamptz not null default now()
);

alter table public.social_profile_stats enable row level security;

drop policy if exists "stats are readable by logged users" on public.social_profile_stats;
drop policy if exists "users upsert own stats" on public.social_profile_stats;
drop policy if exists "users update own stats" on public.social_profile_stats;

create policy "stats are readable by logged users"
  on public.social_profile_stats for select
  to authenticated
  using (true);

create policy "users upsert own stats"
  on public.social_profile_stats for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own stats"
  on public.social_profile_stats for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.social_profiles(id) on delete cascade,
  receiver_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

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
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and f.deleted_at is null
        and (
          (f.requester_id = sender_id and f.addressee_id = receiver_id)
          or (f.requester_id = receiver_id and f.addressee_id = sender_id)
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

create index if not exists friendships_active_users_idx
  on public.friendships (requester_id, addressee_id, status)
  where deleted_at is null;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.social_profiles(id) on delete cascade,
  body text check (char_length(coalesce(body, '')) <= 2000),
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.social_posts
  add column if not exists comments_enabled boolean not null default true,
  add column if not exists deleted_at timestamptz;

create table if not exists public.social_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  image_url text not null,
  position int not null default 0
);

create table if not exists public.social_post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.social_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.social_post_comments
  add column if not exists deleted_at timestamptz,
  add column if not exists edited_at timestamptz;

create table if not exists public.social_post_comment_likes (
  comment_id uuid not null references public.social_post_comments(id) on delete cascade,
  user_id uuid not null references public.social_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.social_posts enable row level security;
alter table public.social_post_images enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.social_post_comments enable row level security;
alter table public.social_post_comment_likes enable row level security;

drop policy if exists "posts are public readable" on public.social_posts;
drop policy if exists "users create own posts" on public.social_posts;
drop policy if exists "users update own posts" on public.social_posts;
drop policy if exists "users delete own posts" on public.social_posts;
drop policy if exists "post images public readable" on public.social_post_images;
drop policy if exists "post owner adds images" on public.social_post_images;
drop policy if exists "likes public readable" on public.social_post_likes;
drop policy if exists "users like as themselves" on public.social_post_likes;
drop policy if exists "users remove own likes" on public.social_post_likes;
drop policy if exists "comments public readable" on public.social_post_comments;
drop policy if exists "users comment as themselves" on public.social_post_comments;
drop policy if exists "users update own comments" on public.social_post_comments;
drop policy if exists "users update own or received comments" on public.social_post_comments;
drop policy if exists "users delete own comments" on public.social_post_comments;
drop policy if exists "users delete own or received comments" on public.social_post_comments;
drop policy if exists "comment likes public readable" on public.social_post_comment_likes;
drop policy if exists "users like comments as themselves" on public.social_post_comment_likes;
drop policy if exists "users remove own comment likes" on public.social_post_comment_likes;

create policy "posts are public readable"
  on public.social_posts for select
  to authenticated
  using (true);

create policy "users create own posts"
  on public.social_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own posts"
  on public.social_posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own posts"
  on public.social_posts for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "post images public readable"
  on public.social_post_images for select
  to authenticated
  using (true);

create policy "post owner adds images"
  on public.social_post_images for insert
  to authenticated
  with check (exists (select 1 from public.social_posts p where p.id = post_id and p.user_id = auth.uid()));

create policy "likes public readable"
  on public.social_post_likes for select
  to authenticated
  using (true);

create policy "users like as themselves"
  on public.social_post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users remove own likes"
  on public.social_post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "comments public readable"
  on public.social_post_comments for select
  to authenticated
  using (true);

create policy "users comment as themselves"
  on public.social_post_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.social_posts p
      where p.id = post_id
        and p.comments_enabled = true
    )
  );

create policy "users update own or received comments"
  on public.social_post_comments for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.social_posts p
      where p.id = post_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.social_posts p
      where p.id = post_id
        and p.user_id = auth.uid()
    )
  );

create policy "users delete own or received comments"
  on public.social_post_comments for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.social_posts p
      where p.id = post_id
        and p.user_id = auth.uid()
    )
  );

create policy "comment likes public readable"
  on public.social_post_comment_likes for select
  to authenticated
  using (true);

create policy "users like comments as themselves"
  on public.social_post_comment_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users remove own comment likes"
  on public.social_post_comment_likes for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists social_post_comments_post_idx
  on public.social_post_comments (post_id, created_at asc);

create index if not exists social_post_comment_likes_comment_idx
  on public.social_post_comment_likes (comment_id, created_at desc);

create index if not exists social_posts_active_created_idx
  on public.social_posts (created_at desc)
  where deleted_at is null;

create index if not exists social_post_comments_active_post_idx
  on public.social_post_comments (post_id, created_at asc)
  where deleted_at is null;

insert into storage.buckets (id, name, public)
values ('social-posts', 'social-posts', true)
on conflict (id) do update set public = true;

drop policy if exists "social post images are public" on storage.objects;
drop policy if exists "users upload own social images" on storage.objects;
drop policy if exists "users update own social images" on storage.objects;
drop policy if exists "users delete own social images" on storage.objects;

create policy "social post images are public"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'social-posts');

create policy "users upload own social images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'social-posts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users update own social images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'social-posts' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'social-posts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users delete own social images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'social-posts' and auth.uid()::text = (storage.foldername(name))[1]);
