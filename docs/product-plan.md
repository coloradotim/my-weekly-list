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

The main product areas are:

- `Today`: do and record today's activity.
- `Week`: view, plan, and edit the current or future Monday-Sunday week.
- `Review`: reflect on historical completion and make allowed corrections.

There is no permanent top-level Plan workflow. Planning next week is launched
from Week, and future list editing happens within that Week planning context.

The normal mobile app shell should reflect that hierarchy: compact navigation
for `Today`, `Week`, and `Review` only. Sign out remains available, but it should
be a quiet secondary account action rather than competing with daily use.

## Design principles

1. Keep the experience simple enough to use daily on an iPhone.
2. Make the weekly grid feel familiar to the paper sheet.
3. Treat planned days as helpful structure, not a contract.
4. Count completed days toward weekly goals whether or not the activity was planned for that day.
5. Today's unfinished planned items should be easy to move or skip without making the user rebuild the weekly plan.
6. Keep missed items calm and informational, not shamey.
7. Do not create missed items for a week the user had not actually planned.
8. Prefer clear, durable data modeling over clever UI shortcuts.
9. Build with enough testing and deployment hygiene that Codex can safely extend the app.

## Platform target

MVP is a responsive web app, not a native iOS app.

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

The app may later become a Progressive Web App (PWA) so it can be added to the iPhone home screen, but the first release should focus on a reliable mobile browser experience.

Design implications:

- Today view is the primary mobile screen.
- Touch targets should be large and easy to hit.
- Forms should be short and forgiving.
- The weekly grid must be usable on mobile, either through horizontal scrolling or a mobile-friendly day/activity layout.
- Desktop should make planning and review easier, but the app must not depend on desktop use.

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

1. Sunday: finish any Sunday activities, review the current week, and plan next week from Week.
2. Monday: start the new active week.
3. Monday through Saturday: use Today view, mark activities done, move unfinished items, and adjust planned days as needed.
4. During the week: mark an activity done on any day, even if it was not originally planned for that day.
5. End of week: review done days against weekly targets and correct completion truth if needed.

The app should know the current day and use that context. Sunday should gently suggest review and planning, but it must still allow the user to mark Sunday activities done or leave them missed. Monday should start the new week if a planned week exists, or help the user create the current week if it does not.

The root route `/` should not show a content-free dashboard. For an
authenticated allowed user, it should route into the app: setup if the starter
list is missing, Today if the current week exists, or current-week assurance
using the established Week list rules when setup is complete and the current
week can be created safely. It must not route to Review just because a past week
has not been reviewed, and it must not require Close or Finalize.

## Week timing model

User-facing week context should be date based:

- This week: the current Monday-Sunday week.
- Next week: the upcoming Monday-Sunday week prepared from Week.
- Past week: an ended week that Review can summarize and correct.

There is no required Close, Finalize, or user-facing Draft ceremony in MVP.
Internal status values may remain for implementation compatibility, but normal
product copy should use human labels such as `This week`, `Next week`, and
`Past`.

Current-week activity/category/target structure should remain stable in MVP.
Day planning can be adjusted from Week, completion belongs in Today, and
completion correction belongs in Review. Past weeks do not allow planning or
structure edits, but Review may correct completion truth.

## Missed Sunday or Monday behavior

The app should be forgiving when the user does not open it on the ideal review/planning days.

### If the user opens the app on Sunday

Sunday remains part of the active week.

The app should show a gentle prompt such as:

> Today is Sunday. You can finish today's items, review this week, or start planning next week.

Actions should stay within the three main areas: Today, Week, and Review.

### If the user does not open the app Sunday

On Monday, the app should use or create the new current week without requiring
the previous week to be reviewed first. The app should not block Monday use
because Sunday review did not happen.

### If the user does not open the app Monday

When the user next opens the app, the app should detect the current date.

If no active week exists for the current Monday-Sunday period, it should show a prompt such as:

> This week hasn't been planned yet. Start from your most recent list?

Actions:

- Start or open this week from the saved list
- Adjust this week in Week
- Review a previous week later

If the user creates the current week late, the app should preserve the reusable
list and avoid creating elapsed-day planned, missed, skipped, or done history.
This avoids creating missed items for days before the user actually planned the
week.

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

- open items planned for today
- each item's weekly progress, such as `2/4`
- a fast `Mark done` action for activities planned today
- a quiet way to move or skip an incomplete plan scheduled for today
- a compact `+ Something else` picker for unplanned same-day completion
- one unified Done today section for all activities completed today
- a Skipped section for planned-today occurrences intentionally skipped today
- current-week setup prompt when no active week exists

Today is same-day execution and same-day plan resolution. It should not become
a prior-day backlog cleanup screen.

Today should be organized by current state:

1. Open Planned for today
2. `+ Something else`
3. Done today
4. Skipped

Normal Today rows should not show category labels. Categories appear only inside
the expanded `+ Something else` picker.

The Today view should be fast. The user should be able to open the app, mark something done, and leave within seconds.

The normal Today screen should begin directly with Today content. It should not
spend mobile space on a large date/week header card.

### Week

Week is the digital version of the paper sheet and owns weekly planning. It
shows the current week by default, can open next week for planning, and is where
future list editing lives.

It should show:

- compact week context only when needed, such as `Next week` or `May 25–31 · Past`
- categories grouped vertically
- activity rows
- target count per activity
- Monday through Sunday columns
- day cells using the defined status visuals

The grid is a planning and weekly-overview surface. Completion entry belongs in
Today, while correction of forgotten prior-day completions belongs in Review.

For the current Week on mobile, the grid should open near today's column once on
initial entry. Manual horizontal scrolling should be respected afterward, and
planning toggles must not reset the scroll position. Next Week and Past Week
views can open at Monday.

### List Editing Inside Week

For MVP, list editing is accessed from Week, not from a separate primary Plan
destination. Use compact copy like `Edit list` or `Edit next week's list`.

It should support future-week list editing:

- add activity
- edit activity name
- edit category
- create a new category when adding or editing an activity
- edit weekly target count
- remove from future weeks by marking inactive
- adjust planned days
- reorder categories and activities when supported by the implementation

The UI should say "Remove from future weeks" rather than "Archive" in normal use.

For Active weeks, do not allow brand-new activities, deleted activities, changed targets, or changed category structure in MVP. Active-week adjustments should be limited to day planning and completion.

### Review

Review summarizes what happened and supports correcting completion truth.

It should show:

- overall completed activity-day count
- activity target count
- activity done-day count
- whether each target was met
- compact target-met and short-of-target sections
- optional day-by-day details for completion correction

Review should focus on actual completion against weekly goals, not strict
adherence to the original daily plan. The default summary should not show
category totals, an overall score, or skipped-versus-missed distinctions.

In day-by-day Review details, the grid answers only: did this activity happen on
this day? Use `✓` for completed days and a blank quiet cell for every
not-completed day. Planned, skipped, missed, and unplanned-not-done facts remain
stored for This Week, Today, and future reporting, but Review MVP does not
visually distinguish them.

## Cell behavior

Each activity/day cell should track planning and completion separately but keep the UI simple.

Backend facts:

- planned: true/false
- done: true/false
- date
- week activity

Derived state:

- missed: planned is true, done is false, the cell date is before today, and the week is not a future week being planned

UI states:

- blank
- planned
- done
- missed

Done count is what matters for weekly goals. A done item counts whether it was planned or unplanned.

An activity can count at most once per day toward its weekly target. The app is tracking days on which the activity happened, not the number of times the activity happened that day.

## Moving and missed items

Normal Today actions should be:

- Mark done
- Move today's plan to another remaining day in the same week
- Skip today's planned occurrence
- Mark something else done today

Skip should be available as an intentional resolution path for today's planned
occurrence, but it should not visually compete with the primary `Mark done`
action except on Sunday when no same-week move is available.

If an item was planned for a prior day and was not completed, that past day
derives as missed and remains visible in This Week. Today should not turn prior
missed planned days into an overdue-task queue. If the user actually completed a
prior-day activity but forgot to enter it, Review owns that correction before
the app relies on the week as history.

Moving an item should affect the planned marker, not the done marker. For
example, moving an unfinished plan from today to Saturday removes today's planned
marker and adds a Saturday planned marker. If today's cell is already done,
moving should not be available for that completed cell.

### Today completion and Skip behavior

The `+ Something else` picker should be expanded-by-default when opened, grouped
by collapsible categories, and used only for unplanned same-day completion.
Selecting `Mark done today` keeps the picker open so multiple same-day
completions can be recorded quickly.

`✓ Done` is a quiet tappable same-day correction status. Tapping it removes
today's completion: planned items return to open Planned for today, while
unplanned completions become eligible again in the picker.

Before Sunday, an open planned-today item shows direct `Mark done`, `Move`, and
`Skip` actions. `Move` appears only when at least one valid later day remains in
the same week.

Move destinations are later day names in the same current week where that same
week activity is not already planned and not already done. Moving today's plan
must not overwrite or merge with an existing destination cell. Sunday has no
cross-week movement; open planned Sunday rows show direct `Mark done` and `Skip`
actions.

Skip means the user intentionally decided not to complete an occurrence planned
for today. It preserves the original planned occurrence, does not change the
weekly target, and does not remove the activity from future weeks. A skipped
activity remains eligible to be marked done later the same day. Review owns
correction of forgotten prior-day completions.

## Planning rules

- Weeks run Monday through Sunday.
- Sunday is the preferred review and next-week planning day.
- Monday is the start of the active week.
- Week owns current-week viewing, next-week planning, and future list editing.
- There is no permanent top-level Plan workflow in the product model.
- Copy previous week should default to copying activities, target counts, categories, and planned days when planning before the new week starts.
- If creating the current week late, copy activities and target counts but default to planned days from today forward only.
- The user can then adjust the copied future week.
- The user may plan more days than the target count.
- Done-day count alone determines whether an activity's weekly target was met.
- An activity can count only once per day.
- Completion notes are deferred from MVP unless easy to add without clutter.
- Multiple completions of the same activity on the same day are out of scope for MVP.

## Authentication and access

The app is private and single-user.

Preferred approach:

- Supabase Auth with email Magic Link login for the configured owner account.
- Lock access to `cubuff98@gmail.com`.
- Use an `ALLOWED_USER_EMAIL` environment variable so the allowed user is configured outside source code.
- Do not expose an editable login email field; the app should send links only to `ALLOWED_USER_EMAIL`.
- Disable new public signups in Supabase after the owner Auth user exists.
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
- editing planning/structure for past weeks
- native iOS app
- App Store distribution
- React Native app
- push notifications
- offline-first behavior

## Testing expectations

Core logic should be covered with tests from the start.

Important test areas:

- Monday-Sunday week calculations
- responsive behavior for iPhone browser viewport sizes
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
- locking past weeks against planning and structure edits
- review calculations by activity and category
- access-control behavior for non-allowed users

## First implementation sequence

1. Responsive web foundation: Next.js, TypeScript, linting, test setup, basic app shell, and mobile browser layout baseline.
2. Supabase setup: client, environment variables, auth guard, allowed-user check.
3. Database schema: weeks, categories, activities, week activities, day cells, seed data.
4. Week lifecycle/date logic: current, next, and past week behavior; Monday-Sunday dates; Sunday/Monday/late-start behavior.
5. This Week grid: display seeded week and support planning-only cell changes with defined visual status language.
6. Today view: show open planned items, mark same-day completions, record unplanned same-day completions, move today's plan to another remaining day, and explicitly Skip today's planned occurrence.
7. Copy previous week: create next/current weeks from the prior saved list with correct planned-day behavior.
8. Week planning / Edit List: add/edit/remove-from-future-weeks for future weeks; keep active weeks constrained.
9. Review: target vs done summaries by activity, with completion-only day-by-day correction and no required Close Week action.
10. Mobile polish: make iPhone Chrome the primary acceptance target.
11. Test hardening: add/expand unit and integration coverage around the core workflow.

## Open questions

These can be resolved during implementation:

1. Whether completion notes are useful enough for MVP.
2. Whether `Hobbies` should eventually become a broader category like `Creative / Social / Hobbies`.
3. Whether the app should eventually support print/export for a physical backup.
4. Whether long-term trend reporting is useful after several weeks of data exist.
