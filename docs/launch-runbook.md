# Launch & Operations Runbook — swipe-jobs (M10, Ferizaj pilot)

Operational procedures for the pilot. Owner: Florian. Keep this current.

---

## 0. Pre-launch checklist (do in order)

1. [ ] **PR #2 merged to `main`** (M5→M9). CI green (lint · type-check · golden-rule gate · test · build · secret-scan · npm audit).
2. [ ] **Supabase prod project** decided: pilot may reuse the current hosted project, but for a clean launch create a **separate prod project** (security.md) and run `supabase db push` against it (applies migrations `0001`→`0018`).
3. [ ] **Storage bucket** `photos` exists (created by migration `0009`) and is **private**.
4. [ ] **Vercel project** linked to the GitHub repo; **production env vars set** (see §1). `main` auto-deploys to production; other branches get preview deploys.
5. [ ] **Cron enabled**: `vercel.json` declares 3 crons. Sub-daily (`dispatch-emails`, every 2 min) requires a **Vercel Pro** plan; on Hobby, reduce to daily or upgrade.
6. [ ] **Resend**: domain verified, `RESEND_FROM_EMAIL` uses that domain (avoids spam).
7. [ ] **Sentry**: DSN set; first error/transaction visible after deploy.
8. [ ] **Rotate any credential** that ever touched `.env.local` on a shared machine (the pilot used a dev placeholder `CRON_SECRET`).
9. [ ] **Seed employers first** (§3), confirm listings render, then invite workers (§4).
10. [ ] **Backup/restore drill done** (§5) **before** real users.

---

## 1. Production environment variables (Vercel)

Set for the **Production** environment (and Preview where useful). `NEXT_PUBLIC_*` are inlined at build time — set them BEFORE the production build.

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (RLS-limited, safe in browser) |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` — **server only**, never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | the production URL, e.g. `https://swipejobs.vercel.app` (used for email links) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | transactional email |
| `CRON_SECRET` | long random value; Vercel Cron sends it as `Authorization: Bearer …` |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | monitoring + source-map upload |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | **recommended** for distributed rate limiting (multi-instance). Without them, rate limiting falls back to per-instance in-memory. |

---

## 2. Monitoring (watch daily during the pilot)

- **Sentry** — errors + performance; `enabled` only in production. Session Replay is intentionally OFF (golden-rule PII).
- **Vercel** — deploy status, function logs, cron run history (`/api/cron/*` should return 200 with a `Bearer CRON_SECRET`).
- **Supabase** — DB health, storage usage, auth logs; Postgres logs for RLS denials (`42501`).
- **North-star metric** — confirmed hires: `select count(*) from audit_logs where action = 'match_hired';` (also on `/admin`).
- **Admin dashboard** `/admin` — pending photos + open reports queue sizes, users/listings/matches/hires. Promote your account: `update public.users set role='admin' where email='you@…';` (via the service-role SQL editor).

---

## 3. Seed hand-recruited employers (do this FIRST)

Use `scripts/seed-employer.mjs` (reads `.env.local` / prod env for the service-role key). For each real, consented employer:

```
node scripts/seed-employer.mjs \
  --email "owner@business.com" --password "<temp>" \
  --business "Café Ballkoni" --phone "+383…" --contact-email "hr@business.com" \
  --title "Barista" --category barista --pay-min 350 --pay-max 400 --pay-period hourly --job-type part_time
```

It creates a verified employer account + profile + one active listing. Share the temp password; they change it via password reset. Repeat per role. Verify each listing shows in a worker's feed before inviting workers.

---

## 4. Invite workers

Once several employers have live listings (so the feed looks populated), share the signup link. Workers onboard → swipe → the loop is live. Watch the funnel: signups → swipes → matches → chats → **confirmed hires** (north-star).

---

## 5. Backup + restore drill (REQUIRED before real users)

Supabase takes automated daily backups (Pro adds Point-in-Time Recovery). **Prove restore works before launch:**

1. **Snapshot**: in Supabase → Database → Backups, note the latest backup (or trigger one). On Pro, note the PITR window.
2. **Drill on a THROWAWAY project** (never restore over prod): create a temp Supabase project, restore the backup (or re-run `supabase db push` + a data dump) into it.
3. **Verify**: row counts for `users`/`listings`/`matches`/`messages` match; run the golden-rule sanity — a non-party still can't read another match (`select * from matches` as a non-party returns 0).
4. **Record** the restore time (RTO) and the newest recoverable point (RPO) here: RTO = ____, RPO = ____.
5. **Storage**: photos live in the `photos` bucket — confirm the bucket is included in the backup plan (Supabase storage is backed up separately from Postgres; export critical objects if needed).
6. Tear down the throwaway project.

Re-run this drill after any major schema change.

---

## 6. Incident response

- **Suspected data leak / golden-rule failure** → treat as SEV-1. Take the app to maintenance if needed (pause the Vercel deployment), reproduce, patch, add a regression test, redeploy. Under Kosovo LPPD/GDPR, a personal-data breach requires notifying the supervisory authority (and affected users where high-risk) — see §8.
- **Abuse (harassment/spam/fakes)** → moderate via `/admin` (suspend user, remove listing, review photos). Reports queue surfaces them.
- **Outage** → check Vercel status + Supabase status; roll back to the previous Vercel deployment (Deployments → Promote a known-good one).

---

## 7. Secret rotation

Leaked/rotated key → generate a new one in the provider (Supabase / Resend / Upstash / Sentry / `CRON_SECRET`), update the Vercel env var, redeploy. The service-role key is the most sensitive — rotate immediately if exposed. `.env` is gitignored; never commit secrets (gitleaks in CI is the backstop).

---

## 8. Privacy / breach readiness (Kosovo LPPD / GDPR-equivalent)

- **Data controller** contact + a monitored `privacy@…` inbox (referenced in `/privacy`).
- **Erasure**: users self-serve delete from their profile (removes all their data + storage); handle contact-us requests for edge cases.
- **Access requests**: fulfil from the DB (a user's `users`/profile/matches/messages rows) on request.
- **Breach notification**: on a personal-data breach, notify the supervisory authority without undue delay (target ≤72h) and affected users if high-risk. Keep an incident log.

---

## 9. Known operational notes

- **Sub-daily cron needs Vercel Pro** (Hobby caps crons at daily).
- **Rate limiting** is per-instance in-memory unless Upstash is configured — set Upstash for correct multi-instance limits.
- **Async (cron) emails default to Albanian** (`sq`) — recipient locale isn't persisted yet.
- **Admin is created via SQL** (`role='admin'`), no admin signup.
- Test/demo accounts (`m6test.*`, `attacker.*`) exist in the current hosted DB — **do not carry them into a clean prod project**.
