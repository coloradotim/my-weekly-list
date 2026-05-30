# Supabase Operations

This repo treats Supabase schema changes as code. Migration files live in
`supabase/migrations`, and normal schema changes should be made through a pull
request that adds or edits migration files and updates the schema contract.

Manual SQL paste/edit in the Supabase dashboard is an exception path only. If it
is ever used for emergency work, follow up with a migration that captures the
same change in the repo.

## Required Local Values

Local CLI migration commands need:

- `SUPABASE_PROJECT_REF`: the Supabase project reference.
- `SUPABASE_DB_PASSWORD`: the database password for the linked project.
- `SUPABASE_ACCESS_TOKEN`: optional locally if `supabase login` has already
  authenticated the CLI, but required for GitHub Actions.

Do not commit these values. For local migration work, copy
`supabase.env.example` to `.env.supabase.local` and fill in the project ref and
database password there, or put the values in your shell environment. The
`.env.supabase.local` file is ignored by git and is loaded only by the Supabase
operation scripts. Keep these operations secrets out of `.env.local` unless the
value is already meant for the app runtime. Never expose service-role keys to
browser code.

## Local CLI Workflow

Check CLI availability, link the project, and show local/remote migration
state:

```bash
cp supabase.env.example .env.supabase.local
# Fill in .env.supabase.local, then run:
scripts/supabase-status.sh
```

Preview what would be applied:

```bash
SUPABASE_MIGRATION_MODE=dry-run \
scripts/supabase-migrate.sh
```

Apply pending repo migrations:

```bash
SUPABASE_MIGRATION_MODE=apply \
scripts/supabase-migrate.sh
```

The apply mode links the project, prints current migration state, runs
`supabase db push`, and prints migration state again.

Local validation against a local Supabase stack requires Docker because the
Supabase CLI runs the local database through containers. If Docker is not
available, use the linked-project dry run or GitHub Actions dry run instead.

## GitHub Actions Workflow

The manual workflow is:

- `.github/workflows/supabase-migrations.yml`

It is intentionally `workflow_dispatch` only. It does not run automatically on
merge, so schema changes require an explicit migration operation.

Required GitHub repository secrets:

- `SUPABASE_ACCESS_TOKEN`: Supabase personal access token for the CLI.
- `SUPABASE_PROJECT_REF`: project reference for the production Supabase project.
- `SUPABASE_DB_PASSWORD`: database password used by `supabase link` and
  `supabase db push`.

The workflow has one input:

- `mode`: `dry-run` or `apply`.

Use `dry-run` first. It links the project, lists migration state, and prints
which migrations would be applied. Use `apply` only after reviewing the dry-run
output.

The workflow uses GitHub environment `production`. If the repository has
environment protection rules, approve the run before applying migrations.

## Remote Migration Verification

Use either path:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<database-password> \
scripts/supabase-status.sh
```

or run the GitHub Actions workflow in `dry-run` mode.

Verification should show that every file in `supabase/migrations` is present in
the linked project's migration history. If a migration is missing, run the
workflow in `apply` mode or run `SUPABASE_MIGRATION_MODE=apply
scripts/supabase-migrate.sh` locally.

## Owner Auth Bootstrap

My Weekly List uses Supabase email Magic Link auth for one existing owner user.
The app never accepts a browser-submitted recipient email. It reads
`ALLOWED_USER_EMAIL` on the server and calls `signInWithOtp` with
`shouldCreateUser: false`.

One-time Supabase dashboard setup:

1. Open the Supabase project dashboard.
2. Go to **Authentication > Sign In / Providers > Email**.
3. Confirm the Email provider and Magic Link email auth are enabled.
4. Go to **Authentication > Users**.
5. Use **Add user > Create new user** to provision `cubuff98@gmail.com` as the
   existing owner Auth user. Confirm the user has an email identity and can
   receive Magic Link email.
6. Return to **Authentication > Sign In / Providers > Email** and disable
   **Allow new users to sign up** before normal app login/use. Supabase documents
   this as the existing-users-only mode when signup is disabled.
7. Go to **Authentication > URL Configuration**.
8. Configure the production Site URL and add allowed redirect URLs for
   production Vercel and local development:
   - `https://my-weekly-list.vercel.app/auth/callback`
   - `https://<production-vercel-domain>/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `http://127.0.0.1:3000/auth/callback`
   If local Magic Link callback URLs include query parameters or nested local
   paths, add local wildcards too:
   - `http://localhost:3000/**`
   - `http://127.0.0.1:3000/**`

No Google Cloud OAuth setup is required. Do not add a Before User Created hook
unless the existing-user-plus-signups-disabled approach proves blocked. Do not
put service-role keys in browser code.

Magic Link email delivery can be rate-limited by Supabase Auth. During testing,
prefer using an existing logged-in browser session when possible. If email links
stop arriving, wait for the provider limit window to clear and avoid repeated
login attempts. Local login requests should generate callback URLs using the
local request origin, such as `http://localhost:3000/auth/callback` or
`http://127.0.0.1:3000/auth/callback`, not the production Site URL.

## Vercel Runtime Environment

The Vercel app runtime needs exactly these app variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ALLOWED_USER_EMAIL`

Do not document or configure `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a required app
variable. The app code reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

`NEXT_PUBLIC_` values are exposed to browser code and must remain public-safe.
Do not add Supabase service-role keys as public Vercel variables. No
service-role key is required for normal app screens, setup, Week, Today, or
Review.

Production URL:

```text
https://my-weekly-list.vercel.app
```

After deploys, verify development preview routes are unavailable in production:

```bash
curl -I https://my-weekly-list.vercel.app/dev/week-preview
curl -I https://my-weekly-list.vercel.app/dev/today-preview
curl -I https://my-weekly-list.vercel.app/dev/review-preview
```

Each preview route should return a not-found response in production. Authenticated
production users should not be able to use fixture-only preview surfaces.

## Production Smoke Test

Use this checklist for a production release:

1. Owner can sign in with the email Magic Link.
2. Unauthorized/non-owner access is blocked or cannot create/use an account.
3. `/` routes into Today when the current week exists.
4. If setup is complete and no current week exists, `/` safely ensures the
   current week from the saved list when possible, then lands on Today.
5. Late current-week assurance does not create elapsed-day planned, missed,
   skipped, or done history.
6. Today can mark a planned item done.
7. Today can record unplanned completion through `+ Something else`.
8. Today can move a planned item to a valid later day.
9. Today can skip a planned item and later mark it done.
10. Week reflects Today changes after refresh.
11. Week current/next-week planning and list editing work.
12. Review summary loads and counts completed activity-days correctly.
13. Review day-by-day correction toggles completion truth only.
14. Past-week Review does not require Close or Finalize.
15. Repeated navigation and refresh do not create duplicate current weeks or
    duplicate week-activity snapshots.

iPhone Chrome acceptance should confirm bottom navigation, touch targets,
current Week opening near today, Week scroll preservation after planning
changes, Next/Past Week opening at Monday, and compact readable Review.

## Seed Function

The initial reusable categories and activity templates are inserted by:

```sql
select public.seed_initial_weekly_list();
```

Run this as the authenticated allowed user after that user has signed in at
least once. The function uses `auth.uid()`, so it creates rows for the current
authenticated user and is safe to run more than once.

The normal setup path is the protected `/setup` page in the app. Sign in with
the owner Magic Link, open `/setup`, and use `Create my weekly list`. The app
calls the RPC with the signed-in user's normal Supabase session, so RLS and
`auth.uid()` stay in effect.

Running the function from the Supabase SQL Editor without an authenticated app
session fails with:

```text
Must be authenticated to seed My Weekly List defaults.
```

That failure is expected. Do not work around it by hardcoding a user id, pasting
manual insert SQL, or putting a service-role key in browser code.

Do not run the seed through browser code with a service-role key.

If setup fails in the app, confirm the migration has been applied, sign in again
as the allowed user, and retry `/setup`; the seed function is idempotent and will
not duplicate the initial categories or activity templates.

## Codex Workflow Rules

- Schema changes must be captured in migrations and docs.
- Run `./scripts/check.sh` for every PR.
- Run a migration dry run before applying remote migrations when credentials are
  available.
- Report exactly which Supabase CLI commands were run and whether they applied
  migrations or only verified state.
- Do not commit tokens, database passwords, service-role keys, `.env.local`, or
  `supabase/.temp`.
