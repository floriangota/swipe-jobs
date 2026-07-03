-- M3: listings (an employer posts hourly/shift roles) + RLS.
-- Owner-scoped only in M3. The worker-facing "read active listings" SELECT policy
-- (the swipe feed) lands in M5 — do NOT add it here.

-- Fixed-attribute enums (values must match the Zod enums in features/listings/schemas.ts).
-- required_experience reuses public.experience_level (defined in M2) so a listing's
-- requirement and a worker's experience stay aligned for feed matching in M5.
create type public.job_type as enum ('full_time', 'part_time', 'shift', 'temporary');
create type public.pay_period as enum ('hourly', 'monthly');
create type public.listing_status as enum ('active', 'paused', 'closed');

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  employer_profile_id uuid not null references public.employer_profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete restrict, -- denormalized from the employer (fast city-filtered feed in M5)
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 1000),
  job_type public.job_type not null,
  required_experience public.experience_level not null,
  pay_min int not null check (pay_min > 0), -- integer minor units (EUR cents)
  pay_max int check (pay_max is null or pay_max >= pay_min), -- null = exact pay
  pay_period public.pay_period not null,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hot path for the M5 worker feed (city + status + category). Created now because
-- the index belongs to the table, even though the feed query itself is M5.
create index if not exists listings_feed_idx on public.listings (city_id, status, category_id);
create index if not exists listings_employer_idx on public.listings (employer_profile_id);
create index if not exists listings_status_idx on public.listings (status);

create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- Ownership helper (SECURITY INVOKER: honors RLS on employer_profiles, so it only
-- returns true for a listing whose employer_profile belongs to the caller).
create or replace function public.owns_employer_profile(p_employer_profile_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.employer_profiles ep
    where ep.id = p_employer_profile_id and ep.user_id = (select auth.uid())
  );
$$;

-- Verification + city helpers (SECURITY DEFINER: read the caller's users row
-- regardless of RLS). These push two invariants down to the DB layer so they hold
-- even against direct PostgREST access with the publishable key (defense in depth,
-- same pattern as user_has_role in migration 0007):
--   1. Only a verified employer may write listings (the M3 soft-gate — mirrors the
--      user.emailVerified check in listing.actions.ts).
--   2. A listing's denormalized city_id must equal the owner's city (it is copied
--      server-side from the employer; never trusted from the client).
create or replace function public.user_is_verified()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.email_verified_at is not null
  );
$$;

create or replace function public.current_user_city_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select u.city_id from public.users u where u.id = (select auth.uid());
$$;

alter table public.listings enable row level security;

-- M3 = owner-scoped only (an employer manages their own listings). Writes also
-- require role = 'employer' (defense in depth with the service layer). The
-- worker-facing SELECT of active listings is added in M5 (swipe feed).
create policy "employer reads own listings" on public.listings
  for select to authenticated
  using (public.owns_employer_profile(employer_profile_id));

create policy "employer inserts own listings" on public.listings
  for insert to authenticated
  with check (
    public.owns_employer_profile(employer_profile_id)
    and public.user_has_role('employer')
    and public.user_is_verified() -- soft-gate: unverified employers cannot post
    and city_id = public.current_user_city_id() -- city is denormalized from the owner
  );

create policy "employer updates own listings" on public.listings
  for update to authenticated
  using (public.owns_employer_profile(employer_profile_id))
  with check (
    public.owns_employer_profile(employer_profile_id)
    and public.user_has_role('employer')
    and public.user_is_verified() -- soft-gate: unverified employers cannot edit / change status
  );

-- No DELETE policy: listings are closed (status = 'closed'), never hard-deleted.
-- (They cascade only if the parent employer_profile is deleted.)
