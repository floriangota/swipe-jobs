# Features

Feature-folder structure (see `CLAUDE.md`). Each feature is built in its own
milestone and follows the same layering:

```
route / server action  ->  service (business logic + authz)  ->  data-access  ->  DB
```

Rules that apply to every feature as it is built:

- **Authorization in the service layer AND Postgres RLS** (defense in depth).
- **Zod validation** on every input; reject unknown fields.
- **Golden rule:** contact fields (`last_name`, `phone`, `email`) never appear in
  a response unless a `matches` row exists between requester and subject.
- Every screen ships designed **loading / empty / error** states.

These folders are intentionally **empty in M0** — they are placeholders that fix
the structure. Do not build ahead of the current milestone.

| Folder | Milestone |
|--------|-----------|
| `auth` | M1 — Authentication & Accounts |
| `profiles` | M2 — Worker + Employer profiles |
| `listings` | M3 — Listings |
| `photos` | M4 — Photos & Moderation |
| `swipe` | M5 — Swipe Feed & Matching (the core) |
| `chat` | M6 — In-App Chat (Realtime) |
| `notifications` | M7 — Notifications |
| `admin` | M8 — Admin Panel |
