# My Weekly List Implementation Plan

## Purpose

This document turns `docs/product-plan.md` into a practical build sequence for Codex-driven development.

The goal is a private, single-user, responsive web app that works well in Chrome on iPhone and desktop browsers. The first release should preserve the paper workflow: plan a Monday-Sunday week, mark which days activities happen, move unfinished planned items, review done days against weekly targets, and close the week.

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

## Week lifecycle

Implement lifecycle states deliberately:

```text
Draft -> Active -> Needs Review -> Closed
```

### Draft

Future week being planned. Full editing is allowed.

### Active

Current Monday-Sunday week. Completion and day-plan adjustment are allowed. Do not allow brand-new activities, activity deletion, category changes, or target-count changes in MVP.

### Needs Review

Prior week that ended but has not been closed. Review and close are allowed. Do not block use of the current week.

### Closed

View-only historical week. No corrections or edits.

## Date behavior

- Weeks run Monday through Sunday.
- App-side lifecycle helpers use `YYYY-MM-DD` date-only strings and UTC date math internally so a personal planning day does not shift because of browser or server timezone conversion.
- Sunday should prompt review and next-week planning while still allowing Sunday execution.
- Monday should start a planned Draft week as Active if one exists.
- If the user starts the current week late, do not create missed cells for days before the user planned the week.
- If several weeks are missed, do not auto-create ghost weeks.

## UX priority

Build for these user moments first:

1. Open app on iPhone and mark an item done quickly.
2. Open app on iPhone and move an unfinished item to tomorrow.
3. On Sunday, review the week and start planning next week.
4. On desktop, view and adjust the weekly grid.
5. On Monday or later, recover gracefully if the prior week was not reviewed or the current week was not planned.

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
- Implement Draft, Active, Needs Review, and Closed states.
- Implement Sunday prompt behavior.
- Implement Monday transition behavior.
- Implement late-start behavior.
- Add tests for lifecycle and date rules.

### Phase 4 — This Week grid

- Show categories, activities, targets, and seven day cells.
- Implement direct planning toggles for blank and planned cells.
- Render done and missed states as display-only in the weekly overview.
- Make the grid usable on mobile and desktop.

The first current week is created from active seeded templates when `/week` has
no current Monday-Sunday week. Creation snapshots category name, category order,
activity name, target count, activity order, and template references into
`week_activities`; day cells remain absent until the user explicitly plans or
later completion flows record a done day.

The MVP This Week grid is a planning and overview surface:

- Draft weeks: blank and planned cells toggle directly.
- Active weeks: today and future blank/planned cells toggle directly.
- Active past cells, done cells, missed cells, and closed weeks are view-only.

Planning toggles should feel immediate. The persisted Week grid uses local
optimistic state for editable blank/planned cells and saves an explicit desired
`planned` value in the background, rather than submitting a full-page form for
each cell or relying on a blind server-side toggle.

Completion entry belongs to Today, and completion corrections belong to Review.

### Phase 5 — Today view

- Show planned items for today.
- Mark done quickly.
- Move unfinished planned items to tomorrow or another day.
- Mark an unplanned item done.
- Show unresolved prior planned items when useful.

### Phase 6 — Draft planning and copy week

- Copy prior week into a Draft week before the new week starts.
- Copy activities, categories, targets, and planned days when planning ahead.
- If creating the current week late, copy activities and targets but default planned days from today forward only.
- Allow Draft week editing.

### Phase 7 — Review and close week

- Show done-day counts against target counts.
- Show per-activity and category summaries.
- Include a simple visual summary grid.
- Add Close Week action.
- Lock closed weeks.

### Phase 8 — Mobile polish and hardening

- Make iPhone Chrome the primary acceptance target.
- Polish touch targets, spacing, empty states, and copy.
- Add high-value Playwright flows if the foundation supports it.
- Confirm deployment and environment setup.

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
- closed week immutability
- allowed-user access checks where practical

Browser or integration tests should eventually cover:

- logging in
- viewing Today
- marking planned item done
- marking unplanned item done
- moving an item
- reviewing and closing a week
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
3. Copy the prior week into a new week.
4. Plan days for activities.
5. Use Today view on iPhone Chrome.
6. Mark planned and unplanned items done.
7. Move unfinished planned items.
8. Review done days against target counts.
9. Close a week and view it later as read-only.
10. Deploy through Vercel with documented environment variables.
