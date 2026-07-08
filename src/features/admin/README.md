# admin — Admin Panel (M8)

Moderation + marketplace-health tooling for staff. **English-only** (CLAUDE.md), gated
by **two layers** (defense in depth): the app checks `requireRole('admin')` on every
route/page **and** the database enforces it — admin READS via RLS SELECT policies
(`user_has_role('admin')`), admin WRITES via `SECURITY DEFINER admin_*` functions that
re-check admin and mutate only the intended columns + write an `audit_logs` row. **No
service-role client** is used for admin ops.

## Surface (contract §11 + §8)

- **Dashboard** `/admin` — metric tiles (users by role, listings by status, matches,
  hires, pending-photo + open-report queue sizes). `GET /admin/metrics`.
- **Photos** `/admin/photos` — pending moderation queue with signed-URL previews;
  approve (wires `photo_id`/`logo_id` onto the owner profile — finishing the M4
  pipeline) / reject. `GET /admin/photos`, `POST /admin/photos/:id/review`.
- **Reports** `/admin/reports` — open queue; dismiss / suspend_user / remove_listing.
  `GET /admin/reports`, `POST /admin/reports/:id/resolve`.
- **Users** `/admin/users` — list + suspend (with reason; never self, never other
  admins). `POST /admin/users/:id/suspend`.
- **Categories** `/admin/categories` — bilingual create/edit. `GET/POST /admin/categories`,
  `PATCH /admin/categories/:id`.
- **Audit log** `/admin/audit` — the `audit_logs` trail, cursor-paginated. `GET /admin/audit`.

## Reporting (user-facing, feeds the queue — `src/features/reports/`)

`POST /reports` (any authed, rate-limit seam, Zod: exactly one target, sanitized
details) inserts under RLS ("user files own report" — reporter pinned to `auth.uid()`).
A reusable bilingual `ReportSheet` is wired into chat: **report a received message**
(hover control on the bubble) and **report the listing** (in the contact sheet). The
endpoint also supports user-targeted reports; more entry points are a small follow-up.

## Admin provisioning

There is no admin signup (not in MVP scope). Create an admin by setting
`users.role = 'admin'` via the service-role client / SQL. Suspended users are blocked
at login (M1); a mid-session API status guard is the M9 shared active-user guard.
