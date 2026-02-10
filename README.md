# Lendable 360 Feedback Prototype

A prototype demonstrating AI-powered 360 feedback collection and multi-step synthesis with full observability.

## Overview

This system collects structured feedback from multiple reviewers, enriches it through conversational AI, and synthesizes insights using a transparent 3-step pipeline with weighting and explainability at every stage.

## Methodology

### 1. Feedback Collection & Enrichment

**Reviewer Experience:**
- Reviewers provide initial feedback in Start/Stop/Continue format
- AI asks up to 2 targeted follow-up questions to gather specific examples and context
- Questions are deterministic and area-focused (never repeat the same category)
- Reviewers can skip any question, triggering a final "anything else?" prompt
- Full transcript is preserved for audit trail

**AI Structuring:**
- Each completed review is structured into JSON with:
  - **Insights**: Clear, actionable themes extracted from the conversation
  - **Descriptions**: Concise summaries faithful to reviewer's words
  - **Evidence**: Direct quotes from the transcript
  - **Confidence ratings** (0-5): Based on emphasis and specificity

### 2. Multi-Review Synthesis Pipeline

The system combines individual reviews through a 3-step LLM pipeline:

#### Step 1: Clustering & Prioritisation
- Groups similar insights across all reviews
- Applies explicit weighting:
  - **Relationship type**: Manager (4x) > Direct report (3x) > Peer (2x) > Cross-functional (1x)
  - **Collaboration frequency**: Weekly (3x) > Monthly (2x) > Rarely (1x)
  - **Confidence rating**: Scales the above (rating / 5)
- Selects top 3 themes per category (Start/Stop/Continue)
- Outputs primary + omitted insights with prioritisation rationale

#### Step 2: Detailed Synthesis
- Writes 2-4 sentence synthesis for each prioritised theme
- Weaves together multiple reviewers' perspectives when clustered
- Includes specific details (projects, situations, impacts)
- Cites most compelling evidence quotes
- Makes themes concrete and actionable for manager discussions

#### Step 3: Executive Summary
- Generates 3-5 sentence overview highlighting key themes
- Balanced across Start/Stop/Continue categories
- Focuses on patterns that matter most (weighted by relationship + frequency)

### 3. Observability & Transparency

**For Reviewers:**
- "See JSON" button after submission shows full transcript + structured output
- Can inspect how their words were interpreted

**For Managers:**
- **Combined review editor**: Full synthesis with evidence and weighting rationale
- **Omitted insights**: Themes that didn't make top 3, with explanation
- **JSON artifacts**: Complete pipeline output (Step 1/2/3) for full transparency
- **Individual reviews**: Original structured feedback from each reviewer
- **Edit capability**: Managers can refine synthesis before finalisation

## What's Built

- Employee flow to nominate 3-6 reviewers (relationship type + collaboration frequency)
- Reviewer flow with AI-guided Start/Stop/Continue + smart follow-ups
- Per-review structuring with evidence preservation
- 3-step weighted synthesis pipeline
- Manager view with edit/finalise capability
- Complete JSON observability at every stage

## What's Intentionally Simplified

- No real authentication or email sending (mock flow only)
- Single review cycle (no multi-cycle management)
- No role-based access control (demo flow only)
- No export functionality or integrations

## Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Add your OpenAI API key to `.env.local`

3. **Setup database:**
   ```bash
   npm run db:migrate
   ```
   This creates tables and seeds 4 submitted reviews + 1 pending test review

4. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Testing the System

### Quick Test (5 minutes)

1. **Reviewer flow:**
   - Go to [/reviewer](http://localhost:3000/reviewer)
   - Click on the outstanding review for Sarah Johnson
   - Fill in Start/Stop/Continue fields
   - Answer the AI follow-up questions (or skip them)
   - Submit and view the JSON output

2. **Manager flow:**
   - Go to [/manager](http://localhost:3000/manager)
   - Click "Open summary" for Alex Morgan
   - Review the combined synthesis (your review + 4 seed reviews)
   - Expand "Omitted insights" to see deprioritised themes
   - Expand "JSON artifacts" to inspect full pipeline output
   - Edit any synthesis text if desired
   - Click "Save" or "Finalise"

### Comprehensive Test (15 minutes)

1. **Employee flow:**
   - Go to [/employee](http://localhost:3000/employee)
   - Add 2-3 reviewers from the dropdown (various relationship types)
   - Click "Done" when minimum reviewers added

2. **Complete multiple reviews:**
   - Go to [/reviewer](http://localhost:3000/reviewer)
   - Complete each pending review with varied feedback
   - Try different answer patterns (detailed vs brief, skip vs answer)
   - Note how AI adjusts follow-up questions

3. **Observe synthesis:**
   - Return to [/manager](http://localhost:3000/manager)
   - Watch how new reviews cluster with existing themes
   - Check weighting rationale (manager feedback weighted higher)
   - Compare synthesis detail to individual evidence quotes

4. **Inspect observability:**
   - Expand "JSON artifacts" to see raw pipeline output
   - Compare Step 1 (clustering) → Step 2 (synthesis) → Step 3 (summary)
   - Verify evidence quotes match original transcripts
   - Check omitted insights and their deprioritisation reason

### Testing Clustering Behaviour

The seed data is designed to demonstrate clustering:
- **2 reviewers** mention "Flag constraints earlier" (Start doing)
- **2 reviewers** mention "Give earlier feedback" (Start doing)
- **2 reviewers** mention "Avoid silent reprioritisation" (Stop doing)
- **2 reviewers** mention "Reduce unnecessary meetings" (Stop doing)
- **2 reviewers** mention "Maintain transparent communication" (Continue doing)
- **2 reviewers** mention "Make work teachable" (Continue doing)

When you add your test review, your unique themes should appear as the **3rd prioritised item** in their respective categories, demonstrating how the system balances clustered themes with unique insights.

## Deployment (Vercel + Supabase)

1. **Database setup:**
   - Create Supabase project
   - Get connection pooler URL (Transaction mode, port 6543)
   - Run migrations in Supabase SQL editor

2. **Vercel configuration:**
   ```bash
   # Set in Vercel dashboard or via CLI:
   DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true"
   OPENAI_API_KEY="sk-..."
   ```

3. **Deploy:**
   ```bash
   git push  # Vercel auto-deploys
   ```

4. **Seed production database:**
   ```bash
   # Point .env.local to production DB
   npm run db:seed
   ```

## Architecture Highlights

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: Prisma + PostgreSQL (Supabase)
- **LLM**: OpenAI (structured outputs via JSON mode)
- **Styling**: Tailwind CSS
- **Observability**: Full JSON artifacts stored and exposed in UI

## Useful Scripts

- `npm run dev` — Start development server
- `npm run db:migrate` — Apply migrations + seed data
- `npm run db:studio` — Inspect database
- `npm run db:seed` — Re-seed with fresh test data

## Questions or Issues?

This is a prototype demonstrating feasibility and approach. For production use, you'd want to add authentication, email delivery, proper access control, and more robust error handling.
