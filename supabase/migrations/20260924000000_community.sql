-- Phase 2: community features.
--
-- Donors can only read their own pledges, so the leaderboard and heat map are
-- security definer functions that expose totals, never individual pledges.
-- Only received (confirmed) donations count.

-- Confirmed items this calendar month (UTC) for the signed-in user and the
-- people they follow, most first.
create function public.leaderboard_this_month()
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
    select f.followee_id from public.follows f where f.follower_id = (select auth.uid())
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

-- Confirmed items per approved organization near a point over the last
-- `days` days, for the community heat map.
create function public.community_heat(
  lat double precision,
  lng double precision,
  radius_m double precision default 20000,
  days integer default 30
)
returns table (
  organization_id uuid,
  organization_name text,
  org_lat double precision,
  org_lng double precision,
  items_received bigint,
  donors bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with here as (
    select extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography as point
  )
  select
    o.id,
    o.name,
    extensions.st_y(o.location::extensions.geometry),
    extensions.st_x(o.location::extensions.geometry),
    coalesce(sum(pl.quantity), 0),
    count(distinct pl.donor_id)
  from public.organizations o
  cross join here
  left join public.needs n on n.organization_id = o.id
  left join public.pledges pl
    on pl.need_id = n.id
   and pl.status = 'received'
   and pl.resolved_at >= now() - make_interval(days => greatest(days, 1))
  where o.status = 'approved'
    and extensions.st_dwithin(o.location, here.point, radius_m)
  group by o.id
  order by 5 desc;
$$;

revoke execute on function
  public.leaderboard_this_month(),
  public.community_heat(double precision, double precision, double precision, integer)
from public, anon, authenticated;

grant execute on function public.leaderboard_this_month() to authenticated;
grant execute on function
  public.community_heat(double precision, double precision, double precision, integer)
to anon, authenticated;
