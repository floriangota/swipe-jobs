-- M2 hardening: enforce the role invariant at the RLS layer too (defense in
-- depth). Previously role was checked only in the Server Actions, so a hostile
-- client using the publishable key directly could insert a mismatched profile
-- (e.g. a worker creating an employer_profiles row).

create or replace function public.user_has_role(p_role public.user_role)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = p_role
  );
$$;

-- worker_profiles: writes require role = 'worker'
drop policy if exists "worker inserts own profile" on public.worker_profiles;
create policy "worker inserts own profile" on public.worker_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.user_has_role('worker'));

drop policy if exists "worker updates own profile" on public.worker_profiles;
create policy "worker updates own profile" on public.worker_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.user_has_role('worker'));

-- employer_profiles: writes require role = 'employer'
drop policy if exists "employer inserts own profile" on public.employer_profiles;
create policy "employer inserts own profile" on public.employer_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.user_has_role('employer'));

drop policy if exists "employer updates own profile" on public.employer_profiles;
create policy "employer updates own profile" on public.employer_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.user_has_role('employer'));
