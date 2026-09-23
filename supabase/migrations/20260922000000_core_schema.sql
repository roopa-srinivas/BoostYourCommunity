-- Boost Your Community: core schema.
--
-- The donation loop: an approved organization posts a need, donors pledge part
-- of it, and the organization's staff confirm what was actually received.
-- Only received pledges should count toward badges, leaderboards and stats.
--
-- Security model:
--   * Row level security on every table decides which rows a user can touch.
--   * Column grants decide which columns a user can write, so clients can never
--     set things like an organization's approval status or a pledge's outcome.
--   * Pledge status changes go through the cancel_pledge / resolve_pledge
--     functions instead of direct updates.
--   * Organizations start as 'pending'. An admin approves them from the
--     Supabase dashboard; only approved organizations are public and can post.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.organization_kind as enum ('shelter', 'food_pantry', 'community_fridge', 'other');
create type public.organization_status as enum ('pending', 'approved', 'suspended');
create type public.member_role as enum ('owner', 'staff');
create type public.need_category as enum ('food', 'water', 'clothing', 'hygiene', 'other');
create type public.need_status as enum ('open', 'closed', 'cancelled');
create type public.pledge_status as enum ('pledged', 'received', 'no_show', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  kind public.organization_kind not null default 'other',
  description text,
  address text not null,
  location extensions.geography (point, 4326) not null,
  phone text,
  website text,
  status public.organization_status not null default 'pending',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index organizations_location_idx on public.organizations using gist (location);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category public.need_category not null,
  title text not null check (char_length(title) between 3 and 120),
  details text,
  quantity_needed integer not null check (quantity_needed between 1 and 100000),
  -- Sum of pledges that are 'pledged' or 'received'. Maintained by triggers on
  -- pledges; clients can't write it.
  quantity_committed integer not null default 0 check (quantity_committed >= 0),
  unit text not null default 'items' check (char_length(unit) between 1 and 30),
  dropoff_starts_at timestamptz not null,
  dropoff_ends_at timestamptz not null,
  status public.need_status not null default 'open',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (dropoff_ends_at > dropoff_starts_at)
);

create index needs_organization_id_idx on public.needs (organization_id);
create index needs_open_idx on public.needs (dropoff_ends_at) where status = 'open';

create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id) on delete cascade,
  donor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status public.pledge_status not null default 'pledged',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

create index pledges_need_id_idx on public.pledges (need_id);
create index pledges_donor_id_idx on public.pledges (donor_id);

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_id_idx on public.follows (followee_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- security definer so policies can call these without recursing through the
-- organization_members policies.
create function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$$;

create function public.is_org_owner(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every new auth user gets a profile. The app can pass a display name in the
-- sign-up metadata; otherwise we fall back to the start of their email.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'new member'
    ), 60)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever registers an organization becomes its owner.
create function public.add_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (new.id, new.created_by, 'owner');
  end if;
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.add_organization_owner();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger needs_set_updated_at
  before update on public.needs
  for each row execute function public.set_updated_at();

create trigger pledges_set_updated_at
  before update on public.pledges
  for each row execute function public.set_updated_at();

-- Staff can't lower a need below what donors have already committed.
create function public.check_need_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.quantity_needed is distinct from old.quantity_needed
     and new.quantity_needed < new.quantity_committed then
    raise exception 'donors have already committed % %; the need can''t go below that',
      new.quantity_committed, new.unit
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger needs_check_quantity
  before update on public.needs
  for each row execute function public.check_need_quantity();

-- A new pledge must be for an open need at an approved organization, and can't
-- take the need over its quantity. Locking the need row makes concurrent
-- pledges queue up instead of both squeezing into the last slot.
create function public.reserve_pledge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.needs%rowtype;
begin
  select * into n from public.needs where id = new.need_id for update;

  if not found or not exists (
    select 1 from public.organizations o
    where o.id = n.organization_id and o.status = 'approved'
  ) then
    raise exception 'need not found' using errcode = 'no_data_found';
  end if;

  if n.status <> 'open' or n.dropoff_ends_at <= now() then
    raise exception 'this need is no longer accepting pledges' using errcode = 'check_violation';
  end if;

  if n.quantity_committed + new.quantity > n.quantity_needed then
    raise exception 'only % % left to pledge', n.quantity_needed - n.quantity_committed, n.unit
      using errcode = 'check_violation';
  end if;

  new.status := 'pledged';
  update public.needs set quantity_committed = quantity_committed + new.quantity where id = new.need_id;
  return new;
end;
$$;

create trigger pledges_reserve
  before insert on public.pledges
  for each row execute function public.reserve_pledge();

-- Keep needs.quantity_committed in step when a pledge is cancelled, marked as a
-- no-show, or corrected back to received.
create function public.sync_committed_quantity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_committed boolean := old.status in ('pledged', 'received');
  is_committed boolean := new.status in ('pledged', 'received');
begin
  if was_committed and not is_committed then
    update public.needs set quantity_committed = quantity_committed - old.quantity where id = new.need_id;
  elsif is_committed and not was_committed then
    update public.needs set quantity_committed = quantity_committed + new.quantity where id = new.need_id;
  end if;
  return new;
end;
$$;

create trigger pledges_sync_committed
  after update of status on public.pledges
  for each row execute function public.sync_committed_quantity();

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

-- A donor cancels their own pledge before it's resolved.
create function public.cancel_pledge(pledge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pledges
  set status = 'cancelled', resolved_at = now(), resolved_by = (select auth.uid())
  where id = pledge_id and donor_id = (select auth.uid()) and status = 'pledged';

  if not found then
    raise exception 'pledge not found or can no longer be cancelled' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Organization staff record whether a pledge was dropped off. They can also
-- correct an earlier received/no_show call.
create function public.resolve_pledge(pledge_id uuid, outcome public.pledge_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if outcome not in ('received', 'no_show') then
    raise exception 'outcome must be received or no_show' using errcode = 'invalid_parameter_value';
  end if;

  update public.pledges p
  set status = outcome, resolved_at = now(), resolved_by = (select auth.uid())
  from public.needs n
  where p.id = pledge_id
    and n.id = p.need_id
    and p.status in ('pledged', 'received', 'no_show')
    and public.is_org_member(n.organization_id);

  if not found then
    raise exception 'pledge not found' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Open needs near a point, nearest first. Runs as the caller, so the usual
-- row level security applies.
create function public.needs_near(
  lat double precision,
  lng double precision,
  radius_m double precision default 8000,
  only_category public.need_category default null
)
returns table (
  need_id uuid,
  organization_id uuid,
  organization_name text,
  address text,
  org_lat double precision,
  org_lng double precision,
  category public.need_category,
  title text,
  details text,
  unit text,
  quantity_needed integer,
  quantity_remaining integer,
  dropoff_starts_at timestamptz,
  dropoff_ends_at timestamptz,
  distance_m double precision
)
language sql
stable
set search_path = ''
as $$
  with here as (
    select extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography as point
  )
  select
    n.id,
    o.id,
    o.name,
    o.address,
    extensions.st_y(o.location::extensions.geometry),
    extensions.st_x(o.location::extensions.geometry),
    n.category,
    n.title,
    n.details,
    n.unit,
    n.quantity_needed,
    n.quantity_needed - n.quantity_committed,
    n.dropoff_starts_at,
    n.dropoff_ends_at,
    extensions.st_distance(o.location, here.point)
  from public.needs n
  join public.organizations o on o.id = n.organization_id
  cross join here
  where n.status = 'open'
    and o.status = 'approved'
    and n.dropoff_ends_at > now()
    and n.quantity_committed < n.quantity_needed
    and (only_category is null or n.category = only_category)
    and extensions.st_dwithin(o.location, here.point, radius_m)
  order by extensions.st_distance(o.location, here.point);
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on table
  public.profiles, public.organizations, public.organization_members,
  public.needs, public.pledges, public.follows
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

grant select on public.organizations to anon, authenticated;
grant insert (name, kind, description, address, location, phone, website) on public.organizations to authenticated;
grant update (name, kind, description, address, location, phone, website) on public.organizations to authenticated;

grant select, delete on public.organization_members to authenticated;
grant insert (organization_id, user_id) on public.organization_members to authenticated;

grant select on public.needs to anon, authenticated;
grant insert (organization_id, category, title, details, quantity_needed, unit, dropoff_starts_at, dropoff_ends_at)
  on public.needs to authenticated;
grant update (category, title, details, quantity_needed, unit, dropoff_starts_at, dropoff_ends_at, status)
  on public.needs to authenticated;

grant select on public.pledges to authenticated;
grant insert (need_id, quantity) on public.pledges to authenticated;

grant select, delete on public.follows to authenticated;
grant insert (followee_id) on public.follows to authenticated;

-- Functions are executable by everyone by default; only expose the app-facing
-- ones, and only to the roles that need them.
revoke execute on function
  public.is_org_member(uuid), public.is_org_owner(uuid),
  public.handle_new_user(), public.add_organization_owner(), public.set_updated_at(),
  public.check_need_quantity(), public.reserve_pledge(), public.sync_committed_quantity(),
  public.cancel_pledge(uuid), public.resolve_pledge(uuid, public.pledge_status),
  public.needs_near(double precision, double precision, double precision, public.need_category)
from public, anon, authenticated;

grant execute on function public.is_org_member(uuid), public.is_org_owner(uuid) to anon, authenticated;
grant execute on function public.cancel_pledge(uuid), public.resolve_pledge(uuid, public.pledge_status) to authenticated;
grant execute on function
  public.needs_near(double precision, double precision, double precision, public.need_category)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.needs enable row level security;
alter table public.pledges enable row level security;
alter table public.follows enable row level security;

create policy "Signed-in users can see profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can edit their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Approved orgs are public; members and creators see theirs"
  on public.organizations for select to anon, authenticated
  using (
    status = 'approved'
    or created_by = (select auth.uid())
    or public.is_org_member(id)
  );

create policy "Signed-in users can register an organization"
  on public.organizations for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Owners can edit their organization"
  on public.organizations for update to authenticated
  using (public.is_org_owner(id))
  with check (public.is_org_owner(id));

create policy "Members can see their organization's staff"
  on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_org_member(organization_id));

create policy "Owners can add staff"
  on public.organization_members for insert to authenticated
  with check (role = 'staff' and public.is_org_owner(organization_id));

create policy "Owners can remove staff, and staff can leave"
  on public.organization_members for delete to authenticated
  using (
    role = 'staff'
    and (public.is_org_owner(organization_id) or user_id = (select auth.uid()))
  );

create policy "Needs of approved orgs are public; members see all of theirs"
  on public.needs for select to anon, authenticated
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.status = 'approved'
    )
    or public.is_org_member(organization_id)
  );

create policy "Members of approved organizations can post needs"
  on public.needs for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.status = 'approved'
    )
  );

create policy "Members can edit their organization's needs"
  on public.needs for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "Donors see their own pledges; staff see pledges to their needs"
  on public.pledges for select to authenticated
  using (
    donor_id = (select auth.uid())
    or exists (
      select 1 from public.needs n
      where n.id = need_id and public.is_org_member(n.organization_id)
    )
  );

create policy "Donors can pledge as themselves"
  on public.pledges for insert to authenticated
  with check (donor_id = (select auth.uid()));

create policy "Signed-in users can see who follows whom"
  on public.follows for select to authenticated
  using (true);

create policy "Users can follow as themselves"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));

create policy "Users can unfollow"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));
