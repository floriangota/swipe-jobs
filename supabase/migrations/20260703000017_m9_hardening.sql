-- M9a: security hardening at the DB layer (defense in depth with the app-layer guards).
--   1. user_is_active(): a suspended/deleted user's WRITES are refused by RLS even if
--      their in-session JWT is still valid (closes the mid-session-suspension gap; the
--      app also 403s these fast). Added to every action-write policy.
--   2. Listing UPDATE re-asserts the denormalized city_id (the INSERT policy already did;
--      the UPDATE policy didn't — a defense-in-depth gap now closed).
--   3. replace_worker_joins(): atomic (single-transaction) replacement of a worker's
--      category/language/availability join rows — the previous delete-then-insert could
--      wipe the sets on a mid-write failure.

-- ---- user_is_active() -------------------------------------------------------
create or replace function public.user_is_active()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.status = 'active'
  );
$$;

-- ---- Re-assert active on action-write policies ------------------------------
drop policy if exists "worker inserts own swipes" on public.swipes;
create policy "worker inserts own swipes" on public.swipes
  for insert to authenticated
  with check (public.owns_worker_profile(worker_profile_id) and public.user_is_active());

drop policy if exists "employer inserts own employer_swipes" on public.employer_swipes;
create policy "employer inserts own employer_swipes" on public.employer_swipes
  for insert to authenticated
  with check (
    public.owns_listing(listing_id)
    and public.user_has_role('employer')
    and public.user_is_verified()
    and public.user_is_active()
  );

drop policy if exists "match parties send messages" on public.messages;
create policy "match parties send messages" on public.messages
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and public.is_match_party(match_id)
    and public.user_is_verified()
    and public.user_is_active()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.status in ('active', 'hired')
    )
  );

drop policy if exists "user files own report" on public.reports;
create policy "user files own report" on public.reports
  for insert to authenticated
  with check (reporter_user_id = (select auth.uid()) and public.user_is_active());

-- ---- M3: listing UPDATE re-asserts city_id (defense in depth) ----------------
drop policy if exists "employer updates own listings" on public.listings;
create policy "employer updates own listings" on public.listings
  for update to authenticated
  using (public.owns_employer_profile(employer_profile_id))
  with check (
    public.owns_employer_profile(employer_profile_id)
    and public.user_has_role('employer')
    and public.user_is_verified()
    and city_id = public.current_user_city_id()
  );

-- ---- M2: atomic worker join-set replacement ---------------------------------
-- One transaction: verifies ownership, then swaps categories/languages/availabilities.
-- Replaces the app-layer delete-then-parallel-insert, which could leave a worker's
-- sets wiped if an insert failed. Empty/null arrays clear the set (unnest → no rows).
create or replace function public.replace_worker_joins(
  p_profile_id uuid,
  p_category_ids uuid[],
  p_language_ids uuid[],
  p_availabilities text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.owns_worker_profile(p_profile_id) then
    raise exception 'not authorized to modify this profile';
  end if;

  delete from public.worker_categories where worker_profile_id = p_profile_id;
  delete from public.worker_languages where worker_profile_id = p_profile_id;
  delete from public.worker_availabilities where worker_profile_id = p_profile_id;

  insert into public.worker_categories (worker_profile_id, category_id)
    select p_profile_id, cid from unnest(coalesce(p_category_ids, '{}')) as cid;
  insert into public.worker_languages (worker_profile_id, language_id)
    select p_profile_id, lid from unnest(coalesce(p_language_ids, '{}')) as lid;
  insert into public.worker_availabilities (worker_profile_id, availability)
    select p_profile_id, av::public.availability
    from unnest(coalesce(p_availabilities, '{}')) as av;
end;
$$;
