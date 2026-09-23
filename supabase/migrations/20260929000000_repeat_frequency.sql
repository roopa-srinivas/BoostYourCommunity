-- Repeat frequencies beyond weekly: every day, every week, every 2 weeks, or
-- every month on the same weekday of the month (e.g. the 2nd Tuesday).
-- Replaces needs.repeats_weekly with needs.repeat_frequency.

create type public.repeat_frequency as enum ('daily', 'weekly', 'biweekly', 'monthly');

alter table public.needs add column repeat_frequency public.repeat_frequency;
update public.needs set repeat_frequency = 'weekly' where repeats_weekly;

-- The series trigger watched repeats_weekly; watch repeat_frequency instead.
drop trigger needs_set_repeat_series on public.needs;

create or replace function public.set_repeat_series()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.repeat_frequency is not null and new.repeat_series is null then
    new.repeat_series := new.id;
  end if;
  return new;
end;
$$;

create trigger needs_set_repeat_series
  before insert or update of repeat_frequency on public.needs
  for each row execute function public.set_repeat_series();

alter table public.needs drop column repeats_weekly;

grant insert (repeat_frequency) on public.needs to authenticated;
grant update (repeat_frequency) on public.needs to authenticated;

create or replace function public.stop_repeating(need_id uuid)
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
  update public.needs set repeat_frequency = null
  where id = need_id or (n.repeat_series is not null and repeat_series = n.repeat_series);
end;
$$;

-- A local start time moved `steps` repeats later. Monthly keeps the weekday
-- and its position in the month (2nd Tuesday stays 2nd Tuesday); a 5th
-- weekday falls back to the month's last one.
create function private.shift_occurrence(local_start timestamp, frequency public.repeat_frequency, steps integer)
returns timestamp
language plpgsql
immutable
set search_path = ''
as $$
declare
  time_of_day interval := local_start - date_trunc('day', local_start);
  nth integer;
  target_month date;
  first_same_weekday date;
  candidate date;
begin
  if frequency = 'daily' then
    return local_start + make_interval(days => steps);
  elsif frequency = 'weekly' then
    return local_start + make_interval(weeks => steps);
  elsif frequency = 'biweekly' then
    return local_start + make_interval(weeks => 2 * steps);
  end if;

  nth := ceil(extract(day from local_start) / 7.0)::integer;
  target_month := (date_trunc('month', local_start) + make_interval(months => steps))::date;
  first_same_weekday := target_month
    + ((extract(dow from local_start)::integer - extract(dow from target_month)::integer + 7) % 7);
  candidate := first_same_weekday + (nth - 1) * 7;
  if extract(month from candidate) <> extract(month from target_month) then
    candidate := candidate - 7;
  end if;
  return candidate + time_of_day;
end;
$$;

grant execute on function private.shift_occurrence(timestamp, public.repeat_frequency, integer) to authenticated;

create or replace function public.post_next_repeating_needs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest record;
  tz text;
  steps integer;
  local_start timestamp;
  next_start timestamptz;
  next_end timestamptz;
  empty_limit integer;
  posted integer := 0;
begin
  for latest in
    select distinct on (n.repeat_series) n.*
    from public.needs n
    where n.repeat_series is not null
    order by n.repeat_series, n.dropoff_starts_at desc
  loop
    -- Only the latest occurrence decides, and only once its window is over.
    continue when latest.repeat_frequency is null
      or latest.status = 'cancelled'
      or latest.dropoff_ends_at > now();

    -- Stop after too many occurrences in a row with no pledges: a week of
    -- quiet days for daily needs, three occurrences otherwise.
    empty_limit := case when latest.repeat_frequency = 'daily' then 7 else 3 end;
    if (
      select count(*) = empty_limit and bool_and(pledged = 0)
      from (
        select (
          select count(*) from public.pledges p
          where p.need_id = w.id and p.status <> 'cancelled'
        ) as pledged
        from public.needs w
        where w.repeat_series = latest.repeat_series
        order by w.dropoff_starts_at desc
        limit empty_limit
      ) recent
    ) then
      update public.needs set repeat_frequency = null where repeat_series = latest.repeat_series;
      continue;
    end if;

    select o.timezone into tz from public.organizations o where o.id = latest.organization_id;
    local_start := latest.dropoff_starts_at at time zone tz;

    -- The first occurrence whose window is still to come, in local time.
    steps := 1;
    loop
      next_start := private.shift_occurrence(local_start, latest.repeat_frequency, steps) at time zone tz;
      next_end := next_start + (latest.dropoff_ends_at - latest.dropoff_starts_at);
      exit when next_end > now();
      steps := steps + 1;
    end loop;

    insert into public.needs (
      organization_id, category, title, details, quantity_needed, unit,
      dropoff_starts_at, dropoff_ends_at, created_by, repeat_frequency, repeat_series
    ) values (
      latest.organization_id, latest.category, latest.title, latest.details, latest.quantity_needed, latest.unit,
      next_start, next_end, latest.created_by, latest.repeat_frequency, latest.repeat_series
    );
    posted := posted + 1;
  end loop;
  return posted;
end;
$$;
