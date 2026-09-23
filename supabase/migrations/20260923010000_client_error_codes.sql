-- Report "not found / can't do that" refusals from the pledge functions as
-- client errors. They used errcode no_data_found (P0002), which PostgREST
-- returns as HTTP 500; the default raise_exception code (P0001) is a 400.
-- Only the errcode changes; the logic is identical.

create or replace function public.reserve_pledge()
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
    raise exception 'need not found';
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

create or replace function public.cancel_pledge(pledge_id uuid)
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
    raise exception 'pledge not found or can no longer be cancelled';
  end if;
end;
$$;

create or replace function public.resolve_pledge(pledge_id uuid, outcome public.pledge_status)
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
    and private.is_org_member(n.organization_id);

  if not found then
    raise exception 'pledge not found';
  end if;
end;
$$;
