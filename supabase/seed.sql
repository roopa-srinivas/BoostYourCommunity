-- Sample data for local development and demos. All organizations are
-- fictional. Drop-off windows are relative to now() so the demo always has
-- open needs.

insert into public.organizations (id, name, kind, description, address, location, status) values
  ('00000000-0000-4000-8000-000000000001', 'Mission Street Community Kitchen', 'food_pantry',
   'Hot meals six nights a week and a grocery pantry on Saturdays.',
   '2400 Mission St, San Francisco, CA', 'POINT(-122.4187 37.7587)', 'approved'),
  ('00000000-0000-4000-8000-000000000002', 'SoMa Harbor Shelter', 'shelter',
   'Overnight shelter with 80 beds and a daytime resource center.',
   '600 Folsom St, San Francisco, CA', 'POINT(-122.3968 37.7854)', 'approved'),
  ('00000000-0000-4000-8000-000000000003', 'Bayview Neighbors Fridge', 'community_fridge',
   'A 24/7 community fridge and pantry shelf. Take what you need, leave what you can.',
   '3rd St & Palou Ave, San Francisco, CA', 'POINT(-122.3905 37.7337)', 'approved'),
  ('00000000-0000-4000-8000-000000000004', 'Tenderloin Warm Welcome Center', 'shelter',
   'Drop-in center offering showers, clothing and case management.',
   '150 Eddy St, San Francisco, CA', 'POINT(-122.4108 37.7840)', 'approved'),
  ('00000000-0000-4000-8000-000000000005', 'Sunset Family Closet', 'other',
   'Free clothing for families, sorted by size.',
   '1800 Irving St, San Francisco, CA', 'POINT(-122.4779 37.7637)', 'approved'),
  ('00000000-0000-4000-8000-000000000006', 'Haight Street Outreach', 'other',
   'Waiting for approval, so it should not appear to donors.',
   '1500 Haight St, San Francisco, CA', 'POINT(-122.4469 37.7700)', 'pending');

insert into public.needs
  (organization_id, category, title, details, quantity_needed, unit, dropoff_starts_at, dropoff_ends_at)
values
  ('00000000-0000-4000-8000-000000000001', 'food', 'Canned beans and vegetables',
   'Unopened, not past the best-by date. No glass jars please.', 60, 'cans',
   date_trunc('hour', now()), date_trunc('hour', now()) + interval '2 days'),
  ('00000000-0000-4000-8000-000000000001', 'water', 'Bottled water (16.9 oz)',
   'Individual bottles for meal service.', 120, 'bottles',
   date_trunc('hour', now()), date_trunc('hour', now()) + interval '1 day'),
  ('00000000-0000-4000-8000-000000000002', 'clothing', 'New socks, adult sizes',
   'New only, any color. Men''s L and XL are needed most.', 40, 'pairs',
   date_trunc('hour', now()) + interval '4 hours', date_trunc('hour', now()) + interval '3 days'),
  ('00000000-0000-4000-8000-000000000002', 'hygiene', 'Travel-size toiletries',
   'Toothpaste, toothbrushes, deodorant, shampoo. Sealed items only.', 80, 'items',
   date_trunc('hour', now()), date_trunc('hour', now()) + interval '5 days'),
  ('00000000-0000-4000-8000-000000000003', 'food', 'Fresh fruit',
   'Whole fruit that keeps a few days: apples, oranges, bananas.', 50, 'pieces',
   date_trunc('hour', now()), date_trunc('hour', now()) + interval '1 day'),
  ('00000000-0000-4000-8000-000000000004', 'clothing', 'Warm jackets',
   'Gently used is fine if clean. Adult M to XXL.', 25, 'jackets',
   date_trunc('hour', now()), date_trunc('hour', now()) + interval '7 days'),
  ('00000000-0000-4000-8000-000000000004', 'water', 'Water for the drop-in center',
   'Cases of bottled water.', 20, 'cases',
   date_trunc('hour', now()) + interval '1 day', date_trunc('hour', now()) + interval '2 days'),
  ('00000000-0000-4000-8000-000000000005', 'clothing', 'Kids'' winter coats',
   'Sizes 4T through youth L.', 30, 'coats',
   date_trunc('hour', now()), date_trunc('hour', now()) + interval '10 days'),
  ('00000000-0000-4000-8000-000000000006', 'food', 'Granola bars',
   'Belongs to the pending organization, so donors should not see it.', 100, 'bars',
   date_trunc('hour', now()), date_trunc('hour', now()) + interval '3 days');
