-- Staff invites: owners share a one-time code; teammates join with it.
--
-- Joining with a code is the only way to become staff, so nobody is added
-- to an organization (and shown its donors' names) without agreeing to it.

-- The old direct path: owners could insert any user as staff.
drop policy "Owners can add staff" on public.organization_members;
revoke insert on public.organization_members from authenticated;

create table public.organization_invites (
  code text primary key default public.new_checkin_code(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz
);

create index organization_invites_organization_id_idx on public.organization_invites (organization_id);

alter table public.organization_invites enable row level security;
revoke all on table public.organization_invites from anon, authenticated;
grant select on public.organization_invites to authenticated;

create policy "Owners can see their organization's invites"
  on public.organization_invites for select to authenticated
  using (private.is_org_owner(organization_id));

-- An owner creates an invite and gets its code back.
create function public.create_staff_invite(organization_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  if not private.is_org_owner(organization_id) then
    raise exception 'only owners can invite staff' using errcode = 'insufficient_privilege';
  end if;

  insert into public.organization_invites (organization_id, created_by)
  values (organization_id, (select auth.uid()))
  returning code into new_code;
  return new_code;
end;
$$;

-- The signed-in user joins the organization an unused, unexpired code is
-- for, as staff. Returns the organization's id.
create function public.join_organization(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.organization_invites%rowtype;
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'sign in to join an organization' using errcode = 'insufficient_privilege';
  end if;

  select * into invite from public.organization_invites
  where code = upper(replace(invite_code, ' ', ''))
  for update;

  if not found or invite.used_at is not null or invite.expires_at <= now() then
    raise exception 'that invite code isn’t valid. it may have been used already or expired; ask for a new one.';
  end if;

  if exists (
    select 1 from public.organization_members m
    where m.organization_id = invite.organization_id and m.user_id = me
  ) then
    raise exception 'you’re already part of this organization.';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invite.organization_id, me, 'staff');

  update public.organization_invites set used_by = me, used_at = now() where code = invite.code;
  return invite.organization_id;
end;
$$;

revoke execute on function public.create_staff_invite(uuid), public.join_organization(text) from public, anon;
grant execute on function public.create_staff_invite(uuid), public.join_organization(text) to authenticated;
