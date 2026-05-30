# Supabase Contract

This document describes the database foundation for My Weekly List. The app is
private and single-user, but the database still uses user-owned rows and row
level security so anonymous/public clients cannot read or write app data.

## Environment

Browser and server clients use these public-safe variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Local admin scripts use:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not put a service-role key in browser code or public Vercel env vars. The
service-role key is only for local manual user management scripts.

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
- `is_allowed`: whether the authenticated user may use the app.
- `must_change_password`: whether the user must change a temporary password
  before normal access.
- `created_at`, `updated_at`: audit timestamps.

An auth trigger upserts a profile when a user is created or when the auth email
changes.

Tim manually creates/resets/disables users with local scripts that use Supabase
Admin APIs and update these access fields. Adding or removing allowed users does
not require editing Vercel environment variables or redeploying the app.
The password-auth migration preserves access for profiles that already existed
before the change; newly created Auth users default to not allowed until a local
admin script enables them.

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

Current-week creation snapshots each active reusable template into
`week_activities`. The repo migration
`20260529040500_week_activity_snapshot_uniqueness.sql` adds a uniqueness guard
on `(week_id, activity_template_id)` so retrying the first-week creation flow
cannot duplicate the same template snapshot inside one week. That migration
also merges any retry-created duplicate snapshots before adding the index,
preserving any planned/done day cells on the kept snapshot row.

### `activity_day_cells`

Purpose: one day cell for one week activity on one date.

Key fields:

- `week_activity_id`: owning week activity.
- `cell_date`: date inside the parent week.
- `planned`: whether the activity was planned for that day.
- `done`: whether the activity happened that day.
- `skipped`: whether a planned occurrence was intentionally skipped that day.

Constraints:

- `(week_activity_id, cell_date)` is unique, so an activity can count at most
  once per day.
- `cell_date` must be within the parent Monday-Sunday week.
- `done` and `skipped` cannot both be true.
- `skipped` requires `planned` to be true, so Skip preserves the original
  planned occurrence instead of erasing it.
- Rows cannot be inserted, updated, or deleted for a closed week.

## Planned, Done, Skipped, and Missed

Planning, completion, and intentional Skip resolution are separate facts:

- `planned`: planned structure for a day.
- `done`: what actually happened.
- `skipped`: a planned occurrence intentionally skipped for that day.

Valid day-cell combinations are:

```text
planned = true,  done = false, skipped = false
  Planned/pending today, or missed after the date passes.

planned = true,  done = true,  skipped = false
  Planned and completed.

planned = false, done = true,  skipped = false
  Unplanned completion.

planned = true,  done = false, skipped = true
  Planned and intentionally skipped.
```

These combinations are invalid:

```text
done = true and skipped = true
skipped = true and planned = false
```

Done counts whether or not the cell was planned. Missed is not stored. It is
derived as:

```text
planned is true
done is false
cell_date is before today
week status is not draft
```

Keeping missed derived avoids creating missed rows for unplanned or ghost weeks.
Skip is stored distinctly from missed so Review can later distinguish intentional
same-day resolution from a planned occurrence that simply was not completed.

The This Week grid is a planning and weekly-overview surface. It mutates only
the `planned` fact:

- Draft weeks: blank and planned cells toggle directly.
- Active weeks: today and future blank/planned cells toggle directly.
- Active past cells, done cells, missed cells, and closed weeks are display-only.

The app may show an immediate optimistic planning toggle in the browser, but the
server action still persists an explicit intended `planned` value through the
authenticated Supabase session and existing RLS. Fresh loads use Supabase as the
source of truth.

Marking an unplanned cell done will store `planned = false`, `done = true`, and
`skipped = false` from the Today flow. Marking a planned cell done will store
`planned = true`, `done = true`, and `skipped = false`, but both render with the
same Done visual treatment in the normal UI. Skipping a planned occurrence stores
`planned = true`, `done = false`, and `skipped = true`; it does not change the
weekly target or remove the plan from historical record. The This Week MVP may
use the current muted missed/skipped visual treatment for skipped cells while
Review can still distinguish Skip in stored data. Removing the last
false/false/false fact deletes the day-cell row rather than storing empty cells.

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

- Authenticated users can read their own profile row.
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
- Authenticated users cannot directly update access fields on their own profile.
  The app clears `must_change_password` through the narrow
  `public.clear_own_password_change_required()` function after a successful
  Supabase password update.
- Browser clients cannot bypass RLS with service-role privileges.
- Closed-week child rows cannot be changed through normal table writes.

## Future Enforcement

This schema stores the facts needed for future workflows, including active-week
rules and closed-week locking. Later issues can add app-level logic to prevent
brand-new activities in already active weeks and to manage week lifecycle
transitions while relying on these database constraints as the persistence
foundation.
