-- M1: app-managed email verification tokens (soft-gate). Only the SECRET-key
-- server client touches this table, so RLS is ON with NO client policies.

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Look up by hash on confirm; list by user for resend cooldown checks.
create index if not exists email_verifications_token_hash_idx
  on public.email_verifications (token_hash);
create index if not exists email_verifications_user_id_created_idx
  on public.email_verifications (user_id, created_at desc);

alter table public.email_verifications enable row level security;
-- Intentionally NO policies: the anon/authenticated (RLS-bound) clients can never
-- read or write tokens. All access is via the service-role client on the server.
