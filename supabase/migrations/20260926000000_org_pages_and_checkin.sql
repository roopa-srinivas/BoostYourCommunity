-- Organization pages and drop-off check-in codes.

-- ---------------------------------------------------------------------------
-- Organization pages: hours and what they do and don't accept
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column hours text check (char_length(hours) <= 300),
  add column accepts text check (char_length(accepts) <= 500),
  add column does_not_accept text check (char_length(does_not_accept) <= 500);

grant insert (hours, accepts, does_not_accept) on public.organizations to authenticated;
grant update (hours, accepts, does_not_accept) on public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- Check-in codes
-- ---------------------------------------------------------------------------

-- Six characters from an alphabet without look-alikes (no 0/O, 1/I/L), so a
-- donor can read it out at a busy front desk. Not a secret: it only helps
-- staff find a pledge they can already see.
create function public.new_checkin_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6);
$$;

revoke execute on function public.new_checkin_code() from public, anon;
-- Column defaults run as the inserting user, so donors need to be able to call it.
grant execute on function public.new_checkin_code() to authenticated;

-- The default runs per row, so existing pledges each get their own code.
alter table public.pledges
  add column checkin_code text not null default public.new_checkin_code()
    check (checkin_code ~ '^[A-HJ-KM-NP-Z2-9]{6}$');

-- Codes only need to be unique among pledges still waiting for drop-off.
create unique index pledges_checkin_code_pending_idx on public.pledges (checkin_code) where status = 'pledged';

-- Clients can't choose their own code: the pledge insert grant stays
-- (need_id, quantity), so checkin_code always comes from the default.
