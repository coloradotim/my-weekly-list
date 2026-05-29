# My Weekly List

A personal weekly planning app for creating a weekly list, planning which days to do each item, marking items done or skipped, moving items later in the week, and reviewing follow-through at the end of the week.

This is a private/single-user app built for personal use.

## Current foundation

This repository contains the responsive Next.js App Router foundation for the app. It includes TypeScript, Tailwind, ESLint, Prettier, Vitest, Supabase Auth, and placeholder routes for the MVP screens:

- Today
- This Week
- Review
- Plan

The current planning screens are intentionally placeholders. Real week logic,
Today behavior, and Review behavior are planned for later issues.

## Local setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=your Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your Supabase publishable key
ALLOWED_USER_EMAIL=cubuff98@gmail.com
```

Do not commit `.env.local` or any secrets.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Or use the local dev server helper:

```bash
scripts/dev.sh start
scripts/dev.sh status
scripts/dev.sh open
scripts/dev.sh restart
scripts/dev.sh stop
scripts/dev.sh logs
```

The helper starts the Next.js app at `http://127.0.0.1:3000`, tracks the PID
under `.dev/`, and writes logs to `.dev/server.log`. Set `DEV_PORT` or
`DEV_HOST` to override the defaults.

## Checks

Run the standard repo check command:

```bash
./scripts/check.sh
```

The check script runs:

```bash
npm run lint
npm run format
npm run test:run
npm run build
```

## Supabase auth

My Weekly List uses Supabase email Magic Link auth for one configured owner
account. The app does not show an editable email field. The login action reads
`ALLOWED_USER_EMAIL` on the server and sends a link only to that address with
`shouldCreateUser: false`, so the owner Auth user must already exist.

Required Supabase dashboard setup:

1. In the Supabase project, go to **Authentication > Sign In / Providers > Email**.
2. Keep the Email provider and Magic Link email auth enabled.
3. Go to **Authentication > Users**.
4. Use **Add user > Create new user** to provision `cubuff98@gmail.com` as the one
   owner Auth user. Confirm the user has an email identity and can receive Magic
   Link email.
5. Return to **Authentication > Sign In / Providers > Email** and turn off
   **Allow new users to sign up** before normal app use. With signup disabled,
   only existing users can sign in.
6. Go to **Authentication > URL Configuration** and set the production Site URL.
   Add redirect URLs for production Vercel and local development, including
   `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback`.

No Google Cloud OAuth setup is required. Do not add service-role keys to browser
code.

## Supabase migrations

Database migrations live in `supabase/migrations`.

Supabase schema changes should be applied from repo migrations, not by manually
pasting SQL into the Supabase dashboard. The full operations workflow is in
[docs/supabase-operations.md](docs/supabase-operations.md).

Check linked-project status with:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<database-password> \
scripts/supabase-status.sh
```

Preview pending migrations with:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<database-password> \
SUPABASE_MIGRATION_MODE=dry-run \
scripts/supabase-migrate.sh
```

Apply pending migrations with:

```bash
SUPABASE_PROJECT_REF=<project-ref> \
SUPABASE_DB_PASSWORD=<database-password> \
SUPABASE_MIGRATION_MODE=apply \
scripts/supabase-migrate.sh
```

After the allowed user signs in for the first time, open the protected setup
flow and create the starter list:

```text
/setup
```

The setup flow calls the authenticated, idempotent Supabase RPC:

```sql
select public.seed_initial_weekly_list();
```

Do not run this from the Supabase SQL Editor without an authenticated app
session; it will fail by design because it uses `auth.uid()` to create
user-owned rows. Do not use service-role keys in browser code.

Local Supabase database validation requires a running local Supabase stack. The
Supabase CLI uses Docker for that local stack.

The schema contract is documented in [docs/supabase-contract.md](docs/supabase-contract.md).

## Development notes

- Do not commit secrets or local environment files.
- Browser code must use the Supabase publishable key only. Do not use service-role keys in browser code.
- The app is private and single-user. `ALLOWED_USER_EMAIL` controls the one owner email allowed to open protected app screens.
- Configure Supabase Auth for email Magic Links, provision the owner Auth user, disable public signup for normal use, and add callback URLs such as `http://localhost:3000/auth/callback` to the allowed redirect URLs for local development.
- This is a responsive web app, with iPhone Chrome as the primary daily-use target.
- Native iOS, React Native, push notifications, offline-first behavior, streaks, badges, gamification, and AI coaching are out of scope for the MVP.
