# swipe-jobs — Project Context (read this first, every session)

This file is the **source of truth** for how this project is built. Follow it strictly.
When anything here conflicts with a request, follow this file and flag the conflict.

---

## What we're building

A **two-sided, swipe-based job matching PWA** (Tinder-style) connecting **hourly/shift
workers** with **local businesses**, launching in **Ferizaj, Kosovo**.

- Segment: **hourly/shift work only** (waiter, barista, retail, warehouse, cleaning, delivery…).
  White-collar/professional is a documented **Phase 2** — keep the schema flexible for it, do NOT build it.
- Market: **Ferizaj only** for MVP. No neighborhoods, no geolocation. `city` is a first-class
  field so multi-city later is additive.
- Languages: UI is **Albanian + English** (i18n from day one). **Codebase, comments, DB, admin
  are all in English.** Albanian copy must be native-quality, not machine-translated.
- Who pays: employers (pay-per-listing) — **but launched FREE**. Payment infra is **Phase 2**.

### The core loop (this is the whole product — protect it)
Worker signs up → swipes on job listings → right-swipe = "interested" → worker enters that
listing's candidate stack → employer swipes through interested workers → employer right-swipe
= **match** → **in-app chat** opens + contact info is revealed → they arrange the job.

Matching is **Flow 1** (asymmetric): worker expresses interest first, employer confirms.
Employers can NEVER browse all workers — only candidates who swiped their specific listing.

---

## Stack (LOCKED — do not substitute without asking)

- **Frontend:** Next.js (App Router) + React, delivered as a **PWA** · TypeScript · Tailwind CSS
  (design-system tokens) · **Framer Motion** (swipe physics + transitions) · `next-intl` (SQ/EN).
- **Backend:** Next.js route handlers + server actions (stateless modular monolith — NOT microservices).
- **Platform:** **Supabase** — Postgres, Auth, Realtime (chat), Storage (photos).
- **Email:** Resend (transactional: verification, new match, new message).
- **Hosting:** Vercel. **Errors/monitoring:** Sentry.
- **State:** React Server Components for data where possible; Zustand for swipe deck + chat UI.
  No Redux.

Rationale: boring, mainstream, well-documented = reliable and fast for a solo dev + AI. The
novelty budget goes into **UI/UX craft**, never into exotic tech or unfamiliar interaction patterns.

---

## NON-NEGOTIABLE rules

### Security / privacy (the biggest liability)
- **Golden rule:** contact fields — `last_name`, `phone`, `email` — must **NEVER** appear in any
  API response unless a `matches` row exists between the requester and that subject.
  Enforce in the **service layer AND Postgres RLS** (defense in depth). Pre-match, workers show
  only `first_name` + last initial.
- **A CI test asserting contact fields are absent pre-match is a required release gate.**
- **RLS ON for every table.** A user reads only their own data / conversations they're party to.
- **Parameterized queries only.** Never string-concatenate SQL.
- **Zod validation on every endpoint input.** Reject unknown fields. Server is source of truth.
- **No `dangerouslySetInnerHTML`** (lint rule). React escaping + sanitize free text (bio, description, chat) on write.
- Secure headers incl. CSP; SameSite httpOnly cookies (Supabase Auth); CSRF via SameSite + same-origin.
- **No secrets in git.** `.env` gitignored, `.env.example` committed. Service-role key server-only.
- Uploaded images: validate type/size/dimensions, **strip EXIF/GPS**, re-encode, private bucket,
  **PENDING → admin-approved before public**.
- **Soft-gate email verification:** users can onboard/browse immediately, but CANNOT match, chat,
  or be shown to others until verified.

### Data
- **UUID primary keys.** `created_at`/`updated_at timestamptz` on every table.
- **Money = integer minor units (cents), EUR.** Never floats.
- Lookups (`categories`, `languages`, `cities`, `business_types`) are **runtime tables** (admin-editable),
  bilingual (`name_sq`, `name_en`) — NOT enums.
- Full schema in `docs/database-schema.md`. API contract in `docs/api-contract.md`.

### Code / structure
- **Feature-folder structure** (`/features/swipe`, `/features/chat`, `/features/listings`,
  `/features/admin`, etc.). Layered: route/action → service (business logic + authz) → data-access → DB.
- Keep it **handoff-ready**: clean, documented, so the next dev can pick it up.
- Every screen ships with designed **loading (skeleton), empty, and error** states. No blank screens,
  no raw spinners.

---

## Scope discipline (this is a FIXED €7.5K MVP)

Build ONLY what the current milestone specifies. Do **not** add features beyond it, however tempting.

**OUT OF SCOPE (Phase 2 — do not build):** payments/pay-per-listing activation · native mobile app ·
ratings/reviews · user-to-user block · admin 2FA · push notifications · multi-city · geolocation ·
professional/white-collar segment · CV/resume/work-history · verified badge · advanced feed ranking.

If a task seems to need any of these, STOP and ask — it's likely scope creep.

---

## How we work

- **One milestone at a time** (M0 → M10, see `docs/roadmap.md`). Never build ahead.
- Before writing code for a milestone: **propose a plan + file structure and wait for approval.**
- **Ask before any architectural decision** (new library, schema change, deviation from these docs).
- Prefer **boring/mainstream over clever.** Prefer **maintainability over shortcuts.**
- When unsure, re-read the relevant file in `/docs` rather than guessing.

## Reference docs
- `docs/database-schema.md` — tables, relationships, constraints, indexes (Phase 4)
- `docs/api-contract.md` — every endpoint: method, URL, auth, request, response, errors (Phase 5)
- `docs/security.md` — security & privacy requirements (Phase 6)
- `docs/roadmap.md` — milestones M0–M10, order, difficulty, dependencies (Phase 7)
