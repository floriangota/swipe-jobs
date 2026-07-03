-- M2: employer_profiles (1:1 with an employer user) + RLS.

create table if not exists public.employer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users (id) on delete cascade,
  business_name text not null,
  business_type_id uuid references public.business_types (id) on delete restrict,
  description text check (description is null or char_length(description) <= 1000),
  logo_id uuid, -- FK to photos added in M4; null until then
  contact_phone text, -- sensitive: revealed only on match (M5)
  contact_email text, -- sensitive: revealed only on match (M5)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employer_profiles_business_type_idx
  on public.employer_profiles (business_type_id);

create trigger employer_profiles_set_updated_at before update on public.employer_profiles
  for each row execute function public.set_updated_at();

alter table public.employer_profiles enable row level security;

-- M2 = own-row only. Contact fields (contact_phone/contact_email) are revealed
-- only on match (M5) — enforced in the service layer + a match-gated policy later.
create policy "employer reads own profile" on public.employer_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "employer inserts own profile" on public.employer_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "employer updates own profile" on public.employer_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
