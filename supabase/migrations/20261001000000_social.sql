-- Following organizations, and hiding your monthly total from leaderboards.

-- Donors follow organizations to see their open needs first on Give. Who
-- follows an organization is private: each person sees only their own rows.
create table public.organization_follows (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create index organization_follows_organization_id_idx on public.organization_follows (organization_id);

revoke all on table public.organization_follows from anon, authenticated;
grant select, delete on public.organization_follows to authenticated;
grant insert (organization_id) on public.organization_follows to authenticated;

alter table public.organization_follows enable row level security;

create policy "Users see the organizations they follow"
  on public.organization_follows for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users follow approved organizations as themselves"
  on public.organization_follows for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.status = 'approved'
    )
  );

create policy "Users unfollow organizations"
  on public.organization_follows for delete to authenticated
  using (user_id = (select auth.uid()));

-- People can keep their monthly total off their followers' leaderboards.
-- They still see their own row.
alter table public.profiles add column hide_from_leaderboard boolean not null default false;
grant update (hide_from_leaderboard) on public.profiles to authenticated;

create or replace function public.leaderboard_this_month()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  items_given bigint,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with circle as (
    select (select auth.uid()) as id
    union
    select f.followee_id
    from public.follows f
    join public.profiles followee on followee.id = f.followee_id
    where f.follower_id = (select auth.uid())
      and not followee.hide_from_leaderboard
  )
  select
    p.id,
    p.display_name,
    p.avatar_url,
    coalesce(sum(pl.quantity) filter (
      where pl.status = 'received' and pl.resolved_at >= date_trunc('month', now())
    ), 0) as items_given,
    p.id = (select auth.uid()) as is_me
  from circle c
  join public.profiles p on p.id = c.id
  left join public.pledges pl on pl.donor_id = p.id
  group by p.id
  order by items_given desc, p.display_name;
$$;
