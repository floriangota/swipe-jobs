-- M1: cities lookup (first-class so multi-city is additive) + shared updated_at trigger.

-- Shared trigger to keep updated_at current on any table that uses it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text not null default 'XK',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function public.set_updated_at();

alter table public.cities enable row level security;

-- Active cities are readable by everyone (incl. anon) so the signup city list
-- can load pre-auth. No client write policies — admins manage cities via the
-- secret-key client, which bypasses RLS.
create policy "cities are viewable by everyone"
  on public.cities
  for select
  to anon, authenticated
  using (is_active);

-- Required referential seed: Ferizaj (MVP launch city). Idempotent.
insert into public.cities (name, country)
values ('Ferizaj', 'XK')
on conflict (name) do nothing;
