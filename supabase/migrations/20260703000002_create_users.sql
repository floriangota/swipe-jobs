-- M1: users table (extends auth.users) + role/status enums + auto-provisioning trigger.

create type public.user_role as enum ('worker', 'employer', 'admin');
create type public.user_status as enum ('active', 'suspended', 'deleted');

-- Contact fields (last_name/phone/email-of-others) live on profile tables (M2),
-- never here. This table only mirrors the auth email for convenience/authz.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'worker',
  email text not null,
  city_id uuid not null references public.cities (id) on delete restrict,
  status public.user_status not null default 'active',
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_city_id_idx on public.users (city_id);
create index if not exists users_role_idx on public.users (role);
create index if not exists users_status_idx on public.users (status);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

-- A user may read only their own row. `(select auth.uid())` is wrapped so the
-- planner evaluates it once per query, not once per row.
create policy "users can read own row"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- No INSERT policy: the trigger below owns row creation.
-- No UPDATE policy in M1: role/status/email_verified_at are server-controlled and
-- written via the secret-key client (bypasses RLS). A guarded own-row UPDATE policy
-- arrives with profile editing in M2. Suspension is enforced at the service layer,
-- NOT by RLS (a suspended user still satisfies auth.uid() = id).

-- ---------------------------------------------------------------------------
-- Auto-provision the public.users row atomically with the auth user. The signup
-- Server Action passes role + city_id via signUp options.data (raw_user_meta_data).
-- SECURITY DEFINER + empty search_path is required so the function (invoked by
-- supabase_auth_admin) can write into public with fully-qualified names.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_city_id uuid;
begin
  -- Re-clamp role in SQL: only worker/employer from signup, never admin
  -- (defense-in-depth against a crafted metadata payload).
  v_role := case new.raw_user_meta_data ->> 'role'
    when 'employer' then 'employer'::public.user_role
    else 'worker'::public.user_role
  end;

  -- city_id must reference an existing city; fall back to Ferizaj, then to any
  -- active city, so signup can never NULL out the NOT NULL column.
  v_city_id := nullif(new.raw_user_meta_data ->> 'city_id', '')::uuid;
  if v_city_id is null
     or not exists (select 1 from public.cities c where c.id = v_city_id) then
    select c.id into v_city_id from public.cities c where c.name = 'Ferizaj' limit 1;
  end if;
  if v_city_id is null then
    select c.id into v_city_id
    from public.cities c
    where c.is_active
    order by c.created_at
    limit 1;
  end if;
  if v_city_id is null then
    raise exception 'handle_new_user: no city available to assign (seed public.cities).';
  end if;

  insert into public.users (id, email, role, city_id, status, email_verified_at)
  values (new.id, new.email, v_role, v_city_id, 'active', null);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Let the auth admin role invoke the (security definer) trigger function.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;
