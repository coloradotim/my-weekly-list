import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyOptimisticTodayAction,
  buildTodayViewModel,
  getAvailableMoveDates,
  getRemainingMoveDates,
  getTodayCorrectionCellState,
  getTodayDayDates,
  type TodayState,
} from "@/lib/today/current";

const todayPage = readFileSync(join(process.cwd(), "app/(app)/today/page.tsx"), "utf8");
const todayActions = readFileSync(
  join(process.cwd(), "app/(app)/today/actions.ts"),
  "utf8",
);
const todayClient = readFileSync(
  join(process.cwd(), "components/optimistic-today-view.tsx"),
  "utf8",
);

describe("persisted Today model", () => {
  it("orders Today by open planned, Something else options, Done today, then Skipped", () => {
    const view = buildTodayViewModel(fixtureState());

    expect(view.openPlannedToday.map((activity) => activity.activityName)).toEqual([
      "Walk",
      "Read",
      "Downtime",
    ]);
    expect(view.unplannedOptions.map((activity) => activity.activityName)).toEqual([
      "Yoga",
      "Journal",
    ]);
    expect(view.doneToday.map((activity) => activity.activityName)).toEqual([
      "Quality kid time",
    ]);
    expect(view.skippedToday.map((activity) => activity.activityName)).toEqual([
      "Meditation",
    ]);
  });

  it("marks a planned-today item done and allows same-day reversal", () => {
    const doneState = applyOptimisticTodayAction(fixtureState(), {
      type: "mark-done",
      activityId: "walk",
    });
    const doneView = buildTodayViewModel(doneState);

    expect(doneView.openPlannedToday.some((activity) => activity.id === "walk")).toBe(
      false,
    );
    expect(doneView.doneToday.find((activity) => activity.id === "walk")).toMatchObject({
      isPlannedToday: true,
      isDoneToday: true,
      progressLabel: "2/4",
    });

    const undoneView = buildTodayViewModel(
      applyOptimisticTodayAction(doneState, {
        type: "undo-done",
        activityId: "walk",
      }),
    );

    expect(undoneView.doneToday.some((activity) => activity.id === "walk")).toBe(false);
    expect(
      undoneView.openPlannedToday.find((activity) => activity.id === "walk"),
    ).toMatchObject({
      isPlannedToday: true,
      isDoneToday: false,
      progressLabel: "1/4",
    });
  });

  it("records unplanned same-day completion and makes it picker-eligible after undo", () => {
    const doneState = applyOptimisticTodayAction(fixtureState(), {
      type: "mark-done",
      activityId: "yoga",
    });
    const doneView = buildTodayViewModel(doneState);

    expect(doneView.doneToday.find((activity) => activity.id === "yoga")).toMatchObject({
      isPlannedToday: false,
      isDoneToday: true,
    });
    expect(doneView.unplannedOptions.some((activity) => activity.id === "yoga")).toBe(
      false,
    );

    const undoneView = buildTodayViewModel(
      applyOptimisticTodayAction(doneState, {
        type: "undo-done",
        activityId: "yoga",
      }),
    );

    expect(undoneView.doneToday.some((activity) => activity.id === "yoga")).toBe(false);
    expect(undoneView.unplannedOptions.some((activity) => activity.id === "yoga")).toBe(
      true,
    );
  });

  it("moves today's plan to a later day without completion and supports Undo", () => {
    const movedState = applyOptimisticTodayAction(fixtureState(), {
      type: "move-today-plan",
      activityId: "read",
      toDate: "2026-06-06",
    });
    const movedView = buildTodayViewModel(movedState);

    expect(movedView.openPlannedToday.some((activity) => activity.id === "read")).toBe(
      false,
    );
    expect(movedView.doneToday.some((activity) => activity.id === "read")).toBe(false);

    const restoredView = buildTodayViewModel(
      applyOptimisticTodayAction(movedState, {
        type: "undo-move-today-plan",
        activityId: "read",
        fromDate: "2026-06-06",
      }),
    );

    expect(restoredView.openPlannedToday.some((activity) => activity.id === "read")).toBe(
      true,
    );
  });

  it("excludes already planned and done days from move destinations", () => {
    expect(
      getAvailableMoveDates({
        today: "2026-06-04",
        weekEndDate: "2026-06-07",
        cells: [
          cell("2026-06-04", true, false),
          cell("2026-06-05", true, false),
          cell("2026-06-06", false, true),
        ],
      }).map((date) => date.weekdayLabel),
    ).toEqual(["Sunday"]);
  });

  it("shows no move choices when every remaining day is already planned or done", () => {
    const view = buildTodayViewModel(fixtureState());
    const downtime = view.openPlannedToday.find((activity) => activity.id === "downtime");

    expect(downtime?.moveDates).toEqual([]);
  });

  it("does not overwrite an existing planned or done destination cell", () => {
    const plannedDestinationState = applyOptimisticTodayAction(fixtureState(), {
      type: "move-today-plan",
      activityId: "read",
      toDate: "2026-06-05",
    });
    const doneDestinationState = applyOptimisticTodayAction(fixtureState(), {
      type: "move-today-plan",
      activityId: "read",
      toDate: "2026-06-07",
    });

    expect(plannedDestinationState).toEqual(fixtureState());
    expect(doneDestinationState).toEqual(fixtureState());
  });

  it("skips today's plan as a separate stored resolution and can later mark it done", () => {
    const skippedState = applyOptimisticTodayAction(fixtureState(), {
      type: "skip-today",
      activityId: "walk",
    });
    const skippedView = buildTodayViewModel(skippedState);

    expect(
      skippedView.skippedToday.find((activity) => activity.id === "walk"),
    ).toMatchObject({
      isPlannedToday: true,
      isDoneToday: false,
      isSkippedToday: true,
      progressLabel: "1/4",
    });

    const doneView = buildTodayViewModel(
      applyOptimisticTodayAction(skippedState, {
        type: "mark-done",
        activityId: "walk",
      }),
    );

    expect(doneView.skippedToday.some((activity) => activity.id === "walk")).toBe(false);
    expect(doneView.doneToday.find((activity) => activity.id === "walk")).toMatchObject({
      isDoneToday: true,
      isSkippedToday: false,
      progressLabel: "2/4",
    });
  });

  it("unskips a skipped row back into open Planned for today", () => {
    const view = buildTodayViewModel(
      applyOptimisticTodayAction(fixtureState(), {
        type: "undo-skip",
        activityId: "meditation",
      }),
    );

    expect(view.skippedToday.some((activity) => activity.id === "meditation")).toBe(
      false,
    );
    expect(
      view.openPlannedToday.find((activity) => activity.id === "meditation"),
    ).toMatchObject({
      isPlannedToday: true,
      isDoneToday: false,
      isSkippedToday: false,
    });
  });

  it("uses remaining day names only and has no Sunday move dates", () => {
    expect(
      getRemainingMoveDates({
        today: "2026-06-04",
        weekEndDate: "2026-06-07",
      }).map((date) => date.weekdayLabel),
    ).toEqual(["Friday", "Saturday", "Sunday"]);
    expect(
      getRemainingMoveDates({
        today: "2026-06-07",
        weekEndDate: "2026-06-07",
      }),
    ).toEqual([]);
  });

  it("builds a full current-week correction row for each Today activity", () => {
    const view = buildTodayViewModel(fixtureState());
    const walk = view.activities.find((activity) => activity.id === "walk");

    expect(view.dayDates).toEqual(getTodayDayDates("2026-06-01"));
    expect(walk?.cells.map((cell) => cell.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
    ]);
  });

  it("corrects past, today, skipped, and unplanned completions without changing planning", () => {
    const pastBlankDone = applyOptimisticTodayAction(fixtureState(), {
      type: "set-completion",
      activityId: "walk",
      date: "2026-06-02",
      done: true,
    });
    expect(cellFor(pastBlankDone, "walk", "2026-06-02")).toMatchObject({
      planned: false,
      done: true,
      skipped: false,
    });

    const pastDoneRemoved = applyOptimisticTodayAction(fixtureState(), {
      type: "set-completion",
      activityId: "walk",
      date: "2026-06-01",
      done: false,
    });
    expect(cellFor(pastDoneRemoved, "walk", "2026-06-01")).toMatchObject({
      planned: true,
      done: false,
      skipped: false,
    });

    const todayBlankDone = applyOptimisticTodayAction(fixtureState(), {
      type: "set-completion",
      activityId: "journal",
      date: "2026-06-04",
      done: true,
    });
    expect(cellFor(todayBlankDone, "journal", "2026-06-04")).toMatchObject({
      planned: false,
      done: true,
      skipped: false,
    });

    const skippedTodayDone = applyOptimisticTodayAction(fixtureState(), {
      type: "set-completion",
      activityId: "meditation",
      date: "2026-06-04",
      done: true,
    });
    expect(cellFor(skippedTodayDone, "meditation", "2026-06-04")).toMatchObject({
      planned: true,
      done: true,
      skipped: false,
    });
  });

  it("updates weekly progress after focused completion correction", () => {
    const correctedView = buildTodayViewModel(
      applyOptimisticTodayAction(fixtureState(), {
        type: "set-completion",
        activityId: "walk",
        date: "2026-06-02",
        done: true,
      }),
    );

    expect(
      correctedView.activities.find((activity) => activity.id === "walk"),
    ).toMatchObject({
      progressLabel: "2/4",
    });
  });

  it("keeps future days visible but not editable in the focused correction sheet", () => {
    expect(
      getTodayCorrectionCellState({
        cell: { date: "2026-06-05", done: false },
        today: "2026-06-04",
      }),
    ).toEqual({ display: "blank", isEditable: false });
    expect(
      getTodayCorrectionCellState({
        cell: { date: "2026-06-04", done: false },
        today: "2026-06-04",
      }),
    ).toEqual({ display: "blank", isEditable: true });
  });
});

describe("persisted Today implementation guardrails", () => {
  it("renders the real Today route with the optimistic persisted client", () => {
    expect(todayPage).toContain("loadToday");
    expect(todayPage).toContain("ensureCurrentWeekForUserId");
    expect(todayPage).toContain("OptimisticTodayView");
    expect(todayPage).not.toContain("PlaceholderCard");
    expect(todayPage).not.toContain("Earlier this week");
  });

  it("shows direct Move and Skip controls without the old adjustment flow", () => {
    expect(todayClient).toContain("Cancel");
    expect(todayClient).toContain("movingActivityId");
    expect(todayClient).toContain("setMovingActivityId((current)");
    expect(todayClient).toContain("current === activity.id ? null : activity.id");
    expect(todayClient).toContain("moveDates.length > 0");
    expect(todayClient).toContain("moveDates.length === 0");
    expect(todayClient).toContain("disabled:border-line-soft");
    expect(todayClient).toContain("Skip");
    expect(todayClient).not.toContain("Adjust plan");
    expect(todayClient).not.toContain("Move to another day");
    expect(todayClient).not.toContain("disabled:opacity");
    expect(todayClient).not.toContain("onCancelAdjust");
  });

  it("persists explicit facts and never uses unsafe blind toggles", () => {
    expect(todayActions).toContain("planned: boolean");
    expect(todayActions).toContain("done: boolean");
    expect(todayActions).toContain("skipped: boolean");
    expect(todayActions).toContain("setActivityDayCellFacts");
    expect(todayActions).toContain("getTodayDateOnly()");
    expect(todayActions).toContain("moveWeekActivityPlanDate");
    expect(todayActions).toContain("moveTodayPlanAction");
    expect(todayActions).toContain("setTodayCompletionCorrectionAction");
    expect(todayActions).toContain("setReviewCellDone");
    expect(todayActions).not.toContain("toggle");
    expect(todayActions).not.toContain("SERVICE_ROLE");
    expect(todayActions).not.toContain("service_role");
  });

  it("models immediate optimistic state with rollback/error behavior", () => {
    expect(todayClient).toContain("applyOptimisticTodayAction");
    expect(todayClient).toContain("Couldn’t save that change. Try again.");
    expect(todayClient).toContain("rollback");
    expect(todayClient).toContain("pendingActivityIds");
    expect(todayClient).toContain("pendingCorrectionKeys");
    expect(todayClient).toContain("getBoundingClientRect");
    expect(todayClient).toContain("onPointerDown={onClose}");
    expect(todayClient).toContain('event.key === "Escape"');
    expect(todayClient).toContain("Close correction sheet");
    expect(todayClient).toContain("getTodayStateScope");
    expect(todayClient).not.toContain("router.refresh");
  });

  it("uses the approved Today copy without prior-missed backlog language", () => {
    expect(todayClient).toContain("Planned for today");
    expect(todayClient).toContain("+ Something else");
    expect(todayClient).toContain("Done today");
    expect(todayClient).toContain("Skipped");
    expect(todayClient).toContain("Mark done");
    expect(todayClient).toContain("Mark done today");
    expect(todayClient).toContain("Move");
    expect(todayClient).toContain("Skip");
    expect(todayClient).toContain("Unskip");
    expect(todayClient).toContain("onUnskip");
    expect(todayClient).toContain('this week <span aria-hidden="true">›</span>');
    expect(todayClient).toContain("Tap any day to correct whether you did it.");
    expect(todayClient).toContain("Future day, not editable.");
    expect(todayClient).toContain("Collapse");
    expect(todayClient).toContain("Expand");
    expect(todayClient).not.toContain("Also done today");
    expect(todayClient).not.toContain(">Hide<");
    expect(todayClient).not.toContain(">Show<");
    expect(todayClient).not.toContain("Adjust plan");
    expect(todayClient).not.toContain("Earlier this week");
    expect(todayClient).not.toContain("Leave missed");
    expect(todayClient).not.toContain("Move to today");
    expect(todayClient).not.toContain("Skip for the week");
  });
});

function cellFor(state: TodayState, activityId: string, date: string) {
  return state.activities
    .find((activity) => activity.id === activityId)
    ?.cells.find((cell) => cell.date === date);
}

function fixtureState(): TodayState {
  return {
    week: {
      id: "week-1",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      status: "active",
    },
    today: "2026-06-04",
    activities: [
      activity({
        id: "walk",
        activityName: "Walk",
        targetCount: 4,
        cells: [cell("2026-06-01", true, true), cell("2026-06-04", true, false)],
      }),
      activity({
        id: "yoga",
        activityName: "Yoga",
        targetCount: 2,
        sortOrder: 20,
        cells: [cell("2026-06-03", false, true)],
      }),
      activity({
        id: "read",
        categoryName: "Mental Health",
        categorySortOrder: 20,
        activityName: "Read",
        targetCount: 5,
        sortOrder: 10,
        cells: [
          cell("2026-06-04", true, false),
          cell("2026-06-05", true, false),
          cell("2026-06-07", false, true),
        ],
      }),
      activity({
        id: "journal",
        categoryName: "Mental Health",
        categorySortOrder: 20,
        activityName: "Journal",
        targetCount: 1,
        sortOrder: 20,
        cells: [],
      }),
      activity({
        id: "meditation",
        categoryName: "Mental Health",
        categorySortOrder: 20,
        activityName: "Meditation",
        targetCount: 3,
        sortOrder: 30,
        cells: [cell("2026-06-04", true, false, true)],
      }),
      activity({
        id: "downtime",
        categoryName: "Mental Health",
        categorySortOrder: 20,
        activityName: "Downtime",
        targetCount: 2,
        sortOrder: 40,
        cells: [
          cell("2026-06-04", true, false),
          cell("2026-06-05", true, false),
          cell("2026-06-06", false, true),
          cell("2026-06-07", true, false),
        ],
      }),
      activity({
        id: "kid-time",
        categoryName: "Family and Home",
        categorySortOrder: 30,
        activityName: "Quality kid time",
        targetCount: 1,
        sortOrder: 10,
        cells: [cell("2026-06-04", true, true)],
      }),
    ],
  };
}

function activity(overrides: Partial<TodayState["activities"][number]>) {
  return {
    id: "activity",
    categoryName: "Physical Health",
    categorySortOrder: 10,
    activityName: "Activity",
    targetCount: 1,
    sortOrder: 10,
    cells: [],
    ...overrides,
  };
}

function cell(date: string, planned: boolean, done: boolean, skipped = false) {
  return {
    date,
    planned,
    done,
    skipped,
  };
}
