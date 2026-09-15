# ADP Cup — Live Team Leaderboard

Live TV-facing bracket dashboard for Amity's monthly sales competition (9
teams). Ranks teams by units (deals) enrolled since competition kickoff,
pairs them into a live Round 1 bracket, and shows an individual-contribution
ticker with a shout-out to the top closer.

Live: https://amity-team-leaderboard.vercel.app

## Stack

- **Next.js 14** (App Router) — deployed on Vercel
- **Neon Postgres** — stores team roster, snapshots, and per-agent snapshots
- **Google BigQuery** — source of truth for enrollment data
  (`amity-one-call-data.aod_forth_data.VW_SAMAN`)
- **Framer Motion** — reorder/count-up animations

## How it works

- A Vercel cron (`vercel.json`) hits `/api/sync` every 15 minutes.
- `/api/sync` (`lib/sync.ts`) queries BigQuery for each agent's enrolled
  debt and deal count since competition start, aggregates it per team, and
  writes a row to `team_snapshots` (team totals) and `agent_snapshots`
  (per-agent, for the ticker).
- `/api/leaderboard` (`app/api/leaderboard/route.ts`) reads the latest
  snapshots from Neon, ranks teams, and returns the data the dashboard
  polls every 20 seconds.
- `app/page.tsx` renders the bracket: #1 team gets a bye, the other 8 are
  paired by adjacent rank (2v3, 4v5, 6v7, 8v9). Round 1 pairing only —
  no advancement/scoring logic yet.

## Environment variables (set in Vercel project settings)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (`team_leaderboard` DB) |
| `GOOGLE_PROJECT_ID` | GCP project for BigQuery |
| `GOOGLE_CLIENT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key (escaped `\n`s are fixed automatically in `lib/bigquery.ts`) |

Without BigQuery credentials set, the app falls back to a mock-data mode
(small random increments) so the UI still works end-to-end.

## Local development

```bash
npm install
npm run dev
```

Requires the env vars above in `.env.local` to hit real data; otherwise
runs in mock mode.

## Database schema (Neon)

```sql
teams (team_id, team_name, captain, members[], baseline_enrolled, baseline_deals, competition_month)
team_snapshots (snapshot_id, team_id, captured_at, current_enrolled, current_deals)
agent_roster (agent_name PK, team_id)
agent_snapshots (agent_name, team_id, current_deals, current_enrolled, captured_at)
```

## Known next steps

- Round 2+ bracket advancement (confirm winners, reset scores, move
  teams through the bracket) — not built yet, scoped as a future addition.
