-- M9 audit: docs/database-schema.md mandates users.email UNIQUE + an email index.
-- auth.users already enforces email uniqueness upstream and the app keys on users.id,
-- but add the unique index for schema-doc parity and defense in depth. Every public.users
-- row is created by handle_new_user() copying auth.users.email, so no duplicates exist.
create unique index if not exists users_email_unique_idx on public.users (email);
