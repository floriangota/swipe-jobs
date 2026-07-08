-- M8: Admin Panel — the `reports` table (user submissions) + the admin surface.
-- Admin gating is DEFENSE-IN-DEPTH (CLAUDE.md): the app checks requireRole('admin')
-- AND the database enforces it — admin READS go through the RLS SELECT policies below
-- (user_has_role('admin')), admin WRITES go through SECURITY DEFINER admin_* functions
-- that re-check user_has_role('admin') and mutate only the intended columns + write an
-- audit_logs row atomically. No service-role client is used for admin ops.

-- ---- reports (user-submitted; consumed by the admin queue) -------------------
create type public.report_reason as enum ('inappropriate_photo', 'spam', 'harassment', 'fake', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users (id) on delete cascade,
  reported_user_id uuid references public.users (id) on delete cascade,
  reported_listing_id uuid references public.listings (id) on delete cascade,
  reported_message_id uuid references public.messages (id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_has_target check (
    reported_user_id is not null or reported_listing_id is not null or reported_message_id is not null
  ),
  constraint reports_details_max_length check (details is null or char_length(details) <= 1000)
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_reported_user_idx on public.reports (reported_user_id);

create trigger reports_set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;
-- Any authed user files a report AS THEMSELVES; a report always names its reporter.
-- No client SELECT (reporters don't read reports back); admin reads via the policy below.
create policy "user files own report" on public.reports
  for insert to authenticated
  with check (reporter_user_id = (select auth.uid()));
create policy "admin reads reports" on public.reports
  for select to authenticated using (public.user_has_role('admin'));

-- ---- Admin READ policies (defense in depth; reads only, writes go via functions) ----
create policy "admin reads all photos" on public.photos
  for select to authenticated using (public.user_has_role('admin'));
create policy "admin reads all users" on public.users
  for select to authenticated using (public.user_has_role('admin'));
create policy "admin reads all listings" on public.listings
  for select to authenticated using (public.user_has_role('admin'));
create policy "admin reads all matches" on public.matches
  for select to authenticated using (public.user_has_role('admin'));
create policy "admin reads all worker profiles" on public.worker_profiles
  for select to authenticated using (public.user_has_role('admin'));
create policy "admin reads all employer profiles" on public.employer_profiles
  for select to authenticated using (public.user_has_role('admin'));
create policy "admin reads audit logs" on public.audit_logs
  for select to authenticated using (public.user_has_role('admin'));
-- Admin may read objects in the private photos bucket (to sign moderation previews).
create policy "photos bucket: admin reads all" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.user_has_role('admin'));

-- ---- Admin WRITE functions (SECURITY DEFINER; self-authorize + audit) --------

-- Approve/reject a photo. On approve, also wire it onto the owner's profile
-- (worker_profiles.photo_id / employer_profiles.logo_id) — finishing the M4 pipeline.
create or replace function public.admin_review_photo(p_photo_id uuid, p_decision text)
returns table (ok boolean, not_found boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_type public.photo_type;
begin
  if not public.user_has_role('admin') then
    return query select false, false; return;
  end if;
  if p_decision not in ('approved', 'rejected') then
    return query select false, false; return;
  end if;

  select user_id, type into v_owner, v_type from public.photos where id = p_photo_id;
  if v_owner is null then
    return query select false, true; return; -- not found
  end if;

  update public.photos
  set status = p_decision::public.photo_status, reviewed_by = v_uid, reviewed_at = now()
  where id = p_photo_id;

  if p_decision = 'approved' then
    if v_type = 'worker_photo' then
      update public.worker_profiles set photo_id = p_photo_id where user_id = v_owner;
    else
      update public.employer_profiles set logo_id = p_photo_id where user_id = v_owner;
    end if;
  end if;

  insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (v_uid, 'photo_' || p_decision, 'photo', p_photo_id, jsonb_build_object('decision', p_decision));

  return query select true, false;
end;
$$;

-- Suspend a user (status -> suspended). Suspended users are blocked at login (M1);
-- the mid-session API guard is M9. Never let an admin suspend themselves.
create or replace function public.admin_suspend_user(p_user_id uuid, p_reason text)
returns table (ok boolean, not_found boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_exists boolean;
begin
  if not public.user_has_role('admin') or p_user_id = v_uid then
    return query select false, false; return;
  end if;
  select exists (select 1 from public.users where id = p_user_id) into v_exists;
  if not v_exists then
    return query select false, true; return;
  end if;

  update public.users set status = 'suspended' where id = p_user_id;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (v_uid, 'user_suspended', 'user', p_user_id, jsonb_build_object('reason', left(coalesce(p_reason, ''), 500)));
  return query select true, false;
end;
$$;

-- Resolve a report: dismiss | suspend_user | remove_listing. suspend_user/remove_listing
-- act on the report's named target (no-op if that target is absent) then mark resolved.
create or replace function public.admin_resolve_report(p_report_id uuid, p_action text, p_note text)
returns table (ok boolean, not_found boolean, invalid boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_reported_user uuid;
  v_reported_listing uuid;
begin
  if not public.user_has_role('admin') then
    return query select false, false, false; return;
  end if;
  if p_action not in ('dismiss', 'suspend_user', 'remove_listing') then
    return query select false, false, true; return;
  end if;

  select reported_user_id, reported_listing_id into v_reported_user, v_reported_listing
  from public.reports where id = p_report_id;
  if not found then
    return query select false, true, false; return;
  end if;

  if p_action = 'suspend_user' then
    if v_reported_user is null or v_reported_user = v_uid then
      return query select false, false, true; return; -- nothing/invalid to suspend
    end if;
    update public.users set status = 'suspended' where id = v_reported_user;
    insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
    values (v_uid, 'user_suspended', 'user', v_reported_user, jsonb_build_object('via', 'report', 'report_id', p_report_id));
  elsif p_action = 'remove_listing' then
    if v_reported_listing is null then
      return query select false, false, true; return;
    end if;
    update public.listings set status = 'closed' where id = v_reported_listing;
    insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
    values (v_uid, 'listing_removed', 'listing', v_reported_listing, jsonb_build_object('via', 'report', 'report_id', p_report_id));
  end if;

  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed'::public.report_status else 'resolved'::public.report_status end,
      resolved_by = v_uid
  where id = p_report_id;

  insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (v_uid, 'report_resolved', 'report', p_report_id, jsonb_build_object('action', p_action, 'note', left(coalesce(p_note, ''), 500)));
  return query select true, false, false;
end;
$$;

-- Create or update a bilingual category (admin-editable lookup data).
create or replace function public.admin_upsert_category(
  p_id uuid,
  p_slug text,
  p_name_sq text,
  p_name_en text,
  p_is_active boolean,
  p_sort_order int
)
returns table (ok boolean, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if not public.user_has_role('admin') then
    return query select false, null::uuid; return;
  end if;

  if p_id is null then
    insert into public.categories (slug, name_sq, name_en, is_active, sort_order)
    values (p_slug, p_name_sq, p_name_en, coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning id into v_id;
  else
    update public.categories
    set slug = p_slug, name_sq = p_name_sq, name_en = p_name_en,
        is_active = coalesce(p_is_active, true), sort_order = coalesce(p_sort_order, 0)
    where id = p_id
    returning id into v_id;
  end if;

  if v_id is null then
    return query select false, null::uuid; return;
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (v_uid, case when p_id is null then 'category_created' else 'category_updated' end, 'category', v_id, jsonb_build_object('slug', p_slug));
  return query select true, v_id;
end;
$$;
