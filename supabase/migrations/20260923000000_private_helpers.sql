-- Move the membership helpers out of the API-exposed public schema so they
-- aren't callable as /rest/v1/rpc endpoints (Supabase advisor lints 0028/0029).
--
-- Row level security policies reference functions by identity, so they keep
-- working after the move. Function bodies reference them by name, so
-- resolve_pledge is recreated to point at the new location.

create schema if not exists private;

-- Policies run as the calling role, which needs to be able to call these.
grant usage on schema private to anon, authenticated;

alter function public.is_org_member(uuid) set schema private;
alter function public.is_org_owner(uuid) set schema private;

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
    raise exception 'pledge not found' using errcode = 'no_data_found';
  end if;
end;
$$;
