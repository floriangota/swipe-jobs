-- M2: bilingual lookup tables (categories, languages, business_types) + seeds.
-- Admin-editable at runtime (not enums). Public read of active rows so onboarding
-- forms can load them pre-auth. Writes are service-role only (admin panel = M8).

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_sq text not null,
  name_en text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_sq text not null,
  name_en text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_sq text not null,
  name_en text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_active_idx on public.categories (is_active);
create index if not exists languages_active_idx on public.languages (is_active);
create index if not exists business_types_active_idx on public.business_types (is_active);

-- updated_at (set_updated_at() defined in the M1 cities migration).
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger languages_set_updated_at before update on public.languages
  for each row execute function public.set_updated_at();
create trigger business_types_set_updated_at before update on public.business_types
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.languages enable row level security;
alter table public.business_types enable row level security;

create policy "categories are viewable by everyone" on public.categories
  for select to anon, authenticated using (is_active);
create policy "languages are viewable by everyone" on public.languages
  for select to anon, authenticated using (is_active);
create policy "business_types are viewable by everyone" on public.business_types
  for select to anon, authenticated using (is_active);

-- ---- Seeds (Ferizaj hourly/shift work). Idempotent. ------------------------
insert into public.categories (slug, name_en, name_sq, sort_order) values
  ('waiter', 'Waiter / Waitress', 'Kamarier/e', 10),
  ('barista', 'Barista', 'Barist/e', 20),
  ('bartender', 'Bartender', 'Banakier/e', 30),
  ('cook', 'Cook', 'Kuzhinier/e', 40),
  ('kitchen-help', 'Kitchen help', 'Ndihmës/e kuzhine', 50),
  ('cashier', 'Cashier', 'Arkatar/e', 60),
  ('retail-assistant', 'Shop assistant', 'Shitës/e', 70),
  ('warehouse', 'Warehouse worker', 'Punëtor/e depoje', 80),
  ('delivery', 'Delivery / Courier', 'Shpërndarës/e', 90),
  ('cleaner', 'Cleaner', 'Pastrues/e', 100),
  ('security', 'Security', 'Sigurim', 110),
  ('driver', 'Driver', 'Shofer/e', 120),
  ('construction', 'Construction labor', 'Punëtor/e krahu', 130),
  ('hairdresser', 'Hairdresser / Beauty', 'Parukier/e', 140)
on conflict (slug) do nothing;

insert into public.languages (code, name_en, name_sq, sort_order) values
  ('sq', 'Albanian', 'Shqip', 10),
  ('en', 'English', 'Anglisht', 20),
  ('sr', 'Serbian', 'Serbisht', 30),
  ('de', 'German', 'Gjermanisht', 40),
  ('tr', 'Turkish', 'Turqisht', 50)
on conflict (code) do nothing;

insert into public.business_types (slug, name_en, name_sq, sort_order) values
  ('cafe', 'Café', 'Kafe', 10),
  ('restaurant', 'Restaurant', 'Restorant', 20),
  ('bar', 'Bar', 'Bar', 30),
  ('retail-shop', 'Retail shop', 'Dyqan', 40),
  ('supermarket', 'Supermarket', 'Supermarket', 50),
  ('hotel', 'Hotel', 'Hotel', 60),
  ('bakery', 'Bakery', 'Furrë', 70),
  ('warehouse', 'Warehouse / Logistics', 'Depo / Logjistikë', 80),
  ('beauty-salon', 'Beauty salon', 'Sallon bukurie', 90),
  ('cleaning-service', 'Cleaning service', 'Shërbim pastrimi', 100),
  ('delivery-service', 'Delivery service', 'Shërbim shpërndarjeje', 110),
  ('construction', 'Construction', 'Ndërtimtari', 120)
on conflict (slug) do nothing;
