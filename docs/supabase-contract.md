# Supabase Contract

This document describes the database foundation for My Weekly List. The app is
private and single-user, but the database still uses user-owned rows and row
level security so anonymous/public clients cannot read or write app data.

## Environment

Browser and server clients use these public-safe variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ALLOWED_USER_EMAIL`

Do not put a service-role key in browser code. Service-role keys are not needed
for normal app screens and must remain server-only if they are ever introduced
for deployment or administrative workflows.

## Migration Files

The initial schema is in:

- `supabase/migrations/20260528223000_initial_schema.sql`

Apply migrations locally or remotely with the Supabase CLI after linking a
project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

For local-only development, start the local Supabase stack and apply migrations
with the normal Supabase CLI workflow for this repo. If Docker or a linked
project is unavailable, review the migration SQL and run `./scripts/check.sh`;
the unit tests verify the expected schema artifacts and seed definitions are
present.

## Tables

### `profiles`

Purpose: one profile row per authenticated Supabase user.

Key fields:

- `id`: references `auth.users(id)` and is the primary key.
- `email`: copied from the auth user.
- `created_at`, `updated_at`: audit timestamps.

An auth trigger upserts a profile when a user is created or when the auth email
changes.

### `weeks`

Purpose: one Monday-Sunday planning week for one user.

Key fields:

- `user_id`: owner, references `auth.users(id)`.
- `week_start_date`: must be a Monday.
- `week_end_date`: generated as six days after `week_start_date`.
- `status`: one of `draft`, `active`, `needs_review`, or `closed`.

Constraints:

- One row per `user_id` and `week_start_date`.
- Closed weeks are identifiable through `status = 'closed'`.
- Updates or deletes to an already closed week are blocked by trigger.

### `categories`

Purpose: reusable category definitions for the user's active/future lists.

Key fields:

- `user_id`: owner.
- `name`: reusable category name.
- `sort_order`: display order.
- `is_active`: future planning visibility.

These rows are reusable templates. Historical week display must not depend only
on current category rows because future category edits should not rewrite past
weeks.

### `activity_templates`

Purpose: reusable activity definitions, such as `Walk`.

Key fields:

- `user_id`: owner.
- `category_id`: current reusable category.
- `name`: reusable activity name.
- `default_target_count`: target copied into future week activities.
- `sort_order`: display order inside the category.
- `is_active`: future planning visibility.

These rows are reusable templates. Future template edits should affect future
planning, not historical weeks.

### `week_activities`

Purpose: an activity's copy inside one week.

Key fields:

- `week_id`: owning week.
- `activity_template_id`: nullable reference to the reusable template. It may
  become null if a template is removed in the future.
- `category_id`: nullable reference to the reusable category.
- `category_name`: historical category snapshot.
- `category_sort_order`: historical category ordering snapshot.
- `activity_name`: historical activity name snapshot.
- `target_count`: historical weekly target snapshot.
- `sort_order`: historical activity ordering snapshot.

Snapshot strategy:

Historical display uses `category_name`, `category_sort_order`,
`activity_name`, `target_count`, and `sort_order` from `week_activities`. The
current `categories` and `activity_templates` rows are only references back to
the reusable list; they are not the source of truth for a past week.

Rows cannot be inserted, updated, or deleted for a closed week.

### `activity_day_cells`

Purpose: one day cell for one week activity on one date.

Key fields:

- `week_activity_id`: owning week activity.
- `cell_date`: date inside the parent week.
- `planned`: whether the activity was planned for that day.
- `done`: whether the activity happened that day.

Constraints:

- `(week_activity_id, cell_date)` is unique, so an activity can count at most
  once per day.
- `cell_date` must be within the parent Monday-Sunday week.
- Rows cannot be inserted, updated, or deleted for a closed week.

## Planned, Done, and Missed

Planning and completion are separate facts:

- `planned`: planned structure for a day.
- `done`: what actually happened.

Done counts whether or not the cell was planned. Missed is not stored. It is
derived as:

```text
planned is true
done is false
cell_date is before today
week status is not draft
```

Keeping missed derived avoids creating missed rows for unplanned or ghost weeks.

## Seed Data

The initial categories and activities come from `docs/product-plan.md`.

The migration defines:

```sql
public.seed_initial_weekly_list()
```

Call this function as the authenticated app user after the user has signed in,
for example from a future setup or onboarding flow:

```sql
select public.seed_initial_weekly_list();
```

The function uses `auth.uid()` and inserts user-owned rows into `categories`
and `activity_templates`. It is safe to run more than once because unique
indexes plus `on conflict do nothing` prevent duplicate categories or activity
templates.

Seed categories:

- Physical Health
- Mental Health
- Family and Home
- Relationship Health
- Hobbies
- Work

Seed activity templates:

- Physical Health: Walk x4, Floss x4, Yoga x2, Cardio / Strength x2
- Mental Health: Weekly calendar x1, Friends x1, Journal x1, Pivot Year x7,
  Meditation x3, Downtime x2, Read x5, Get out of the house x3
- Family and Home: Quality kid time x1, Check budget x2, House upkeep x2
- Relationship Health: Video call x5, Check in x1, Fun sexy times x1
- Hobbies: Singing practice x4, Dance x1, Pickleball x1, Harmony Road work x1
- Work: Update whiteboard x3, Complete a big item x1

## RLS

RLS is enabled on every app table.

Allowed:

- Authenticated users can read and write their own profile row.
- Authenticated users can read and write their own weeks.
- Authenticated users can read and write their own categories and activity
  templates.
- Authenticated users can read and write week activities and day cells only
  through weeks they own.
- Inserts that reference a category or activity template must reference rows
  owned by the authenticated user.

Blocked:

- Anonymous/public users cannot read app data.
- Authenticated users cannot read or write rows owned by another user.
- Browser clients cannot bypass RLS with service-role privileges.
- Closed-week child rows cannot be changed through normal table writes.

## Future Enforcement

This schema stores the facts needed for future workflows, including active-week
rules and closed-week locking. Later issues can add app-level logic to prevent
brand-new activities in already active weeks and to manage week lifecycle
transitions while relying on these database constraints as the persistence
foundation.
