# My Weekly List

A personal weekly planning app for creating a weekly list, planning which days to do each item, marking items done or skipped, moving items later in the week, and reviewing follow-through at the end of the week.

This is a private/single-user app built for personal use.

## Current app

This repository contains the responsive Next.js App Router app. It includes
TypeScript, Tailwind, ESLint, Prettier, Vitest, Supabase Auth, and the persisted
weekly planning workflow.

- Today
- Week
- Review

The root route sends the authenticated owner into Today whenever possible. Week
owns current-week planning, next-week list preparation, and list editing; Review
summarizes and corrects completion truth. `/plan` is retained only as a
compatibility redirect to Week, not as a primary app area.

Sign out is intentionally not shown in the normal app chrome. To clear the
current browser session and ask Supabase to invalidate refresh tokens, run:

```bash
scripts/sign-out.sh
```

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

Do not use `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the app expects Supabase's
publishable-key variable name. Do not commit `.env.local` or any secrets.

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
   If local callback links include query parameters or nested development paths,
   also add local wildcards such as `http://localhost:3000/**` and
   `http://127.0.0.1:3000/**`.

No Google Cloud OAuth setup is required. Do not add service-role keys to browser
code.

Magic Link email delivery is subject to Supabase Auth rate limits. If links stop
arriving during testing, wait for the limit window to clear, avoid repeated
login attempts, and keep using an existing browser session when possible.

## Vercel production setup

Production is hosted at:

```text
https://my-weekly-list.vercel.app
```

Set these Vercel environment variables for Production, Preview, and Development
unless there is a deliberate reason to scope them differently:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ALLOWED_USER_EMAIL
```

`NEXT_PUBLIC_` variables are visible to browser code, so they must contain only
public-safe Supabase values. Do not add service-role keys as public Vercel
variables, and do not add service-role keys to app runtime env unless a future
server-only administrative workflow explicitly requires it.

The Vercel project should be connected to the `coloradotim/my-weekly-list`
GitHub repository. Production deployments should build from `main`.

Development-only preview routes such as `/dev/week-preview`,
`/dev/today-preview`, and `/dev/review-preview` are disabled in production.

## Supabase migrations

Database migrations live in `supabase/migrations`.

Supabase schema changes should be applied from repo migrations, not by manually
pasting SQL into the Supabase dashboard. The full operations workflow is in
[docs/supabase-operations.md](docs/supabase-operations.md).

Check linked-project status with:

```bash
cp supabase.env.example .env.supabase.local
# Fill in .env.supabase.local, then run:
scripts/supabase-status.sh
```

Preview pending migrations with:

```bash
SUPABASE_MIGRATION_MODE=dry-run \
scripts/supabase-migrate.sh
```

Apply pending migrations with:

```bash
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

After setup has created active reusable categories and activity templates, open
the protected Week screen:

```text
/week
```

If there is no week for the current Monday-Sunday period, use `Start this week`.
The app creates one `active` week, snapshots active templates into
`week_activities`, and leaves day cells empty until you explicitly plan days in
the grid. Retrying the start action is safe: the database prevents duplicate
current weeks and duplicate template snapshots inside a week.

While hosted Supabase email Magic Link auth is unavailable or rate-limited, use
the development-only preview route to review the This Week grid interaction
without touching Supabase:

```text
/dev/week-preview
```

That route uses deterministic in-memory fixture data, supports the same cell
direct planning toggles as the real grid, and is unavailable in production.

Local Supabase database validation requires a running local Supabase stack. The
Supabase CLI uses Docker for that local stack.

The schema contract is documented in [docs/supabase-contract.md](docs/supabase-contract.md).

## Production smoke test

Use this checklist after deployment:

1. Open `https://my-weekly-list.vercel.app`.
2. Sign in as the owner with the email Magic Link.
3. Confirm an unauthenticated browser goes to login and that non-owner accounts
   cannot use the app.
4. Confirm `/` lands on Today when the current week exists.
5. If there is no current week, confirm `/` safely creates or opens the current
   week from the saved list when possible, without duplicate weeks or elapsed-day
   planned/missed/skipped/done history.
6. In Today, mark a planned item done, record `+ Something else`, move a planned
   item to a valid later day, skip a planned item, and mark a skipped item done.
7. Refresh Today and Week; confirm saved state persists and Week reflects Today
   changes.
8. In Week, confirm current-week planning toggles, next-week planning/list
   editing, category/activity reorder, and mobile horizontal scroll behavior.
9. In Review, confirm the summary loads, day-by-day correction toggles
   completion truth only, and no Close/Finalize step is required.
10. Revisit `/` and Week after refreshes; confirm no duplicate current week or
    duplicate week-activity snapshots appear.

For iPhone Chrome acceptance, also confirm the bottom navigation remains above
browser controls and has reliable tap targets on Today, Week, and Review. Week
and Review use scroll-heavy weekly grids, so check them directly rather than
assuming the Today shell behavior covers them. Also confirm Today opens directly
into useful actions, current Week opens near today's column, Next/Past Week open
at Monday, and Review remains readable and compact.

## Development notes

- Do not commit secrets or local environment files.
- Browser code must use the Supabase publishable key only. Do not use service-role keys in browser code.
- The app is private and single-user. `ALLOWED_USER_EMAIL` controls the one owner email allowed to open protected app screens.
- Configure Supabase Auth for email Magic Links, provision the owner Auth user, disable public signup for normal use, and add callback URLs such as `http://localhost:3000/auth/callback` to the allowed redirect URLs for local development.
- This is a responsive web app, with iPhone Chrome as the primary daily-use target.
- Native iOS, React Native, push notifications, offline-first behavior, streaks, badges, gamification, and AI coaching are out of scope for the MVP.
- Historical aggregate look-back is deferred from the MVP.
