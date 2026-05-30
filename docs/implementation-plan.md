# My Weekly List Implementation Plan

## Purpose

This document turns `docs/product-plan.md` into a practical build sequence for Codex-driven development.

The goal is a private, single-user, responsive web app that works well in Chrome on iPhone and desktop browsers. The first release should preserve the paper workflow: plan a Monday-Sunday week, mark which days activities happen, move or skip today's unfinished planned items, and review done days against weekly targets.

## Source of truth

Read these before implementation work:

1. `AGENTS.md`
2. `docs/product-plan.md`
3. This implementation plan
4. The GitHub issue being worked

If documents conflict, ask before implementing.

## MVP architecture

Expected stack:

- Next.js App Router
- TypeScript
- Tailwind
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Vercel hosting
- Vitest for unit tests
- Playwright later for high-value browser flows

MVP is not a native iOS app and should not use React Native.

## Core domain model

The implementation should keep planning and completion separate.

Core concepts:

- user/profile
- weeks
- categories
- reusable activity definitions or templates
- week activities
- activity day cells

Recommended plain-English model:

- A reusable activity definition is the durable item, such as `Walk`.
- A week activity is that activity's copy within one week, including category and target count for that week.
- A day cell records whether the week activity was planned and/or done on a specific date.
- Missed is derived from planned/done/date/week state unless implementation constraints require otherwise.

A single activity can count at most once per day.

## Week timing model

Use date-based user-facing context:

- This week: the current Monday-Sunday week.
- Next week: the upcoming Monday-Sunday week prepared from Week.
- Past week: an ended week that Review can summarize and correct.

There is no required Close, Finalize, or user-facing Draft step in normal MVP
flow. Internal status values may remain for compatibility, but product routing
and copy should derive current/next/past behavior from dates. Current-week
structure remains stable in MVP; past weeks allow completion-only Review
correction and no planning or structure edits.

## Date behavior

- Weeks run Monday through Sunday.
- App-side lifecycle helpers use `YYYY-MM-DD` date-only strings and UTC date math internally so a personal planning day does not shift because of browser or server timezone conversion.
- Sunday should prompt review and next-week planning while still allowing Sunday execution.
- Monday should use a prepared next week as the current week if one exists.
- If the user starts the current week late, do not create missed cells for days before the user planned the week.
- If several weeks are missed, do not auto-create ghost weeks.

## UX priority

Build for these user moments first:

1. Open app on iPhone and mark an item done quickly.
2. Open app on iPhone and move an unfinished item to tomorrow.
3. On Sunday, review the week and start planning next week.
4. On desktop, view and adjust the weekly grid.
5. On Monday or later, recover gracefully if the current week does not exist yet.

## UI implementation standards

The app should feel warm, calm, and non-punitive.

Use the visual status language from `docs/product-plan.md` and `AGENTS.md`:

- Blank: empty neutral cell
- Planned: soft blue outlined circle
- Done: green filled circle with white check
- Missed: muted gray slash or faded gray X
- Today: subtle highlight

Do not invent a new visual language without approval.

For material UI, interaction, responsive-layout, or mobile usability changes,
create a reviewable local app state before calling the PR complete. If auth or
persisted setup makes direct review difficult, use a development-only preview
harness with representative fixture state. Preview harnesses must be disabled in
production, avoid production data, avoid auth bypasses, and cover the states and
interactions needed for Tim to review mobile and desktop behavior. High-impact
screens should stay open for Tim's local interaction review unless he explicitly
approves auto-merge.

## Build sequence

### Phase 0 — Repo and project foundation

- Initialize the Next.js app.
- Add TypeScript, Tailwind, linting, formatting, Vitest, and basic scripts.
- Add `scripts/check.sh` as the standard check entry point.
- Add a responsive app shell and placeholder routes.
- Ensure mobile viewport behavior is considered from the start.

### Phase 1 — Auth and environment

- Add Supabase client setup.
- Add owner-only Supabase email Magic Link auth.
- Add `ALLOWED_USER_EMAIL` environment variable.
- Send magic links only to the configured owner email, with `shouldCreateUser: false`.
- Reject users whose authenticated email does not match.
- Document required environment variables.

### Phase 2 — Database and seed data

- Add Supabase migrations.
- Add tables for weeks, categories, activities/templates, week activities, and day cells.
- Add row-level security.
- Seed initial categories and activities from `docs/product-plan.md`.
- Document schema and RLS in `docs/supabase-contract.md`.

### Phase 3 — Week lifecycle logic

- Implement Monday-Sunday date helpers.
- Implement Monday-Sunday date helpers and internal status handling.
- Implement Sunday prompt behavior.
- Implement Monday transition behavior.
- Implement late-start behavior.
- Add tests for lifecycle and date rules.

### Phase 4 — This Week grid

- Show categories, activities, targets, and seven day cells.
- Implement direct planning toggles for blank and planned cells.
- Render done and missed states as display-only in the weekly overview.
- Make the grid usable on mobile and desktop.
- Keep Week as the primary home for current-week viewing, next-week planning,
  and future list editing. `/plan`, if retained, is a compatibility redirect or
  internal route, not a primary navigation destination.

The first current week is created from active seeded templates when `/week` has
no current Monday-Sunday week. Creation snapshots category name, category order,
activity name, target count, activity order, and template references into
`week_activities`; day cells remain absent until the user explicitly plans or
later completion flows record a done day.

The MVP This Week grid is a planning and overview surface:

- Future weeks being planned: blank and planned cells toggle directly.
- Active weeks: today and future blank/planned cells toggle directly.
- Active past cells, done cells, missed cells, and past weeks are view-only for
  planning.

Planning toggles should feel immediate. The persisted Week grid uses local
optimistic state for editable blank/planned cells and saves an explicit desired
`planned` value in the background, rather than submitting a full-page form for
each cell or relying on a blind server-side toggle.

Completion entry belongs to Today, and completion corrections belong to Review.

Week and Review day-by-day details must share the same responsive grid geometry
for sticky activity/category context, day-column widths, horizontal scroll
snapping, and mobile spacing. On mobile, day columns should be calculated from
the available scroll-container width so four complete days fit next to the
sticky activity column. The current Week view should initially snap to today's
column, while Review day-by-day details should start at Monday. Treat that
layout as shared infrastructure rather than separate screen-specific CSS, and
verify Week, Review, and their development previews together when changing it.

### Phase 5 — Today view

- Get Tim's approval on a development-only interactive local preview before
  implementing persistence.
- Show open planned items for today first, with fast `Mark done`.
- Record unplanned same-day completion through `+ Something else`.
- Show one unified Done today section for planned and unplanned completions.
- Show direct row actions: `Mark done`, `Move` when a valid later same-week
  destination exists, and `Skip`.
- Exclude move destinations where the same week activity is already planned or
  done, and never overwrite an existing destination cell.
- Do not show unresolved prior planned days as a Today backlog; Review owns
  backdated correction before relying on the week as history.

Today should reuse the same `week_activities` and `activity_day_cells` model as
This Week and should match the optimistic interaction quality established for
Week planning toggles: immediate local state, explicit intended persistence,
and rollback/error behavior on failure.

Persisted Skip requires an explicit stored resolution fact. It must not be
implemented by clearing `planned`, because that erases the original occurrence.
The persisted schema stores this as an explicit `skipped` day-cell fact, with
constraints preventing `done` and `skipped` from both being true.
Issue #8 Review will later preserve planned/completed/skipped/missed facts for
correction and future reporting, but Review MVP should visually show final
completion truth only in day-by-day details: checks for completed days and blank
cells for all not-completed days. This Week may still use planned/missed/skipped
visual language where appropriate.

### Phase 6 — Next-week planning and copy week inside Week

- Launch next-week planning from Week rather than a standalone Plan screen.
- Copy the most recent real week into next week before the new week starts.
- Copy activities, categories, targets, ordering, and planned-day pattern when
  planning ahead.
- Never copy done, skipped, missed, or other outcome facts into the new week.
- If creating the current week late, copy activities and targets but default
  planned days from today forward only.
- Do not create ghost weeks for skipped calendar gaps.
- Use an existing prepared next week as the current week when its Monday arrives,
  rather than requiring a Done/Ready/Finalize action or prior-week ceremony.
- Allow future week editing from Week: activity name, category, new category,
  target, add activity, remove from future weeks, category/activity order, and
  planned days.
- Future-week structural edits update the reusable/template list while
  preserving historical `week_activities` snapshots.

### Phase 7 — Review and historical completion correction

- Show done-day counts against target counts.
- Show summary-first target-met and short-of-target sections by activity.
- Do not show category totals or an overall score in the Review summary.
- Include collapsible day-by-day details for correcting completion truth only.
- Render Review detail cells as checks for completed days and blank quiet cells
  for all not-completed days, while preserving planned/skipped/missed facts in
  storage.
- Do not require or expose Close Week, Finalize Week, or user-facing Draft
  actions in Review.

### Phase 8 — Mobile polish and hardening

- Replace the scaffold/home route with smart entry behavior: setup if the
  starter list is missing, Today if the current week exists, and current-week
  assurance from the saved list before landing on Today when setup is complete
  and no current week exists.
- Use compact app navigation focused on Today, Week, and Review. Do not expose
  Plan, Home, Setup, or Sign out as primary navigation items.
- On mobile, preserve normal document scrolling so iPhone Chrome can collapse
  its browser controls naturally. Keep the bottom nav fixed for app use, but
  offset it from the current `visualViewport` when Chrome controls are visible
  and include that offset in bottom content padding. Week and Review are
  scroll-heavy because of the weekly grids, so verify them alongside Today when
  changing shell spacing or navigation hit targets.
- Keep `/plan`, if retained, as a compatibility redirect/internal route rather
  than a primary app destination.
- Keep Sign out out of normal app chrome; use a deliberate utility route/script
  when a session needs to be cleared.
- Remove large mobile header cards where they do not help the user decide:
  Today should begin with Today content, current Week should begin near the
  grid, and Review should use compact context like `Review · May 25–31`.
- On mobile, open current Week near today's column on initial load, while Next
  Week and Past Week open at Monday. Do not reset the manual scroll position
  during optimistic planning interactions.
- Preserve the Today direct action model while polishing navigation and spacing.
- Make iPhone Chrome the primary acceptance target.
- Polish touch targets, spacing, empty states, and copy.
- Add high-value Playwright flows if the foundation supports it.
- Confirm deployment and environment setup.

### Phase 9 — Production readiness

- Verify Vercel production deploys from `main` and uses the expected Supabase
  project.
- Keep runtime environment requirements limited to
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
  `ALLOWED_USER_EMAIL`.
- Do not require or expose a Supabase service-role key for normal app screens.
- Verify remote Supabase migrations match repo migrations before relying on
  production data behavior.
- Keep development-only preview routes unavailable in production.
- Maintain a concise production smoke-test and iPhone Chrome acceptance
  checklist in the README/Supabase operations docs.

## Testing strategy

Unit tests should cover:

- Monday-Sunday week calculations
- Sunday prompt logic
- Monday transition logic
- late-start week creation
- avoiding ghost weeks
- done-day count calculations
- unplanned done cells counting toward weekly goals
- one done count per activity per day
- missed-state derivation
- moving planned cells
- past-week planning/structure immutability
- allowed-user access checks where practical

Browser or integration tests should eventually cover:

- logging in
- viewing Today
- marking planned item done
- marking unplanned item done
- moving an item
- reviewing and correcting completion truth
- mobile layout at iPhone viewport sizes

## Documentation expectations

Update docs when changing:

- product behavior
- week lifecycle
- setup/deployment
- Supabase schema/RLS
- environment variables
- auth behavior
- routes/navigation
- testing/check commands

## Definition of MVP done

MVP is done when Tim can:

1. Log in with a Supabase email Magic Link and only his email can access the app.
2. See or create the current Monday-Sunday week.
3. Open Week for current-week planning and next-week list preparation.
4. Plan days for activities.
5. Use Today view on iPhone Chrome.
6. Mark planned and unplanned items done.
7. Move unfinished planned items.
8. Review done days against target counts and correct completion truth.
9. Use the app through a compact Today / Week / Review shell on iPhone.
10. Deploy through Vercel with documented environment variables.
