# Progress — swipe-jobs

Update this after each milestone so any new Claude Code session knows exactly where things stand.
At the start of a session: "Read CLAUDE.md, /docs, and PROGRESS.md, then continue."

## Milestones
- [x] **M0** — Foundation & Design System (Next.js + TS + Tailwind, design system, next-intl, Supabase wiring, Sentry, CI/CD)
- [x] **M1** — Authentication & Accounts (signup/login/logout, soft-gate email verification, password reset, sessions, users + cities tables, RLS baseline)
- [x] **M2** — Profiles (worker + employer onboarding, reference-data endpoints + seeds, profile view/edit, visibility toggle)
- [x] **M3** — Listings (employer create/edit/pause/close, pay validation + cents, my-listings dashboard w/ placeholder counts, premium listing card)
- [x] **M4** — Photos & Moderation Pipeline (upload → validate/EXIF-strip/re-encode → private bucket → pending gate; approved photo wired into profile display)
- [~] **M5** — Swipe Feed & Matching  (⭐⭐⭐⭐⭐ tentpole)  ← **CURRENTLY HERE** — M5a backend DONE; M5b swipe-engine UI + match moment next
- [ ] **M6** — In-App Chat (Realtime)
- [ ] **M7** — Notifications
- [ ] **M8** — Admin Panel
- [ ] **M9** — Hardening (security, i18n, performance)
- [ ] **M10** — Pilot Launch (Ferizaj)

## Notes / decisions made during build
(Record anything that came up mid-build that a future session should know —
e.g. "chose X for Y", deviations approved, TODOs deferred.)
-

### M3 — Listings (decisions & deviations, all user-approved)
- **Verification gate on posting (deviation from documented soft-gate):** unverified
  employers CANNOT create/edit/change-status of a listing — enforced in **three layers**
  (page redirect, server action `emailVerified` check, AND RLS `user_is_verified()` in the
  write policies, defense-in-depth per an adversarial-review finding). The soft-gate doc
  only names match/chat/be-shown; the user chose to also gate posting. The `/listings`
  dashboard stays viewable while unverified and shows a "verify your email to post" prompt.
- **Mutations = server actions (not REST route handlers):** `saveListing` /
  `updateListingStatus` in `features/listings/listing.actions.ts` realize the
  api-contract's POST /listings + PATCH /listings/:id. Only the reads
  (`GET /api/v1/listings/mine`, `GET /api/v1/listings/[id]`) are route handlers — mirrors M2.
- **Native Postgres enums** for `job_type`, `pay_period`, `listing_status`; `required_experience`
  **reuses** the M2 `public.experience_level` type (identical values → stays aligned for M5 feed matching).
- **RLS = owner-scoped only** (`owns_employer_profile` helper + `user_has_role('employer')`,
  `user_is_verified()`, and `city_id = current_user_city_id()` on writes). NO worker "read
  active listings" SELECT policy yet — that's M5. **No DELETE policy** (close = status).
- **Dashboard interested/matched counts are placeholders (0)** — real aggregation needs swipes/matches (M5).
- **No photo upload** (M4) — the listing card uses the deterministic `gradientFor()` fallback.
- **Pagination:** `GET /listings/mine` uses an opaque offset-backed cursor (fine for MVP scale; can move to keyset later).
- **⚠️ Migration `20260703000008_create_listings.sql` is written but NOT yet applied.** Run `npm run db:push`
  (or `db:reset`) to apply it before the listings pages will function against the DB.
- Premium listing card lives at `features/listings/components/listing-card.tsx`; previewable in the styleguide
  ("Listing card" section). The M2 `swipe-card-demo.tsx` was left untouched.

### M4 — Photos & Moderation Pipeline (decisions & notes, all user-approved)
- **New dependency `sharp`** — server-side re-encode + EXIF/GPS strip + magic-byte/dimension validation.
  Runs only on the **Node runtime** (`export const runtime = "nodejs"` on the photo routes).
- **`sharp` must NEVER reach the client bundle.** Shared upload constants live in `features/photos/constants.ts`
  (no sharp import); `features/photos/image.ts` (imports sharp) is imported only by server code + tests. A client
  component importing anything from `image.ts` breaks the build with `Can't resolve 'child_process'/'fs'`.
- **Pipeline + gate only; admin approve/reject queue is M8.** Uploads land `status='pending'` and show the
  placeholder. To test the approved-photo display before M8, set `photos.status='approved'` and point
  `worker_profiles.photo_id` / `employer_profiles.logo_id` at it via SQL.
- **Private `photos` bucket + storage RLS** (owner path `photos/{uid}/…`) created by migration `0009` (applied).
  Approved photos served via short-lived **signed URLs**; nothing pending/rejected is ever served.
- **Upload is NOT verification-gated** (contract marks POST /photos as any-authed); role/type must match
  (worker→worker_photo, employer→employer_logo). Photo routes use `getCurrentUser()` and, like every other
  v1 API route, do **not** check `user.status` — a systemic gap to close in **M9** (a shared active-user API guard).
- **Upload rate-limit** uses the M1 `checkRateLimit` seam (no-op until M9 wires Upstash).
- Migration `0009` applied to the hosted DB (all 9 migrations in sync).

### M5a — Swipe Feed & Matching, backend (decisions & notes, all user-approved)
- **Split milestone:** M5a = backend/core-loop logic (this commit). M5b = the swipe-engine UI
  (Framer Motion drag physics) + the "It's a match!" moment (next checkpoint).
- **Stops at the match:** M5 creates the match row + fires the moment (M5b) and lands the DB
  **golden-rule gate** (match-gated SELECT policies on worker_profiles/employer_profiles). Chat AND
  the contact-reveal endpoint (`GET /matches/:id`) are **M6** — deliberately not built here.
- **THE GOLDEN RULE IS LIVE.** Pre-match responses never carry contact fields: the `worker_feed` +
  `listing_candidates` DB functions select contact-free columns; the candidate DTO is first-name +
  last-INITIAL by construction; match-gated RLS is the DB backstop. **CI gate:**
  `features/swipe/__tests__/candidate-view.test.ts` asserts contact-fields-absent (required release gate).
- **Migration `0010`:** `swipes`/`employer_swipes`/`matches` + enums + the atomic race-safe
  `record_employer_swipe` RPC (one TX + UNIQUE + a **Flow-1 candidacy gate** from the adversarial review:
  an employer may only act on a worker who is a genuine, currently-shown candidate). Also `worker_feed`,
  `listing_candidates`, `listing_engagement_counts` functions; the deferred **worker-reads-active-listings**
  policy on `listings`; `owns_listing` helper.
- **Endpoints (route handlers):** `GET /feed`, `POST /listings/[id]/swipe`,
  `GET /listings/[id]/candidates`, `POST /listings/[id]/candidates/[workerId]/swipe`. Keyset feed cursor;
  swipes idempotent (clean 409); soft-gate (unverified workers browse/swipe but aren't shown / can't match).
- **Real counts:** the M3 dashboard's placeholder interested/matched now use live aggregates.
- **Cross-user photos deferred** — feed/candidate cards will use gradient placeholders (M5b); no service-role
  photo path built. Migration `0010` applied (10/10 in sync). Branch: `m5-matching` (fresh off `main`).

## Reminders for every milestone
- Propose plan + file structure BEFORE writing code; wait for approval.
- Build only the current milestone — no building ahead.
- Contact fields (last_name/phone/email) never exposed pre-match (service layer + RLS).
- RLS on for any new table; Zod on any new input; parameterized queries only.
- Loading / empty / error states on every new screen.
- No Phase-2 features (payments, native, ratings, blocking, 2FA, push, multi-city, professional).
- Commit clearly after each milestone (e.g. "Complete M3: listings CRUD").
