# Nutrition Tracker

Personal calorie, macro, and water tracker. Single user. Next.js + Supabase,
deployed on Vercel, with Claude estimating macros from meal descriptions.

## Stack
- **Next.js (App Router)** — UI + serverless API routes
- **Supabase** — Postgres, auth (magic link), Row Level Security
- **Anthropic Claude** — meal macro estimation (server-side only)
- **Vercel** — hosting + the GitHub deploy pipeline

## First-time setup
1. **Create the Supabase project**, then run `db/phase1_schema.sql` in the
   Supabase SQL Editor. Edit the `home_timezone` default first.
2. **Enable magic-link auth**: Supabase → Authentication → Sign In / Providers → Email.
3. **Copy env vars**: `cp .env.local.example .env.local` and fill in the values.
4. **Install + run**:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000 — the status page shows which env vars are set.

## Deploy
1. Push to GitHub.
2. Import the repo in Vercel.
3. Add the three env vars (from `.env.local.example`) in
   Vercel → Settings → Environment Variables.
4. Deploy. Every push to the main branch redeploys.

## Project layout
```
db/phase1_schema.sql          Supabase tables + RLS policies
src/app/page.tsx              Temporary status page (→ becomes the dashboard)
src/app/manifest.ts           PWA manifest (installable to home screen)
src/app/api/estimate/route.ts Claude estimation endpoint (currently a stub)
src/lib/supabase/client.ts    Browser Supabase client
src/lib/supabase/server.ts    Server Supabase client (auth via cookies)
```

## Roadmap
- **Phase 1 (now):** calories + water + goals + searchable history + auth
- **Phase 2:** meal planner (log meals on future dates; planned vs. actual)
- **Phase 3:** exercise tracker
