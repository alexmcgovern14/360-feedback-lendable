# QA checklist – 360 Feedback (Vercel)

Use this in the browser at **https://360-feedback-lendable.vercel.app** (or your deployment URL). Ensure **DATABASE_URL** on Vercel uses Supabase’s **connection pooler (port 6543)** if you see “Database unavailable”.

---

## 1. Shell and navigation
- [ ] Home/root redirects to a valid page (e.g. `/employee` or similar).
- [ ] Sidebar shows **Lendable / 360 Feedback** and links: **Employee**, **Reviewer**, **Manager**.
- [ ] Each nav link loads the correct page without full reload errors.
- [ ] No “Database unavailable” or generic error screen on load.

---

## 2. Employee page (`/employee`)
- [ ] Page title/heading refers to nominating reviewers (e.g. “Nominate reviewers for …”).
- [ ] Instruction text: “Choose 3–6 colleagues…” is visible.
- [ ] **Staff combobox**: click opens list; typing filters names; can select a person.
- [ ] **Relationship** and **Collaboration frequency** fields exist and can be set.
- [ ] **Add reviewer** (or equivalent) adds a row; new reviewer appears in the list.
- [ ] Added reviewers show status (e.g. “Requested” or “Completed”) and are “locked” (no edit).
- [ ] At least one **deeplink** (e.g. “Open review” / link to `/reviewer/requests/...`) is present for a requested or completed review.
- [ ] Cannot finish/submit with fewer than 3 reviewers (button disabled or validation).
- [ ] With 3–6 reviewers, can complete flow without console or server errors.

---

## 3. Reviewer inbox (`/reviewer`)
- [ ] Heading “Reviewer inbox” and short description visible.
- [ ] **Outstanding** section lists pending reviews (or shows “No pending reviews” if empty).
- [ ] Each outstanding item shows employee name and reviewer name (or equivalent).
- [ ] **Open** / **Complete** (or similar) link goes to `/reviewer/requests/[token]`.
- [ ] **Submitted** section lists completed reviews; no broken links.

---

## 4. Reviewer request page (`/reviewer/requests/[token]`)
- [ ] Employee name (who is being reviewed) visible at top.
- [ ] **4 boxes**: Start doing, Stop doing, Continue doing, Anything else — with placeholders.
- [ ] Textareas expand as content is added.
- [ ] **Submit** (or “Send”) sends the form; form content appears as first message in chat (animation or immediate).
- [ ] Chat appears and assistant can reply (OpenAI or mock).
- [ ] Up to 3 follow-up questions; can skip if that option exists.
- [ ] After completion (or 3 questions), review locks; no further input.
- [ ] No uncaught errors in console; no 500 on message API.

---

## 5. Manager page (`/manager`)
- [ ] “Review cycles” (or equivalent) heading and description.
- [ ] List of cycles with employee name and status (e.g. Requested / Ready / Finalised).
- [ ] Link to a cycle detail page (e.g. `/manager/cycles/[id]`).

---

## 6. Manager cycle detail (`/manager/cycles/[id]`)
- [ ] Employee name and cycle context visible.
- [ ] **Combined summary** (or executive summary) is visible when at least 2 reviews exist.
- [ ] Summary text is editable (if design says so); **Save** persists changes.
- [ ] **Finalise** (or equivalent) locks the cycle; state updates (e.g. “Finalised”).
- [ ] **Omitted insights** (or similar) are available and expand/collapse.
- [ ] **Individual reviews** listed; can open transcript/view per review.
- [ ] No broken links or 404s for valid cycle IDs.

---

## 7. API and errors
- [ ] No 500s on page load for `/employee`, `/reviewer`, `/manager`.
- [ ] Reviewer message API (`/api/reviewer/requests/[token]/message`) returns 200 for valid payloads (check Network tab if needed).
- [ ] Invalid or missing token for reviewer request shows clear error, not raw 500.

---

## 8. Quick smoke
- [ ] **Employee** → add 3 reviewers (or use existing) → open one reviewer link.
- [ ] **Reviewer** → open that link → submit form → complete chat (or skip) → see Completed.
- [ ] **Manager** → open cycle → see combined summary (if 2+ reviews) → edit + save → finalise.

---

*After fixing DATABASE_URL to use the pooler (port 6543), redeploy and run this checklist again.*
