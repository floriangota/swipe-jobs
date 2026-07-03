-- M4: photos (uploads + moderation state) + private storage bucket + RLS.
-- M4 builds the ingestion pipeline and the pending->approved GATE. The admin
-- approve/reject queue is M8 (it flips status via the service-role client, which
-- bypasses RLS) — so there is intentionally NO user UPDATE policy here.

create type public.photo_type as enum ('worker_photo', 'employer_logo');
create type public.photo_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  storage_path text not null, -- object path within the private 'photos' bucket
  type public.photo_type not null,
  status public.photo_status not null default 'pending', -- moderation gate
  reviewed_by uuid references public.users (id) on delete set null, -- set by admin in M8
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photos_status_idx on public.photos (status); -- admin queue (M8)
create index if not exists photos_user_id_idx on public.photos (user_id);

create trigger photos_set_updated_at before update on public.photos
  for each row execute function public.set_updated_at();

alter table public.photos enable row level security;

-- Owner-scoped in M4. Status changes (approve/reject) run through the service-role
-- client in M8; no user UPDATE policy exists, so a user cannot self-approve.
create policy "user reads own photos" on public.photos
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user inserts own photos" on public.photos
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user deletes own photos" on public.photos
  for delete to authenticated using (user_id = (select auth.uid()));

-- Activate the deferred FKs (stub columns shipped in M2). ON DELETE SET NULL so
-- deleting a photo just unlinks it from the profile rather than cascading.
alter table public.worker_profiles
  add constraint worker_profiles_photo_id_fkey
  foreign key (photo_id) references public.photos (id) on delete set null;
alter table public.employer_profiles
  add constraint employer_profiles_logo_id_fkey
  foreign key (logo_id) references public.photos (id) on delete set null;

create index if not exists worker_profiles_photo_id_idx on public.worker_profiles (photo_id);

-- ---- Private storage bucket ------------------------------------------------
-- Objects live at photos/{user_id}/{uuid}.jpg. Private (never public); approved
-- photos are served via short-lived signed URLs generated server-side. The bucket
-- caps size + mime as defense in depth with the server-side validation/re-encode.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- A user may only touch objects under their own folder (photos/{their-uid}/...).
create policy "photos bucket: read own objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos bucket: insert own objects" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos bucket: delete own objects" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
