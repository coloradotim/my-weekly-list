# My Weekly List — Agent Context

## Product

My Weekly List is a private, single-user weekly planning app. It digitizes Tim's paper weekly-list ritual without turning it into a generic task manager, calendar, streak tracker, or productivity framework.

The app helps Tim:

1. Plan a Monday-Sunday week.
2. Choose daily activities and weekly target counts.
3. Mark which days each activity actually happened.
4. Move unfinished planned items when the week changes.
5. Review done days against weekly targets.
6. Close the week when it is done.

The product should feel warm, calm, welcoming, and practical. It should help the user return to the plan without shame.

## Required product references

Before making product, workflow, data-model, UI, auth, or deployment changes, read:

1. `docs/product-plan.md`
2. `AGENTS.md`
3. The GitHub issue being worked
4. Any referenced docs or prior issue comments

Do not invent product behavior that conflicts with `docs/product-plan.md`. If the issue and product plan conflict, stop and ask for clarification.

## Core product rules

- Weeks run Monday through Sunday.
- Sunday is the preferred review and next-week planning day.
- Monday is the start of the active week.
- The app is a responsive web app, not a native iOS app.
- Primary mobile target is Chrome on iPhone.
- Desktop browser support matters for planning and review.
- Done-day count determines weekly goal progress.
- An activity can count at most once per day.
- Done counts whether or not the activity was planned for that day.
- Planned days are helpful structure, not a contract.
- Missed items are planning information, not failure.
- Do not create missed items for a week the user had not actually planned.
- Closed weeks are view-only.

## Week states

Use the lifecycle from `docs/product-plan.md`:

```text
Draft
Active
Needs Review
Closed
```

### Draft

A future week that is being planned.

Allowed:

- edit activities for the week
- edit categories for the week
- edit weekly target counts
- edit planned days
- copy from the most recent week/list

### Active

The current Monday-Sunday week.

Allowed:

- mark day cells done
- mark unplanned day cells done
- move planned items to another day in the same week
- leave prior planned items missed
- adjust planned days within the active week if needed

Not allowed in MVP:

- add brand-new activities to the active week
- delete activities from the active week
- change category structure for the active week
- change weekly target counts for the active week

### Needs Review

A prior week that has ended but has not been closed.

Allowed:

- review the week
- mark remaining unresolved items missed, if needed
- close the week

Do not block the user from planning or using the current week just because a prior week needs review.

### Closed

A reviewed and closed week.

Allowed:

- view only

Do not allow editing planned days, done/missed states, targets, categories, or activities on closed weeks.

## Cell behavior

Each activity/day cell tracks planning and completion separately.

Backend facts:

- `planned`: true/false
- `done`: true/false
- date
- week activity

Derived state:

- `missed`: planned is true, done is false, the cell date is before today, and the week is not Draft

UI states:

- blank
- planned
- done
- missed

Important rules:

- Done should look the same whether it was planned or unplanned.
- The UI does not need to distinguish planned-done from unplanned-done in normal use.
- The backend may retain planned vs unplanned information for review or future analytics.
- Moving an unfinished planned item changes the planned marker, not the done marker.
- A done cell cannot be moved; it already happened.

## Visual status language

Do not invent a new status scheme without explicit product approval.

Use this MVP visual language:

| Cell state | Meaning | Visual treatment |
| --- | --- | --- |
| Blank | Not planned and not done | Empty cell with neutral border/background |
| Planned | Planned but not done yet | Soft blue outlined circle |
| Done | Done, whether planned or unplanned | Green filled circle with a white check |
| Missed | Planned for a past day and not done | Muted gray slash or faded gray X |
| Today | Current day context | Subtle column/cell highlight, not a separate status |

Avoid heavy red failure styling. Preserve a calm, non-punitive feel.

## Shared weekly grid layout

The Week grid and Review day-by-day grid should use the same responsive grid
geometry for sticky activity/category context, day-column widths, horizontal
scroll snapping, and mobile spacing. On mobile, the shared grid should size day
columns from the available container width so four complete day columns fit next
to the sticky activity column. The current Week view should initially scroll so
today is the first useful visible day; Review day-by-day details should start at
Monday. Do not tune Review and Week as separate almost-matching grids; update
the shared grid layout helper and verify both screens together on an
iPhone-sized viewport.

## Platform target

MVP is a responsive web app.

Primary use cases:

- iPhone browser, especially Chrome on iPhone
- quick daily use from a mobile browser
- desktop browser for easier planning and review

MVP should not require:

- App Store distribution
- native iOS development
- React Native
- push notifications
- offline-first behavior

A Progressive Web App can be considered later, but MVP should focus on a reliable mobile browser experience.

## Initial categories and activities

Seed the app using the initial list in `docs/product-plan.md`.

Current categories:

- Physical Health
- Mental Health
- Family and Home
- Relationship Health
- Hobbies
- Work

Do not rename categories or activities unless the issue explicitly asks for that change.

## Tech stack

Expected stack:

- Next.js App Router
- TypeScript
- Tailwind
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Vercel hosting
- Vitest for unit tests
- Playwright later for core browser flows

If a different stack is proposed, stop and ask before changing direction.

## Auth and access rules

The app is private and single-user.

- Use Supabase Auth email Magic Link login for the configured owner account.
- Lock access to `cubuff98@gmail.com`.
- Use `ALLOWED_USER_EMAIL` as an environment variable.
- Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser-safe Supabase client configuration.
- The login action must derive the recipient from `ALLOWED_USER_EMAIL`, not browser input.
- Magic-link login must use `shouldCreateUser: false`; provision the owner user in Supabase first and keep public signup disabled for normal use.
- Reject all other authenticated users.
- Do not commit secrets.
- Do not use service-role keys in browser code.
- Supabase schema and RLS changes must be captured in migrations and docs, not only in the dashboard.
- Supabase migrations should be applied through the documented CLI or manual GitHub Actions workflow in `docs/supabase-operations.md`; dashboard SQL edits are exceptional and must be followed by repo migrations.

## Development workflow

Use GitHub issues and PRs.

When the user asks to `work issue #X`, treat that as instruction to implement GitHub issue `#X` using this workflow:

1. Read `AGENTS.md`.
2. Read `docs/product-plan.md`.
3. Read the GitHub issue and all issue comments.
4. Check out `main`.
5. Pull latest `origin/main`.
6. Create a feature branch named for the issue, using the `codex/` prefix unless the user requests otherwise.
7. Keep work scoped to the issue.
8. Make the requested changes.
9. Update tests when behavior, data flow, date logic, UI state, auth, or Supabase behavior changes.
10. Update docs when setup, deployment, environment variables, data model, workflow, or user-visible behavior changes.
11. Run the required checks.
12. Commit changes to the feature branch.
13. Push the branch.
14. Open a PR that links the issue.
15. Enable auto-merge when branch protection and repository settings allow it, unless the task is high-risk or the user asks for manual review.
16. If auto-merge or merge is blocked, report the exact blocker.

Do not commit directly to `main`.

## UI implementation and review workflow

For material UI, interaction, responsive-layout, or mobile usability changes,
prefer authenticated local or production-like iteration before treating the PR
as complete.

1. Provide a reviewable app state for meaningful UI work using the real
   persisted Today, Week, Review, or install flows whenever possible.
2. Use unit/component tests for behavior that does not require a live browser or
   Supabase session.
3. Add temporary fixture-only prototype routes only when explicitly requested
   or when production-like review is genuinely blocked. Remove them once the
   persisted flow is stable.
4. Iterate with Tim on interaction and mobile/desktop layout before
   finalizing high-impact screens.
5. After the UX is approved, complete persistence/integration verification, run
   repository checks, and proceed with PR review/merge.
6. Do not auto-merge high-impact user-facing screens before Tim has reviewed the
   interaction unless he explicitly says otherwise.

This does not require a special route for trivial copy or styling edits.

## Required checks

Every PR should pass the repo check command before merge.

The intended check entry point is:

```bash
scripts/check.sh
```

Until `scripts/check.sh` exists, run the available equivalents and document what was run in the PR:

```bash
npm run lint
npm run test:run
npm run build
```

Do not bypass failing tests or builds. Fix failures or report the exact blocker.

## Issue and PR completeness standard

For every product, UX, feature, data, or workflow change, consider downstream impact across:

- navigation
- Today view
- This Week grid
- Review and Close Week
- Draft week planning
- empty states and setup prompts
- Sunday/Monday/late-start behavior
- mobile browser layout
- accessibility
- auth and allowed-user behavior
- Supabase schema, migrations, and RLS
- tests
- README and docs
- deployment and environment variables

If an area is affected, update it in the same PR unless the issue explicitly says otherwise. If an area is not affected, note that briefly in the PR summary.

When creating or refining issues, include an impact audit section when the change is more than a tiny bug fix.

## Guardrails

Do not:

- commit directly to `main`
- commit secrets
- use service-role keys in browser code
- bypass failing tests or builds
- bypass branch protection or required checks
- force-merge blocked PRs
- add native iOS, React Native, push notifications, offline-first behavior, gamification, streaks, badges, AI coaching, or calendar integration unless explicitly approved
- change product direction without asking first
- silently create ghost weeks or missed items for weeks the user had not planned
- add brand-new activities to an already-active week in MVP
- edit closed weeks

## Autonomy expectations

Once intent is clear, proceed fully without asking for permission to do normal engineering work:

- write the code
- write or update tests
- run checks
- fix lint/type/test/build failures
- update relevant docs
- open a PR

Ask questions early when intent, edge cases, product behavior, data migrations, destructive changes, or user workflow are unclear.

## PR description requirements

Every PR should include:

- what changed and why
- issue linked with `Closes #N` or `Refs #N`
- how to verify locally, including commands and UI steps
- tests/checks run
- docs updated or why not needed
- known limitations
- follow-up issues opened, if any

## Commit style

Use conventional commits:

- `feat:`
- `fix:`
- `test:`
- `docs:`
- `chore:`
- `refactor:`

Subject line should be imperative and no more than 72 characters.

Keep commits atomic. Do not bundle unrelated fixes.

## Before major changes

Ask first if changing:

- product direction
- week lifecycle behavior
- active-week editing rules
- closed-week locking rules
- auth provider or access-control model
- Supabase schema/RLS strategy
- core visual status language
- platform target
- deployment approach
