# Development Roadmap — swipe-jobs (Phase 7)

Principle: **build the spine first, then the limbs.** One milestone at a time. Each leaves something
testable. UI/UX polish is woven throughout (design system in M0, onboarding M2, swipe M5, chat M6,
final polish M9) — never deferred to the end where it gets cut.
Difficulty: ⭐ (easy) → ⭐⭐⭐⭐⭐ (hard/risky).

## Dependency order
M0 → M1 → M2 → M3 → M5 → M6 → M7 → M9 → M10 (critical path).
M4 parallels M3 (both need M2). M8 starts once M4 + M5 exist (can overlap M6/M7).
**M5 is the tentpole** — hardest, most valuable, flagship. Protect its time.

---

## M0 — Foundation & Design System ⭐⭐
Repo, Next.js + TS + Tailwind, feature-folder structure. **Design system:** tokens (color/type/
spacing/motion) + core components (button, input, card, sheet, toast, skeleton). Supabase project
(staging + prod), env/secrets. next-intl scaffold (sq/en). CI/CD (GitHub Actions: lint, type-check,
test, build → Vercel preview + prod). Sentry wired.
**Deliverable:** empty but beautiful app shell that deploys, switches language, has a component library.
Depends: none.

## M1 — Authentication & Accounts ⭐⭐
Signup (worker/employer role), login, logout. **Soft-gate email verification** (Resend) + resend +
nudge states. Password reset (no-enumeration). Sessions, `GET /me`, role route protection.
`users` + `cities` tables, RLS baseline.
**Deliverable:** accounts + login + soft-gate verification. Depends: M0.

## M2 — Profiles (Worker + Employer) ⭐⭐
Worker onboarding (thin profile: categories/languages/availabilities/experience/bio). Employer
onboarding (business profile). Reference-data endpoints + seed category/language/business-type lists.
Profile view/edit; visibility toggle. **Onboarding UX polish** (first impression — guided, effortless).
**Deliverable:** both user types have real editable profiles. Depends: M1.

## M3 — Listings ⭐⭐
Create/edit/pause/close listings (employer). Pay validation (min>0, max≥min, required), enums, city
denormalization. Employer "my listings" dashboard (placeholder counts). Listing card component
(premium standard — workers will swipe it).
**Deliverable:** employers post roles; cards render beautifully. Depends: M2.

## M4 — Photos & Moderation Pipeline ⭐⭐⭐
Upload (worker photo / employer logo): validate type/size/dimensions, **strip EXIF**, resize/compress,
private bucket. `photos` table pending→approved gate; placeholder until approved. Wire approved photo
into display.
**Deliverable:** uploads work; nothing unreviewed goes public. Depends: M2 (M8 consumes queue). Risk: med.

## M5 — Swipe Feed & Matching ⭐⭐⭐⭐⭐ (THE CORE + FLAGSHIP)
Feed endpoint (city + category filtered, exclude swiped, cursor pagination, pre-fetch). **Swipe engine
(Framer Motion):** drag physics, tilt, spring-back, velocity fling, optimistic UI. Worker swipe →
interest; employer candidate stack; employer swipe. **Atomic race-safe match creation** (TX + unique
constraint). **"It's a match!" moment.**
**Deliverable:** full core loop end-to-end. Depends: M3. Risk: HIGH. Budget the most time here.

## M6 — In-App Chat (Realtime) ⭐⭐⭐⭐
Match unlocks chat + contact reveal (the golden-rule reveal point). Message send/list (cursor history),
sanitize on write. **Supabase Realtime** delivery; RLS-gated channel per match. Read receipts / unread;
match status incl. **hired**. Chat UI polished (WhatsApp-familiar).
**Deliverable:** matched parties chat in real time; contact revealed correctly. Depends: M5. Risk: med-high.

## M7 — Notifications ⭐⭐
Email (Resend): new match, new message (offline), verification. In-app notification center + unread
badges. Background jobs (Vercel Cron): offline-message emails, token cleanup, stale-listing close.
**Deliverable:** users pulled back by alerts. Depends: M6.

## M8 — Admin Panel ⭐⭐⭐
Photo moderation queue (approve/reject). Report queue + resolve (dismiss/suspend/remove). User
suspension; category management (bilingual). **Health/metrics dashboard** (users, listings, matches,
hires, queue sizes — cold-start visibility). audit_logs surfaced.
**Deliverable:** moderation + marketplace-health visibility. Depends: M4 + M5.

## M9 — Hardening: Security, i18n, Performance ⭐⭐⭐ (cash in the "extra")
Security: finalize RLS all tables, rate limiting live, secure headers/CSP, **contact-hidden-until-match
test as CI gate**, npm audit/secret-scan, authz self-review. i18n: native-quality Albanian pass, all
strings externalized, SQ/EN QA every screen. Performance: feed/swipe latency, image CDN sizing, index
verification vs real query plans, Lighthouse/PWA audit, offline shell. UX: every loading/empty/error
state designed; motion tuned; accessibility basics. Privacy: consent/policy/terms (bilingual),
deletion/erasure flow.
**Deliverable:** secure, fast, polished, legally-covered app. Depends: M7 + M8.

## M10 — Pilot Launch (Ferizaj) ⭐⭐
Seed employers first (hand-recruited) → real listings live → then invite workers (link) so feed looks
populated. Monitoring watch (Sentry, uptime, metrics). **Backup + restore drill BEFORE real users.**
DR runbook finalized. Feedback loop: matches → chats → **confirmed hires** (north-star).
**Deliverable:** live instrumented pilot. Depends: M9.

---

## Where time & risk concentrate
| Milestone | Difficulty | Risk | Why |
|---|---|---|---|
| M0 Foundation | ⭐⭐ | low | Makes everything else fast + premium |
| M5 Swipe & Match | ⭐⭐⭐⭐⭐ | HIGH | The product IS this; flagship UX |
| M6 Realtime Chat | ⭐⭐⭐⭐ | med-high | Retention + hire data |
| M4 Photos/Moderation | ⭐⭐⭐ | med | Safety + privacy correctness |
| M9 Hardening | ⭐⭐⭐ | med | Where "solid/extra" is proven |
Everything else ⭐⭐/low — deliberately, so solo focus lands on M5/M6/M9.

## Scope discipline (€7.5K protection)
Per temptation ask: "Does the core swipe→match→chat loop need this?" If no → Phase 2, documented and
offered as paid work, not silently absorbed. This roadmap IS the €7.5K scope.
**Phase 2 (next contract):** payments · native app · ratings · blocking · 2FA · push · multi-city ·
professional segment.
