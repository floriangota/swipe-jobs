# Progress — swipe-jobs

Update this after each milestone so any new Claude Code session knows exactly where things stand.
At the start of a session: "Read CLAUDE.md, /docs, and PROGRESS.md, then continue."

## Milestones
- [x] **M0** — Foundation & Design System (Next.js + TS + Tailwind, design system, next-intl, Supabase wiring, Sentry, CI/CD)
- [x] **M1** — Authentication & Accounts (signup/login/logout, soft-gate email verification, password reset, sessions, users + cities tables, RLS baseline)
- [x] **M2** — Profiles (worker + employer onboarding, reference-data endpoints + seeds, profile view/edit, visibility toggle)
- [x] **M3** — Listings (employer create/edit/pause/close, pay validation + cents, my-listings dashboard w/ placeholder counts, premium listing card)
- [x] **M4** — Photos & Moderation Pipeline (upload → validate/EXIF-strip/re-encode → private bucket → pending gate; approved photo wired into profile display)
- [x] **M5** — Swipe Feed & Matching (feed + swipe engine + candidate stack + atomic matching + "It's a match!" moment; golden rule LIVE)
- [x] **M6** — In-App Chat (Realtime) (matches inbox + chat thread + contact reveal + read receipts + hired status; RLS-gated private Realtime channel; golden-rule reveal point LIVE)
- [x] **M7** — Notifications (in-app center + unread badge; DB-trigger notifications; Resend emails new match/offline message; Vercel Cron: email dispatch, token cleanup, stale-listing close)
- [x] **M8** — Admin Panel (photo moderation, report submission + queue/resolve, user suspension, bilingual category management, health/metrics dashboard, audit log; admin RLS + admin_* functions)
- [ ] **M9** — Hardening (security, i18n, performance)  ← **CURRENTLY HERE**
- [ ] **M10** — Pilot Launch (Ferizaj)

## Notes / decisions made during build
(Record anything that came up mid-build that a future session should know —
e.g. "chose X for Y", deviations approved, TODOs deferred.)

### ⚠️ CURRENT STATE — read this first
**Branch:** `m5-matching` (fresh off `main`). M0–M4 merged to `main` via PR #1. **M5 + M6 are up for review as
[PR #2](https://github.com/floriangota/swipe-jobs/pull/2)** (`main ← m5-matching`): commits `6968b1f` (M5a
backend) + `5693240` (M5b UI) + `c16d183` (the two hotfixes below) + `15f17a2` (M6 chat + review hardening),
all pushed. _M6–M8 were committed onto the same branch (they depend on unmerged M5), so PR #2 now spans M5→M8._
Next milestone: **M9 — Hardening** (not started).

**Two hotfixes (found while demoing, now committed in `c16d183`):**
1. **`next.config.ts`** — removed a stray trailing `module.exports = {allowedDevOrigins}` block that
   **clobbered the whole config** (Next compiles this TS config as CJS, so `module.exports =` overwrote the
   `export default` → silently dropped next-intl + Sentry + security headers → EVERY page 500'd with
   "Couldn't find next-intl config"). Folded `allowedDevOrigins` (the LAN dev/phone IPs) into the real
   `nextConfig`. **NEVER append `module.exports` to this file.**
2. **`src/features/auth/actions.ts`** — **all auth forms were broken** (signup/login/reset returned
   `invalid_input`). Cause: Next 16 injects `$ACTION_*` fields into `<form action>` FormData; the strict Zod
   schemas (`z.strictObject`, reject-unknown) rejected them. Fix = a `formObject()` helper strips `$ACTION*`
   keys before parsing. Verified signup + login work; golden-rule + config pre-PR reviews came back clean.
- `next-env.d.ts` — Next's auto-generated dev-path churn; intentionally left uncommitted.

**Demo data in the HOSTED DB (test data, not fixtures):** a fully-verified demo was seeded — a **worker**
account ("Ardit Berisha", hospitality) + an **employer** account ("Fokus", 6 active Ferizaj listings), with
**Arta K.** pre-seeded as a candidate on the Barista/Kamarier roles. **ALL existing users had
`email_verified_at` set** to neutralize the email soft-gate for the demo. Verified end-to-end (login → feed
of 6 → candidate stack shows Arta → match). Migration `0010` applied (10/10 in sync). _Demo login
credentials are kept OUT of the repo — ask Florian, or re-seed/reset via the admin API._

**Gotchas learned this session:**
- **Turbopack dev route-discovery glitch:** whole route groups (`(auth)` login/signup; deeply-nested
  `[id]/candidates/[workerId]/swipe`) sometimes 404 until a `next dev` **restart**. Dev-only; prod builds all routes.
- **Supabase delete gotcha:** deleting a user from the `users` table (dashboard editor) does NOT delete
  `auth.users` → orphan blocks re-signup ("already registered"). Delete via the **admin API** (removes both).
- **Match moment is employer-only by design** (Flow-1: the employer completes the match). A worker-side live
  "It's a match!" needs Realtime → **M6** (chat) / **M7** (notifications). User declined to build it ahead.

**Deferred TODOs carried forward:**
- Cross-user photos on feed/candidate cards (M5b deferred) → fast-follow (service-role signed URL; approved=public).
- Shared active-user (`user.status`) API guard across all v1 routes + Upstash rate-limiting (swipe/photo routes
  use the no-op M1 `checkRateLimit` seam) → **M9**.

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

### M5b — Swipe engine UI + match moment (the flagship)
- **`features/swipe/`**: real Framer Motion drag deck (`swipe-card.tsx` — drag/tilt/like-nope stamps,
  velocity fling that must AGREE with drag direction so a recoil can't fling the wrong way), a Zustand
  factory+provider deck store (`store.tsx`, no undo), the worker `SwipeDeck`, the employer `CandidateDeck`
  (contact-free `CandidateCard`), and the **`MatchMoment`** overlay (a11y modal: Escape-close, focus
  trap/restore, body-scroll-lock — all verified in-browser). Optimistic swipe + rollback (409/404 terminal);
  keyset-cursor prefetch; a skeleton (not the empty state) shows while a page is in flight.
- **Pages:** `/feed` (worker) and `/listings/[id]/candidates` (employer, owner-scoped). Header gets a worker
  "Jobs" link; the employer dashboard gets a "Candidates" link per listing. `Feed`/`Candidates`/`Match` i18n (SQ+EN).
- **Chat + contact reveal stay in M6.** The match moment celebrates and says chat unlocks soon.
- Verified in-browser (swipe card + match moment premium; auth gates; no client-bundle issues). Adversarial
  review fixed 4 (wrong-direction fling, prefetch/empty flash, modal a11y, scroll-lock). 64 tests.
- **Note:** `/listings/*` routes have a `loading.tsx`, so unauth requests return a 200 loading shell then
  client-redirect (not a 307) — expected, not an auth bypass.

### M6 — In-App Chat / Realtime (decisions & notes, all user-approved)
- **THE golden-rule reveal point is LIVE and is the ONLY contact crossing.** Contact (surname/phone/email)
  is revealed in exactly one place: `GET /matches/:id` via the `match_detail` SECURITY DEFINER function,
  which returns rows only to the two match parties (a non-party gets 0 rows → 404, existence never leaks).
  Worker-side reveal = the employer's `contact_phone`/`contact_email` exactly as shared (no fallback to
  their account email — data minimization). Inbox + messages carry NO contact (CI test `chat-views.test.ts`).
- **`features/chat/`**: `schemas.ts` (Zod, strict, body 1–2000), `sanitize.ts` (strips control/zero-width/bidi
  on write; render escaping is the XSS defense — no `dangerouslySetInnerHTML`), `types.ts` (+ golden-rule
  mappers), `service/{match,message}.service.ts`, `store.tsx` (SSR chat-thread store factory+provider),
  `hooks/use-match-channel.ts` (private Realtime channel), `components/*` (inbox list, thread, bubble w/
  read ticks, composer, contact bottom-sheet, close/hired actions). Pages `/matches` + `/matches/[id]` with
  loading/empty/error states. Header gets a "Matches" link (both roles).
- **Endpoints (contract §6):** `GET /matches` · `GET/PATCH /matches/:id` (reveal / status) ·
  `GET/POST /matches/:id/messages` · `POST /matches/:id/read`. Non-party match-scoped GETs → **404** (no
  existence leak); PATCH → 403 per contract. Send is soft-gated (verified) + rate-limit seam (M9) + 422 on
  a `closed_*` match.
- **Realtime = PRIVATE per-match Broadcast channel `match:{id}`.** Subscription is authorized by RLS on
  `realtime.messages` (`is_match_party_topic`) — a non-party's *subscribe* is rejected AT THE DATABASE.
  Only the DB publishes (broadcast trigger on message insert + `realtime.send` for read/status); no client
  INSERT policy, so events can't be spoofed. REST is source of truth; client resyncs on reconnect. CSP
  already allowed `wss://*.supabase.co` (M0). Browser Supabase client's first real consumer.
- **`match_status` enum already had all four values** (M5) — no enum change. Status changes via the
  `update_match_status` RPC (matches has no client write policy): worker→closed_by_worker;
  employer→closed_by_employer|hired; only from `active`; terminal. **`hired` writes an `audit_logs` row**
  (north-star metric) — this migration creates the minimal `audit_logs` table (RLS on, server-write only).
- **Cursor lift:** `features/swipe/cursor.ts` → `src/lib/cursor.ts` (chat is a 2nd consumer); 4 imports
  updated, test moved. `MatchMoment` now takes `matchId` + a "Send a message" CTA into the chat.
- **MatchMoment is still employer-only** (Flow-1). A worker discovers a match via the `/matches` inbox;
  a worker-side live "It's a match!" needs push/notifications → **M7**.
- **Migrations `0011` (chat) + `0012` (hardening) applied** to the hosted DB (12/12 in sync). Branch: `m5-matching`.

### M6 — Security review (focused, against docs/security.md) — ALL 5 GATES PASS
Verified at the DB layer with the RLS-limited publishable key + real signed-in sessions (proves the DB
refuses the action, not just app code):
1. **Contact unreachable pre-match** ✅ — pre-match employer / non-party read of `worker_profiles` contact → 0 rows;
   `match_detail` for a non-party → 0 rows; matched party reveal works (positive control).
2. **RLS messages/matches + Realtime, non-party** ✅ — SELECT 0 rows; INSERT (self & impersonating) → RLS 42501;
   `match_messages`/`match_inbox` 0 rows; `mark_match_read` → -1; **Realtime subscribe DENIED by the DB**
   ("Unauthorized … Channel topic"); party subscribe allowed.
3. **Sanitize on write + escape on render (XSS)** ✅ — control/zero-width/bidi stripped; markup stored + rendered
   as one inert text node (0 script/img injected); no `dangerouslySetInnerHTML`.
4. **Message endpoint Zod + rate-limit** ✅/⚠️ — empty/whitespace/>2000/unknown-field/missing → all 400; valid → 201.
   Rate-limit is WIRED (two keys) but a **no-op seam until M9** (same as all mutating routes — a conscious M9 dependency).
5. **Status changes party-only** ✅ — non-party blocked; worker can't `hired`; employer can't `closed_by_worker`.

**Recommended fixes applied (migration `0012` + client), all re-verified:**
- Dropped `match_chat_open` (leaked open-state to non-parties) → inlined into the INSERT policy.
- BEFORE INSERT trigger forces `read_at=null`/`created_at=now()` (a party could otherwise pre-set them via
  direct PostgREST to suppress unread / pin the thread).
- `update_match_status` UPDATE-as-gate → concurrent double-`hired` now yields exactly one audit row + one
  winner (verified with two concurrent RPCs); terminal status can't be overwritten.
- Client: resync no longer drops a sent/failed message (`replaceMessage` guard + `resetLatest` carry-over);
  own-message broadcast reconciles the pending temp instead of duplicating; `onResync` refetches status too;
  composer ignores Enter mid-IME-composition; hostile/garbage cursor now decodes to null → first page (no 500);
  messages page size clamped to 49 (the `+1` has-more sentinel vs the DB cap of 50). 7 new store tests lock these.
- **Deferred (low, cosmetic — NOT in the applied set):** MatchMoment focus-trap re-run refocuses "Go to chat"
  on a parent re-render; `loadOlder` captures the scroll anchor before the await. Follow-up.
- **Test data in the hosted DB:** `m6test.worker`/`m6test.employer` (matched, hired) + `attacker.*` accounts +
  a "Race-test role" listing/match were seeded for review; harmless, left in place (pw kept out of repo).
- **⚠️ Browser note:** the post-fix in-browser send re-check was blocked by a wedged preview renderer
  (screenshots hung on all pages after working earlier); fixes verified instead via live DB tests + unit tests.
  The pre-fix build was fully verified in-browser (match → chat both ways → live delivery → receipts → hired).

### M7 — Notifications (decisions & notes, all user-approved)
- **In-app notifications are created by SECURITY DEFINER triggers** (migration `0013`), best-effort
  (each trigger body swallows errors so a notification bug can NEVER roll back a match/message/swipe):
  `matches` insert → `new_match` for both parties; `messages` insert → `new_message` for the recipient;
  `swipes` right-swipe → `new_candidate` for the listing owner. **Payloads are contact-free** (golden rule):
  `new_candidate` = first name + last initial; match/message carry the post-match display name only.
  CI test: `notifications/__tests__/types.test.ts`. Verified live: 9/9 DB checks (triggers fire, payloads
  contact-free, RLS scopes reads, `mark_notifications_read` RPC is caller-scoped).
- **Endpoints (contract §9):** `GET /notifications` (cursor + `meta.unread_count`), `POST /notifications/read`
  (`{ ids? }`, omit = all, via `mark_notifications_read` RPC). RLS: own-row read only; no client insert/update.
- **UI:** header **bell + server-rendered unread badge** (refreshes on navigation), `/notifications` center
  (mark-all-read, per-item read on open, load-more, loading/empty/error). Nav gets a "Notifications" link/bell.
- **Emails (Resend), dispatched out-of-band by Vercel Cron** (kept out of the swipe/chat hot path):
  `new_match` immediately; `new_message` collapsed per (recipient, match) and only if still unread after a
  5-min offline window (checks `messages.read_at`). `notifications.emailed_at` gates re-sends (idempotent).
  User-derived strings (names, preview) are **HTML-escaped** (`emails/notification-emails.ts`; CI test).
- **Cron (`vercel.json`, `CRON_SECRET`-gated, fail-closed):** `dispatch-emails` (*/2 min), `cleanup-tokens`
  (daily — purge used/expired verification tokens), `close-stale-listings` (daily — close `active` listings
  with no swipe activity for **60 days**; reversible + audit-logged `listing_closed_stale`). Verified: all
  three 401 without/with-wrong bearer; all three 200 with the bearer (dispatch ran end-to-end, 0 sent).
- **Deviations/decisions (approved):** added `notifications.emailed_at` (email-dispatch tracking) + new env
  `CRON_SECRET` (`.env.local` has a **dev placeholder — replace with a long random value**; set it in Vercel).
- **Known limitations (documented in `features/notifications/README.md`):** async (cron) emails **default to
  `sq`** — recipient locale isn't persisted (`users` has no `locale` column; M9 i18n-pass item); **sub-daily
  cron needs Vercel Pro** (Hobby caps at daily); one in-app notification per message (email collapses per
  match); unread badge is server-fetched (a live Realtime badge is optional future polish). No web/push (Phase 2).
- **⚠️ Browser note:** live in-tab interaction was again blocked by a wedged preview renderer (streaming stuck
  on the loading shell); verified instead via the API (`GET /notifications` returns the contact-free payload),
  the fully-streamed page HTML (localized notification + mark-all button + bell badge all present), the cron
  HTTP checks, and 9 live DB checks. Migration `0013` applied (13/13 in sync). Branch: `m5-matching`.

### M8 — Admin Panel (decisions & notes, all user-approved)
- **Defense-in-depth gating, NO service-role for admin ops:** every admin route/page checks
  `requireRole('admin')` AND the DB enforces it — admin READS via new RLS SELECT policies
  (`user_has_role('admin')` on photos/users/listings/matches/worker+employer profiles/reports/
  audit_logs + a storage policy to sign photo previews); admin WRITES via `SECURITY DEFINER admin_*`
  functions (`admin_review_photo`, `admin_suspend_user`, `admin_resolve_report`, `admin_upsert_category`)
  that re-check admin, mutate only the intended columns, and write an `audit_logs` row. Verified live:
  17/17 DB checks (non-admin refused on every path; admin allowed; self-suspend blocked; audit written).
- **`reports` table** (migration `0014`): user-submitted, RLS insert-own (reporter pinned to `auth.uid()`)
  + own-read (`0015`) + admin-read; CHECK exactly-one-target. `POST /reports` (any authed, rate-limit seam,
  Zod, sanitized details). Reusable bilingual `ReportSheet` wired into chat (report a message + the listing).
- **Endpoints (§8+§11):** POST /reports · GET /admin/photos · POST /admin/photos/:id/review (approve wires
  `photo_id`/`logo_id` onto the profile — finishes the M4 pipeline) · GET /admin/reports ·
  POST /admin/reports/:id/resolve (dismiss|suspend_user|remove_listing) · POST /admin/users/:id/suspend ·
  GET/POST /admin/categories · PATCH /admin/categories/:id · GET /admin/metrics · GET /admin/audit.
- **UI:** `(admin)` route group, `requireRole('admin')` layout, **English-only** (CLAUDE.md — not added to the
  SQ/EN catalogs). Dashboard (metric tiles), photo queue (signed-URL previews), report queue, user table
  (suspend), category editor, audit log. Header gets an "Admin" link for admins. Loading/empty/error states.
- **Admin provisioning is manual** (no admin signup — not in MVP scope; `handle_new_user` clamps signup role
  so admin can only be set via service-role/SQL). The verification admin was created + then DELETED (no
  privileged known-password account left in the DB); create one by setting `users.role='admin'`.
- **Two real bugs the live DB verification caught (that lint/typecheck/tests/build all passed):**
  (1) `POST /reports` failed 42501 — `insert…returning id` is subject to SELECT RLS and there was no
  reporter-read policy → fixed in `0015`. (2) `admin_upsert_category` returned a null id — its OUT column
  `id` shadowed `categories.id` in `returning id` → fixed in `0016` (`#variable_conflict use_column` +
  qualified `categories.id`). Both re-verified.
- **⚠️ Browser note:** dev route-discovery glitch (Turbopack) 404'd the new nested `/admin/*` + `/api/v1/admin/*`
  routes until a `next dev` restart (documented gotcha; prod build compiled all). After restart the admin API
  returned real data (metrics/reports/audit 200) and pages render server-side; live in-tab interaction was
  again blocked by the wedged preview renderer, so verified via API + SSR HTML + 17 live DB checks. Migrations
  `0014`+`0015`+`0016` applied (16/16 in sync). Branch: `m5-matching`.

## Reminders for every milestone
- Propose plan + file structure BEFORE writing code; wait for approval.
- Build only the current milestone — no building ahead.
- Contact fields (last_name/phone/email) never exposed pre-match (service layer + RLS).
- RLS on for any new table; Zod on any new input; parameterized queries only.
- Loading / empty / error states on every new screen.
- No Phase-2 features (payments, native, ratings, blocking, 2FA, push, multi-city, professional).
- Commit clearly after each milestone (e.g. "Complete M3: listings CRUD").
