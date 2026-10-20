# Boost Your Community

A donation app connecting local donors with homeless shelters and help centers in real time, for iOS, Android and the web.

**Try it:** https://roopa-srinivas.github.io/BoostYourCommunity/app/ · **About the project:** https://roopa-srinivas.github.io/BoostYourCommunity/

## What it does
- **Live needs near you:** a map and a list of specific, time-boxed needs, sorted by urgency and filtered by a travel distance you pick (1–50 miles)
- **Pledges that add up:** donors pledge part of a need, never more than is still needed, with drop-off reminders
- **QR code check-in:** staff scan a donor's code at drop-off to mark the pledge received
- **Tools for organizations:** admin-approved sign-up, staff invite codes, drafts, needs that repeat on any schedule, a dashboard and a public organization page
- **Giving worth celebrating:** six milestone badges, a leaderboard you can opt out of, a community heat map and a "year in giving" recap
- **Share and follow:** share a need with a link that opens for friends without the app, and follow organizations
- **Accounts:** email and password, with 6-digit emailed codes to confirm sign-up and reset a forgotten password, and in-app account deletion

## Tech Stack
**App:** React Native with Expo and TypeScript (iOS, Android and web), Supabase (Postgres + PostGIS, auth, row level security, pg_cron), Leaflet and OpenStreetMap for maps on the web

**Infrastructure:** GitHub Actions (required checks on every PR, daily keep-awake job), GitHub Pages

**Original prototype:** HTML, CSS, JavaScript, Tailwind CSS, Leaflet.js, Leaflet.markercluster, DiceBear API

## Project structure
| Path | What it is |
|---|---|
| `index.html` | The project's landing page, served by GitHub Pages. |
| `app.html` | The original clickable prototype. All data in it is mock data. |
| `mobile/` | The real app for donors and shelter staff (Expo / React Native). |
| `supabase/migrations/` | The database schema: organizations, staff, needs, pledges and follows, with access rules. |
| `supabase/seed.sql` | Fictional sample organizations and needs for development and demos. |
| `supabase/checks/` | Behavior checks for the schema's rules (`./supabase/checks/run.sh`). |
| `supabase/templates/` | The sign-up confirmation and password reset emails (pasted into the Supabase dashboard by hand). |
| `privacy.html`, `terms.html`, `checkin.html`, `need.html` | Privacy policy, terms of use, the page a check-in QR code opens in a phone's regular camera, and the public page a shared need link opens (for friends without the app); served by GitHub Pages. |

## How the app works
1. An approved organization posts a specific need, like "40 pairs of new socks, drop off Tue 4-7pm".
2. Donors nearby pledge part of it. Pledges can't exceed what's still needed.
3. The donor drops the items off during the window.
4. Staff mark the pledge received (or a no-show). Only received donations count toward badges, leaderboards and stats.

New organizations start as pending and are approved by an admin (in the app under profile → review organizations) before they appear to donors or can post needs. Admins are listed in the `admins` table. Pledges still unconfirmed a day after their drop-off window closes are marked as not dropped off by an hourly job, and another hourly job posts the next round of repeating needs.

## Development
**App:**
```sh
cd mobile
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm install
npx expo start               # scan the QR code with Expo Go, or press i / a / w
```

**Checks on GitHub:** every pull request (and push to `main`) runs type checking, lint and the database checks automatically (`.github/workflows/checks.yml`), and they must pass before merging. A daily job (`.github/workflows/keep-awake.yml`) makes one small read so the free Supabase project doesn't pause.

**Database checks locally** (needs `brew install postgresql@17 postgis`):
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
- **The app on the web:** https://roopa-srinivas.github.io/BoostYourCommunity/app/ (maps use Leaflet and OpenStreetMap on the web; phones use Apple or Google maps)
- **The landing page:** https://roopa-srinivas.github.io/BoostYourCommunity/
- **The original prototype:** https://roopa-srinivas.github.io/BoostYourCommunity/app.html

`.github/workflows/pages.yml` publishes all of these on every push to `main`: it builds the web app into `/app` and adds the static pages from the repo root.
