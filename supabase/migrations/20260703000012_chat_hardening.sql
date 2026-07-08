-- M6 hardening (from the M6 security review). Three DB fixes. 0011 is already applied
-- to the hosted DB, so these land as a forward migration (no reset — demo data intact).

-- ---- Fix 1: match_chat_open leaked open-state to non-parties ------------------
-- It was a SECURITY DEFINER helper with no party check, PUBLIC-executable as an RPC,
-- so anyone could probe any match id for its open/closed state. It was only ever used
-- inside the messages-INSERT policy, so inline the status check there (a policy is not
-- callable as an RPC) and drop the standalone function.
drop policy if exists "match parties send messages" on public.messages;
drop function if exists public.match_chat_open(uuid);

create policy "match parties send messages" on public.messages
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and public.is_match_party(match_id)
    and public.user_is_verified()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.status in ('active', 'hired') -- closed_* ends chat
    )
  );

-- ---- Fix 2: clients could pre-set read_at / created_at on their own messages -----
-- The INSERT policy constrains sender/party/verified/open but not these columns, so a
-- party posting straight to PostgREST could suppress their own message's unread badge
-- (read_at pre-set) or pin/lead the thread (backdated/postdated created_at). Force both
-- to server-controlled values on every insert. Read receipts only ever move through
-- mark_match_read (an UPDATE — this BEFORE INSERT trigger doesn't touch it).
create or replace function public.force_message_server_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.read_at := null;
  new.created_at := now();
  return new;
end;
$$;

create or replace trigger messages_force_server_fields
  before insert on public.messages
  for each row execute function public.force_message_server_fields();

-- ---- Fix 3: hired/close race — read-then-write let a terminal status be overwritten
-- and could double-insert the 'match_hired' audit row (north-star double-count). Make
-- the UPDATE itself the atomic gate: only the transaction that actually flips
-- active -> X (row_count = 1) audits + broadcasts; a concurrent second call sees 0 rows
-- and returns invalid_transition. Same signature as 0011, so the service mapping is
-- unchanged. (Mirrors the UNIQUE/ON CONFLICT backstop used by record_employer_swipe.)
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

  -- The gate: flip only if still active. row_count = 1 means we won the race.
  update public.matches set status = p_status
  where id = p_match_id and status = 'active';
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    -- already terminal (or a concurrent transition won) — no reopen in MVP.
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
