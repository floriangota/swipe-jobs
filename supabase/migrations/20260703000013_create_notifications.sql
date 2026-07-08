-- M7: in-app notifications + the hooks that create them. Notifications are created by
-- SECURITY DEFINER triggers (atomic with the event, RLS-agnostic, never forgotten) and
-- are best-effort: a notification failure NEVER rolls back the core action (a match, a
-- message, a swipe). Emails are dispatched out-of-band by a Vercel Cron reading this
-- table (emailed_at tracks delivery). Payloads are CONTACT-FREE by construction (golden
-- rule): pre-match surfaces carry first name + last initial only; match/message
-- notifications may carry the post-match display name, never phone/email/surname alone.

create type public.notification_type as enum ('new_match', 'new_message', 'new_candidate', 'system');

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb, -- no contact fields
  read_at timestamptz,
  emailed_at timestamptz, -- M7 addition: email-dispatch tracking (null = not yet emailed)
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_read_idx on public.notifications (user_id, read_at);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
-- Cron dispatch scans by (type, emailed_at) for rows still needing an email.
create index if not exists notifications_dispatch_idx on public.notifications (type, emailed_at, created_at);

-- ---- RLS -------------------------------------------------------------------
alter table public.notifications enable row level security;
-- Read only your own. No client INSERT (triggers/server-role only). No UPDATE/DELETE
-- policy: read receipts go through mark_notifications_read (SECURITY DEFINER), matching
-- the M6 mark_match_read pattern, so clients can only ever flip read_at on their own rows.
create policy "user reads own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- ---- Mark read (own rows) --------------------------------------------------
-- p_ids null/empty => mark ALL of the caller's unread notifications read. Returns the
-- number marked. Scoped to auth.uid() so a caller can never touch another user's rows.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated int;
begin
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid())
    and read_at is null
    and (p_ids is null or array_length(p_ids, 1) is null or id = any (p_ids));
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- ---- Trigger: a new match notifies BOTH parties -----------------------------
create or replace function public.notify_new_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_user uuid;
  v_employer_user uuid;
  v_business text;
  v_worker_name text;
  v_title text;
begin
  begin
    select wp.user_id, wp.first_name || ' ' || wp.last_name
      into v_worker_user, v_worker_name
    from public.worker_profiles wp where wp.id = new.worker_profile_id;

    select ep.user_id, ep.business_name, l.title
      into v_employer_user, v_business, v_title
    from public.listings l
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    where l.id = new.listing_id;

    -- Worker's notification: counterpart is the business.
    insert into public.notifications (user_id, type, payload)
    values (
      v_worker_user, 'new_match',
      jsonb_build_object('match_id', new.id, 'listing_id', new.listing_id,
                         'listing_title', v_title, 'counterpart_name', v_business)
    );
    -- Employer's notification: counterpart is the worker (name unlocked post-match).
    insert into public.notifications (user_id, type, payload)
    values (
      v_employer_user, 'new_match',
      jsonb_build_object('match_id', new.id, 'listing_id', new.listing_id,
                         'listing_title', v_title, 'counterpart_name', v_worker_name)
    );
  exception when others then
    null; -- best-effort: never block the match
  end;
  return null;
end;
$$;

create or replace trigger matches_notify_new_match
  after insert on public.matches
  for each row execute function public.notify_new_match();

-- ---- Trigger: a new message notifies the recipient --------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_user uuid;
  v_employer_user uuid;
  v_business text;
  v_worker_name text;
  v_recipient uuid;
  v_sender_name text;
begin
  begin
    select wp.user_id, wp.first_name || ' ' || wp.last_name, ep.user_id, ep.business_name
      into v_worker_user, v_worker_name, v_employer_user, v_business
    from public.matches m
    join public.worker_profiles wp on wp.id = m.worker_profile_id
    join public.listings l on l.id = m.listing_id
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    where m.id = new.match_id;

    if new.sender_user_id = v_worker_user then
      v_recipient := v_employer_user;
      v_sender_name := v_worker_name; -- employer sees the worker's (unlocked) name
    else
      v_recipient := v_worker_user;
      v_sender_name := v_business; -- worker sees the business name
    end if;

    if v_recipient is not null then
      insert into public.notifications (user_id, type, payload)
      values (
        v_recipient, 'new_message',
        jsonb_build_object('match_id', new.match_id, 'message_id', new.id,
                           'sender_name', v_sender_name, 'preview', left(new.body, 80))
      );
    end if;
  exception when others then
    null; -- best-effort: never block the message send
  end;
  return null;
end;
$$;

create or replace trigger messages_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ---- Trigger: a worker's right-swipe notifies the listing owner --------------
create or replace function public.notify_new_candidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employer_user uuid;
  v_title text;
  v_worker_name text; -- GOLDEN RULE: first name + last INITIAL only (pre-match).
begin
  if new.direction <> 'right' then
    return null;
  end if;
  begin
    select ep.user_id, l.title
      into v_employer_user, v_title
    from public.listings l
    join public.employer_profiles ep on ep.id = l.employer_profile_id
    where l.id = new.listing_id;

    select wp.first_name || ' ' || upper(left(wp.last_name, 1)) || '.'
      into v_worker_name
    from public.worker_profiles wp where wp.id = new.worker_profile_id;

    if v_employer_user is not null then
      insert into public.notifications (user_id, type, payload)
      values (
        v_employer_user, 'new_candidate',
        jsonb_build_object('listing_id', new.listing_id, 'listing_title', v_title,
                           'worker_name', v_worker_name)
      );
    end if;
  exception when others then
    null;
  end;
  return null;
end;
$$;

create or replace trigger swipes_notify_new_candidate
  after insert on public.swipes
  for each row execute function public.notify_new_candidate();
