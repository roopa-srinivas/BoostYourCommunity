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

-- Community: leaderboard and heat map -------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-4000-8000-000000000005', 'eve@example.com', '{"display_name":"Eve"}'),
  ('ffffffff-0000-4000-8000-000000000006', 'fay@example.com', '{"display_name":"Fay"}');
select pg_temp.act_as('eeeeeeee-0000-4000-8000-000000000005');
insert into public.pledges (need_id, quantity) select socks, 5 from ids;
insert into public.pledges (need_id, quantity) select socks, 2 from ids;
reset role;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select public.resolve_pledge((select id from public.pledges where donor_id = 'eeeeeeee-0000-4000-8000-000000000005' and quantity = 5), 'received');
reset role;
select pg_temp.act_as('ffffffff-0000-4000-8000-000000000006');
insert into public.follows (followee_id) values ('eeeeeeee-0000-4000-8000-000000000005');
select pg_temp.ok('leaderboard shows me and the people I follow, nobody else',
  (select string_agg(display_name || '=' || items_given, ',' order by items_given desc, display_name)
   from public.leaderboard_this_month()) = 'Eve=5,Fay=0');
select pg_temp.ok('only confirmed items count (Eve''s unconfirmed 2 are left out)',
  (select items_given from public.leaderboard_this_month() where display_name = 'Eve') = 5);
select pg_temp.ok('leaderboard marks my own row',
  (select bool_and(is_me = (display_name = 'Fay')) from public.leaderboard_this_month()));
reset role;
select pg_temp.act_as('eeeeeeee-0000-4000-8000-000000000005');
select pg_temp.ok('someone who follows nobody sees only themselves',
  (select count(*) from public.leaderboard_this_month()) = 1);
reset role;
select pg_temp.act_as(null);
select pg_temp.rejects('signed-out visitors cannot see the leaderboard', 'select * from public.leaderboard_this_month()');
select pg_temp.ok('heat map totals confirmed items per organization',
  (select items_received = 5 and donors = 1 from public.community_heat(37.7854, -122.3968, 20000)
   where organization_name = 'SoMa Harbor Shelter'));
select pg_temp.ok('heat map leaves out pending organizations',
  not exists (select 1 from public.community_heat(37.77, -122.44, 20000) where organization_name = 'Haight Street Outreach'));
reset role;
-- Hiding from leaderboards: Fay follows Eve, who has 5 confirmed this month.
select pg_temp.act_as('eeeeeeee-0000-4000-8000-000000000005');
update public.profiles set hide_from_leaderboard = true where id = auth.uid();
select pg_temp.ok('hiding still shows me my own total',
  (select items_given from public.leaderboard_this_month() where is_me) = 5);
reset role;
select pg_temp.act_as('ffffffff-0000-4000-8000-000000000006');
select pg_temp.ok('followers no longer see a hidden total',
  (select string_agg(display_name, ',') from public.leaderboard_this_month()) = 'Fay');
update public.profiles set hide_from_leaderboard = false where id = 'eeeeeeee-0000-4000-8000-000000000005';
reset role;
select pg_temp.ok('nobody can unhide someone else',
  (select hide_from_leaderboard from public.profiles where id = 'eeeeeeee-0000-4000-8000-000000000005'));
select pg_temp.act_as('eeeeeeee-0000-4000-8000-000000000005');
update public.profiles set hide_from_leaderboard = false where id = auth.uid();
reset role;
select pg_temp.act_as('ffffffff-0000-4000-8000-000000000006');
select pg_temp.ok('showing it again puts it back on followers'' leaderboards',
  (select items_given from public.leaderboard_this_month() where display_name = 'Eve') = 5);
reset role;
-- Backdate Eve's confirmation to 40 days ago: outside the 30-day heat window
-- and outside this month's leaderboard.
update public.pledges set resolved_at = now() - interval '40 days'
where donor_id = 'eeeeeeee-0000-4000-8000-000000000005' and status = 'received';
select pg_temp.act_as('ffffffff-0000-4000-8000-000000000006');
select pg_temp.ok('heat map ignores confirmations older than the window',
  (select items_received from public.community_heat(37.7854, -122.3968, 20000, 30)
   where organization_name = 'SoMa Harbor Shelter') = 0
  and (select items_received from public.community_heat(37.7854, -122.3968, 20000, 60)
   where organization_name = 'SoMa Harbor Shelter') = 5);
select pg_temp.ok('leaderboard ignores confirmations from earlier months',
  (select items_given from public.leaderboard_this_month() where display_name = 'Eve') = 0);
reset role;

-- Admins -------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-4000-8000-000000000007', 'ada@example.com', '{"display_name":"Ada Admin"}');
insert into public.admins (user_id) values ('11111111-0000-4000-8000-000000000007');
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select pg_temp.rejects('non-admins cannot approve organizations',
  $$select public.set_organization_status('00000000-0000-4000-8000-000000000006', 'approved')$$);
select pg_temp.ok('non-admins cannot see who is an admin', (select count(*) from public.admins) = 0);
reset role;
select pg_temp.act_as('11111111-0000-4000-8000-000000000007');
select pg_temp.ok('admins see pending organizations',
  exists (select 1 from public.organizations where status = 'pending'));
select pg_temp.ok('admins can see that they are admins', (select count(*) from public.admins) = 1);
select public.set_organization_status('00000000-0000-4000-8000-000000000006', 'approved');
select pg_temp.ok('admins can approve an organization',
  (select status from public.organizations where id = '00000000-0000-4000-8000-000000000006') = 'approved');
select public.set_organization_status('00000000-0000-4000-8000-000000000006', 'pending');
reset role;
select pg_temp.act_as(null);
select pg_temp.rejects('signed-out visitors cannot change statuses',
  $$select public.set_organization_status('00000000-0000-4000-8000-000000000006', 'approved')$$);
reset role;

-- Account deletion ----------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('22222222-0000-4000-8000-000000000008', 'gus@example.com', '{"display_name":"Gus"}');
select pg_temp.act_as('22222222-0000-4000-8000-000000000008');
insert into public.organizations (name, address, location) values ('Gus Pantry', '9 Main St', 'POINT(-122.42 37.77)');
insert into public.pledges (need_id, quantity) select id, 6 from public.needs where title = 'Travel-size toiletries';
reset role;
update public.organizations set status = 'approved' where name = 'Gus Pantry';
select pg_temp.ok('pledge counts before deletion',
  (select quantity_committed from public.needs where title = 'Travel-size toiletries') = 6);
select pg_temp.act_as('22222222-0000-4000-8000-000000000008');
select public.delete_my_account();
reset role;
select pg_temp.ok('the account and profile are gone',
  not exists (select 1 from auth.users where email = 'gus@example.com')
  and not exists (select 1 from public.profiles where display_name = 'Gus'));
select pg_temp.ok('their pledge is released back to the need',
  (select quantity_committed from public.needs where title = 'Travel-size toiletries') = 0);
select pg_temp.ok('an organization left with no members is suspended, not deleted',
  (select status from public.organizations where name = 'Gus Pantry') = 'suspended');
select pg_temp.ok('organizations with other members are untouched',
  (select status from public.organizations where id = '00000000-0000-4000-8000-000000000002') = 'approved');
select pg_temp.act_as(null);
select pg_temp.rejects('signed-out visitors cannot delete accounts', 'select public.delete_my_account()');
reset role;

-- Expiring stale pledges -------------------------------------------------------------
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
insert into public.pledges (need_id, quantity) select id, 3 from public.needs where title = 'Kids'' winter coats';
insert into public.pledges (need_id, quantity) select id, 2 from public.needs where title = 'Warm jackets';
reset role;
-- Coats' window closed two days ago (past the grace period); jackets' closed an hour ago (within it).
update public.needs set dropoff_starts_at = now() - interval '3 days', dropoff_ends_at = now() - interval '2 days'
  where title = 'Kids'' winter coats';
update public.needs set dropoff_starts_at = now() - interval '5 hours', dropoff_ends_at = now() - interval '1 hour'
  where title = 'Warm jackets';
select pg_temp.ok('expiry marks exactly the pledge past the grace period', public.expire_stale_pledges() = 1);
select pg_temp.ok('the expired pledge is not dropped off, with no one recorded as deciding',
  (select p.status = 'no_show' and p.resolved_by is null from public.pledges p join public.needs n on n.id = p.need_id
   where n.title = 'Kids'' winter coats'));
select pg_temp.ok('expiring releases the quantity',
  (select quantity_committed from public.needs where title = 'Kids'' winter coats') = 0);
select pg_temp.ok('a pledge within the grace period stays pledged',
  (select p.status from public.pledges p join public.needs n on n.id = p.need_id where n.title = 'Warm jackets') = 'pledged');
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.rejects('users cannot run expiry themselves', 'select public.expire_stale_pledges()');
reset role;

-- Organization pages ------------------------------------------------------------------
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
update public.organizations set hours = 'weekdays 9–5', accepts = 'new socks', does_not_accept = 'used clothing'
  where id = '00000000-0000-4000-8000-000000000002';
reset role;
select pg_temp.ok('owners can set hours and what they accept',
  (select accepts = 'new socks' and does_not_accept = 'used clothing' from public.organizations
   where id = '00000000-0000-4000-8000-000000000002'));
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
update public.organizations set accepts = 'hacked' where id = '00000000-0000-4000-8000-000000000002';
reset role;
select pg_temp.ok('non-members cannot edit an organization''s page',
  (select accepts from public.organizations where id = '00000000-0000-4000-8000-000000000002') = 'new socks');
select pg_temp.act_as(null);
select pg_temp.ok('organization pages are public',
  (select hours from public.organizations where id = '00000000-0000-4000-8000-000000000002') = 'weekdays 9–5');
reset role;

-- Check-in codes -------------------------------------------------------------------------
select pg_temp.ok('existing pledges got check-in codes',
  not exists (select 1 from public.pledges where checkin_code !~ '^[A-HJ-KM-NP-Z2-9]{6}$'));
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
insert into public.pledges (need_id, quantity) select id, 1 from public.needs where title = 'Travel-size toiletries';
select pg_temp.ok('new pledges get a readable six-character code',
  (select checkin_code ~ '^[A-HJ-KM-NP-Z2-9]{6}$' from public.pledges p join public.needs n on n.id = p.need_id
   where n.title = 'Travel-size toiletries' and p.status = 'pledged'));
select pg_temp.rejects('donors cannot choose their own code',
  $$insert into public.pledges (need_id, quantity, checkin_code) select id, 1, 'AAAAAA' from public.needs where title = 'Travel-size toiletries'$$);
reset role;
create temp table toiletries_code as
  select p.checkin_code as code from public.pledges p join public.needs n on n.id = p.need_id
  where n.title = 'Travel-size toiletries' and p.status = 'pledged';
grant select on toiletries_code to authenticated;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select pg_temp.ok('staff can find a pledge to their organization by its code',
  (select count(*) from public.pledges where checkin_code = (select code from toiletries_code)) = 1);
reset role;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.ok('other users cannot find a pledge by its code',
  (select count(*) from public.pledges where checkin_code = (select code from toiletries_code)) = 0);
reset role;
select pg_temp.ok('codes are unique among pledges waiting for drop-off',
  (select count(*) = count(distinct checkin_code) from public.pledges where status = 'pledged'));
select pg_temp.rejects('two pending pledges cannot share a code',
  $$update public.pledges set checkin_code = (select code from toiletries_code)
    where status = 'pledged' and checkin_code <> (select code from toiletries_code)$$);

-- Staff invites -------------------------------------------------------------------------------
-- Sam owns SoMa Harbor Shelter (org 2). Hal is a new user who'll be invited.
insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-0000-4000-8000-000000000009', 'hal@example.com', '{"display_name":"Hal"}');
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
create temp table invite as select public.create_staff_invite('00000000-0000-4000-8000-000000000002') as code;
select pg_temp.ok('owners can create an invite with a readable code',
  (select code ~ '^[A-HJ-KM-NP-Z2-9]{6}$' from invite));
select pg_temp.ok('owners can see their invites', (select count(*) from public.organization_invites) >= 1);
select pg_temp.rejects('owners can no longer add staff directly',
  $$insert into public.organization_members (organization_id, user_id) values ('00000000-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000009')$$);
reset role;
grant select on invite to authenticated;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.rejects('non-owners cannot create invites',
  $$select public.create_staff_invite('00000000-0000-4000-8000-000000000002')$$);
select pg_temp.ok('non-owners cannot see invites', (select count(*) from public.organization_invites) = 0);
reset role;
select pg_temp.act_as('33333333-0000-4000-8000-000000000009');
select pg_temp.rejects('a made-up code does not work', $$select public.join_organization('ABCDEF')$$);
select pg_temp.ok('joining with a valid code (typed lowercase with a space) makes you staff',
  public.join_organization((select lower(substr(code, 1, 3)) || ' ' || lower(substr(code, 4)) from invite))
  = '00000000-0000-4000-8000-000000000002');
select pg_temp.ok('the new member is staff, not owner',
  (select role from public.organization_members where user_id = '33333333-0000-4000-8000-000000000009') = 'staff');
reset role;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.rejects('an invite works only once', $$select public.join_organization((select code from invite))$$);
reset role;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
create temp table invite2 as select public.create_staff_invite('00000000-0000-4000-8000-000000000002') as code;
reset role;
grant select on invite2 to authenticated;
select pg_temp.act_as('33333333-0000-4000-8000-000000000009');
select pg_temp.rejects('you cannot join an organization twice', $$select public.join_organization((select code from invite2))$$);
reset role;
update public.organization_invites set expires_at = now() - interval '1 minute' where code = (select code from invite2);
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.rejects('an expired invite does not work', $$select public.join_organization((select code from invite2))$$);
reset role;
select pg_temp.act_as('33333333-0000-4000-8000-000000000009');
delete from public.organization_members where user_id = '33333333-0000-4000-8000-000000000009';
select pg_temp.ok('staff can leave an organization',
  not exists (select 1 from public.organization_members where user_id = '33333333-0000-4000-8000-000000000009'));
reset role;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
create temp table invite3 as select public.create_staff_invite('00000000-0000-4000-8000-000000000002') as code;
reset role;
grant select on invite3 to authenticated;
select pg_temp.act_as('33333333-0000-4000-8000-000000000009');
select public.join_organization((select code from invite3));
reset role;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
delete from public.organization_members where user_id = '33333333-0000-4000-8000-000000000009';
reset role;
select pg_temp.ok('non-members cannot remove staff',
  exists (select 1 from public.organization_members where user_id = '33333333-0000-4000-8000-000000000009'));
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
delete from public.organization_members where user_id = '33333333-0000-4000-8000-000000000009';
delete from public.organization_members where user_id = 'cccccccc-0000-4000-8000-000000000003';
reset role;
select pg_temp.ok('owners can remove staff',
  not exists (select 1 from public.organization_members where user_id = '33333333-0000-4000-8000-000000000009'));
select pg_temp.ok('owners cannot remove themselves (an organization always keeps its owner)',
  exists (select 1 from public.organization_members where user_id = 'cccccccc-0000-4000-8000-000000000003'));

-- Repeating needs ------------------------------------------------------------------------------
-- Sam is owner (staff) at SoMa Harbor Shelter (org 2).
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
-- Last week's bread pickup, 6–9 pm Pacific, repeating weekly.
insert into public.needs (organization_id, category, title, quantity_needed, unit, dropoff_starts_at, dropoff_ends_at, repeat_unit)
values ('00000000-0000-4000-8000-000000000002', 'food', 'Bread pickup', 30, 'loaves',
        (date_trunc('day', now() at time zone 'America/Los_Angeles') - interval '6 days' + interval '18 hours') at time zone 'America/Los_Angeles',
        (date_trunc('day', now() at time zone 'America/Los_Angeles') - interval '6 days' + interval '21 hours') at time zone 'America/Los_Angeles',
        'week');
reset role;
select pg_temp.ok('a repeating need starts its own series, anchored on itself',
  (select repeat_series = id and repeat_anchor = dropoff_starts_at from public.needs where title = 'Bread pickup'));
select pg_temp.ok('the job posts the next one once the window has ended', public.post_next_repeating_needs() = 1);
select pg_temp.ok('weekly: exactly one week later, same local time',
  (select count(*) = 2
      and max(dropoff_starts_at) - min(dropoff_starts_at) = interval '7 days'
      and bool_and(extract(hour from dropoff_starts_at at time zone 'America/Los_Angeles') = 18)
   from public.needs where title = 'Bread pickup'));
select pg_temp.ok('the copy keeps the details, the rule and the series',
  (select count(distinct repeat_series) = 1 and count(distinct repeat_anchor) = 1
      and bool_and(quantity_needed = 30 and repeat_unit = 'week' and repeat_interval = 1)
   from public.needs where title = 'Bread pickup'));
select pg_temp.ok('running again posts nothing (the next one is still to come)', public.post_next_repeating_needs() = 0);

-- A winter series (standard time) carried into summer keeps 6 pm local, not 7 pm.
insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at, repeat_unit)
values ('00000000-0000-4000-8000-000000000002', 'food', 'Winter soup', 10, '2026-01-15 18:00-08', '2026-01-15 20:00-08', 'week');
select public.post_next_repeating_needs();
select pg_temp.ok('repeats keep local time across daylight saving changes',
  (select extract(hour from max(dropoff_starts_at) at time zone 'America/Los_Angeles') = 18 and max(dropoff_starts_at) > now()
   from public.needs where title = 'Winter soup'));

insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at, repeat_unit, status)
values ('00000000-0000-4000-8000-000000000002', 'food', 'Cancelled repeat', 5, now() - interval '3 days', now() - interval '2 days', 'week', 'cancelled');
select public.post_next_repeating_needs();
select pg_temp.ok('cancelled needs do not repeat', (select count(*) from public.needs where title = 'Cancelled repeat') = 1);

-- Three finished weeks in a row with no pledges stop the series.
insert into public.needs (id, organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at, repeat_unit)
values ('44444444-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'water', 'Ignored water', 5,
        now() - interval '15 days', now() - interval '15 days' + interval '2 hours', 'week');
insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at, repeat_unit, repeat_series)
select '00000000-0000-4000-8000-000000000002', 'water', 'Ignored water', 5, now() - interval '15 days' + (w || ' weeks')::interval,
       now() - interval '15 days' + (w || ' weeks')::interval + interval '2 hours', 'week', '44444444-0000-4000-8000-000000000001'
from generate_series(1, 2) w;
select public.post_next_repeating_needs();
select pg_temp.ok('three in a row without pledges stop the series',
  (select count(*) = 3 and bool_and(repeat_unit is null) from public.needs where title = 'Ignored water'));

select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.rejects('non-members cannot stop a series',
  $$select public.stop_repeating((select id from public.needs where title = 'Bread pickup' order by dropoff_starts_at desc limit 1))$$);
update public.needs set repeat_unit = 'week' where title = 'Fresh fruit';
reset role;
select pg_temp.ok('non-members cannot turn repeating on', (select repeat_unit is null from public.needs where title = 'Fresh fruit'));
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select public.stop_repeating((select id from public.needs where title = 'Bread pickup' order by dropoff_starts_at desc limit 1));
reset role;
select pg_temp.ok('members can stop a series (all of it)',
  (select bool_and(repeat_unit is null) from public.needs where title = 'Bread pickup'));

-- Custom rules: the next date after a given time ---------------------------------------------
create or replace function pg_temp.nxt(anchor timestamp, after timestamp, unit public.repeat_unit, every integer,
  weekdays smallint[] default null, mode public.repeat_month_mode default null) returns timestamp
language sql as $$ select private.next_occurrence(anchor, after, unit, every, weekdays, mode) $$;
select pg_temp.ok('every day: the next day, same time',
  pg_temp.nxt('2026-09-23 17:00', '2026-09-23 17:00', 'day', 1) = '2026-09-24 17:00');
select pg_temp.ok('every 3 days: sep 1 → 4 → 7',
  pg_temp.nxt('2026-09-01 08:00', '2026-09-05 12:00', 'day', 3) = '2026-09-07 08:00');
select pg_temp.ok('every 2 weeks: 14 days later',
  pg_temp.nxt('2026-09-23 17:00', '2026-09-23 17:00', 'week', 2) = '2026-10-07 17:00');
select pg_temp.ok('every 2 weeks on mon and thu: mon sep 7 → thu sep 10',
  pg_temp.nxt('2026-09-07 17:00', '2026-09-07 17:00', 'week', 2, '{1,4}') = '2026-09-10 17:00');
select pg_temp.ok('every 2 weeks on mon and thu: thu sep 10 → mon sep 21 (skips the off week)',
  pg_temp.nxt('2026-09-07 17:00', '2026-09-10 17:00', 'week', 2, '{1,4}') = '2026-09-21 17:00');
select pg_temp.ok('every 2 weeks on mon and thu: mon sep 21 → thu sep 24',
  pg_temp.nxt('2026-09-07 17:00', '2026-09-21 17:00', 'week', 2, '{4,1}') = '2026-09-24 17:00');
select pg_temp.ok('weekly on mondays, set on a wednesday: never before the start (→ mon sep 14)',
  pg_temp.nxt('2026-09-09 10:00', '2026-09-09 10:00', 'week', 1, '{1}') = '2026-09-14 10:00');
select pg_temp.ok('monthly on the 2nd tuesday: sep 8 → oct 13',
  pg_temp.nxt('2026-09-08 18:00', '2026-09-08 18:00', 'month', 1, null, 'weekday') = '2026-10-13 18:00');
select pg_temp.ok('monthly on a 5th tuesday → the next month''s last tuesday',
  pg_temp.nxt('2026-09-29 18:00', '2026-09-29 18:00', 'month', 1, null, 'weekday') = '2026-10-27 18:00');
select pg_temp.ok('monthly on the 1st friday across the year boundary',
  pg_temp.nxt('2026-12-04 10:00', '2026-12-04 10:00', 'month', 1, null, 'weekday') = '2027-01-01 10:00');
select pg_temp.ok('monthly skips ahead past `after` (jan 12 → apr 13)',
  pg_temp.nxt('2026-01-12 09:30', '2026-03-20 00:00', 'month', 1, null, 'weekday') = '2026-04-13 09:30');
select pg_temp.ok('monthly on the 31st: jan 31 → feb 28 (short month)',
  pg_temp.nxt('2026-01-31 09:00', '2026-01-31 09:00', 'month', 1, null, 'date') = '2026-02-28 09:00');
select pg_temp.ok('monthly on the 31st: back to mar 31 after february',
  pg_temp.nxt('2026-01-31 09:00', '2026-02-28 09:00', 'month', 1, null, 'date') = '2026-03-31 09:00');
select pg_temp.ok('every 3 months on the 2nd tuesday: sep 8 → dec 8',
  pg_temp.nxt('2026-09-08 18:00', '2026-09-08 18:00', 'month', 3, null, 'weekday') = '2026-12-08 18:00');

-- End conditions and rule edits ----------------------------------------------------------------
insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at, repeat_unit, repeat_ends_after)
values ('00000000-0000-4000-8000-000000000002', 'water', 'Twice only', 5, now() - interval '5 hours', now() - interval '3 hours', 'day', 2);
select public.post_next_repeating_needs();
select pg_temp.ok('"after 2 times": the second one is posted', (select count(*) from public.needs where title = 'Twice only') = 2);
update public.needs set dropoff_starts_at = dropoff_starts_at - interval '1 day', dropoff_ends_at = dropoff_ends_at - interval '1 day'
  where title = 'Twice only' and dropoff_ends_at > now();
select public.post_next_repeating_needs();
select pg_temp.ok('"after 2 times": no third one, and the series ends',
  (select count(*) = 2 and bool_and(repeat_unit is null) from public.needs where title = 'Twice only'));

insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at, repeat_unit, repeat_until)
values ('00000000-0000-4000-8000-000000000002', 'water', 'Until today', 5, now() - interval '5 hours', now() - interval '3 hours', 'day',
        -- The local date it started on (not today's: just after midnight that's already tomorrow).
        ((now() - interval '5 hours') at time zone 'America/Los_Angeles')::date);
select public.post_next_repeating_needs();
select pg_temp.ok('"until the day it started": nothing after the end date, and the series ends',
  (select count(*) = 1 and bool_and(repeat_unit is null) from public.needs where title = 'Until today'));

select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
insert into public.needs (organization_id, category, title, quantity_needed, dropoff_starts_at, dropoff_ends_at, repeat_unit)
values ('00000000-0000-4000-8000-000000000002', 'food', 'Rule edit', 5, now() + interval '1 day', now() + interval '1 day 2 hours', 'week');
update public.needs set repeat_interval = 2, repeat_weekdays = '{2,5}', dropoff_starts_at = now() + interval '2 days',
  dropoff_ends_at = now() + interval '2 days 2 hours' where title = 'Rule edit';
reset role;
select pg_temp.ok('changing the rule moves its starting point to that occurrence',
  (select repeat_anchor = dropoff_starts_at and repeat_interval = 2 from public.needs where title = 'Rule edit'));
select pg_temp.rejects('weekdays outside 0–6 are rejected', $$update public.needs set repeat_weekdays = '{1,7}' where title = 'Rule edit'$$);
select pg_temp.rejects('an interval of 0 is rejected', $$update public.needs set repeat_interval = 0 where title = 'Rule edit'$$);

-- Following organizations ---------------------------------------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
insert into public.organization_follows (organization_id) values ('00000000-0000-4000-8000-000000000002');
select pg_temp.ok('a donor can follow an approved organization',
  (select count(*) from public.organization_follows) = 1);
select pg_temp.rejects('following the same organization twice is rejected',
  $$insert into public.organization_follows (organization_id) values ('00000000-0000-4000-8000-000000000002')$$);
select pg_temp.rejects('cannot follow a pending organization',
  $$insert into public.organization_follows (organization_id) values ('00000000-0000-4000-8000-000000000006')$$);
select pg_temp.rejects('cannot follow on someone else''s behalf',
  $$insert into public.organization_follows (user_id, organization_id)
    values ('bbbbbbbb-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001')$$);
reset role;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.ok('who follows an organization is private', (select count(*) from public.organization_follows) = 0);
delete from public.organization_follows;
reset role;
select pg_temp.act_as(null);
select pg_temp.rejects('signed-out visitors cannot read follows', 'select 1/(count(*)-count(*)) from public.organization_follows');
reset role;
select pg_temp.ok('someone else''s delete leaves the follow in place', (select count(*) from public.organization_follows) = 1);
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
delete from public.organization_follows where organization_id = '00000000-0000-4000-8000-000000000002';
select pg_temp.ok('a donor can unfollow', (select count(*) from public.organization_follows) = 0);
reset role;

-- Organization dashboard ----------------------------------------------------------------------
-- Olga runs a new pantry with two needs. Ana brings 6 rice and 2 soap; Ben
-- pledges 2 soap (doesn't come) and 1 rice (still expected).
insert into auth.users (id, email, raw_user_meta_data) values
  ('44444444-0000-4000-8000-000000000010', 'olga@example.com', '{"display_name":"Olga"}');
select pg_temp.act_as('44444444-0000-4000-8000-000000000010');
insert into public.organizations (name, address, location) values ('Olga Pantry', '1 Test St', 'POINT(-122.41 37.78)');
reset role;
update public.organizations set status = 'approved' where name = 'Olga Pantry';
create temp table dash as select id as org from public.organizations where name = 'Olga Pantry';
grant select on dash to authenticated, anon;
select pg_temp.act_as('44444444-0000-4000-8000-000000000010');
insert into public.needs (organization_id, category, title, quantity_needed, unit, dropoff_starts_at, dropoff_ends_at)
select org, 'food'::public.need_category, 'Dash rice', 10, 'bags', now() - interval '1 hour', now() + interval '1 day' from dash
union all
select org, 'hygiene', 'Dash soap', 4, 'bars', now() - interval '1 hour', now() + interval '1 day' from dash;
reset role;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
insert into public.pledges (need_id, quantity) select id, 6 from public.needs where title = 'Dash rice';
insert into public.pledges (need_id, quantity) select id, 2 from public.needs where title = 'Dash soap';
insert into public.organization_follows (organization_id) select org from dash;
reset role;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-000000000002');
insert into public.pledges (need_id, quantity) select id, 2 from public.needs where title = 'Dash soap';
insert into public.pledges (need_id, quantity) select id, 1 from public.needs where title = 'Dash rice';
reset role;
select pg_temp.act_as('44444444-0000-4000-8000-000000000010');
select public.resolve_pledge(p.id, 'received') from public.pledges p join public.needs n on n.id = p.need_id
  where n.title like 'Dash %' and p.donor_id = 'aaaaaaaa-0000-4000-8000-000000000001';
select public.resolve_pledge(p.id, 'no_show') from public.pledges p join public.needs n on n.id = p.need_id
  where n.title = 'Dash soap' and p.donor_id = 'bbbbbbbb-0000-4000-8000-000000000002';
create temp table dash_stats as select public.organization_stats((select org from dash)) as s;
reset role;
select pg_temp.ok('dashboard: items received, drop-offs and donors',
  (select (s->>'items_received')::int = 8 and (s->>'dropoffs')::int = 2 and (s->>'donors')::int = 1 from dash_stats));
select pg_temp.ok('dashboard: arrivals and no-shows for the arrival rate',
  (select (s->>'arrived')::int = 2 and (s->>'no_shows')::int = 1 from dash_stats));
select pg_temp.ok('dashboard: pledges still expected',
  (select (s->>'expected_pledges')::int = 1 and (s->>'expected_items')::int = 1 from dash_stats));
select pg_temp.ok('dashboard: followers are counted',
  (select (s->>'followers')::int = 1 from dash_stats));
select pg_temp.ok('dashboard: needs posted and filled',
  (select (s->>'needs_posted')::int = 2 and (s->>'needs_filled')::int = 0 from dash_stats));
select pg_temp.ok('dashboard: categories, most asked-for first, with what came in',
  (select s->'categories'->0->>'category' = 'food' and (s->'categories'->0->>'needed')::int = 10
      and (s->'categories'->0->>'received')::int = 6 and (s->'categories'->1->>'received')::int = 2 from dash_stats));
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.rejects('donors cannot see an organization''s dashboard',
  'select public.organization_stats((select org from dash))');
reset role;
select pg_temp.act_as('cccccccc-0000-4000-8000-000000000003');
select pg_temp.rejects('staff of another organization cannot see it either',
  'select public.organization_stats((select org from dash))');
reset role;
select pg_temp.act_as(null);
select pg_temp.rejects('signed-out visitors cannot see dashboards',
  'select public.organization_stats((select org from dash))');
reset role;
