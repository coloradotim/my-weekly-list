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
create a reviewable app state before calling the PR complete. Prefer
authenticated local or production-like testing against the real persisted Today,
Week, Review, and install flows. Use unit/component tests for behavior that does
not require a live session. Temporary fixture-only prototype routes should be
used only when explicitly requested or when production-like review is genuinely blocked,
and they should be removed once the persisted flow is stable. High-impact
screens should stay open for Tim's interaction review unless he explicitly
approves auto-merge.

## Current implementation map

The original MVP build sequence is complete enough that future work should be
driven by GitHub issues and verified against the real Today, Week, Review,
onboarding, install, auth, and Supabase flows. The sections below summarize the
current architecture by area; they are not instructions to rebuild the app in
order.

### Repo and project foundation

- Initialize the Next.js app.
- Add TypeScript, Tailwind, linting, formatting, Vitest, and basic scripts.
- Add `scripts/check.sh` as the standard check entry point.
- Add a responsive app shell and placeholder routes.
- Ensure mobile viewport behavior is considered from the start.

### Auth and environment

- Add Supabase client setup.
- Add Supabase email/password auth.
- Disable public signup and do not add in-app registration.
- Store app access on the user's database profile.
- Add local admin scripts for creating users, resetting temporary passwords, and
  disabling app access.
- Force users with temporary passwords to change them before accessing Today,
  Week, or Review.
- After password change, route manually provisioned users with no usable weekly
  list to first-run onboarding instead of a preset starter-list setup screen.
- Keep service-role credentials local to admin scripts; never expose them to
  browser code or public Vercel runtime env vars.
- Document required environment variables.

### Database and seed/onboarding data

- Add Supabase migrations.
- Add tables for weeks, categories, activities/templates, week activities, and day cells.
- Add row-level security.
- Seed initial categories and activities from `docs/product-plan.md`.
- Track first-run onboarding completion on the user's profile so completed users
  are not repeatedly sent back through onboarding.
- Document schema and RLS in `docs/supabase-contract.md`.

### Week lifecycle logic

- Implement Monday-Sunday date helpers and internal status handling.
- Implement Sunday prompt behavior.
- Implement Monday transition behavior.
- Implement late-start behavior.
- Add tests for lifecycle and date rules.

### Week grid

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
- The active current-day column also supports a narrow same-day correction:
  tapping a done cell clears done while preserving the planned fact, and tapping
  a skipped cell clears skipped back to planned/open. This must not add Move,
  Skip, Mark done, popovers, or backdated Review correction to Week.

Planning toggles should feel immediate. The persisted Week grid uses local
optimistic state for editable blank/planned cells and current-day correction
cells, then saves explicit desired facts in the background rather than
submitting a full-page form for each cell or relying on a blind server-side
toggle.

Completion entry belongs to Today, and completion corrections belong to Review.

Week and Review day-by-day details must share the same responsive grid geometry
for sticky activity/category context, day-column widths, horizontal scroll
snapping, and mobile spacing. On mobile, day columns should be calculated from
the available scroll-container width so four complete days fit next to the
sticky activity column. The current Week view should initially snap to today's
column, while Review day-by-day details should start at Monday. Treat that
layout as shared infrastructure rather than separate screen-specific CSS, and
verify Week and Review production screens/tests together when changing it.
The weekday/date header row should be sticky during vertical scrolling on both
Week and Review detail grids while staying aligned with horizontal scroll.

### Today view

- Preserve the approved production Today interaction model and verify changes
  against the real route or focused component tests.
- Show open planned items for today first, with fast `Mark done`.
- Record unplanned same-day completion through `+ Something else`.
- Show one unified Done today section for planned and unplanned completions.
- Show direct row actions in a stable order: `Mark done`, `Skip`, then `Move`.
  Before Sunday, keep `Move` visible but disabled/subdued when no valid later
  same-week destination remains.
- Skipped rows should retain `Mark done` and offer secondary `Unskip`, which
  clears skipped and returns the item to open Planned for today.
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

### Next-week planning and copy-forward inside Week

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
- In the Week list editor, prefer category-local `+ Add activity` actions with
  the launching category preselected. The bottom list action is `+ Add category`
  so a new category can be created before adding activities under it.
- Future-week structural edits update the reusable/template list while
  preserving historical `week_activities` snapshots.

### Review and historical completion correction

- Show done-day counts against target counts.
- Show summary-first target-met and short-of-target sections by activity.
- Do not show category totals or an overall score in the Review summary.
- Include collapsible day-by-day details for correcting completion truth only.
- Render Review detail cells as checks for completed days and blank quiet cells
  for all not-completed days, while preserving planned/skipped/missed facts in
  storage.
- Do not require or expose Close Week, Finalize Week, or user-facing Draft
  actions in Review.

### Mobile shell, install, and hardening

- Replace the scaffold/home route with a lightweight authenticated redirect to
  Today. Today owns current-week assurance from the saved list when setup is
  complete and no current week exists.
- If Today cannot find any usable list data for an allowed user, route to
  `/onboarding` so the user can create their first categories, activities,
  targets, and current-week plan.
- Keep installed-app launch responsive by routing directly to Today and avoiding
  textual loading interstitials during normal Today, Week, and Review
  navigation. Avoid duplicate Supabase auth checks in the app shell when
  middleware already guards authenticated app routes.
- Use compact app navigation focused on Today, Week, and Review. Do not expose
  Plan, Home, Setup, or Sign out as primary navigation items.
- Derive selected nav state from the committed current route segment so exactly
  one Today/Week/Review item is active at a time.
- Provide a stable `/install` route for iPhone Safari Add to Home Screen. It
  should not smart-route away, should not be primary navigation, and should link
  to `/today` so launches open the daily execution screen directly.
- Provide standalone web app metadata: manifest `start_url: "/today"`,
  `scope: "/"`, `display: "standalone"`, warm theme/background colors, real PNG
  icons, and iOS Home Screen metadata. Use `/install` for installation rather
  than installing from route-specific pages such as `/week` or `/review`.
- On mobile, preserve normal document scrolling. Keep the bottom nav fixed to
  the bottom safe area with content padding for the nav height and safe area.
  Avoid `100dvh` app frames, visual-viewport browser-control offsets, fake top
  spacers, or route-specific Week/Review padding unless a concrete device test
  proves they are still required after standalone install metadata is correct.
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
- Make the iPhone Home Screen install path the primary app-like acceptance
  target, with iPhone Chrome/Safari browser testing still important.
- Polish touch targets, spacing, empty states, and copy.
- Add high-value Playwright flows if the foundation supports it.
- Confirm deployment and environment setup.

### Production readiness

- Verify Vercel production deploys from `main` and uses the expected Supabase
  project.
- Keep runtime environment requirements limited to
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Do not require or expose a Supabase service-role key for normal app screens.
- Verify remote Supabase migrations match repo migrations before relying on
  production data behavior.
- Do not ship obsolete development preview routes.
- Maintain a concise production smoke-test and iPhone/Home Screen acceptance
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
- database-backed access checks where practical

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

1. Log in with Supabase email/password, with app access controlled by the
   database.
2. See or create the current Monday-Sunday week.
3. Open Week for current-week planning and next-week list preparation.
4. Plan days for activities.
5. Use Today view on iPhone, preferably from the installed Home Screen app.
6. Mark planned and unplanned items done.
7. Move unfinished planned items.
8. Review done days against target counts and correct completion truth.
9. Use the app through a compact Today / Week / Review shell on iPhone.
10. Deploy through Vercel with documented environment variables.
