# notifications — in-app center + transactional email + cron (M7)

Users are pulled back by alerts: an in-app notification center with an unread badge,
transactional emails (new match, offline new message; verification lives in M1), and
Vercel Cron background jobs. **No web/push notifications — that's Phase 2.**

## How it works

- **In-app notifications are created by DB triggers** (`…0013`, SECURITY DEFINER, same
  style as M6's broadcast trigger) so they're atomic with the event and never
  forgotten — and **best-effort**: each trigger body swallows errors so a notification
  bug can never roll back a match, a message, or a swipe.
  - `matches` insert → one `new_match` per party.
  - `messages` insert → one `new_message` for the recipient.
  - `swipes` right-swipe → one `new_candidate` for the listing owner.
  - Payloads are **contact-free** (golden rule): `new_candidate` carries first name +
    last initial; match/message carry the post-match display name, never phone/email/
    surname alone. CI test: `__tests__/types.test.ts`.
- **Endpoints** (contract §9): `GET /notifications` (cursor + `meta.unread_count`) ·
  `POST /notifications/read` (`{ ids? }`, omit = all). Read receipts go through the
  `mark_notifications_read` RPC (scoped to `auth.uid()`); RLS gives own-row read only,
  no client insert/update.
- **UI**: header bell + server-rendered unread badge; `/notifications` center
  (mark-all-read, per-item read on open, load-more, loading/empty/error states).
- **Emails** are dispatched **out-of-band by cron** (kept out of the swipe/chat hot
  path). `email-dispatch.service.ts` (service-role): `new_match` immediately;
  `new_message` collapsed per (recipient, match) and only if still unread after a
  5-minute offline window (checks the message's `read_at`). `emailed_at` gates
  re-sends (idempotent). User-derived strings (names, preview) are HTML-escaped
  (`emails/notification-emails.ts`).
- **Cron** (`vercel.json`, `CRON_SECRET`-gated, fail-closed): `dispatch-emails`
  (every 2 min), `cleanup-tokens` (daily — purge used/expired verification tokens),
  `close-stale-listings` (daily — close active listings with no swipe activity for
  60 days; reversible + audit-logged).

## Known limitations / deferrals

- **Async email locale defaults to `sq`** — recipient locale isn't persisted per user
  (`users` has no `locale` column). Ferizaj is Albanian-first; a `users.locale` column
  is an M9 i18n-pass item. The synchronous verification email still honors the cookie.
- **Sub-daily cron needs Vercel Pro** (Hobby caps crons at daily). `dispatch-emails`
  is scheduled every 2 min; adjust the schedule or plan at deploy.
- **One notification per message** (no in-app collapse); email delivery *does* collapse
  per match. In-app grouping is a possible M9 polish.
- Unread badge is **server-rendered** (refreshes on navigation); a live badge via a
  per-user Realtime channel is optional future polish.
