# Supabase & Auth setup (M1)

M1 code is complete, but the auth flows need a Supabase project + a little dashboard
config to run. Do this once per environment (staging, prod).

## 1. Create the project & env vars
1. Create a Supabase project (one per environment).
2. In **Project Settings → API keys**, copy the **Publishable** key (`sb_publishable_…`)
   and the **Secret** key (`sb_secret_…`).
3. Fill `.env.local` (see `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...            # server-only, bypasses RLS
   NEXT_PUBLIC_SITE_URL=http://localhost:3000   # canonical origin, no trailing slash
   RESEND_API_KEY=re_...                        # server-only
   RESEND_FROM_EMAIL="SwipeJobs <no-reply@yourdomain.com>"
   ```

## 2. Apply the database migrations
```bash
npx supabase link --project-ref <ref>   # once
npm run db:push                          # applies supabase/migrations/* to the remote
```
This creates `cities` (+ Ferizaj), `users` (+ the `handle_new_user` trigger), and
`email_verifications`, all with RLS on. For local dev with Docker you can instead
`npm run db:reset` against a local stack.

### Storage — photos (M4)
The private **`photos`** bucket and its `storage.objects` RLS policies are created by
migration `20260703000009_create_photos.sql`, so `npm run db:push` provisions them with
**no manual dashboard steps**. Uploads are re-encoded (EXIF/GPS stripped) and stored
`pending`; an approved photo is served via a short-lived signed URL. The admin approve/
reject UI lands in **M8** — until then, approve a photo for testing by setting
`photos.status = 'approved'` and pointing `worker_profiles.photo_id` / `employer_profiles.logo_id`
at it via SQL.

## 3. Dashboard configuration (Auth)
1. **Authentication → Providers → Email:** turn **"Confirm email" OFF.** We run a
   *soft gate* — users sign in immediately; `users.email_verified_at` (stamped by our
   own Resend verification link) is the source of truth for match/chat access (M5/M6).
2. **Authentication → URL Configuration → Redirect URLs:** allowlist
   `http://localhost:3000/**` and your Vercel preview/prod origins (e.g.
   `https://<app>.vercel.app/**`). Missing entries = "works locally, breaks in prod".
3. **Password reset email template:** ensure the link uses the `token_hash` +
   `type=recovery` form pointing at `/auth/confirm?next=/update-password` (PKCE/SSR),
   not the legacy hash-fragment link.
4. **(Recommended) Custom SMTP → Resend:** wire Resend as the SMTP provider so the
   password-reset email also goes through Resend and isn't capped at 2/hour. The
   *verification* email already sends via the Resend API directly.

## 4. Resend
1. Create a Resend API key and verify your sending domain.
2. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a verified sender).

## Notes
- Admins are **never** created via public signup — the trigger + Zod clamp `role` to
  `worker`/`employer`. Provision admins via SQL / the secret-key client.
- Rate limiting is a no-op seam in M1 (Supabase's built-in auth limits are the
  backstop); real Upstash limiting lands in M9.
