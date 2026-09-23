-- When a pledge row is deleted (e.g. its donor's account is deleted, which
-- cascades to their pledges), give its quantity back to the need. Without
-- this, needs.quantity_committed would stay inflated forever.

create function public.release_deleted_pledge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('pledged', 'received') then
    update public.needs
    set quantity_committed = greatest(quantity_committed - old.quantity, 0)
    where id = old.need_id;
  end if;
  return old;
end;
$$;

revoke execute on function public.release_deleted_pledge() from public, anon, authenticated;

create trigger pledges_release_on_delete
  after delete on public.pledges
  for each row execute function public.release_deleted_pledge();
