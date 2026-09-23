-- Minimal stand-ins for the parts of Supabase the schema relies on (auth.users,
-- auth.uid(), the anon/authenticated roles), so the schema can be checked on a
-- plain Postgres + PostGIS without Docker.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth; create schema extensions;
grant usage on schema public, extensions, auth to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
-- mimic Supabase default privileges on new public tables
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
