# Progress — swipe-jobs

Update this after each milestone so any new Claude Code session knows exactly where things stand.
At the start of a session: "Read CLAUDE.md, /docs, and PROGRESS.md, then continue."

## Milestones
- [x] **M0** — Foundation & Design System (Next.js + TS + Tailwind, design system, next-intl, Supabase wiring, Sentry, CI/CD)
- [x] **M1** — Authentication & Accounts (signup/login/logout, soft-gate email verification, password reset, sessions, users + cities tables, RLS baseline)
- [x] **M2** — Profiles (worker + employer onboarding, reference-data endpoints + seeds, profile view/edit, visibility toggle)
- [x] **M3** — Listings (employer create/edit/pause/close, pay validation + cents, my-listings dashboard w/ placeholder counts, premium listing card)
- [ ] **M4** — Photos & Moderation Pipeline  ← **CURRENTLY HERE**
- [ ] **M5** — Swipe Feed & Matching  (⭐⭐⭐⭐⭐ tentpole — budget the most time)
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

## Reminders for every milestone
- Propose plan + file structure BEFORE writing code; wait for approval.
- Build only the current milestone — no building ahead.
- Contact fields (last_name/phone/email) never exposed pre-match (service layer + RLS).
- RLS on for any new table; Zod on any new input; parameterized queries only.
- Loading / empty / error states on every new screen.
- No Phase-2 features (payments, native, ratings, blocking, 2FA, push, multi-city, professional).
- Commit clearly after each milestone (e.g. "Complete M3: listings CRUD").
