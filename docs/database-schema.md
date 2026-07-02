# Database Schema — swipe-jobs (Phase 4)

**Engine:** PostgreSQL (Supabase). Relational, 3NF.

## Conventions
- `snake_case` names; tables plural.
- **UUID** primary keys (non-guessable, safe to expose in URLs/APIs).
- `created_at` / `updated_at timestamptz` on every table.
- **Money = integer minor units (cents), EUR.** Never floats.
- Lookups are runtime tables (admin-editable), not enums, and bilingual (`name_sq`, `name_en`).
- **RLS ON for every table.**

## Core design decisions
1. **One `users` table + separate `worker_profiles` / `employer_profiles`** (1:1 extension via `user_id`).
   Role on `users` distinguishes worker/employer/admin. Keeps professional-segment expansion clean.
2. **Two directional swipe tables** — `swipes` (worker→listing) and `employer_swipes`
   (employer→candidate-per-listing) — because Flow 1 is asymmetric.
3. **A `matches` row is materialized** when both sides right-swipe. It unlocks contact + chat.
4. Sensitive fields (`worker_profiles.last_name`, `worker_profiles.phone`,
   `employer_profiles.contact_*`) are **never selected pre-match** (service layer + RLS).

---

## Tables

### cities
First-class from day one so multi-city is additive.
- `id` uuid PK
- `name` text UNIQUE (seed: `Ferizaj`)
- `country` text default `'XK'`
- `is_active` bool default true
- timestamps

### users
Extends Supabase `auth.users`.
- `id` uuid PK (**= auth.users.id**)
- `role` enum(`worker`,`employer`,`admin`) NOT NULL
- `email` text UNIQUE NOT NULL (mirrored for convenience/authz)
- `city_id` uuid FK→cities NOT NULL (ON DELETE RESTRICT)
- `status` enum(`active`,`suspended`,`deleted`) default `active`
- `email_verified_at` timestamptz NULL
- timestamps
- **Indexes:** email(unique), city_id, role, status

### worker_profiles (1:1 with a worker user; extensible for Phase 2)
- `id` uuid PK
- `user_id` uuid FK→users UNIQUE NOT NULL (ON DELETE CASCADE)
- `first_name` text NOT NULL — shown always
- `last_name` text NOT NULL — **stored; revealed only on match** (card shows first_name + last initial)
- `bio` text NULL (length-capped)
- `experience_level` enum(`none`,`under_1y`,`1_3y`,`over_3y`) NOT NULL
- `phone` text NULL — **sensitive; never selected pre-match**
- `photo_id` uuid FK→photos NULL
- `is_visible` bool default true (worker can pause being shown)
- timestamps
- **Indexes:** user_id(unique), experience_level, is_visible, photo_id

### employer_profiles (1:1 with an employer user)
- `id` uuid PK
- `user_id` uuid FK→users UNIQUE NOT NULL (ON DELETE CASCADE)
- `business_name` text NOT NULL
- `business_type_id` uuid FK→business_types
- `description` text NULL (length-capped)
- `logo_id` uuid FK→photos NULL
- `contact_phone` text NULL — sensitive, revealed on match
- `contact_email` text NULL — sensitive, revealed on match
- timestamps
- **Indexes:** user_id(unique)

### categories (lookup, bilingual, admin-editable)
- `id` uuid PK
- `slug` text UNIQUE (e.g. `barista`)
- `name_sq` text NOT NULL, `name_en` text NOT NULL
- `is_active` bool default true
- `sort_order` int
- timestamps
- **Indexes:** slug(unique), is_active

### languages (lookup, bilingual)
- `id` uuid PK
- `code` text UNIQUE (`sq`,`en`,`sr`,`de`,`tr`…)
- `name_sq`, `name_en` text
- `is_active` bool

### business_types (lookup, bilingual)
- `id` uuid PK
- `slug` text UNIQUE
- `name_sq`, `name_en` text
- `is_active` bool

### worker_categories (join: worker ↔ categories)
- `worker_profile_id` uuid FK→worker_profiles (ON DELETE CASCADE)
- `category_id` uuid FK→categories (ON DELETE RESTRICT)
- **PK (worker_profile_id, category_id)**
- **Indexes:** category_id, worker_profile_id

### worker_languages (join: worker ↔ languages)
- `worker_profile_id` uuid FK (cascade)
- `language_id` uuid FK (restrict)
- **PK (worker_profile_id, language_id)**

### worker_availabilities (join: worker ↔ availability)
- `worker_profile_id` uuid FK (cascade)
- `availability` enum(`full_time`,`part_time`,`weekends`,`evenings`)
- **PK (worker_profile_id, availability)**

### listings (one role per listing)
- `id` uuid PK
- `employer_profile_id` uuid FK→employer_profiles NOT NULL (ON DELETE CASCADE)
- `city_id` uuid FK→cities NOT NULL (denormalized for fast city-filtered feed)
- `category_id` uuid FK→categories NOT NULL (ON DELETE RESTRICT)
- `title` text NOT NULL
- `description` text NULL (length-capped)
- `job_type` enum(`full_time`,`part_time`,`shift`,`temporary`) NOT NULL
- `required_experience` enum(`none`,`under_1y`,`1_3y`,`over_3y`) NOT NULL
- `pay_min` int NOT NULL (cents) — **required**
- `pay_max` int NULL (null = exact pay)
- `pay_period` enum(`hourly`,`monthly`) NOT NULL
- `status` enum(`active`,`paused`,`closed`) default `active`
- timestamps
- **Constraints:** CHECK(pay_min > 0); CHECK(pay_max IS NULL OR pay_max >= pay_min)
- **Indexes:** **(city_id, status, category_id)** ← hot path (worker feed); employer_profile_id; status

### swipes (worker → listing)
- `id` uuid PK
- `worker_profile_id` uuid FK→worker_profiles NOT NULL (cascade)
- `listing_id` uuid FK→listings NOT NULL (cascade)
- `direction` enum(`left`,`right`) NOT NULL (right = interested)
- `created_at`
- **Constraints:** **UNIQUE(worker_profile_id, listing_id)** (no double-swipe; no undo in MVP)
- **Indexes:** the unique index (exclude already-swiped from feed); (listing_id, direction) (build candidate stack)

### employer_swipes (employer → candidate per listing)
- `id` uuid PK
- `listing_id` uuid FK→listings NOT NULL (cascade)
- `worker_profile_id` uuid FK→worker_profiles NOT NULL (cascade)
- `direction` enum(`left`,`right`) NOT NULL
- `created_at`
- **Constraints:** **UNIQUE(listing_id, worker_profile_id)**
- **Indexes:** unique index; (listing_id, direction)

### matches (materialized on mutual right-swipe)
- `id` uuid PK
- `listing_id` uuid FK→listings NOT NULL (cascade)
- `worker_profile_id` uuid FK→worker_profiles NOT NULL (cascade)
- `status` enum(`active`,`closed_by_worker`,`closed_by_employer`,`hired`) default `active`
- `matched_at` timestamptz default now
- timestamps
- **Constraints:** **UNIQUE(listing_id, worker_profile_id)** (guarantees one match even under race)
- **Indexes:** unique index; worker_profile_id; listing_id
- **Note:** `hired` status = the north-star metric (confirmed hires).

### messages (chat within a match; text-only MVP)
- `id` uuid PK
- `match_id` uuid FK→matches NOT NULL (cascade)
- `sender_user_id` uuid FK→users NOT NULL
- `body` text NOT NULL (length-capped, **sanitized on write**)
- `read_at` timestamptz NULL
- `created_at`
- **Indexes:** **(match_id, created_at)** (chat history); (match_id, read_at) (unread)

### photos (uploads + moderation state)
- `id` uuid PK
- `user_id` uuid FK→users NOT NULL (cascade)
- `storage_path` text NOT NULL (private bucket)
- `type` enum(`worker_photo`,`employer_logo`)
- `status` enum(`pending`,`approved`,`rejected`) default `pending` ← moderation gate
- `reviewed_by` uuid FK→users NULL
- `reviewed_at` timestamptz NULL
- timestamps
- **Indexes:** status (admin queue), user_id

### reports
- `id` uuid PK
- `reporter_user_id` uuid FK→users NOT NULL
- `reported_user_id` uuid FK→users NULL
- `reported_listing_id` uuid FK→listings NULL
- `reported_message_id` uuid FK→messages NULL
- `reason` enum(`inappropriate_photo`,`spam`,`harassment`,`fake`,`other`)
- `details` text NULL
- `status` enum(`open`,`reviewing`,`resolved`,`dismissed`) default `open`
- `resolved_by` uuid FK→users NULL
- timestamps
- **Constraints:** CHECK at least one reported_* target is non-null
- **Indexes:** status, reported_user_id

### audit_logs (security/analytics trail)
- `id` uuid PK
- `actor_user_id` uuid FK→users NULL (null = system)
- `action` text (e.g. `match_created`,`photo_approved`,`user_suspended`,`listing_closed`)
- `target_type` text, `target_id` uuid
- `metadata` jsonb (**no PII/secrets**)
- `created_at`
- **Indexes:** (actor_user_id, created_at), action, created_at

### notifications (in-app)
- `id` uuid PK
- `user_id` uuid FK→users NOT NULL (cascade)
- `type` enum(`new_match`,`new_message`,`new_candidate`,`system`)
- `payload` jsonb
- `read_at` timestamptz NULL
- `created_at`
- **Indexes:** (user_id, read_at), (user_id, created_at)

---

## Normalization notes
- 3NF. Multi-value attributes (categories/languages/availabilities) are join tables, not CSV strings.
- **Intentional denormalizations:** `listings.city_id` (from employer — feed filters by city constantly);
  `users.email` (mirrored from auth). Both justified by hot-path reads.

## Hot-path indexes (summary)
| Query | Index |
|---|---|
| Worker feed (city+status+category, exclude swiped) | listings(city_id,status,category_id) + swipes(worker_profile_id,listing_id) |
| Employer candidate stack | swipes(listing_id,direction) |
| Match create/detect | unique indexes on both swipe tables + matches(listing_id,worker_profile_id) |
| Chat history | messages(match_id,created_at) |
| Unread | messages(match_id,read_at), notifications(user_id,read_at) |
| Admin photo queue | photos(status) |
| Admin report queue | reports(status) |

## Future seams (built-in, dormant)
- `cities` first-class → multi-city = insert rows.
- `worker_profiles` extensible → professional segment adds columns/tables, no restructure.
- Lookups runtime-editable → grow via admin, no migrations.
- Payments-ready: add `payments`/`listing_orders` referencing employer/listing when activated.
  `matches.hired` already captures the value metric.

## Integrity / privacy at DB layer
- Cascades: deleting a user cascades to profile/swipes/matches/messages (supports GDPR erasure).
  Categories/cities use RESTRICT.
- Contact fields never selected pre-match (data-access layer + RLS).
- GDPR/LPPD erasure: soft-delete (`status=deleted`) → hard-delete via cascade after grace window.
