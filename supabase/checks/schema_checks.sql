-- Behavior checks for the core schema. Each line of output is PASS or FAIL.
-- Run with supabase/checks/run.sh.
\set ON_ERROR_STOP 1
-- helpers ------------------------------------------------------------------
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  if uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$
begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
-- expect a statement to be rejected
create or replace function pg_temp.rejects(label text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; raise notice 'FAIL % (was allowed)', label;
  exception when others then raise notice 'PASS % (%)', label, sqlerrm; end;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- users: donor A, donor B, staff S (owner of SoMa Harbor Shelter)
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'ana@example.com', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ben@example.com', '{}'),
  ('cccccccc-0000-4000-8000-000000000003', 'sam@example.com', '{"display_name":"Sam (staff)"}');
insert into public.organization_members values
  ('00000000-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000003', 'owner');
select pg_temp.ok('signup creates profiles with display names',
  (select string_agg(display_name, ',' order by display_name) from public.profiles) = 'Ana,ben,Sam (staff)');

-- anonymous browsing --------------------------------------------------------
select pg_temp.act_as(null);
select pg_temp.ok('anon sees 5 approved orgs, not the pending one', (select count(*) from public.organizations) = 5);
select pg_temp.ok('anon sees 8 needs, not the pending org''s', (select count(*) from public.needs) = 8);
select pg_temp.ok('needs_near from Mission & 16th returns open needs nearest first',
  (select organization_name from public.needs_near(37.7650, -122.4194) limit 1) = 'Mission Street Community Kitchen');
select pg_temp.ok('needs_near respects radius (1 km)',
  (select count(distinct organization_id) from public.needs_near(37.7650, -122.4194, 1000)) = 1);
select pg_temp.ok('needs_near filters by category',
  (select bool_and(category = 'clothing') from public.needs_near(37.7650, -122.4194, 20000, 'clothing')));
select pg_temp.rejects('anon cannot see profiles', 'select 1/(count(*)-count(*)) from public.profiles');
select pg_temp.rejects('anon cannot pledge',
  $$insert into public.pledges (need_id, quantity) select id, 1 from public.needs limit 1$$);
reset role;

-- pledging -------------------------------------------------------------------
create temp table ids as select
  (select id from public.needs where title like 'New socks%') as socks,
  (select id from public.needs where title = 'Granola bars') as granola;
grant select on ids to authenticated;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
insert into public.pledges (need_id, quantity) select socks, 30 from ids;
select pg_temp.ok('pledge lowers remaining quantity to 10',
  (select quantity_remaining from public.needs_near(37.78, -122.40, 20000) where title like 'New socks%') = 10);
select pg_temp.rejects('cannot over-pledge (15 > 10 left)',
  $$insert into public.pledges (need_id, quantity) select socks, 15 from ids$$);
select pg_temp.rejects('cannot pledge as someone else',
  $$insert into public.pledges (need_id, quantity, donor_id) select socks, 1, 'bbbbbbbb-0000-4000-8000-000000000002' from ids$$);
select pg_temp.rejects('cannot insert a pledge already marked received',
  $$insert into public.pledges (need_id, quantity, status) select socks, 1, 'received' from ids$$);
select pg_temp.rejects('cannot mark own pledge received by direct update',
  $$update public.pledges set status = 'received'$$);
select pg_temp.rejects('cannot pledge to the pending org''s need',
  $$insert into public.pledges (need_id, quantity) select granola, 1 from ids$$);
reset role;

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.ok('donor B cannot see donor A''s pledges', (select count(*) from public.pledges) = 0);
insert into public.pledges (need_id, quantity) select socks, 10 from ids;
select pg_temp.ok('need is full, so it drops out of needs_near',
  not exists (select 1 from public.needs_near(37.78, -122.40, 20000) where title like 'New socks%'));
select pg_temp.rejects('donor B cannot cancel donor A''s pledge',
  $$select public.cancel_pledge((select id from public.pledges where quantity = 30))$$);
select public.cancel_pledge((select id from public.pledges where donor_id = auth.uid()));
select pg_temp.ok('cancelling frees 10 socks again',
  (select quantity_remaining from public.needs_near(37.78, -122.40, 20000) where title like 'New socks%') = 10);
select pg_temp.rejects('donor cannot resolve pledges', $$select public.resolve_pledge(gen_random_uuid(), 'received')$$);
reset role;

-- staff ----------------------------------------------------------------------
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select pg_temp.ok('staff see both pledges on their need', (select count(*) from public.pledges) = 2);
select public.resolve_pledge((select id from public.pledges where quantity = 30), 'received');
select pg_temp.ok('staff can mark a pledge received',
  (select status from public.pledges where quantity = 30) = 'received');
select pg_temp.rejects('staff cannot lower the need below committed (30)',
  $$update public.needs set quantity_needed = 20 where id = (select socks from ids)$$);
update public.needs set quantity_needed = 50 where id = (select socks from ids);
select pg_temp.ok('staff can raise the need', (select quantity_needed from public.needs where id = (select socks from ids)) = 50);
update public.needs set title = 'hacked' where title = 'Fresh fruit';
reset role;
select pg_temp.ok('staff cannot edit another org''s need', not exists (select 1 from public.needs where title = 'hacked'));
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select pg_temp.rejects('staff cannot write quantity_committed',
  $$update public.needs set quantity_committed = 0 where id = (select socks from ids)$$);
select pg_temp.rejects('staff cannot approve their own org',
  $$update public.organizations set status = 'approved' where id = '00000000-0000-4000-8000-000000000006'$$);
insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at)
  values ('00000000-0000-4000-8000-000000000002', 'food', 'Sandwich bread', 20, now(), now() + interval '1 day');
select pg_temp.ok('staff can post a need for their org', exists (select 1 from public.needs where title = 'Sandwich bread'));
select pg_temp.rejects('staff cannot post for another org',
  $$insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at)
    values ('00000000-0000-4000-8000-000000000001', 'food', 'Bread', 5, now(), now() + interval '1 day')$$);
select public.resolve_pledge((select id from public.pledges where quantity = 30), 'no_show');
select pg_temp.ok('correcting received -> no_show frees the 30 again',
  (select quantity_committed from public.needs where id = (select socks from ids)) = 0);
reset role;

-- registering a new organization ---------------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
insert into public.organizations (name, address, location) values ('Ana''s Pantry', '1 Main St', 'POINT(-122.42 37.77)');
select pg_temp.ok('new org starts pending and creator becomes owner',
  (select o.status = 'pending' and m.role = 'owner' from public.organizations o
   join public.organization_members m on m.organization_id = o.id where o.name = 'Ana''s Pantry'));
select pg_temp.rejects('pending org cannot post needs',
  $$insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at)
    select id, 'food', 'Rice', 5, now(), now() + interval '1 day' from public.organizations where name = 'Ana''s Pantry'$$);
select pg_temp.rejects('cannot register an org as approved',
  $$insert into public.organizations (name, address, location, status) values ('Fake', '2 Main St', 'POINT(-122.42 37.77)', 'approved')$$);
reset role;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.ok('other users cannot see a pending org', not exists (select 1 from public.organizations where name = 'Ana''s Pantry'));
insert into public.follows (followee_id) values ('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.rejects('cannot follow on someone else''s behalf',
  $$insert into public.follows (follower_id, followee_id) values ('aaaaaaaa-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000003')$$);
select pg_temp.rejects('cannot follow yourself',
  $$insert into public.follows (followee_id) values ('bbbbbbbb-0000-4000-8000-000000000002')$$);
update public.profiles set display_name = 'Ben';
select pg_temp.ok('users can rename themselves, only themselves',
  (select string_agg(display_name, ',' order by display_name) from public.profiles) = 'Ana,Ben,Sam (staff)');
reset role;

-- API surface -----------------------------------------------------------------
select pg_temp.ok('membership helpers are not exposed in the public API schema',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('is_org_member', 'is_org_owner')));

-- Account deletion -------------------------------------------------------------
reset role;
insert into auth.users (id, email) values ('dddddddd-0000-4000-8000-000000000004', 'dee@example.com');
select pg_temp.act_as('dddddddd-0000-4000-8000-000000000004');
insert into public.pledges (need_id, quantity) select id, 7 from public.needs where title = 'Fresh fruit';
reset role;
select pg_temp.ok('pledge counts toward the need',
  (select quantity_committed from public.needs where title = 'Fresh fruit') = 7);
delete from auth.users where id = 'dddddddd-0000-4000-8000-000000000004';
select pg_temp.ok('deleting the donor''s account gives their pledge back to the need',
  (select quantity_committed from public.needs where title = 'Fresh fruit') = 0);
