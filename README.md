# Lendable 360 Feedback Prototype

Lightweight, demo-able prototype for structured 360 feedback collection and explainable synthesis.

## What’s built
- Employee flow to nominate 3–6 reviewers with relationship type and collaboration frequency.
- Reviewer flow with structured Start/Stop/Continue + AI follow-ups (max 3).
- Per-review transcript → structured JSON (with evidence + confidence ratings).
- 3-step combined synthesis pipeline with weighting + explainability.
- Manager view to edit and finalise the combined summary.
- Mock data seeded (3 submitted reviews + 1 pending reviewer).

## What’s cut
- Real authentication, email sending, or multi-cycle management.
- Perfect UX polish or edge-case handling.
- Audio input or exports.

## Running locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy envs and add your OpenAI key:
   ```bash
   cp .env.example .env.local
   ```
3. Create and seed the database:
   ```bash
   npm run db:migrate
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
Open `http://localhost:3000`.

## Deploying to Vercel (Supabase)
- Set **DATABASE_URL** in Vercel to your Supabase Postgres URL. Enter the value **without** surrounding quote marks.
- For production, use Supabase’s **connection pooler** (Transaction mode, port **6543**) to avoid exhausting connections: in Supabase go to Project Settings → Database → Connection string → **Connection pooling** and use that URI as `DATABASE_URL`. If the live site shows **"Database unavailable"**, set `DATABASE_URL` to the pooler URL (port 6543) in Vercel and redeploy.
- Set **OPENAI_API_KEY** (and optionally **OPENAI_MODEL**) if you want live LLM responses.
- The build runs `prisma generate` via `postinstall`; ensure migrations are applied to your Supabase DB (run `npm run db:migrate` locally pointing at the same DB, or run the SQL from `prisma/migrations` in the Supabase SQL editor).

**Pushing env vars via Vercel API:** Add `VERCEL_TOKEN` to your `.env` (create at [vercel.com/account/tokens](https://vercel.com/account/tokens)), then run `npm run vercel:env` to push `DATABASE_URL`, `OPENAI_API_KEY`, and `OPENAI_MODEL` from `.env`/`.env.local` to the linked Vercel project. You can pass a project ID: `node scripts/vercel-set-env.mjs prj_xxxx`.

**If you see "Database unavailable" on Vercel:** Follow [SUPABASE-FIX.md](./SUPABASE-FIX.md) for step-by-step instructions. In short: (1) Get the exact **Transaction mode** URI from Supabase Dashboard → Connect (port 6543). (2) Set it as `DATABASE_URL` on Vercel (no quotes). (3) Add `?pgbouncer=true` for Prisma. (4) Check **Database → Network restrictions** and allow connections if needed. (5) Redeploy.

## Summarisation + weighting
Weighting uses explicit maps for relationship type and collaboration frequency, plus confidence rating:
- Relationship: manager > direct report > peer > cross-functional.
- Frequency: weekly > monthly > rarely.
- Final score = relationshipWeight × frequencyWeight × (confidence / 5).

The combined summary is generated in three steps:
1. **Cluster + prioritise** insights (primary + omitted outputs).
2. **Synthesize** each selected insight with evidence quotes.
3. **Executive summary** over the synthesized insights.

## Prompting overview
- Reviewer follow-ups: ask for missing detail; max 3 questions; skippable.
- Per-review structuring: faithful summaries with direct evidence quotes.
- Combined synthesis: professional British English, explainable prioritisation.

## Demo plan (2–3 minutes)
1. **Employee**: nominate reviewers (use existing sample data).
2. **Reviewer**: open the pending review link, submit feedback, answer a follow-up.
3. **Manager**: open the cycle, review combined summary, show omitted insights, edit + finalise.

## Useful scripts
- `npm run dev` — start dev server
- `npm run db:migrate` — create and seed DB
- `npm run db:studio` — inspect data
