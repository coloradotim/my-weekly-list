# My Weekly List Issue Index

This index tracks the intended MVP issue sequence.

## MVP sequence

| Order | Issue | Title | Purpose | Status |
| --- | --- | --- | --- | --- |
| 1 | #1 | Initialize responsive Next.js project foundation | Create the app foundation, tooling, scripts, and responsive shell. | Open |
| 2 | #2 | Set up Supabase auth and allowed-user access control | Add auth, environment variables, and private single-user access control. | Open |
| 3 | #3 | Create Supabase schema, RLS, seed data, and schema docs | Add migrations, core tables, RLS, seed categories/activities, and schema docs. | Open |
| 4 | #4 | Implement week lifecycle and date rules | Add Draft/Active/Needs Review/Closed logic and Monday/Sunday/late-start behavior. | Open |
| 5 | #5 | Build This Week grid and cell status behavior | Implement the paper-like weekly grid and cell status behavior. | Open |
| 6 | #6 | Build Today view for daily execution | Implement fast mobile daily execution: done, move, unplanned done, cleanup. | Open |
| 7 | #7 | Build draft planning and copy-week flow | Copy prior weeks, edit Draft weeks, and support late current-week creation. | Open |
| 8 | #8 | Build Review and Close Week flow | Add weekly review, target vs done summaries, category summaries, and locking. | Open |
| 9 | #9 | Mobile browser polish and acceptance pass | Tune iPhone Chrome UX, accessibility, empty states, and visual polish. | Open |
| 10 | #10 | Deployment and production readiness | Verify Vercel/Supabase setup, env docs, and production checks. | Open |

## Label suggestions

Recommended labels:

- `mvp`
- `foundation`
- `auth`
- `database`
- `workflow`
- `ui`
- `mobile`
- `testing`
- `docs`
- `deployment`
- `polish`
- `blocked`

## Issue-writing standard

Each implementation issue should include:

- Objective
- Background / product context
- Scope
- Out of scope
- Acceptance criteria
- Tests and checks
- Documentation updates
- Impact audit

## Impact audit checklist

For non-trivial changes, inspect impact on:

- navigation
- Today view
- This Week grid
- Review and Close Week
- Draft planning
- Sunday/Monday/late-start behavior
- mobile browser layout
- accessibility
- auth/access control
- Supabase schema/RLS
- tests
- docs
- deployment/environment variables

## Notes

- Keep PRs small and issue-scoped.
- Do not implement native iOS, React Native, push notifications, offline-first behavior, streaks, badges, or AI coaching in MVP.
- Do not edit closed weeks.
- Do not add brand-new activities to already-active weeks in MVP.
