# My Weekly List Product Plan

## Product thesis

My Weekly List digitizes a simple paper weekly-planning ritual.

The current paper workflow is:

1. Print a weekly sheet, usually around Sunday night or Monday morning.
2. Review the major life areas for the week.
3. Choose daily activities and weekly target counts, such as `Walk x4` or `Read x5`.
4. Circle the days intended for each activity.
5. During the week, mark the day when an activity happens.
6. If an activity does not happen, leave it unresolved, move it mentally, or treat it as missed.
7. At the end of the week, use the sheet as a quick visual record of what was planned and what actually happened.

The app should preserve that lightweight rhythm without turning it into a generic task manager, calendar replacement, streak tracker, or productivity framework. The core value is helping the user make a weekly plan, use it day by day, recover when the week changes, and review done days against weekly targets.

## Design principles

1. Keep the experience simple enough to use daily on an iPhone.
2. Make the weekly grid feel familiar to the paper sheet.
3. Treat planned days as helpful structure, not a contract.
4. Count completed days toward weekly goals whether or not the activity was planned for that day.
5. Unfinished items should be easy to move, leave missed, or resolve without making the user rebuild the weekly plan.
6. Keep missed items calm and informational, not shamey.
7. Do not create missed items for a week the user had not actually planned.
8. Prefer clear, durable data modeling over clever UI shortcuts.
9. Build with enough testing and deployment hygiene that Codex can safely extend the app.

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

## Visual status language

Codex should not invent the core status system. The MVP should use a simple, consistent visual language for day cells.

Recommended cell visuals:

| Cell state | Meaning | Visual treatment |
| --- | --- | --- |
| Blank | Not planned and not done | Empty cell with neutral border/background |
| Planned | Planned but not done yet | Soft blue outlined circle |
| Done | Done, whether planned or unplanned | Green filled circle with a white check |
| Missed | Planned for a past day and not done | Muted gray slash or faded gray X |
| Today | Current day context | Subtle column/cell highlight, not a separate status |

Important rules:

- Done should look the same whether it was planned or unplanned.
- The UI does not need to distinguish planned-done from unplanned-done in normal use.
- The backend may retain planned vs unplanned information for review or future analytics.
- Avoid red for missed items unless a later design pass deliberately changes this.

## Core workflow

The default weekly rhythm is:

1. Sunday: finish any Sunday activities, review the current week, and plan next week.
2. Monday: start the new active week.
3. Monday through Saturday: use Today view, mark activities done, move unfinished items, and adjust planned days as needed.
4. During the week: mark an activity done on any day, even if it was not originally planned for that day.
5. End of week: review done days against weekly targets.
6. Once a week is marked closed, it becomes locked.

The app should know the current day and use that context. Sunday should gently suggest review and planning, but it must still allow the user to mark Sunday activities done or leave them missed. Monday should start the new week if a planned week exists, or help the user create the current week if it does not.

## Week states

Weeks should have clear lifecycle states.

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

This keeps the active week as a working record rather than a constantly changing master list.

### Needs Review

A prior week that has ended but has not been closed.

Allowed:

- review the week
- mark remaining unresolved items missed, if needed
- close the week

The app should not block the user from planning or using the current week just because a prior week still needs review.

### Closed

A week that has been reviewed and marked done.

Allowed:

- view only

Not allowed:

- edit planned days
- change done/missed states
- change targets
- change activities

Once the week is closed, it is done.

## Missed Sunday or Monday behavior

The app should be forgiving when the user does not open it on the ideal review/planning days.

### If the user opens the app on Sunday

Sunday remains part of the active week.

The app should show a gentle prompt such as:

> Today is Sunday. You can finish today's items, review this week, or start planning next week.

Actions:

- Go to Today
- Review this week
- Plan next week

### If the user does not open the app Sunday

On Monday, the previous week becomes Needs Review.

The app should show a prompt such as:

> Last week is ready to review. You can close it now or plan this week first.

Actions:

- Review and close last week
- Plan this week
- Skip review and start this week

The app should not block Monday use because Sunday review did not happen.

### If the user does not open the app Monday

When the user next opens the app, the app should detect the current date.

If no active week exists for the current Monday-Sunday period, it should show a prompt such as:

> This week hasn't been planned yet. Start from your most recent list?

Actions:

- Copy last week and plan the rest of this week
- Start a blank week
- Review previous week first

If the user creates the current week late, the default should copy activities and targets but only copy planned days from today forward. This avoids creating missed items for days before the user actually planned the week.

### If the user misses several weeks

The app should not automatically create ghost weeks.

When the user returns, it should show a prompt such as:

> Welcome back. Start a new week from your most recent list?

Actions:

- Start this week from last saved list
- Review last unfinished week
- Go to past weeks

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
- Sunday review/planning prompt when the current day is Sunday
- current-week setup prompt when no active week exists

The Today view should be fast. The user should be able to open the app, mark something done, and leave within seconds.

### This Week

This Week is the digital version of the paper sheet.

It should show:

- week of date
- week state: Draft, Active, Needs Review, or Closed
- categories grouped vertically
- activity rows
- target count per activity
- Monday through Sunday columns
- day cells using the defined status visuals

The grid should support marking an item done even if it was not planned for that day.

### Edit List / Draft Week Planning

For MVP, list editing should focus on draft/future weeks rather than active weeks.

It should support for Draft weeks:

- add activity
- edit activity name
- edit category
- edit weekly target count
- remove from future weeks by marking inactive
- adjust planned days
- reorder later, not required for first MVP unless easy

The UI should say "Remove from future weeks" rather than "Archive" in normal use.

For Active weeks, do not allow brand-new activities, deleted activities, changed targets, or changed category structure in MVP. Active-week adjustments should be limited to day planning and completion.

### Review

Review summarizes how the week went.

It should show:

- activity target count
- activity done-day count
- whether each target was met
- category-level totals
- overall done-day count against total target count
- a simple visual weekly grid or summary
- a clear Close Week action

Review should focus on follow-through against weekly goals, not strict adherence to the original daily plan.

## Cell behavior

Each activity/day cell should track planning and completion separately but keep the UI simple.

Backend facts:

- planned: true/false
- done: true/false
- date
- week activity

Derived state:

- missed: planned is true, done is false, the cell date is before today, and the week is not Draft

UI states:

- blank
- planned
- done
- missed

Done count is what matters for weekly goals. A done item counts whether it was planned or unplanned.

An activity can count at most once per day toward its weekly target. The app is tracking days on which the activity happened, not the number of times the activity happened that day.

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

Moving an item should affect the planned marker, not the done marker. For example, moving an unfinished planned item from Tuesday to Thursday removes the Tuesday planned marker and adds a Thursday planned marker. If Tuesday is already done, moving should not be available for that completed cell.

## Planning rules

- Weeks run Monday through Sunday.
- Sunday is the preferred review and next-week planning day.
- Monday is the start of the active week.
- Copy previous week should default to copying activities, target counts, categories, and planned days when planning before the new week starts.
- If creating the current week late, copy activities and target counts but default to planned days from today forward only.
- The user can then adjust the copied Draft week.
- The user may plan more days than the target count.
- Done-day count alone determines whether an activity's weekly target was met.
- An activity can count only once per day.
- Completion notes are deferred from MVP unless easy to add without clutter.
- Multiple completions of the same activity on the same day are out of scope for MVP.

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
- activity templates or reusable activity definitions
- week activities
- activity day cells or entries

Plain-English meaning:

- An activity template is the reusable item, such as `Walk`.
- A week activity is one week's copy of that item, including that week's target count and category.
- A day cell stores whether that activity was planned and/or done on a specific date.
- Missed is derived from planned/done/date/week state rather than manually stored unless implementation needs require otherwise.

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
- multiple completions per day
- adding brand-new activities to an already-active week
- editing closed weeks

## Testing expectations

Core logic should be covered with tests from the start.

Important test areas:

- Monday-Sunday week calculations
- Sunday review/planning prompt behavior
- Monday transition behavior
- late current-week creation behavior
- not creating missed items for unplanned/ghost weeks
- copying a previous week before the new week starts
- copying a previous week late with planned days from today forward only
- preserving historical weeks when activities are removed from future weeks
- counting done day cells toward weekly targets
- counting unplanned done day cells toward weekly targets
- enforcing at most one done count per activity per day
- deriving missed past planned items
- moving a planned item from one day to another
- locking closed weeks against edits
- review calculations by activity and category
- access-control behavior for non-allowed users

## First implementation sequence

1. Project foundation: Next.js, TypeScript, linting, test setup, basic app shell.
2. Supabase setup: client, environment variables, auth guard, allowed-user check.
3. Database schema: weeks, categories, activities, week activities, day cells, seed data.
4. Week lifecycle logic: Draft, Active, Needs Review, Closed; Monday-Sunday dates; Sunday/Monday/late-start behavior.
5. This Week grid: display seeded week and support basic cell state changes with defined visual status language.
6. Today view: show planned items, mark done, move to tomorrow/another day, mark unplanned done.
7. Copy previous week: create Draft or Active weeks from the prior week with correct planned-day behavior.
8. Draft week planning / Edit List: add/edit/remove-from-future-weeks for future weeks; keep active weeks constrained.
9. Review: target vs done summaries by activity and category, with Close Week action.
10. Mobile polish: make iPhone Chrome the primary acceptance target.
11. Test hardening: add/expand unit and integration coverage around the core workflow.

## Open questions

These can be resolved during implementation:

1. Whether completion notes are useful enough for MVP.
2. Whether `Hobbies` should eventually become a broader category like `Creative / Social / Hobbies`.
3. Whether the app should eventually support print/export for a physical backup.
4. Whether long-term trend reporting is useful after several weeks of data exist.
