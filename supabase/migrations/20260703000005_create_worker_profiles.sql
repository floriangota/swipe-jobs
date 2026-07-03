-- M2: worker_profiles (1:1 with a worker user) + join tables + RLS.

create type public.experience_level as enum ('none', 'under_1y', '1_3y', 'over_3y');
create type public.availability as enum ('full_time', 'part_time', 'weekends', 'evenings');

create table if not exists public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users (id) on delete cascade,
  first_name text not null,
  last_name text not null, -- sensitive: revealed only on match (M5); card shows first name + last initial
  bio text check (bio is null or char_length(bio) <= 500),
  experience_level public.experience_level not null,
  phone text, -- sensitive: never selected pre-match
  photo_id uuid, -- FK to photos added in M4; null until then
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worker_profiles_experience_idx on public.worker_profiles (experience_level);
create index if not exists worker_profiles_visible_idx on public.worker_profiles (is_visible);

create trigger worker_profiles_set_updated_at before update on public.worker_profiles
  for each row execute function public.set_updated_at();

alter table public.worker_profiles enable row level security;

-- M2 = own-row only. The match-gated SELECT for employers viewing candidates
-- (and the contact-field reveal) is added in M5. Contact stripping is also
-- enforced in the service layer (defense in depth).
create policy "worker reads own profile" on public.worker_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "worker inserts own profile" on public.worker_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "worker updates own profile" on public.worker_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Ownership helper for the join tables (SECURITY INVOKER: honors RLS on
-- worker_profiles, so it only returns true for the caller's own profile).
create or replace function public.owns_worker_profile(p_worker_profile_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.worker_profiles wp
    where wp.id = p_worker_profile_id and wp.user_id = (select auth.uid())
  );
$$;

-- ---- Join tables ----------------------------------------------------------
create table if not exists public.worker_categories (
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  primary key (worker_profile_id, category_id)
);
create index if not exists worker_categories_category_idx on public.worker_categories (category_id);

create table if not exists public.worker_languages (
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  language_id uuid not null references public.languages (id) on delete restrict,
  primary key (worker_profile_id, language_id)
);

create table if not exists public.worker_availabilities (
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  availability public.availability not null,
  primary key (worker_profile_id, availability)
);

alter table public.worker_categories enable row level security;
alter table public.worker_languages enable row level security;
alter table public.worker_availabilities enable row level security;

-- Each join row is readable/writable only by the worker who owns the profile.
create policy "read own worker_categories" on public.worker_categories
  for select to authenticated using (public.owns_worker_profile(worker_profile_id));
create policy "insert own worker_categories" on public.worker_categories
  for insert to authenticated with check (public.owns_worker_profile(worker_profile_id));
create policy "delete own worker_categories" on public.worker_categories
  for delete to authenticated using (public.owns_worker_profile(worker_profile_id));

create policy "read own worker_languages" on public.worker_languages
  for select to authenticated using (public.owns_worker_profile(worker_profile_id));
create policy "insert own worker_languages" on public.worker_languages
  for insert to authenticated with check (public.owns_worker_profile(worker_profile_id));
create policy "delete own worker_languages" on public.worker_languages
  for delete to authenticated using (public.owns_worker_profile(worker_profile_id));

create policy "read own worker_availabilities" on public.worker_availabilities
  for select to authenticated using (public.owns_worker_profile(worker_profile_id));
create policy "insert own worker_availabilities" on public.worker_availabilities
  for insert to authenticated with check (public.owns_worker_profile(worker_profile_id));
create policy "delete own worker_availabilities" on public.worker_availabilities
  for delete to authenticated using (public.owns_worker_profile(worker_profile_id));
