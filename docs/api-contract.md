# API Contract — swipe-jobs (Phase 5)

## Conventions
- Base path: **`/api/v1`** (versioned from day one).
- Auth via Supabase Auth (secure httpOnly cookie). Auth levels:
  🔓 Public · 🔒 Any authed · 👷 Worker · 🏢 Employer · 🛡️ Admin
- **Success:** `{ "data": {…}, "meta": {…} }` (meta only when paginating).
- **Error:** `{ "error": { "code": "…", "message": "…", "fields": {…} } }`.
- Status codes: 200 · 201 · 204 · 400 validation · 401 unauth · 403 forbidden · 404 · 409 conflict
  · 422 semantic · 429 rate-limited · 500.
- **Zod validation on every input**; reject unknown fields.
- **Pagination: cursor-based** (`?cursor=…&limit=…`).
- **GOLDEN RULE (enforced server-side + RLS):** `last_name`, `phone`, `email` are NEVER in a
  response unless a `matches` row exists between requester and subject.

---

## 1. Auth & Account
- 🔓 `POST /auth/signup` — `{email,password,role,locale}` → 201 `{user_id, email_verification_required}`.
  Sends verification email. Errors: 400, 409 (email taken). Rate-limited.
- 🔓 `POST /auth/login` — `{email,password}` → 200 (sets cookie) `{user}`. 401 bad creds (generic),
  403 suspended. Rate-limited.
- 🔒 `POST /auth/logout` → 204.
- 🔓 `POST /auth/verify-email` — `{token}` → 200. 400/410 invalid/expired.
- 🔓 `POST /auth/request-password-reset` — `{email}` → **always 200** (no enumeration). Rate-limited.
- 🔓 `POST /auth/reset-password` — `{token,new_password}` → 200. 400/410.
- 🔒 `GET /me` → 200 `{user, profile}`. 401.

## 2. Worker Profile 👷
- 👷 `POST /worker/profile` — `{first_name,last_name,bio,experience_level,phone,availabilities[],
  category_ids[],language_ids[]}` → 201. 400, 409 (exists).
- 🔒 `GET /worker/profile/:id` → 200. Contact fields (last_name, phone) included ONLY if requester
  is an employer matched with this worker; else first_name + last initial, stripped. 404.
- 👷 `PATCH /worker/profile` (partial) → 200. 400.
- 👷 `PATCH /worker/profile/visibility` — `{is_visible}` → 200.

## 3. Employer Profile & Listings 🏢
- 🏢 `POST /employer/profile` — `{business_name,business_type_id,description}` → 201. 409.
- 🔒 `GET /employer/profile/:id` → 200 (no contact pre-match). 404.
- 🏢 `PATCH /employer/profile` → 200.
- 🏢 `POST /listings` — `{category_id,title,description,job_type,required_experience,pay_min,
  pay_max,pay_period}` → 201. 400 (pay_min≤0, pay_max<pay_min, missing pay), 403.
- 🏢 `PATCH /listings/:id` (incl. status active/paused/closed) → 200. 403, 404.
- 🏢 `GET /listings/mine` → 200 paginated (+ interested/matched counts).
- 🔒 `GET /listings/:id` → 200. 404.

## 4. Swipe Feed & Swiping 👷
- 👷 `GET /feed?cursor=…&limit=…` → 200 `{data:[listing cards], meta:{next_cursor}}`.
  Active listings, worker's city, matching interested categories, exclude already-swiped. 401,403.
- 👷 `POST /listings/:id/swipe` — `{direction}` → 201 `{swiped,interest_registered}`.
  409 already swiped, 404 gone/closed, 403. Idempotent (repeat = clean 409).

## 5. Employer Candidate Stack & Matching 🏢
- 🏢 `GET /listings/:id/candidates` → 200 paginated. Workers who right-swiped this listing and the
  employer hasn't swiped yet. **No contact fields** (pre-match). 403 (not owner), 404.
- 🏢 `POST /listings/:id/candidates/:workerId/swipe` — `{direction}`:
  - right + worker already interested → **match created atomically** (TX + UNIQUE constraint) →
    contact unlocks, chat opens, both notified → 201 `{matched:true, match_id}`.
  - left → 201 `{matched:false}`.
  - 409 already swiped, 403, 404.

## 6. Matches & Chat 🔒
- 🔒 `GET /matches` → 200 paginated (unlocked counterpart info + last message + unread count).
- 🔒 `GET /matches/:id` → 200 (**contact revealed here** — surname/phone/email). 403 (not a party), 404.
- 🔒 `GET /matches/:id/messages?cursor=…` → 200 (ordered by created_at). 403.
- 🔒 `POST /matches/:id/messages` — `{body}` → 201. Verify party → sanitize (anti-XSS) → insert →
  Realtime push → offline recipient = queue email. 403, 400 (empty/too long), 422 (match closed).
  Rate-limited.
- 🔒 `POST /matches/:id/read` → 204.
- 🔒 `PATCH /matches/:id` — `{status: closed_by_worker|closed_by_employer|hired}` → 200 (hired writes
  audit_log — north-star metric). 403.
- Realtime delivery via Supabase Realtime (client subscribes to match channel, RLS-gated). REST is
  source of truth + history; Realtime is the live push.

## 7. Photos / Uploads 🔒
- 🔒 `POST /photos` (multipart) → validate type/size/dimensions → **strip EXIF** → compress/resize →
  private bucket → row status=pending → 201 `{photo_id,status:"pending"}`. 400, 413, 429.
  Profile shows placeholder until approved.
- 🔒 `DELETE /photos/:id` → 204. 403.

## 8. Reporting 🔒
- 🔒 `POST /reports` — `{reported_user_id|reported_listing_id|reported_message_id, reason, details}`
  → 201 `{report_id,status:"open"}`. 400 (no target). Rate-limited.

## 9. Notifications 🔒
- 🔒 `GET /notifications?cursor=…` → 200 (+ unread count).
- 🔒 `POST /notifications/read` — `{ids[]}` or all → 204.

## 10. Reference data
- 🔓 `GET /categories` → 200 (active, bilingual). Cacheable.
- 🔓 `GET /languages` → 200 (bilingual). Cacheable.
- 🔓 `GET /cities` → 200 (Ferizaj only now).
- 🔓 `GET /business-types` → 200.
(Public so onboarding can load them pre-auth.)

## 11. Admin 🛡️
- 🛡️ `GET /admin/photos?status=pending` → 200.
- 🛡️ `POST /admin/photos/:id/review` — `{decision: approved|rejected}` → 200 (links to profile if
  approved; audit_log).
- 🛡️ `GET /admin/reports?status=open` → 200.
- 🛡️ `POST /admin/reports/:id/resolve` — `{action: dismiss|suspend_user|remove_listing, note}` → 200 (audit_log).
- 🛡️ `POST /admin/users/:id/suspend` — `{reason}` → 200.
- 🛡️ `GET /admin/categories` · `POST` · `PATCH` (bilingual) → 200/201.
- 🛡️ `GET /admin/metrics` → 200 (users, listings, matches, hires, queue sizes — cold-start visibility).

## 12. System
- 🔓 `GET /health` → 200 `{status:"ok"}`.

---

## Key flow — worker right-swipes then matches
1. `POST /listings/42/swipe {right}` → worker enters listing 42's stack.
2. Employer `GET /listings/42/candidates` → sees worker card (no contact).
3. Employer `POST /listings/42/candidates/{worker}/swipe {right}` → TX inserts employer_swipe +
   match (unique) → `{matched:true, match_id}`.
4. Both notified (email + in-app). Contact unlocked. Chat opens.
