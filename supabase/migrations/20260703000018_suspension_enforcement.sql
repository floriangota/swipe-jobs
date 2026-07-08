-- M9a follow-up (pre-merge review): COMPLETE suspension enforcement. Suspending a user
-- only flips public.users.status='suspended'; their JWT stays valid until it expires, so
-- 0017's RLS-INSERT gates (swipes/employer_swipes/messages/reports) were NOT enough — the
-- match-critical writes go through SECURITY DEFINER RPCs that bypass RLS, and the listings
-- write policies + candidate/feed reads didn't check status. Gaps closed here:
--   • record_employer_swipe: a suspended EMPLOYER could still create a match (unlocking the
--     golden-rule contact reveal + chat); and a suspended WORKER could still be matched.
--   • update_match_status / mark_match_read / mark_notifications_read: suspended party could act.
--   • listings INSERT/UPDATE: a suspended employer could post/edit listings into worker feeds.
--   • listing_candidates / worker_feed: a suspended worker still surfaced as a candidate; a
--     suspended employer's active listings still surfaced in feeds.

-- ---- listings write policies: require an active employer -----------------------
drop policy if exists "employer inserts own listings" on public.listings;
create policy "employer inserts own listings" on public.listings
  for insert to authenticated
  with check (
    public.owns_employer_profile(employer_profile_id)
    and public.user_has_role('employer')
    and public.user_is_verified()
    and public.user_is_active()
    and city_id = public.current_user_city_id()
  );

drop policy if exists "employer updates own listings" on public.listings;
create policy "employer updates own listings" on public.listings
  for update to authenticated
  using (public.owns_employer_profile(employer_profile_id))
  with check (
    public.owns_employer_profile(employer_profile_id)
    and public.user_has_role('employer')
    and public.user_is_verified()
    and public.user_is_active()
    and city_id = public.current_user_city_id()
  );

-- ---- record_employer_swipe: active employer + active worker (the golden-rule guard) ----
create or replace function public.record_employer_swipe(
  p_listing_id uuid,
  p_worker_profile_id uuid,
  p_direction public.swipe_direction
)
returns table (authorized boolean, already_swiped boolean, matched boolean, match_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owns boolean;
  v_is_candidate boolean;
  v_inserted int;
  v_match_id uuid;
begin
  select exists (
    select 1 from public.listings l
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    where l.id = p_listing_id and ep.user_id = (select auth.uid())
  ) into v_owns;

  -- Employer must own the listing, be verified, AND be active (not suspended).
  if not v_owns or not public.user_is_verified() or not public.user_is_active() then
    return query select false, false, false, null::uuid;
    return;
  end if;

  -- Candidacy gate: the worker must be a genuine, currently-shown candidate — right-swiped
  -- this listing, visible, verified, AND active (a suspended worker is not matchable, so
  -- their contact is never revealed).
  select exists (
    select 1
    from public.swipes s
    join public.worker_profiles wp on wp.id = s.worker_profile_id
    join public.users u on u.id = wp.user_id
    where s.listing_id = p_listing_id
      and s.worker_profile_id = p_worker_profile_id
      and s.direction = 'right'
      and wp.is_visible = true
      and u.email_verified_at is not null
      and u.status = 'active'
  ) into v_is_candidate;

  if not v_is_candidate then
    return query select false, false, false, null::uuid;
    return;
  end if;

  insert into public.employer_swipes (listing_id, worker_profile_id, direction)
  values (p_listing_id, p_worker_profile_id, p_direction)
  on conflict (listing_id, worker_profile_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return query select true, true, false, null::uuid;
    return;
  end if;

  if p_direction <> 'right' then
    return query select true, false, false, null::uuid;
    return;
  end if;

  insert into public.matches (listing_id, worker_profile_id)
  values (p_listing_id, p_worker_profile_id)
  on conflict (listing_id, worker_profile_id) do nothing
  returning id into v_match_id;

  if v_match_id is null then
    select id into v_match_id from public.matches
    where listing_id = p_listing_id and worker_profile_id = p_worker_profile_id;
  end if;

  return query select true, false, true, v_match_id;
end;
$$;

-- ---- update_match_status: suspended party may not change status ----------------
create or replace function public.update_match_status(
  p_match_id uuid,
  p_status public.match_status
)
returns table (found boolean, is_party boolean, allowed boolean, updated boolean, current_status public.match_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_is_worker boolean;
  v_is_employer boolean;
  v_current public.match_status;
  v_rows int;
begin
  select
    exists (select 1 from public.worker_profiles wp where wp.id = m.worker_profile_id and wp.user_id = v_uid),
    exists (
      select 1 from public.listings l
      join public.employer_profiles ep on ep.id = l.employer_profile_id
      where l.id = m.listing_id and ep.user_id = v_uid
    ),
    m.status
  into v_is_worker, v_is_employer, v_current
  from public.matches m
  where m.id = p_match_id;

  if v_current is null then
    return query select false, false, false, false, null::public.match_status;
    return;
  end if;

  if not (v_is_worker or v_is_employer) then
    return query select true, false, false, false, null::public.match_status;
    return;
  end if;

  -- A suspended party cannot change status (treated as not-allowed).
  if not public.user_is_active() then
    return query select true, true, false, false, v_current;
    return;
  end if;

  if not (
    (p_status = 'closed_by_worker' and v_is_worker)
    or (p_status in ('closed_by_employer', 'hired') and v_is_employer)
  ) then
    return query select true, true, false, false, v_current;
    return;
  end if;

  update public.matches set status = p_status
  where id = p_match_id and status = 'active';
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select status into v_current from public.matches where id = p_match_id;
    return query select true, true, true, false, v_current;
    return;
  end if;

  if p_status = 'hired' then
    insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
    values (v_uid, 'match_hired', 'match', p_match_id, '{}'::jsonb);
  end if;

  begin
    perform realtime.send(
      jsonb_build_object('match_id', p_match_id, 'status', p_status),
      'status', 'match:' || p_match_id::text, true
    );
  exception when others then null;
  end;

  return query select true, true, true, true, p_status;
end;
$$;

-- ---- mark_match_read / mark_notifications_read: suspended user is a no-op --------
create or replace function public.mark_match_read(p_match_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated int;
begin
  if not public.is_match_party(p_match_id) or not public.user_is_active() then
    return -1;
  end if;

  update public.messages set read_at = now()
  where match_id = p_match_id and sender_user_id <> (select auth.uid()) and read_at is null;
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    begin
      perform realtime.send(
        jsonb_build_object('match_id', p_match_id, 'reader_user_id', (select auth.uid())),
        'read', 'match:' || p_match_id::text, true
      );
    exception when others then null;
    end;
  end if;
  return v_updated;
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated int;
begin
  if not public.user_is_active() then
    return 0;
  end if;
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and read_at is null
    and (p_ids is null or array_length(p_ids, 1) is null or id = any (p_ids));
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- ---- listing_candidates: don't surface suspended workers ------------------------
create or replace function public.listing_candidates(
  p_listing_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table (
  swipe_id uuid, swipe_created_at timestamptz,
  worker_profile_id uuid, first_name text, last_initial text,
  experience_level public.experience_level
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.created_at, wp.id, wp.first_name, upper(left(wp.last_name, 1)), wp.experience_level
  from public.swipes s
  join public.worker_profiles wp on wp.id = s.worker_profile_id
  join public.users u on u.id = wp.user_id
  join public.listings l on l.id = s.listing_id
  join public.employer_profiles ep on ep.id = l.employer_profile_id
  where s.listing_id = p_listing_id
    and s.direction = 'right'
    and ep.user_id = (select auth.uid())
    and wp.is_visible = true
    and u.email_verified_at is not null
    and u.status = 'active' -- exclude suspended/deleted workers
    and not exists (
      select 1 from public.employer_swipes es
      where es.listing_id = p_listing_id and es.worker_profile_id = wp.id
    )
    and (p_cursor_created_at is null or (s.created_at, s.id) < (p_cursor_created_at, p_cursor_id))
  order by s.created_at desc, s.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---- worker_feed: don't surface a suspended employer's listings -----------------
create or replace function public.worker_feed(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table (
  id uuid, city_id uuid, category_id uuid, title text, description text,
  job_type public.job_type, required_experience public.experience_level,
  pay_min int, pay_max int, pay_period public.pay_period, status public.listing_status,
  created_at timestamptz, updated_at timestamptz,
  business_name text, city_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.city_id, l.category_id, l.title, l.description,
         l.job_type, l.required_experience, l.pay_min, l.pay_max, l.pay_period,
         l.status, l.created_at, l.updated_at, ep.business_name, c.name
  from public.listings l
  join public.worker_profiles wp on wp.user_id = (select auth.uid())
  join public.employer_profiles ep on ep.id = l.employer_profile_id
  join public.users eu on eu.id = ep.user_id
  join public.cities c on c.id = l.city_id
  where l.status = 'active'
    and eu.status = 'active' -- hide suspended employers' listings
    and l.city_id = (select u.city_id from public.users u where u.id = (select auth.uid()))
    and l.category_id in (
      select wc.category_id from public.worker_categories wc where wc.worker_profile_id = wp.id
    )
    and not exists (
      select 1 from public.swipes s where s.listing_id = l.id and s.worker_profile_id = wp.id
    )
    and (p_cursor_created_at is null or (l.created_at, l.id) < (p_cursor_created_at, p_cursor_id))
  order by l.created_at desc, l.id desc
  limit least(greatest(p_limit, 1), 50);
$$;
