# Boost Your Community

A community-driven donation platform connecting local donors with homeless shelters in real time.

## What it does
- Interactive map displaying shelter locations and current donation needs
- Ticket-based verification system for homeless individuals to submit requests through help centers
- Gamification features including friends leaderboards, milestone badges, and community heat maps

## Tech Stack
**Prototype (live site):** HTML, CSS, JavaScript, Tailwind CSS, Leaflet.js, Leaflet.markercluster, DiceBear API

**App (in progress):** React Native with Expo, Supabase (Postgres + PostGIS, auth, row level security)

## Project structure
| Path | What it is |
|---|---|
| `index.html`, `app.html` | The original clickable prototype, served by GitHub Pages. All data in it is mock data. |
| `mobile/` | The real app for donors and shelter staff (Expo / React Native). |
| `supabase/migrations/` | The database schema: organizations, staff, needs, pledges and follows, with access rules. |
| `supabase/seed.sql` | Fictional sample organizations and needs for development and demos. |
| `supabase/checks/` | Behavior checks for the schema's rules (`./supabase/checks/run.sh`). |

## How the app works
1. An approved organization posts a specific need, like "40 pairs of new socks, drop off Tue 4-7pm".
2. Donors nearby pledge part of it. Pledges can't exceed what's still needed.
3. The donor drops the items off during the window.
4. Staff mark the pledge received (or a no-show). Only received donations count toward badges, leaderboards and stats.

New organizations start as pending and are approved by an admin before they appear to donors or can post needs.

## Development
**App:**
```sh
cd mobile
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm install
npx expo start               # scan the QR code with Expo Go, or press i / a / w
```

**Database checks** (needs `brew install postgresql@17 postgis`):
```sh
./supabase/checks/run.sh
```

**Applying the schema to a Supabase project:**
```sh
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## Built with AI
Developed using Gemini as a co-engineer throughout, from architecture decisions to debugging and verification logic.

## Live Site
https://roopa-srinivas.github.io/BoostYourCommunity/
