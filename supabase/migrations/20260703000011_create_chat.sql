-- M6: in-app chat. A match unlocks chat + the contact reveal (THE golden-rule reveal
-- point — the ONLY place last_name/phone/email cross the pre-match wall, and only to
-- the two parties of a matches row). messages table + party-gated RLS; SECURITY
-- DEFINER functions for inbox/detail/read/status (the M5 `record_employer_swipe`
-- pattern); Supabase Realtime wired as PRIVATE per-match Broadcast channels
-- ("match:{id}") whose subscription is authorized by RLS on realtime.messages —
-- a non-party cannot even subscribe, let alone receive.

-- ---- Tables ----------------------------------------------------------------

-- Chat within a match; text-only MVP. Body is sanitized on write (service layer) and
-- length-capped here too (defense in depth). Immutable rows (no edit/delete in MVP),
-- so created_at only — same convention as swipes. read_at = read receipt.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_user_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_body_not_blank check (char_length(btrim(body)) > 0),
  constraint messages_body_max_length check (char_length(body) <= 2000)
);
create index if not exists messages_match_created_idx on public.messages (match_id, created_at, id);
create index if not exists messages_match_read_idx on public.messages (match_id, read_at);

-- Security/analytics trail (schema doc). Created here because the contract requires
-- `hired` to write an audit row (the north-star metric). Metadata must carry NO PII.
-- actor survives user deletion as null (= system); admin surfacing is M8.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users (id) on delete set null, -- null = system
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb, -- no PII/secrets
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_created_idx on public.audit_logs (actor_user_id, created_at);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at);

-- ---- Party helper -----------------------------------------------------------
-- "Is the caller one of the two parties to this match?" — the single predicate that
-- gates every chat surface (messages RLS, the realtime channel, the RPCs below).
create or replace function public.is_match_party(p_match_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and (
        exists (
          select 1 from public.worker_profiles wp
          where wp.id = m.worker_profile_id and wp.user_id = (select auth.uid())
        )
        or exists (
          select 1 from public.listings l
          join public.employer_profiles ep on ep.id = l.employer_profile_id
          where l.id = m.listing_id and ep.user_id = (select auth.uid())
        )
      )
  );
$$;

-- Chat stays open while the match is active or hired; closed_* ends it (contract: 422).
create or replace function public.match_chat_open(p_match_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id and m.status in ('active', 'hired')
  );
$$;

-- ---- RLS -------------------------------------------------------------------

alter table public.messages enable row level security;

-- Only the two match parties read a chat (docs/security.md A01).
create policy "match parties read messages" on public.messages
  for select to authenticated
  using (public.is_match_party(match_id));

-- Only a verified party may write, only as themselves, and only into an open match.
-- No UPDATE/DELETE policies: messages are immutable; read receipts go through the
-- mark_match_read RPC below.
create policy "match parties send messages" on public.messages
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and public.is_match_party(match_id)
    and public.user_is_verified()
    and public.match_chat_open(match_id)
  );

alter table public.audit_logs enable row level security;
-- No policies on purpose: audit_logs is written only by SECURITY DEFINER functions /
-- the service-role client, never readable by end users (admin queue = M8).

-- ---- Inbox: the caller's matches, newest activity first ----------------------
-- One row per match the caller is party to: counterpart display name (full name is
-- unlocked post-match), listing, last message, unread count. NO phone/email here —
-- the list is not the reveal point; contact goes through match_detail only.
-- Keyset on (activity_at, match_id) = coalesce(last message time, matched_at).
create or replace function public.match_inbox(
  p_cursor_activity_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table (
  match_id uuid,
  status public.match_status,
  matched_at timestamptz,
  listing_id uuid,
  listing_title text,
  counterpart_name text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_user_id uuid,
  unread_count bigint,
  activity_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.match_id, t.status, t.matched_at, t.listing_id, t.listing_title,
         t.counterpart_name, t.last_message_body, t.last_message_at,
         t.last_message_sender_user_id, t.unread_count, t.activity_at
  from (
    select
      m.id as match_id,
      m.status,
      m.matched_at,
      l.id as listing_id,
      l.title as listing_title,
      case
        when wp.user_id = (select auth.uid()) then ep.business_name
        else wp.first_name || ' ' || wp.last_name
      end as counterpart_name,
      lm.body as last_message_body,
      lm.created_at as last_message_at,
      lm.sender_user_id as last_message_sender_user_id,
      (
        select count(*)
        from public.messages msg
        where msg.match_id = m.id
          and msg.read_at is null
          and msg.sender_user_id <> (select auth.uid())
      ) as unread_count,
      coalesce(lm.created_at, m.matched_at) as activity_at
    from public.matches m
    join public.listings l on l.id = m.listing_id
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    join public.worker_profiles wp on wp.id = m.worker_profile_id
    left join lateral (
      select msg.body, msg.created_at, msg.sender_user_id
      from public.messages msg
      where msg.match_id = m.id
      order by msg.created_at desc, msg.id desc
      limit 1
    ) lm on true
    where wp.user_id = (select auth.uid()) or ep.user_id = (select auth.uid())
  ) t
  where (
    p_cursor_activity_at is null
    or (t.activity_at, t.match_id) < (p_cursor_activity_at, p_cursor_id)
  )
  order by t.activity_at desc, t.match_id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---- Detail: THE golden-rule reveal point ------------------------------------
-- Party check inline (like listing_candidates); a non-party gets ZERO rows → 404.
-- Reveals to the employer: the worker's full name + phone + account email.
-- Reveals to the worker: the business's contact_phone/contact_email — exactly the
-- fields the employer chose to share at onboarding ("shown only after you match");
-- deliberately NO fallback to the employer's account email (data minimization).
create or replace function public.match_detail(p_match_id uuid)
returns table (
  match_id uuid,
  status public.match_status,
  matched_at timestamptz,
  listing_id uuid,
  listing_title text,
  caller_side text, -- 'worker' | 'employer' (which side the CALLER is on)
  counterpart_name text,
  contact_phone text,
  contact_email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.status,
    m.matched_at,
    l.id,
    l.title,
    case when wp.user_id = (select auth.uid()) then 'worker' else 'employer' end,
    case when wp.user_id = (select auth.uid())
      then ep.business_name
      else wp.first_name || ' ' || wp.last_name
    end,
    case when wp.user_id = (select auth.uid()) then ep.contact_phone else wp.phone end,
    case when wp.user_id = (select auth.uid()) then ep.contact_email else wu.email end
  from public.matches m
  join public.listings l on l.id = m.listing_id
  join public.employer_profiles ep on ep.id = l.employer_profile_id
  join public.worker_profiles wp on wp.id = m.worker_profile_id
  join public.users wu on wu.id = wp.user_id
  where m.id = p_match_id
    and (wp.user_id = (select auth.uid()) or ep.user_id = (select auth.uid()));
$$;

-- ---- Chat history (keyset, newest first) -------------------------------------
-- SECURITY INVOKER on purpose: the messages RLS above IS the guard (a non-party gets
-- zero rows), keeping RLS as the enforcement layer instead of re-implementing it.
create or replace function public.match_messages(
  p_match_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 30
)
returns table (
  id uuid, match_id uuid, sender_user_id uuid,
  body text, read_at timestamptz, created_at timestamptz
)
language sql
security invoker
stable
set search_path = ''
as $$
  select msg.id, msg.match_id, msg.sender_user_id, msg.body, msg.read_at, msg.created_at
  from public.messages msg
  where msg.match_id = p_match_id
    and (
      p_cursor_created_at is null
      or (msg.created_at, msg.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by msg.created_at desc, msg.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---- Read receipts -----------------------------------------------------------
-- Marks every message the counterpart sent as read. Returns the number marked, or -1
-- if the caller is not a party (route maps to 404). One private 'read' broadcast lets
-- the counterpart's open chat flip its ticks live.
create or replace function public.mark_match_read(p_match_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated int;
begin
  if not public.is_match_party(p_match_id) then
    return -1;
  end if;

  update public.messages
  set read_at = now()
  where match_id = p_match_id
    and sender_user_id <> (select auth.uid())
    and read_at is null;
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    begin
      perform realtime.send(
        jsonb_build_object('match_id', p_match_id, 'reader_user_id', (select auth.uid())),
        'read',
        'match:' || p_match_id::text,
        true -- private channel
      );
    exception when others then
      null; -- realtime is best-effort; the rows are the source of truth
    end;
  end if;

  return v_updated;
end;
$$;

-- ---- Match status changes (close / hired) --------------------------------------
-- RLS `with check` cannot see the OLD row, so transitions are enforced here instead of
-- an UPDATE policy (matches keeps NO client write policies). Rules (MVP): only from
-- 'active'; each side closes for itself; only the employer marks hired (they hire);
-- closed/hired are terminal. `hired` writes the audit_logs row (north-star metric).
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
begin
  select
    exists (
      select 1 from public.worker_profiles wp
      where wp.id = m.worker_profile_id and wp.user_id = v_uid
    ),
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
    -- Not a party: reveal nothing about the match (not even its status).
    return query select true, false, false, false, null::public.match_status;
    return;
  end if;

  if not (
    (p_status = 'closed_by_worker' and v_is_worker)
    or (p_status in ('closed_by_employer', 'hired') and v_is_employer)
  ) then
    return query select true, true, false, false, v_current;
    return;
  end if;

  if v_current <> 'active' then
    return query select true, true, true, false, v_current; -- terminal; no reopen in MVP
    return;
  end if;

  update public.matches set status = p_status where id = p_match_id;

  if p_status = 'hired' then
    insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
    values (v_uid, 'match_hired', 'match', p_match_id, '{}'::jsonb);
  end if;

  begin
    perform realtime.send(
      jsonb_build_object('match_id', p_match_id, 'status', p_status),
      'status',
      'match:' || p_match_id::text,
      true
    );
  exception when others then
    null;
  end;

  return query select true, true, true, true, p_status;
end;
$$;

-- ---- Realtime: live delivery on the private per-match channel -------------------
-- New messages are pushed from the database itself (broadcast_changes), so delivery
-- can't be spoofed client-side. Best-effort: a realtime failure never blocks the
-- insert — REST is the source of truth and history.
create or replace function public.broadcast_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.broadcast_changes(
      'match:' || new.match_id::text, -- topic: one private channel per match
      tg_op,                          -- event: 'INSERT'
      tg_op,
      tg_table_name,
      tg_table_schema,
      new,
      old
    );
  exception when others then
    null;
  end;
  return null;
end;
$$;

create trigger messages_broadcast_insert
  after insert on public.messages
  for each row execute function public.broadcast_message_insert();

-- Channel authorization: subscribing to a private 'match:{id}' topic requires being a
-- party to that match — enforced by RLS on realtime.messages, i.e. denied AT THE
-- DATABASE even if app code has a bug. Parses the topic defensively (a malformed uuid
-- is a clean false, not an error). No INSERT policy: clients can never publish; only
-- the database broadcasts.
create or replace function public.is_match_party_topic(p_topic text)
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_match_id uuid;
begin
  if p_topic not like 'match:%' then
    return false;
  end if;
  begin
    v_match_id := split_part(p_topic, ':', 2)::uuid;
  exception when others then
    return false;
  end;
  return public.is_match_party(v_match_id);
end;
$$;

create policy "match parties receive chat broadcasts" on realtime.messages
  for select to authenticated
  using (public.is_match_party_topic(realtime.topic()));
