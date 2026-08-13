-- WARNING: DESTRUCTIVE OPERATION
-- This script wipes app data from public schema and clears auth data.
-- Storage files/buckets may require manual deletion in Supabase Dashboard
-- when project is configured as Storage API-only.
-- Run in Supabase SQL Editor as project owner/admin.

begin;

-- 1) Truncate every table in public schema and restart identities.
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename <> 'spatial_ref_sys'
  loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end $$;

-- 2) Storage reset skipped on purpose.
-- Supabase can enforce Storage API-only mode, where SQL deletes are blocked
-- (including internal function paths). In that case, reset buckets manually:
-- Dashboard -> Storage -> bucket -> Empty bucket/Delete bucket
-- or use Storage API from service-role context.

-- Optional check (run manually after this script):
-- select id, name from storage.buckets;
-- select bucket_id, name, created_at from storage.objects order by created_at desc;

-- 3) Delete auth data (if tables exist in this project version).
do $$
begin
  if to_regclass('auth.identities') is not null then
    execute 'delete from auth.identities';
  end if;

  if to_regclass('auth.sessions') is not null then
    execute 'delete from auth.sessions';
  end if;

  if to_regclass('auth.refresh_tokens') is not null then
    execute 'delete from auth.refresh_tokens';
  end if;

  if to_regclass('auth.mfa_factors') is not null then
    execute 'delete from auth.mfa_factors';
  end if;

  if to_regclass('auth.one_time_tokens') is not null then
    execute 'delete from auth.one_time_tokens';
  end if;

  if to_regclass('auth.audit_log_entries') is not null then
    execute 'delete from auth.audit_log_entries';
  end if;

  if to_regclass('auth.users') is not null then
    execute 'delete from auth.users';
  end if;
end $$;

commit;
