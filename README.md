# 360 Feedback Prototype

A prototype demonstrating AI-powered 360 feedback collection and multi-step synthesis, prioritising full observability. 

This system focuses on collecting reviews, eliciting further detail through conversational AI, transforming into structured feedback, writing to database, and synthesising insights into a combined 360 review using clustering and weightings.

**Production link:** https://360-feedback-lendable.vercel.app/ 

## Goals
- **Increase depth and detail of reviews:** It's easy to be surface level when writing reviews, so conversational AI is used to drill down on reviewer's inputs, to react to their comments and elicit further detail in a targeted way. 
- **Efficiency:** Do not waste the reviewer's time. Conversational AI prompts for “good feedback”, while avoiding extensive set up/training for reviewer. 
- **Observability:** Observability is critical for auditing of AI outputs and verification of claims. At each stage, user can view source JSON of reviews and summaries, with evidence included.
- **Faithfully represent reviews:** All summaries must be faithful to original reviews; meaning and intent must not be lost or exaggerated. This is critical, or trust will be lost in system.

## Tech stack
- Cursor: AI-powered IDE for code generation and knowledge base for problem solving and synthetic content generation
   - Cursor browser: inspecting Lendable website to fetch design system
- Supabase: Database storing all inputs and pre-seeded synthetic reviews
- GitHub: Codebase source of truth
- Vercel: Hosting
- ChatGPT: Initial research and brainstorming

### Architecture 

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: Prisma + PostgreSQL (Supabase)
- **LLM**: OpenAI (structured outputs via JSON mode)
- **Styling**: Tailwind CSS
- **Observability**: Full JSON artifacts stored and exposed in UI

### Next steps
To work on with further time investment:
- Design!
- Prompt engineering only iterated a couple of times, not fully optimised
- Testing user journeys
- Optimisation of database 
- Authentication and email sending
- Role-based access control 
- Export functionality/integrations

## Prototype test instructions

### Key pages

Note: At top left of prototype is tester's name and role. This changes between the different pages, to represent the different roles the tester is taking on. 

1. **Employee page:** Employee selects name from dropdown menu, along with frequency and relationship. Confirming adds colleague to list below.
---
2. **Reviewer page:** Reviewer fills in form and then engages in subsequent chat to create review.
3. **Manager page:** Manager is able to review and edit combined review, from manually entered review and pre-seeded database entries. 

- "See JSON" button on stages 2 and 3 show full transcript + structured output for observability.

### Test instructions

2. **Reviewer flow:**
   - Go to [/reviewer](https://360-feedback-lendable.vercel.app/reviewer)
   - Click on the outstanding review for Sarah Johnson
   - Fill in Start/Stop/Continue fields
   - Answer the AI follow-up questions (or skip them)
   - Submit and view the JSON output

3. **Manager flow:**
   - Go to [/manager](https://360-feedback-lendable.vercel.app/manager)
   - Click "Open summary" 
   - Review the combined synthesis (your review + 4 seed reviews)
   - Expand "Omitted insights" to see deprioritised themes
   - Expand "JSON artifacts" to inspect full pipeline output
   - Edit any synthesis text if desired
   - Click "Save" or "Finalise"

## Full methodology

### 1. Feedback Collection & Enrichment

**Reviewer experience: Form + conversational AI**
- Reviewers provide initial feedback in Start/Stop/Continue form
- Starting with an enforced structure encourages reviewer to begin by entering detail on all three required topics
- Reviewer's form entry acts as first prompt in chat, where LLM has two questions to dig deeper based on user's input. This is designed to react to reviewer's notes and dig deeper in targeted areas to elicit further detail and examples. 
- Two-question limit is in place to optimise for reviewer's time and prevent getting stuck in a loop, with a predetermined end point. 
- Questions are area-focused, never repeating the same category.
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

#### Step 1: Clustering + prioritisation
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

## Prompts

All prompts are defined in `src/lib/llm/prompts.ts`. The following are the full prompt texts used in the prototype.

### Shared guardrails

Prepended to all prompts:

```
You are assisting with 360 feedback summarisation.
- Never invent facts or exaggerate intent.
- Preserve meaning; use the reviewer's words when possible.
- Evidence must be direct quotes from the transcript.
- If information is missing, ask for it explicitly and concisely.
```

### 1. Follow-up questions (reviewer enrichment)

Used to generate the two AI follow-up questions that dig deeper on reviewer feedback.

**First follow-up:**
- Base instruction: Choose ONE of Start/Stop/Continue that would benefit most from more detail; prioritise brief or vague areas.
- Output: JSON with `question` and `reason`.

**Second follow-up:**
- Additional rule: Must ask about a COMPLETELY DIFFERENT area than the first follow-up.
- Never ask about the same area twice; never invent new projects or behaviours.

**Final prompt (after skip or second answer):**
- Static text: `"Anything else you'd like to add?"`

### 2. Structure review ( JSON extraction )

Transforms the full transcript into structured feedback:

```
Summarise the reviewer transcript into structured feedback.
Use professional British English. Be faithful and avoid over-interpretation.
Descriptions should be concise synthesis; evidence must be direct quotes.
Confidence rating is 0–5 based on emphasis and evidence.

Return ONLY valid JSON matching the required schema.

Metadata: Employee, Reviewer, Relationship type, Collaboration frequency
Transcript: [full transcript]
```

Schema: `metadata`, `start_doing`, `stop_doing`, `continue_doing` (each array of `{ insight, description, evidence, confidence_rating }`), `full_transcript`.

### 3. Clustering + prioritisation ( Step 1 )

```
Cluster similar insights, prioritise them, and select up to 3 per section.
Use the weighting signals to justify prioritisation. Keep the original source insights intact.

Return ONLY valid JSON matching the required schema.

Insights: [JSON of all insights with metadata and weights]
```

### 4. Detailed synthesis ( Step 2 )

```
Write comprehensive, detailed syntheses for each insight cluster.

CRITICAL REQUIREMENTS:
- Each synthesis MUST be 4-6 sentences minimum (longer is better)
- Extract and include EVERY specific detail from ALL sources in the cluster:
  * Project names mentioned
  * Specific situations or incidents described
  * Concrete impacts and outcomes
  * Timeframes (Q3, Q4, specific sprints, etc.)
  * Quantifiable details (saved a week, avoided rework, etc.)
- When multiple reviewers contribute to a theme, weave ALL their perspectives together
- The synthesis should be SUBSTANTIALLY longer and richer than any single source
- Evidence in the sources is often more detailed than descriptions - mine it thoroughly
- Make it extremely concrete and actionable for manager 1-on-1 discussions

STRUCTURE:
1. Start with the core behaviour/pattern
2. Provide specific examples from the evidence (name projects, situations)
3. Explain the impact or why this matters
4. If multiple sources, show the pattern across different contexts
5. Make it actionable - what specifically should be discussed

Use professional British English. Be thorough and specific.
```

### 5. Executive summary ( Step 3 )

```
Write a concise executive summary (3–5 sentences) of the combined review.
Use professional British English and avoid over-interpretation.
Return ONLY valid JSON matching the required schema.

Syntheses: [JSON of all synthesis outputs]
```

