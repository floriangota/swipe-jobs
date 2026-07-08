# chat — in-app chat + the contact reveal (M6)

A match unlocks chat and reveals contact — **the golden-rule reveal point**. Contact
(surname/phone/email) crosses the pre-match wall in exactly ONE place: the
`match_detail` SECURITY DEFINER function behind `GET /matches/:id`, which yields rows
only to the two parties of a `matches` row. Everything else (inbox, messages) is
contact-free by construction, with CI tests (`__tests__/chat-views.test.ts`).

## Layers

- **Routes** (`src/app/api/v1/matches/**`): GET /matches (inbox) · GET+PATCH
  /matches/:id (detail/reveal + status) · GET+POST /matches/:id/messages ·
  POST /matches/:id/read. Zod on every input; message send is rate-limited
  (global + per-match keys via the M1 seam) and soft-gated on email verification.
- **Services** (`service/*.service.ts`): thin RLS-client/RPC calls returning
  discriminated unions the routes map to status codes.
- **DB** (migration `..000011_create_chat.sql`): `messages` (party-only RLS: SELECT
  for parties, INSERT for verified parties into open matches; immutable rows),
  `audit_logs` (server-only), and the functions `is_match_party`, `match_inbox`,
  `match_detail`, `match_messages` (SECURITY INVOKER — messages RLS is the guard),
  `mark_match_read`, `update_match_status` (transition rules: only from `active`;
  worker → closed_by_worker; employer → closed_by_employer | hired; terminal;
  `hired` writes the audit_logs row — the north-star metric).
- **Realtime**: PRIVATE Broadcast channel `match:{id}` per match. Subscription is
  authorized by RLS on `realtime.messages` (`is_match_party_topic`) — a non-party's
  subscribe is rejected at the database. Only the DB publishes (broadcast trigger on
  message insert + `realtime.send` for read/status events); there is no client INSERT
  policy, so events can't be spoofed. REST is the source of truth; the client resyncs
  on reconnect.
- **UI**: `/matches` (inbox: unread counts, status chips, load-more) and
  `/matches/[id]` (thread: optimistic send + failed/retry, read ticks, day
  separators, contact bottom-sheet, close/hired actions). Zustand store-factory +
  provider (`store.tsx`), seeded server-side. Messages render as React TEXT nodes —
  `sanitize.ts` strips control/invisible chars on write; React escaping neutralizes
  markup on render (no `dangerouslySetInnerHTML`, lint-enforced).

## Deliberate choices

- Non-party requests read as **404** (not 403) on match-scoped GETs — match existence
  never leaks (PATCH distinguishes 403 per the contract, via the RPC).
- Chat stays open on `hired`; `closed_*` returns 422 `match_closed` on send.
- Worker-side contact = employer's `contact_phone`/`contact_email` exactly as the
  employer chose to share (no fallback to their account email — data minimization).
- New-match / new-message notifications (email + in-app) are **M7**.

## Post-review hardening (migration `…0012`)

From the M6 security review (all verified at the DB layer):
- Dropped the standalone `match_chat_open` RPC (it leaked open-state to non-parties);
  the status gate is now inlined into the messages-INSERT policy.
- A BEFORE INSERT trigger forces `read_at = null` / `created_at = now()` so a party
  posting directly to PostgREST can't suppress an unread badge or pin the thread.
- `update_match_status` makes the UPDATE itself the atomic gate
  (`… where status = 'active'` + row-count), so a concurrent double-`hired` can't
  double-write the `match_hired` audit row (the north-star metric) or overwrite a
  terminal status.
