# My Weekly List Product Plan

## Product thesis

My Weekly List is a private weekly planning app for one person. It helps the user copy last week's list, adjust the current week's plan, mark what actually happened, move unfinished items forward, and review done counts against weekly goals.

The app should preserve the best parts of the paper workflow: a simple weekly grid, grouped life areas, target counts like `Walk x4`, day-level planning, and fast marking of done items. It should not become a generic task manager, habit-streak app, calendar replacement, or productivity framework.

## Design principles

1. Keep the experience simple enough to use daily on an iPhone.
2. Make the weekly grid feel familiar to the paper sheet.
3. Treat planned days as helpful structure, not a contract.
4. Count completed work toward weekly goals whether or not it was planned for that day.
5. Make moving unfinished items easier than re-planning the whole week.
6. Keep missed items calm and informational, not shamey.
7. Prefer clear, durable data modeling over clever UI shortcuts.
8. Build with enough testing and deployment hygiene that Codex can safely extend the app.

## Look and feel

The UI should feel warm, calm, welcoming, and practical. The user should not feel sad, scolded, or annoyed when opening the app.

Visual direction:

- soft, readable background rather than stark white everywhere
- rounded cards and generous spacing
- clear status indicators that are not visually harsh
- mobile-first Today view
- desktop-friendly weekly grid
- friendly empty states
- no gamified streak pressure
- no heavy red failure styling

Tone direction:

Use language like:

- planned
- done
- missed
- moved
- not yet
- still possible
- met goal
- try again next week

Avoid language like:

- failed
- overdue
- broken streak
- incomplete
- optimize
- productivity score

A missed item is planning information, not a moral failure.

## Core workflow

The weekly loop is:

1. Create or copy the weekly list.
2. Adjust activities, target counts, categories, and planned days.
3. Use Today view during the week.
4. Mark items done or move them to another day.
5. Resolve unfinished items from yesterday when useful.
6. Review done counts against weekly targets.

## MVP screens

### Today

Today is the primary mobile execution screen.

It should show:

- current date and week context
- items planned for today
- each item's category and weekly progress, such as `2/4`
- fast actions: Done, Move to tomorrow, Move to another day
- a way to mark an unplanned item done
- a small cleanup section for unresolved items from prior days, when present

The Today view should be fast. The user should be able to open the app, mark something done, and leave within seconds.

### This Week

This Week is the digital version of the paper sheet.

It should show:

- week of date
- categories grouped vertically
- activity rows
- target count per activity
- Monday through Sunday columns
- day cells that can show planned, done, both, missed, or blank

The grid should support marking an item done even if it was not planned for that day.

### Edit List

Edit List manages the reusable weekly activities.

It should support:

- add activity
- edit activity name
- edit category
- edit default weekly target count
- remove from future weeks by marking inactive
- reorder later, not required for first MVP unless easy

The UI should say "Remove from future weeks" rather than "Archive" in normal use.

### Review

Review summarizes how the week went.

It should show:

- activity target count
- activity done count
- whether each target was met
- category-level totals
- overall done count against total target count
- a simple visual weekly grid or summary

Review should focus on follow-through against weekly goals, not strict adherence to the original daily plan.

## Cell behavior

Each activity/day cell should be able to represent planning and completion separately.

Supported states:

- blank: not planned and not done
- planned: planned but not done yet
- done: done even though it was not planned
- planned and done: planned and completed
- missed: planned for a past day and not completed

Done count is what matters for weekly goals. A done item counts whether it was planned or unplanned.

## Moving and missed items

Normal Today actions should be:

- Done
- Move to tomorrow
- Move to another day

The app does not need a prominent manual Skip action in the normal Today flow.

If an item was planned for a prior day and was not completed, the app may show it in a cleanup section with choices like:

- Move to today
- Move to another day
- Leave missed
- Mark done

Missed should be implicit for unresolved planned items in the past, but the user should have an easy chance to clean up yesterday's unfinished items.

## Planning rules

- Weeks run Monday through Sunday.
- Copy previous week should default to copying activities, target counts, categories, and planned days.
- The user can then adjust the copied week.
- The user may plan more days than the target count.
- Done count alone determines whether an activity's weekly target was met.
- Completion notes are deferred from MVP unless easy to add without clutter.
- Multiple completions of the same activity on the same day are deferred from MVP unless the data model naturally supports it.

## Authentication and access

The app is private and single-user.

Preferred approach:

- Supabase Auth with Google login, if easy and free to implement.
- Lock access to `cubuff98@gmail.com`.
- Use an `ALLOWED_USER_EMAIL` environment variable so the allowed user is configured outside source code.
- Reject all other authenticated users.
- Use database row-level security policies appropriate for a single-user app.

## Initial categories and activities

Seed the app with the current paper-list categories and activities.

### Physical Health

- Walk, target 4
- Floss, target 4
- Yoga, target 2
- Cardio / Strength, target 2

### Mental Health

- Weekly calendar, target 1
- Friends, target 1
- Journal, target 1
- Pivot Year, target 7
- Meditation, target 3
- Downtime, target 2
- Read, target 5
- Get out of the house, target 3

### Family and Home

- Quality kid time, target 1
- Check budget, target 2
- House upkeep, target 2

### Relationship Health

- Video call, target 5
- Check in, target 1
- Fun sexy times, target 1

### Hobbies

- Singing practice, target 4
- Dance, target 1
- Pickleball, target 1
- Harmony Road work, target 1

### Work

- Update whiteboard, target 3
- Complete a big item, target 1

## Suggested technical stack

- Next.js
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Vercel hosting
- Vitest for unit tests
- Playwright later for core browser flows

## Suggested data model

Keep the model simple but durable.

Recommended concepts:

- user/profile
- weeks
- categories
- activity templates
- week activities
- activity day cells or entries

Plain-English meaning:

- An activity template is the reusable item, such as `Walk`.
- A week activity is this week's copy of that item, including this week's target count and category.
- A day cell stores whether that activity was planned, completed, or missed on a specific date.

The data model should preserve historical weeks even when future activities are removed from the active list.

## Non-goals for MVP

Do not build these in the first MVP unless they fall out naturally:

- public multi-user support
- team sharing
- streaks
- badges
- AI-generated coaching
- calendar integration
- notifications
- recurring rules beyond copying last week
- complex analytics
- long-term trend dashboards
- printing/exporting
- completion notes as a required flow
- multiple completions per day as a primary UX requirement

## Testing expectations

Core logic should be covered with tests from the start.

Important test areas:

- Monday-Sunday week calculations
- copying a previous week
- preserving historical weeks when activities are removed from future weeks
- counting done items toward weekly targets
- counting unplanned done items toward weekly targets
- identifying missed past planned items
- moving a planned item from one day to another
- review calculations by activity and category
- access-control behavior for non-allowed users

## First implementation sequence

1. Project foundation: Next.js, TypeScript, linting, test setup, basic app shell.
2. Supabase setup: client, environment variables, auth guard, allowed-user check.
3. Database schema: weeks, categories, activities, week activities, day cells, seed data.
4. This Week grid: display seeded week and support basic cell state changes.
5. Today view: show planned items, mark done, move to tomorrow/another day, mark unplanned done.
6. Copy previous week: create a new week from the prior week's activities, targets, categories, and planned days.
7. Edit List: add/edit/remove-from-future-weeks for activities.
8. Review: target vs done summaries by activity and category.
9. Mobile polish: make iPhone Chrome the primary acceptance target.
10. Test hardening: add/expand unit and integration coverage around the core workflow.

## Open questions

These can be resolved during implementation:

1. Whether completion notes are useful enough for MVP.
2. Whether multiple completions of the same activity on the same day are needed soon.
3. Whether `Hobbies` should eventually become a broader category like `Creative / Social / Hobbies`.
4. Whether the app should eventually support print/export for a physical backup.
5. Whether long-term trend reporting is useful after several weeks of data exist.
