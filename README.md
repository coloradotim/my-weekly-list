# My Weekly List

A personal weekly planning app for creating a weekly list, planning which days to do each item, marking items done or skipped, moving items later in the week, and reviewing follow-through at the end of the week.

This is a private/single-user app built for personal use.

## Current foundation

This repository contains the responsive Next.js App Router foundation for the app. It includes TypeScript, Tailwind, ESLint, Prettier, Vitest, Supabase Auth, and placeholder routes for the MVP screens:

- Today
- This Week
- Review
- Plan

The current planning screens are intentionally placeholders. Database schema, real week logic, Today behavior, and Review behavior are planned for later issues.

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your Supabase anon key
ALLOWED_USER_EMAIL=cubuff98@gmail.com
```

Do not commit `.env.local` or any secrets.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

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

## Development notes

- Do not commit secrets or local environment files.
- Browser code must use the Supabase anon key only. Do not use service-role keys in browser code.
- The app is private and single-user. `ALLOWED_USER_EMAIL` controls the one Google account allowed to open protected app screens.
- Configure Supabase Auth with Google as an enabled provider and add the local callback URL, such as `http://localhost:3000/auth/callback`, to the allowed redirect URLs for local development.
- This is a responsive web app, with iPhone Chrome as the primary daily-use target.
- Native iOS, React Native, push notifications, offline-first behavior, streaks, badges, gamification, and AI coaching are out of scope for the MVP.
