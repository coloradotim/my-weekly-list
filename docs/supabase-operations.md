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

Do not commit these values. Put local values in your shell environment or a
private password manager, not in `.env.local` unless the value is already meant
for the app runtime. Never expose service-role keys to browser code.

## Local CLI Workflow

Check CLI availability, link the project, and show local/remote migration
state:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<database-password> \
scripts/supabase-status.sh
```

Preview what would be applied:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<database-password> \
SUPABASE_MIGRATION_MODE=dry-run \
scripts/supabase-migrate.sh
```

Apply pending repo migrations:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<database-password> \
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

## Seed Function

The initial reusable categories and activity templates are inserted by:

```sql
select public.seed_initial_weekly_list();
```

Run this as the authenticated allowed user after that user has signed in at
least once. The function uses `auth.uid()`, so it creates rows for the current
authenticated user and is safe to run more than once.

Do not run the seed through browser code with a service-role key. A future setup
flow may call it with the signed-in user's normal Supabase session, or it can be
run manually in an authenticated SQL/RPC context for the allowed user.

## Codex Workflow Rules

- Schema changes must be captured in migrations and docs.
- Run `./scripts/check.sh` for every PR.
- Run a migration dry run before applying remote migrations when credentials are
  available.
- Report exactly which Supabase CLI commands were run and whether they applied
  migrations or only verified state.
- Do not commit tokens, database passwords, service-role keys, `.env.local`, or
  `supabase/.temp`.
