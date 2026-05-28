# My Weekly List Issue Index

This index tracks the intended MVP issue sequence. Issue numbers should be filled in after GitHub issues are created.

## MVP sequence

| Order | Issue | Title | Purpose | Status |
| --- | --- | --- | --- | --- |
| 1 | TBD | Initialize responsive Next.js project foundation | Create the app foundation, tooling, scripts, and responsive shell. | Planned |
| 2 | TBD | Set up Supabase auth and allowed-user access control | Add Google auth, environment variables, and private single-user access control. | Planned |
| 3 | TBD | Create Supabase schema, RLS, and seed data | Add migrations, core tables, RLS, seed categories/activities, and schema docs. | Planned |
| 4 | TBD | Implement week lifecycle and date rules | Add Draft/Active/Needs Review/Closed logic and Monday/Sunday/late-start behavior. | Planned |
| 5 | TBD | Build This Week grid | Implement the paper-like weekly grid and cell status behavior. | Planned |
| 6 | TBD | Build Today view | Implement fast mobile daily execution: done, move, unplanned done, cleanup. | Planned |
| 7 | TBD | Build draft planning and copy-week flow | Copy prior weeks, edit Draft weeks, and support late current-week creation. | Planned |
| 8 | TBD | Build Review and Close Week | Add weekly review, target vs done summaries, category summaries, and locking. | Planned |
| 9 | TBD | Mobile browser polish and acceptance pass | Tune iPhone Chrome UX, accessibility, empty states, and visual polish. | Planned |
| 10 | TBD | Deployment and production readiness | Verify Vercel/Supabase setup, env docs, and production checks. | Planned |

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
