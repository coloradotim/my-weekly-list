# My Weekly List Issue Index

This index tracks the completed MVP work and the small remaining backlog. It is
not a required implementation sequence for future work.

## MVP sequence

| Order | Issue | Title | Purpose | Status |
| --- | --- | --- | --- | --- |
| 1 | #1 | Initialize responsive Next.js project foundation | Create the app foundation, tooling, scripts, and responsive shell. | Closed |
| 2 | #2 | Set up Supabase auth and allowed-user access control | Add auth, environment variables, and private single-user access control. | Closed |
| 3 | #3 | Create Supabase schema, RLS, seed data, and schema docs | Add migrations, core tables, RLS, seed categories/activities, and schema docs. | Closed |
| 4 | #4 | Implement week lifecycle and date rules | Add Monday-Sunday date behavior, internal lifecycle helpers, Sunday/Monday/late-start behavior, and no-ghost-week guardrails. | Closed |
| 5 | #5 | Build first current-week setup flow and persisted This Week grid | Create the current week from seeded templates, persist snapshots, and implement the planning-only weekly grid with immediate toggles. | Closed |
| 6 | #6 | Build Today view for same-day completion and plan resolution | State-ordered Today: open planned items, `+ Something else` unplanned same-day completion, Done today, today's plan movement, explicit Skip, and no prior-missed backlog queue. | Closed |
| 7 | #7 | Build next-week planning and copy-forward inside Week | Add Week-based next-week planning, remove Plan as a primary app area, edit the future weekly list, and support late current-week creation without ghost weeks. | Closed |
| 8 | #8 | Build Review and historical completion-correction flow | Add summary-first Review with target-met/short-of-target sections and day-by-day completion correction. Review details show final completion truth only: checks for completed days and blank cells for all not-completed days, while stored planned/skipped/missed facts remain available for future reporting. | Closed |
| 9 | #9 | Replace scaffold navigation with mobile-first app entry and usability polish | Remove the scaffold home, add Today-first entry/current-week assurance, use compact Today/Week/Review navigation without in-app Sign out chrome, tighten screen context, and position current Week at today on mobile. | Closed |
| 10 | #10 | Production readiness and final deployment audit | Verify Vercel/Supabase setup, env docs, production guards, production smoke-test steps, and iPhone/browser readiness. | Closed |
| 11 | #45 | Fix week grid headers, same-day correction, nav state, and edit-list gaps | Post-MVP usability follow-up: sticky Week/Review day headers, limited today-column correction in Week, Today `Unskip`, single-active nav state, category-local `+ Add activity`, and bottom `+ Add category`. | Closed |
| 12 | #47 | Make Home Screen launch feel immediate | Add lightweight launch/loading states and reduce duplicate app-shell auth work so installed iPhone Home Screen launch feels responsive while Today and Supabase data resolve. | Closed |
| 13 | #49 | Remove obsolete development preview routes and fixture UI | Remove old `/dev` preview harnesses, fixture-only preview state, and preview-first docs now that production auth and persisted Today/Week/Review flows are stable. | Closed |
| 14 | #58 | Replace email auth links with manual user management | Replace magic links/OTP with email/password login, database-backed access flags, forced password change, and local scripts for creating, resetting, and disabling users. | Closed |
| 15 | #61 | Add first-run onboarding for manually provisioned users | Guide newly provisioned allowed users with no usable list through creating first categories, activities, targets, a current-week plan, and a short Today/Week/Review tour. This is not public signup. | Closed |
| 16 | #62 | Audit repository docs and archive-readiness | Align README/docs/issues with the current production app before pausing active development. | In progress |
| Backlog | #30 | Add simple historical activity look-back | Deferred activity-level historical summaries over real recorded weeks only; do not build until Tim resumes this backlog feature. | Open / deferred |

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
- Review
- next-week planning
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
- Do not edit planning or structure for past weeks.
- Do not add brand-new activities to already-active weeks in MVP.
- Main navigation should stay focused on Today, Week, and Review; next-week
  planning lives inside Week rather than as a permanent Plan destination.
- Week and Review grids share responsive sizing, sticky day headers, and
  horizontal overscroll containment; keep their scroll/snap behavior aligned
  when changing either grid.
- Week list editing should stay category-first: add activities within categories
  and add new categories at the bottom.
