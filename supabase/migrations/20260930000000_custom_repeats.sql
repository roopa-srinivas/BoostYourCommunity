-- Fully customizable repeats, like a calendar's "custom" option:
--   every N days / weeks / months
--   weeks: on any set of weekdays (e.g. Monday and Thursday)
--   months: on the same date (the 15th) or weekday position (2nd Tuesday)
--   ends: never, after N times, or on a date
-- Replaces needs.repeat_frequency with a rule stored on each occurrence.

create type public.repeat_unit as enum ('day', 'week', 'month');
create type public.repeat_month_mode as enum ('date', 'weekday');

alter table public.needs
  add column repeat_unit public.repeat_unit,
  add column repeat_interval integer not null default 1 check (repeat_interval between 1 and 99),
  -- 0 = Sunday … 6 = Saturday; weekly rules only. Empty means the start's weekday.
  add column repeat_weekdays smallint[] check (repeat_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  add column repeat_month_mode public.repeat_month_mode,
  add column repeat_ends_after integer check (repeat_ends_after between 1 and 500),
  -- Last local date an occurrence may start on.
  add column repeat_until date,
  -- Where the rule counts from (local start of the occurrence the rule was set on).
  add column repeat_anchor timestamptz;

-- Carry over the fixed frequencies.
update public.needs set
  repeat_unit = case repeat_frequency when 'daily' then 'day'::public.repeat_unit
                                      when 'monthly' then 'month'::public.repeat_unit
                                      else 'week'::public.repeat_unit end,
  repeat_interval = case repeat_frequency when 'biweekly' then 2 else 1 end,
  repeat_month_mode = case when repeat_frequency = 'monthly' then 'weekday'::public.repeat_month_mode end,
  repeat_anchor = dropoff_starts_at
where repeat_frequency is not null;

drop trigger needs_set_repeat_series on public.needs;
alter table public.needs drop column repeat_frequency;
drop function private.shift_occurrence(timestamp, public.repeat_frequency, integer);
drop type public.repeat_frequency;

grant insert (repeat_unit, repeat_interval, repeat_weekdays, repeat_month_mode, repeat_ends_after, repeat_until)
  on public.needs to authenticated;
grant update (repeat_unit, repeat_interval, repeat_weekdays, repeat_month_mode, repeat_ends_after, repeat_until)
  on public.needs to authenticated;

-- Starting a repeat begins a series. Setting or changing the rule (or moving
-- the occurrence it's set on) makes that occurrence the rule's new anchor.
create or replace function public.set_repeat_series()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.repeat_unit is null then
    return new;
  end if;
  if new.repeat_series is null then
    new.repeat_series := new.id;
  end if;
  if tg_op = 'INSERT' then
    new.repeat_anchor := coalesce(new.repeat_anchor, new.dropoff_starts_at);
  elsif (new.repeat_unit, new.repeat_interval, new.repeat_weekdays, new.repeat_month_mode, new.dropoff_starts_at)
        is distinct from
        (old.repeat_unit, old.repeat_interval, old.repeat_weekdays, old.repeat_month_mode, old.dropoff_starts_at) then
    new.repeat_anchor := new.dropoff_starts_at;
  end if;
  return new;
end;
$$;

create trigger needs_set_repeat_series
  before insert or update on public.needs
  for each row execute function public.set_repeat_series();

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
  update public.needs set repeat_unit = null
  where id = need_id or (n.repeat_series is not null and repeat_series = n.repeat_series);
end;
$$;

-- The first time the rule produces that starts strictly after `after`, all in
-- local (wall-clock) time. Every occurrence keeps the anchor's time of day.
create function private.next_occurrence(
  anchor timestamp,
  after timestamp,
  unit public.repeat_unit,
  every integer,
  weekdays smallint[],
  month_mode public.repeat_month_mode
)
returns timestamp
language plpgsql
immutable
set search_path = ''
as $$
declare
  time_of_day interval := anchor - date_trunc('day', anchor);
  anchor_day date := anchor::date;
  step integer;
  candidate timestamp;
  week_start date;
  days smallint[];
  d smallint;
  month_start date;
  nth integer;
  first_same_weekday date;
  day_in_month date;
begin
  if unit = 'day' then
    -- Jump close, then step to the first one past `after`.
    step := greatest(0, floor((after::date - anchor_day) / every::numeric)::integer - 1);
    loop
      candidate := anchor + make_interval(days => step * every);
      exit when candidate > after;
      step := step + 1;
    end loop;
    return candidate;
  end if;

  if unit = 'week' then
    select array_agg(x order by x) into days
    from unnest(coalesce(nullif(weekdays, '{}'), array[extract(dow from anchor)::smallint])) x;
    week_start := anchor_day - extract(dow from anchor)::integer;
    -- Only every `every`-th week (counting from the anchor's week) is on.
    step := greatest(0, floor((after::date - week_start) / 7.0 / every)::integer - 1) * every;
    for attempt in 1..1000 loop
      foreach d in array days loop
        candidate := (week_start + step * 7 + d) + time_of_day;
        if candidate > after and candidate >= anchor then
          return candidate;
        end if;
      end loop;
      step := step + every;
    end loop;
    raise exception 'no next occurrence found';
  end if;

  -- Months: same date (clamped to the month's last day), or the same
  -- weekday position (a 5th weekday becomes the month's last).
  nth := ceil(extract(day from anchor) / 7.0)::integer;
  step := greatest(
    0,
    ((extract(year from after) - extract(year from anchor)) * 12
      + extract(month from after) - extract(month from anchor))::integer / every - 1
  ) * every;
  for attempt in 1..1000 loop
    month_start := (date_trunc('month', anchor) + make_interval(months => step))::date;
    if month_mode = 'date' then
      day_in_month := least(
        month_start + (extract(day from anchor)::integer - 1),
        (month_start + interval '1 month' - interval '1 day')::date
      );
    else
      first_same_weekday := month_start
        + ((extract(dow from anchor)::integer - extract(dow from month_start)::integer + 7) % 7);
      day_in_month := first_same_weekday + (nth - 1) * 7;
      if extract(month from day_in_month) <> extract(month from month_start) then
        day_in_month := day_in_month - 7;
      end if;
    end if;
    candidate := day_in_month + time_of_day;
    if candidate > after and candidate >= anchor then
      return candidate;
    end if;
    step := step + every;
  end loop;
  raise exception 'no next occurrence found';
end;
$$;

grant execute on function
  private.next_occurrence(timestamp, timestamp, public.repeat_unit, integer, smallint[], public.repeat_month_mode)
to authenticated;

-- Posts the next occurrence of every repeating need whose latest window has
-- ended, following its rule and end condition. Returns how many were posted.
create or replace function public.post_next_repeating_needs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest record;
  tz text;
  after_local timestamp;
  next_local timestamp;
  next_start timestamptz;
  next_end timestamptz;
  empty_limit integer;
  finished boolean;
  posted integer := 0;
begin
  for latest in
    select distinct on (n.repeat_series) n.*
    from public.needs n
    where n.repeat_series is not null
    order by n.repeat_series, n.dropoff_starts_at desc
  loop
    continue when latest.repeat_unit is null
      or latest.status = 'cancelled'
      or latest.dropoff_ends_at > now();

    -- Stop after too many occurrences in a row with no pledges: a week of
    -- quiet days for every-day needs, three occurrences otherwise.
    empty_limit := case when latest.repeat_unit = 'day' and latest.repeat_interval = 1 then 7 else 3 end;
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
      update public.needs set repeat_unit = null where repeat_series = latest.repeat_series;
      continue;
    end if;

    select o.timezone into tz from public.organizations o where o.id = latest.organization_id;

    -- The next occurrence whose window is still to come (skipping any that
    -- were missed), unless the rule has ended.
    finished := latest.repeat_ends_after is not null
      and (select count(*) from public.needs w where w.repeat_series = latest.repeat_series) >= latest.repeat_ends_after;
    after_local := latest.dropoff_starts_at at time zone tz;
    while not finished loop
      next_local := private.next_occurrence(
        latest.repeat_anchor at time zone tz, after_local,
        latest.repeat_unit, latest.repeat_interval, latest.repeat_weekdays, latest.repeat_month_mode
      );
      if latest.repeat_until is not null and next_local::date > latest.repeat_until then
        finished := true;
        exit;
      end if;
      next_start := next_local at time zone tz;
      next_end := next_start + (latest.dropoff_ends_at - latest.dropoff_starts_at);
      exit when next_end > now();
      after_local := next_local;
    end loop;

    if finished then
      update public.needs set repeat_unit = null where repeat_series = latest.repeat_series;
      continue;
    end if;

    insert into public.needs (
      organization_id, category, title, details, quantity_needed, unit, dropoff_starts_at, dropoff_ends_at,
      created_by, repeat_series, repeat_anchor, repeat_unit, repeat_interval, repeat_weekdays,
      repeat_month_mode, repeat_ends_after, repeat_until
    ) values (
      latest.organization_id, latest.category, latest.title, latest.details, latest.quantity_needed, latest.unit,
      next_start, next_end, latest.created_by, latest.repeat_series, latest.repeat_anchor, latest.repeat_unit,
      latest.repeat_interval, latest.repeat_weekdays, latest.repeat_month_mode, latest.repeat_ends_after,
      latest.repeat_until
    );
    posted := posted + 1;
  end loop;
  return posted;
end;
$$;
