-- M5: the core loop — swipes (worker→listing), employer_swipes (employer→candidate),
-- matches (materialized on mutual right-swipe). Flow-1 asymmetric: the worker swipes
-- first; the employer only ever sees workers who right-swiped their own listing.
-- Contact reveal + chat are M6 — M5 lands the match GATE (rows + match-gated RLS).

create type public.swipe_direction as enum ('left', 'right');
create type public.match_status as enum ('active', 'closed_by_worker', 'closed_by_employer', 'hired');

-- ---- Tables ----------------------------------------------------------------

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  direction public.swipe_direction not null, -- right = interested
  created_at timestamptz not null default now(),
  unique (worker_profile_id, listing_id) -- no double-swipe; no undo in MVP; also excludes-from-feed
);
create index if not exists swipes_listing_direction_idx on public.swipes (listing_id, direction);

create table if not exists public.employer_swipes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  direction public.swipe_direction not null,
  created_at timestamptz not null default now(),
  unique (listing_id, worker_profile_id)
);
create index if not exists employer_swipes_listing_direction_idx on public.employer_swipes (listing_id, direction);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles (id) on delete cascade,
  status public.match_status not null default 'active',
  matched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, worker_profile_id) -- guarantees one match even under race
);
create index if not exists matches_worker_idx on public.matches (worker_profile_id);
create index if not exists matches_listing_idx on public.matches (listing_id);

create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

-- ---- Ownership helper (SECURITY INVOKER: honors listings/employer_profiles RLS) ----
create or replace function public.owns_listing(p_listing_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.listings l
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    where l.id = p_listing_id and ep.user_id = (select auth.uid())
  );
$$;

-- ---- RLS -------------------------------------------------------------------

alter table public.swipes enable row level security;
-- Workers read/insert their own swipes (unverified workers MAY browse+swipe — soft-gate
-- only blocks being-shown/matching, not browsing). No update/delete: no undo in MVP.
create policy "worker reads own swipes" on public.swipes
  for select to authenticated using (public.owns_worker_profile(worker_profile_id));
create policy "worker inserts own swipes" on public.swipes
  for insert to authenticated with check (public.owns_worker_profile(worker_profile_id));
-- Defense in depth: an employer may read swipes on their OWN listings (candidate stack).
create policy "employer reads own-listing swipes" on public.swipes
  for select to authenticated using (public.owns_listing(listing_id));

alter table public.employer_swipes enable row level security;
-- Employer reads/inserts swipes on their own listings; must be a verified employer to act.
create policy "employer reads own employer_swipes" on public.employer_swipes
  for select to authenticated using (public.owns_listing(listing_id));
create policy "employer inserts own employer_swipes" on public.employer_swipes
  for insert to authenticated
  with check (
    public.owns_listing(listing_id) and public.user_has_role('employer') and public.user_is_verified()
  );

alter table public.matches enable row level security;
-- Both parties to a match can read it. Matches are created only by the atomic RPC below
-- (SECURITY DEFINER); there is no client insert/update policy (status changes = M6).
create policy "match parties read matches" on public.matches
  for select to authenticated
  using (public.owns_worker_profile(worker_profile_id) or public.owns_listing(listing_id));

-- ---- Deferred-from-M3: workers (any authed) can read ACTIVE listings for the feed ----
-- Listings carry no contact fields, so this is safe. Coexists (OR) with the M3 owner policy.
create policy "authenticated read active listings" on public.listings
  for select to authenticated using (status = 'active');

-- ---- Match-gated profile reveal (the golden-rule DB gate; consuming reads land in M6) ----
-- Pre-match, these return false so a counterpart cannot read the other's full profile;
-- once a matches row exists, the matched party may read the full row (incl. contact).
create or replace function public.employer_matched_worker(p_worker_profile_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.matches m
    join public.listings l on l.id = m.listing_id
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    where m.worker_profile_id = p_worker_profile_id and ep.user_id = (select auth.uid())
  );
$$;
create policy "matched employer reads worker profile" on public.worker_profiles
  for select to authenticated using (public.employer_matched_worker(id));

create or replace function public.worker_matched_employer(p_employer_profile_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.matches m
    join public.listings l on l.id = m.listing_id
    join public.worker_profiles wp on wp.id = m.worker_profile_id
    where l.employer_profile_id = p_employer_profile_id and wp.user_id = (select auth.uid())
  );
$$;
create policy "matched worker reads employer profile" on public.employer_profiles
  for select to authenticated using (public.worker_matched_employer(id));

-- ---- Feed (worker): active + own city + interested categories + exclude already-swiped ----
-- SECURITY DEFINER + an explicit contact-free column list. Keyset paginated on (created_at,id).
-- Scoped to the caller's own worker profile, so a caller only ever gets their own feed.
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
         l.status, l.created_at, l.updated_at,
         ep.business_name, c.name
  from public.listings l
  join public.worker_profiles wp on wp.user_id = (select auth.uid())
  join public.employer_profiles ep on ep.id = l.employer_profile_id
  join public.cities c on c.id = l.city_id
  where l.status = 'active'
    and l.city_id = (select u.city_id from public.users u where u.id = (select auth.uid()))
    and l.category_id in (
      select wc.category_id from public.worker_categories wc where wc.worker_profile_id = wp.id
    )
    and not exists (
      select 1 from public.swipes s where s.listing_id = l.id and s.worker_profile_id = wp.id
    )
    and (
      p_cursor_created_at is null
      or (l.created_at, l.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by l.created_at desc, l.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---- Candidate stack (employer): workers who right-swiped MY listing, not yet swiped by me ----
-- SECURITY DEFINER; returns ONLY pre-match-safe fields (first name + last INITIAL, never the
-- surname/phone/email — golden rule by construction). Ownership + soft-gate enforced inline:
-- caller must own the listing; only verified, visible workers are shown.
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
  select s.id, s.created_at,
         wp.id, wp.first_name, upper(left(wp.last_name, 1)),
         wp.experience_level
  from public.swipes s
  join public.worker_profiles wp on wp.id = s.worker_profile_id
  join public.users u on u.id = wp.user_id
  join public.listings l on l.id = s.listing_id
  join public.employer_profiles ep on ep.id = l.employer_profile_id
  where s.listing_id = p_listing_id
    and s.direction = 'right'
    and ep.user_id = (select auth.uid()) -- caller owns the listing
    and wp.is_visible = true
    and u.email_verified_at is not null -- soft-gate: unverified workers are not shown
    and not exists (
      select 1 from public.employer_swipes es
      where es.listing_id = p_listing_id and es.worker_profile_id = wp.id
    )
    and (
      p_cursor_created_at is null
      or (s.created_at, s.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by s.created_at desc, s.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---- Atomic, race-safe employer swipe + match creation ----------------------
-- One transaction (a plpgsql function is atomic): authz-check, record the employer swipe
-- idempotently, and — on a right swipe against an already-interested, verified, visible
-- worker — materialize the match. UNIQUE(listing_id, worker_profile_id) on matches is the
-- concurrency backstop. Returns flags the route maps to 403/409/201.
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
  -- Authz: caller owns the listing AND is a verified employer.
  select exists (
    select 1 from public.listings l
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    where l.id = p_listing_id and ep.user_id = (select auth.uid())
  ) into v_owns;

  if not v_owns or not public.user_is_verified() then
    return query select false, false, false, null::uuid;
    return;
  end if;

  -- Flow-1 candidacy gate: an employer may act ONLY on a worker who is a genuine,
  -- currently-shown candidate of THIS listing (right-swiped it, verified, visible) — the
  -- same set the candidate stack shows. Otherwise write nothing and return not-authorized.
  -- This blocks "pre-swiping" a non-candidate (or a random/non-existent worker id), which
  -- would otherwise permanently suppress a worker who never appeared in the stack.
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
  ) into v_is_candidate;

  if not v_is_candidate then
    return query select false, false, false, null::uuid; -- not a candidate of this listing
    return;
  end if;

  -- Record the employer swipe idempotently (a repeat = clean already_swiped).
  insert into public.employer_swipes (listing_id, worker_profile_id, direction)
  values (p_listing_id, p_worker_profile_id, p_direction)
  on conflict (listing_id, worker_profile_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return query select true, true, false, null::uuid; -- already swiped this candidate
    return;
  end if;

  if p_direction <> 'right' then
    return query select true, false, false, null::uuid; -- a pass; no match
    return;
  end if;

  -- Right swipe on a confirmed candidate → materialize the match (unique guarantees
  -- exactly one under concurrency).
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

-- ---- Real engagement counts for the employer dashboard (replaces M3 placeholders) ----
create or replace function public.listing_engagement_counts(p_listing_ids uuid[])
returns table (listing_id uuid, interested_count bigint, matched_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id,
    (select count(*) from public.swipes s where s.listing_id = l.id and s.direction = 'right'),
    (select count(*) from public.matches m where m.listing_id = l.id)
  from public.listings l
  join public.employer_profiles ep on ep.id = l.employer_profile_id
  where l.id = any (p_listing_ids) and ep.user_id = (select auth.uid());
$$;
