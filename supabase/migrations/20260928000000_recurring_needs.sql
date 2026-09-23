-- Weekly repeating needs.
--
-- A repeating need is one row per week. All weeks share repeat_series (the
-- first week's id). When the latest week's drop-off window ends, an hourly
-- job posts the next week as a copy of it, at the same local day and time in
-- the organization's time zone. Weeks with no pledges three times in a row
-- stop the series, so a forgotten need doesn't keep reappearing.

-- Organizations are in San Francisco for now; the time zone keeps weekly
-- copies at the same local time across daylight saving changes.
alter table public.organizations
  add column timezone text not null default 'America/Los_Angeles';

alter table public.needs
  add column repeats_weekly boolean not null default false,
  add column repeat_series uuid;

create index needs_repeat_series_idx on public.needs (repeat_series) where repeat_series is not null;

grant insert (repeats_weekly) on public.needs to authenticated;
grant update (repeats_weekly) on public.needs to authenticated;

-- A need that starts repeating begins its own series.
create function public.set_repeat_series()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.repeats_weekly and new.repeat_series is null then
    new.repeat_series := new.id;
  end if;
  return new;
end;
$$;

create trigger needs_set_repeat_series
  before insert or update of repeats_weekly on public.needs
  for each row execute function public.set_repeat_series();

-- Clients can't write repeat_series directly (no column grant); keep the
-- series id stable once set.
create function public.keep_repeat_series()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.repeat_series is not null then
    new.repeat_series := old.repeat_series;
  end if;
  return new;
end;
$$;

create trigger needs_keep_repeat_series
  before update on public.needs
  for each row execute function public.keep_repeat_series();

-- Stop a series: no more weeks after the current one. Members only.
create function public.stop_repeating(need_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.needs%rowtype;
begin
  select * into n from public.needs where id = need_id;
  if not found or not private.is_org_member(n.organization_id) then
    raise exception 'need not found';
  end if;
  update public.needs set repeats_weekly = false
  where id = need_id or (n.repeat_series is not null and repeat_series = n.repeat_series);
end;
$$;

revoke execute on function public.stop_repeating(uuid) from public, anon;
grant execute on function public.stop_repeating(uuid) to authenticated;

-- Posts next week's copy of every repeating need whose window has ended.
-- Returns how many were posted. Run hourly.
create function public.post_next_repeating_needs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest record;
  tz text;
  week_count integer;
  next_start timestamptz;
  next_end timestamptz;
  posted integer := 0;
begin
  for latest in
    select distinct on (n.repeat_series) n.*
    from public.needs n
    where n.repeat_series is not null
    order by n.repeat_series, n.dropoff_starts_at desc
  loop
    -- Only the latest week decides, and only once its window is over.
    continue when not latest.repeats_weekly
      or latest.status = 'cancelled'
      or latest.dropoff_ends_at > now();

    -- Three finished weeks in a row with no pledges: stop the series.
    if (
      select count(*) = 3 and bool_and(pledged = 0)
      from (
        select (
          select count(*) from public.pledges p
          where p.need_id = w.id and p.status <> 'cancelled'
        ) as pledged
        from public.needs w
        where w.repeat_series = latest.repeat_series
        order by w.dropoff_starts_at desc
        limit 3
      ) recent
    ) then
      update public.needs set repeats_weekly = false where repeat_series = latest.repeat_series;
      continue;
    end if;

    select o.timezone into tz from public.organizations o where o.id = latest.organization_id;

    -- Same local day and time, whole weeks later, first week still to come.
    week_count := 1;
    loop
      next_start := ((latest.dropoff_starts_at at time zone tz) + make_interval(weeks => week_count)) at time zone tz;
      next_end := ((latest.dropoff_ends_at at time zone tz) + make_interval(weeks => week_count)) at time zone tz;
      exit when next_end > now();
      week_count := week_count + 1;
    end loop;

    insert into public.needs (
      organization_id, category, title, details, quantity_needed, unit,
      dropoff_starts_at, dropoff_ends_at, created_by, repeats_weekly, repeat_series
    ) values (
      latest.organization_id, latest.category, latest.title, latest.details, latest.quantity_needed, latest.unit,
      next_start, next_end, latest.created_by, true, latest.repeat_series
    );
    posted := posted + 1;
  end loop;
  return posted;
end;
$$;

revoke execute on function public.post_next_repeating_needs() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    execute $cron$ select cron.schedule('post-next-repeating-needs', '23 * * * *', 'select public.post_next_repeating_needs()') $cron$;
  end if;
end;
$$;
