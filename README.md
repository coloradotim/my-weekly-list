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

My Weekly List uses Supabase email/password auth. There is no public signup,
magic-link login, OTP login, Google OAuth, or in-app registration. Tim manually
provisions users with local scripts, and app access is stored in the
database-backed `profiles` row.

Required Supabase dashboard setup:

1. In the Supabase project, go to **Authentication > Sign In / Providers > Email**.
2. Keep the Email provider enabled for password login.
3. Disable **Allow new users to sign up** before normal app use.
4. Google OAuth is not required.
5. Magic Link and OTP email are not used for normal app login.

Create a user locally:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/create-user.mjs user@example.com
```

Reset a password locally:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/reset-user-password.mjs user@example.com
```

Disable app access locally:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/disable-user.mjs user@example.com
```

The create/reset scripts print a temporary password once. The user must change
that password in the app before Today, Week, or Review can be used. Tim does not
need to know the user's final password. `SUPABASE_SERVICE_ROLE_KEY` is local
admin-only; never put it in browser code or public Vercel variables.

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
```

`NEXT_PUBLIC_` variables are visible to browser code, so they must contain only
public-safe Supabase values. Do not add service-role keys as public Vercel
variables. User access is stored in Supabase, so adding/removing users does not
require a Vercel env change or redeploy.

The Vercel project should be connected to the `coloradotim/my-weekly-list`
GitHub repository. Production deployments should build from `main`.

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

Use authenticated local or production-like testing for Today, Week, and Review.
Behavior that does not require a live Supabase session should be covered by the
unit/component tests in `test/`. For iPhone app-like verification, install from
the stable Safari install page:

```text
/install
```

Local Supabase database validation requires a running local Supabase stack. The
Supabase CLI uses Docker for that local stack.

The schema contract is documented in [docs/supabase-contract.md](docs/supabase-contract.md).

## Production smoke test

Use this checklist after deployment:

1. Open `https://my-weekly-list.vercel.app`.
2. Sign in with an allowed email/password account.
3. Confirm an unauthenticated browser goes to login and that disabled/non-allowed
   accounts cannot use the app.
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

For iPhone Home Screen acceptance, reinstall from the stable install page:

1. Delete all existing Home Screen icons for My Weekly List.
2. Open Safari.
3. Go to `https://my-weekly-list.vercel.app/install`.
4. Use Share -> Add to Home Screen.
5. Confirm the icon is the real app icon, not a generic `M`.
6. Launch the Home Screen icon.
7. Confirm it opens directly to Today.
8. Test Today, Week, and Review.
9. Navigate between Today / Week / Review using the app bottom nav.
10. Close and reopen the Home Screen app after last visiting Today.
11. Close and reopen after last visiting Week.
12. Close and reopen after last visiting Review.
13. Confirm browser chrome does not appear inconsistently by route.
14. Confirm there is no giant top gap.
15. Confirm bottom nav is at the bottom safe area and immediately tappable.
16. Confirm Week still opens at today and grid scrolling works.

## Development notes

- Do not commit secrets or local environment files.
- Browser code must use the Supabase publishable key only. Do not use service-role keys in browser code.
- The app is private. Users are manually provisioned with local scripts and database-backed access flags.
- Configure Supabase Auth for email/password, disable public signup for normal use, and keep service-role credentials local-only.
- This is a responsive web app, with iPhone Chrome as the primary daily-use target.
- Native iOS, React Native, push notifications, offline-first behavior, streaks, badges, gamification, and AI coaching are out of scope for the MVP.
- Historical aggregate look-back is deferred from the MVP.
