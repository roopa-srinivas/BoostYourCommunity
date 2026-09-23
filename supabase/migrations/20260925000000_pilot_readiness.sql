-- Phase 3: admins, account deletion, and expiring stale pledges.

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

-- Who can approve organizations. Rows are added from the Supabase dashboard
-- or SQL; the app can only check whether the signed-in user is one.
create table public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create policy "Admins can see that they are admins"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

grant execute on function private.is_admin() to anon, authenticated;

-- Admins can see every organization, including pending and suspended ones.
create policy "Admins can see all organizations"
  on public.organizations for select to authenticated
  using (private.is_admin());

-- Approve, suspend or send back to pending. Status has no column grant, so
-- this is the only way the app can change it.
create function public.set_organization_status(organization_id uuid, new_status public.organization_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can change an organization''s status' using errcode = 'insufficient_privilege';
  end if;

  update public.organizations set status = new_status where id = organization_id;
  if not found then
    raise exception 'organization not found';
  end if;
end;
$$;

revoke execute on function public.set_organization_status(uuid, public.organization_status) from public, anon;
grant execute on function public.set_organization_status(uuid, public.organization_status) to authenticated;

-- ---------------------------------------------------------------------------
-- Account deletion (required by the App Store for apps with sign-up)
-- ---------------------------------------------------------------------------

-- Deletes the signed-in user's account. Their profile, pledges, follows and
-- memberships go with it (cascades); pledged quantities are released back to
-- needs by the pledge delete trigger. An organization left with no members is
-- suspended rather than deleted, so other donors' pledge history survives and
-- an admin can hand it to someone new.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  orphaned uuid[];
begin
  if me is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(array_agg(m.organization_id), '{}') into orphaned
  from public.organization_members m
  where m.user_id = me
    and not exists (
      select 1 from public.organization_members other
      where other.organization_id = m.organization_id and other.user_id <> me
    );

  delete from auth.users where id = me;

  update public.organizations set status = 'suspended' where id = any (orphaned);
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Expire stale pledges
-- ---------------------------------------------------------------------------

-- A pledge still unconfirmed a day after its drop-off window closed is marked
-- as not dropped off. resolved_by stays null so it's clear no one decided
-- this, and staff can still correct it with resolve_pledge.
create function public.expire_stale_pledges()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.pledges p
    set status = 'no_show', resolved_at = now(), resolved_by = null
    from public.needs n
    where n.id = p.need_id
      and p.status = 'pledged'
      and n.dropoff_ends_at < now() - interval '1 day'
    returning p.id
  )
  select count(*)::integer from expired;
$$;

revoke execute on function public.expire_stale_pledges() from public, anon, authenticated;

-- Run it hourly where pg_cron is available (the hosted project). Local check
-- databases without pg_cron skip this.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    execute $cron$ select cron.schedule('expire-stale-pledges', '17 * * * *', 'select public.expire_stale_pledges()') $cron$;
  end if;
end;
$$;
