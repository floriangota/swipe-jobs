# reports — user-submitted reports (M8)

User-facing reporting that feeds the M8 admin report queue.

- `POST /reports` (🔒 any authed, rate-limit seam) — Zod requires **exactly one target**
  (`reported_user_id` | `reported_listing_id` | `reported_message_id`) + a reason enum;
  `details` is sanitized on write. Inserted under RLS ("user files own report"), so the
  reporter is pinned to `auth.uid()`; FK constraints reject a target that doesn't exist.
- `components/report-sheet.tsx` — a reusable **bilingual** bottom sheet, wired into chat
  (report a received message + report the listing). Admin resolution lives in
  `src/features/admin/` (dismiss / suspend_user / remove_listing).
