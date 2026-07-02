# Security & Privacy — swipe-jobs (Phase 6)

Mindset: assume the client is hostile, the network is watched, someone will try to break this.
Two worst-case outcomes to prevent: **data leak** (contact info pre-match, or chat) and **abuse**
(harassment, fakes, spam).

## OWASP Top 10 — mitigations
- **A01 Broken Access Control (THE #1 risk):** authz in service layer **+ Postgres RLS** (defense in
  depth). Users access only their own data; employers see only their listing's candidates; only match
  parties read a chat. Contact fields stripped unless a match exists. UUID PKs (non-enumerable).
  Every endpoint has an explicit auth level.
- **A02 Cryptographic Failures:** HTTPS/TLS everywhere; passwords bcrypt (Supabase Auth); DB + storage
  encrypted at rest; no sensitive data in URLs/logs/JWTs.
- **A03 Injection:** parameterized queries only; Zod validation; free text sanitized on write + escaped
  on render (React default; no `dangerouslySetInnerHTML`).
- **A04 Insecure Design:** threat-modeled from the start — contact-hidden-until-match,
  photo-approval-before-public, Flow-1 (no browsing all workers).
- **A05 Security Misconfiguration:** secure headers; generic client errors (details → Sentry);
  least-privilege DB roles; RLS ON everywhere; no default/dev creds in prod.
- **A06 Vulnerable Components:** `npm audit` in CI, Dependabot, minimal dependency surface.
- **A07 Auth Failures:** Supabase Auth; httpOnly SameSite cookies; rotated refresh tokens; mandatory
  email verification (soft-gate); rate-limited login; generic failure messages (no enumeration).
- **A08 Data Integrity:** CI gates (lint/type/test/build) before deploy; migrations versioned, staged first.
- **A09 Logging/Monitoring:** structured logs; `audit_logs` for security events; Sentry; uptime monitor.
  **No PII/secrets in logs.**
- **A10 SSRF:** minimal fixed outbound calls (Resend/Supabase only); no user-supplied URLs fetched server-side.

## Authentication
- bcrypt via Supabase Auth (never plaintext, never logged, never returned).
- Password policy: min length ≥8, reject breached/common; length > symbol-soup (NIST guidance).
- **Soft-gate email verification:** onboard/browse immediately; **cannot match/chat/be shown** until verified.
- Sessions: httpOnly + Secure + SameSite cookies (NOT localStorage). Short access token + rotating refresh.
- Login: rate-limited, generic "invalid credentials", backoff on repeated failures.
- Password reset: single-use, short-expiry token; request endpoint always 200 (no enumeration).
- Admin: separate elevated role; 2FA recommended (Phase 2).

## Authorization (core of the app)
- Two layers: **service-layer checks** (authed? role? owns/party-to? sensitive-field allowed?)
  **+ Postgres RLS** (DB refuses forbidden rows even if app logic has a bug).
  - messages: readable only where user is party to the parent match.
  - worker last_name/phone: exposed only when a match with the requesting employer exists.
  - listings/candidates: employer reads candidates only for listings they own.
- **Golden-rule CI test:** contact fields ABSENT from every pre-match response — required release gate.
- IDOR prevention: UUID PKs + ownership checks on every `:id` route.
- Role is server-controlled; client cannot self-assign admin.

## Rate limiting (per user/IP, 429 + Retry-After)
signup (tight/IP) · login + password-reset (tight/IP + /account) · swipes (generous, capped) ·
messages (moderate/match + global/user) · reports (moderate/user) · photo upload (tight).
Implement via Vercel middleware / edge limiter (e.g. Upstash) keyed by user id + IP.

## Encryption & secrets
- In transit: TLS 1.2+, HSTS. At rest: Supabase encrypts DB + storage.
- Photos: **private** bucket; public only via CDN URL AFTER approval.
- **No secrets in git** (.env gitignored, .env.example committed). Secrets in Vercel/Supabase secret
  stores, separated per environment. **Service-role key server-only**; client gets RLS-limited anon key.
- Rotation runbook: leaked key → rotate + redeploy.

## Input validation
- Zod on every endpoint (type/length/format/enum/reject-unknown). Server is source of truth.
- Guards: pay_min>0, pay_max≥pay_min, length caps (bio/description/messages), valid+active
  category/language IDs.
- Uploads: MIME + magic-byte check (not extension), size + dimension caps, image re-encoded server-side.

## SQL injection / XSS / CSRF
- **SQLi:** parameterized/prepared statements only (Supabase client / typed data layer). RLS backstop.
- **XSS:** React auto-escape; `dangerouslySetInnerHTML` banned (lint); sanitize free text on write;
  CSP header restricts script sources.
- **CSRF:** SameSite cookies (primary); same-origin fetches; CSRF tokens for any classic form posts;
  CORS locked to own origin.

## Secure headers (global)
HSTS · CSP (allow Supabase + Sentry + CDN only) · X-Content-Type-Options: nosniff ·
X-Frame-Options: DENY / frame-ancestors 'none' · Referrer-Policy: strict-origin-when-cross-origin ·
Permissions-Policy (disable unused features).

## Privacy (Kosovo LPPD / GDPR-equivalent)
- Data minimization (thin profiles, surname/contact hidden pre-match, city-only, EXIF stripped).
- Purpose limitation (matching only; no selling).
- Consent: bilingual Privacy Policy + Terms at signup; document lawful basis.
- Right to access & erasure: deletion flow (soft-delete → cascade hard-delete after grace).
- Breach readiness: DR runbook includes regulator + user notification.
- Chat privacy: RLS-enforced; admin reads message content only via reported-message flow, audit-logged.

## Abuse & trust
- Reporting (profiles/listings/messages) → admin queue.
- Photo-approval-before-public. Suspension (suspended users can't log in — status checked at auth).
- Rate limits on messaging/reporting. **User-to-user block = early Phase 2** (recommended, not MVP).

## Security in CI/CD
- `npm audit` + Dependabot; secret-scanning (gitleaks).
- **Contact-hidden-until-match + authz tests run on every PR — failure blocks deploy.**
- Staging mirrors prod config.

## Phase 2 (accepted as NOT-MVP)
admin 2FA · user-to-user block.
