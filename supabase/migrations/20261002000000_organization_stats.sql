-- Numbers for an organization's dashboard, for its staff only. A security
-- definer function so it can count followers (follows are private to each
-- follower) without exposing who they are.
--
-- Over the last `days` days:
--   items_received, dropoffs, donors   confirmed drop-offs (by when they were confirmed)
--   arrived, no_shows                  pledges resolved either way, for the arrival rate
--   needs_posted, needs_filled         needs whose drop-off window started in the period
--   categories                         per category, for those needs: asked for vs received
-- Right now:
--   expected_pledges, expected_items   pledges waiting to be dropped off
--   followers                          people following the organization
create function public.organization_stats(organization_id uuid, days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  org_id uuid := organization_id;
  since timestamptz := now() - make_interval(days => greatest(1, least(days, 3660)));
  result jsonb;
begin
  if not private.is_org_member(org_id) then
    raise exception 'only this organization''s staff can see its dashboard';
  end if;

  with org_pledges as (
    select p.*, n.category, n.dropoff_starts_at
    from public.pledges p
    join public.needs n on n.id = p.need_id
    where n.organization_id = org_id
  ),
  period_needs as (
    select n.*,
      coalesce((select sum(p.quantity) from public.pledges p
                where p.need_id = n.id and p.status = 'received'), 0) as received
    from public.needs n
    where n.organization_id = org_id and n.dropoff_starts_at >= since and n.dropoff_starts_at <= now()
  )
  select jsonb_build_object(
    'days', greatest(1, least(days, 3660)),
    'items_received', (select coalesce(sum(quantity), 0) from org_pledges
                       where status = 'received' and resolved_at >= since),
    'dropoffs', (select count(*) from org_pledges where status = 'received' and resolved_at >= since),
    'donors', (select count(distinct donor_id) from org_pledges where status = 'received' and resolved_at >= since),
    'arrived', (select count(*) from org_pledges where status = 'received' and resolved_at >= since),
    'no_shows', (select count(*) from org_pledges where status = 'no_show' and resolved_at >= since),
    'expected_pledges', (select count(*) from org_pledges where status = 'pledged'),
    'expected_items', (select coalesce(sum(quantity), 0) from org_pledges where status = 'pledged'),
    'followers', (select count(*) from public.organization_follows f where f.organization_id = org_id),
    'needs_posted', (select count(*) from period_needs where status <> 'cancelled'),
    'needs_filled', (select count(*) from period_needs where status <> 'cancelled' and received >= quantity_needed),
    'categories', coalesce((
      select jsonb_agg(c order by c.needed desc, c.category)
      from (
        select category, sum(quantity_needed) as needed, sum(least(received, quantity_needed)) as received,
               count(*) as needs
        from period_needs
        where status <> 'cancelled'
        group by category
      ) c
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.organization_stats(uuid, integer) from public, anon, authenticated;
grant execute on function public.organization_stats(uuid, integer) to authenticated;
