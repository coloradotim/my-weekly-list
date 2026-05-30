import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyOptimisticReviewAction,
  buildReviewState,
  buildReviewViewModel,
  getReviewDetailDisplayState,
  getReviewSummarySentence,
  type ReviewActivityRecord,
} from "@/lib/review/current";
import type { WeekRecord } from "@/lib/week/current";

const reviewPage = readFileSync(join(process.cwd(), "app/(app)/review/page.tsx"), "utf8");
const reviewActions = readFileSync(
  join(process.cwd(), "app/(app)/review/actions.ts"),
  "utf8",
);
const reviewClient = readFileSync(
  join(process.cwd(), "components/optimistic-review-view.tsx"),
  "utf8",
);
const reviewModel = readFileSync(join(process.cwd(), "lib/review/current.ts"), "utf8");

describe("persisted Review model", () => {
  it("builds the required summary sentence and target groupings", () => {
    const view = buildReviewViewModel(fixtureState());

    expect(view.summarySentence).toBe("You completed 8 activities this week.");
    expect(view.targetsMet.map((row) => row.activityName)).toEqual(["Walk", "Read"]);
    expect(view.targetsMet.find((row) => row.activityName === "Read")).toMatchObject({
      doneCount: 4,
      targetCount: 3,
      isTargetMet: true,
    });
    expect(view.shortOfTarget.map((row) => row.activityName)).toEqual([
      "Yoga",
      "Journal",
    ]);
  });

  it("counts planned and unplanned completions as activity-day records", () => {
    const view = buildReviewViewModel(fixtureState());
    const read = fixtureState().activities.find((activity) => activity.id === "read");

    expect(read?.cells.find((cell) => cell.date === "2026-05-28")).toMatchObject({
      planned: false,
      done: true,
    });
    expect(view.completedActivityDays).toBe(8);
  });

  it("renders done as a check and every not-completed state as blank", () => {
    const state = fixtureState();
    const walk = state.activities.find((activity) => activity.id === "walk")!;
    const yoga = state.activities.find((activity) => activity.id === "yoga")!;
    const journal = state.activities.find((activity) => activity.id === "journal")!;

    expect(getReviewDetailDisplayState(walk.cells[0])).toBe("done");
    expect(getReviewDetailDisplayState(yoga.cells[1])).toBe("blank");
    expect(getReviewDetailDisplayState(journal.cells[2])).toBe("blank");
    expect(getReviewDetailDisplayState(walk.cells[1])).toBe("blank");
  });

  it("marks planned, skipped, and unplanned blank cells done", () => {
    const plannedDone = applyOptimisticReviewAction(fixtureState(), {
      type: "set-completion",
      activityId: "yoga",
      date: "2026-05-26",
      done: true,
    });
    const skippedDone = applyOptimisticReviewAction(fixtureState(), {
      type: "set-completion",
      activityId: "journal",
      date: "2026-05-27",
      done: true,
    });
    const unplannedDone = applyOptimisticReviewAction(fixtureState(), {
      type: "set-completion",
      activityId: "walk",
      date: "2026-05-26",
      done: true,
    });

    expect(cell(plannedDone, "yoga", "2026-05-26")).toMatchObject({
      planned: true,
      done: true,
      skipped: false,
    });
    expect(cell(skippedDone, "journal", "2026-05-27")).toMatchObject({
      planned: true,
      done: true,
      skipped: false,
    });
    expect(cell(unplannedDone, "walk", "2026-05-26")).toMatchObject({
      planned: false,
      done: true,
      skipped: false,
    });
  });

  it("removes done and returns the Review cell display to blank", () => {
    const state = applyOptimisticReviewAction(fixtureState(), {
      type: "set-completion",
      activityId: "walk",
      date: "2026-05-25",
      done: false,
    });
    const updated = cell(state, "walk", "2026-05-25");

    expect(updated).toMatchObject({
      planned: true,
      done: false,
      skipped: false,
    });
    expect(getReviewDetailDisplayState(updated!)).toBe("blank");
  });

  it("does not optimistically mutate future display-only cells", () => {
    const state = buildReviewState({
      week: activeWeek,
      today: "2026-05-27",
      activities: fixtureActivities(),
    });
    const updated = applyOptimisticReviewAction(state, {
      type: "set-completion",
      activityId: "walk",
      date: "2026-05-30",
      done: true,
    });

    expect(cell(updated, "walk", "2026-05-30")?.done).toBe(false);
  });

  it("shows the Sunday note only for a Sunday current-week review", () => {
    expect(fixtureState("2026-05-31").isSundayCurrentWeek).toBe(true);
    expect(fixtureState("2026-05-30").isSundayCurrentWeek).toBe(false);
  });

  it("uses in-progress summary copy while the week is still current", () => {
    const view = buildReviewViewModel(fixtureState("2026-05-30"));

    expect(view.isCurrentWeek).toBe(true);
    expect(view.summarySentence).toBe(
      "You have completed 8 activities so far this week.",
    );
    expect(getReviewSummarySentence(3, true)).toBe(
      "You have completed 3 activities so far this week.",
    );
  });
});

describe("persisted Review implementation guardrails", () => {
  it("renders the real Review route with the optimistic persisted client", () => {
    expect(reviewPage).toContain("loadReview");
    expect(reviewPage).toContain("OptimisticReviewView");
    expect(reviewPage).not.toContain("PlaceholderCard");
    expect(reviewPage).not.toContain("Close week");
  });

  it("persists explicit completion truth without planning mutations", () => {
    expect(reviewActions).toContain("setReviewCellDone");
    expect(reviewActions).toContain("done: boolean");
    expect(reviewActions).not.toContain("planned: boolean");
    expect(reviewActions).not.toContain("SERVICE_ROLE");
    expect(reviewActions).not.toContain("service_role");
    expect(reviewModel).toContain('week.status === "closed"');
    expect(reviewModel).toContain("Future days are view-only.");
  });

  it("uses immediate optimistic UI with rollback and no full page refresh", () => {
    expect(reviewClient).toContain("applyOptimisticReviewAction");
    expect(reviewClient).toContain("Couldn’t save that change. Try again.");
    expect(reviewClient).toContain("pendingCellKeys");
    expect(reviewClient).not.toContain("disabled:opacity");
    expect(reviewClient).not.toContain("router.refresh");
  });

  it("does not expose close, finalize, draft, category totals, or score language", () => {
    expect(reviewClient).not.toContain("Close week");
    expect(reviewClient).not.toContain("Finalize");
    expect(reviewClient).not.toContain("Draft");
    expect(reviewClient).not.toContain("category total");
    expect(reviewClient).not.toContain("score");
  });

  it("documents the exact Review summary and detail copy", () => {
    expect(getReviewSummarySentence(3)).toBe("You completed 3 activities this week.");
    expect(reviewClient).toContain("Targets met");
    expect(reviewClient).toContain("Short of target");
    expect(reviewClient).toContain("Review day-by-day details");
    expect(reviewClient).toContain(
      "Review what happened. Tap any day to correct whether you completed that",
    );
  });
});

function fixtureState(today = "2026-06-02") {
  return buildReviewState({
    week: activeWeek,
    today,
    activities: fixtureActivities(),
  });
}

function fixtureActivities(): ReviewActivityRecord[] {
  return [
    activity({
      id: "walk",
      categoryName: "Physical Health",
      targetCount: 3,
      doneDates: ["2026-05-25", "2026-05-27", "2026-05-29"],
      plannedDates: ["2026-05-25", "2026-05-27", "2026-05-29"],
    }),
    activity({
      id: "yoga",
      categoryName: "Physical Health",
      targetCount: 2,
      doneDates: ["2026-05-29"],
      plannedDates: ["2026-05-26", "2026-05-29"],
    }),
    activity({
      id: "read",
      categoryName: "Mental Health",
      targetCount: 3,
      doneDates: ["2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28"],
      plannedDates: ["2026-05-25", "2026-05-26", "2026-05-27"],
    }),
    activity({
      id: "journal",
      categoryName: "Mental Health",
      targetCount: 2,
      doneDates: [],
      plannedDates: ["2026-05-27"],
      skippedDates: ["2026-05-27"],
    }),
  ];
}

function activity({
  id,
  categoryName,
  targetCount,
  doneDates,
  plannedDates,
  skippedDates = [],
}: {
  id: string;
  categoryName: string;
  targetCount: number;
  doneDates: string[];
  plannedDates: string[];
  skippedDates?: string[];
}): ReviewActivityRecord {
  return {
    id,
    categoryName,
    categorySortOrder: categoryName === "Physical Health" ? 10 : 20,
    activityName: id[0].toUpperCase() + id.slice(1),
    targetCount,
    sortOrder: targetCount * 10,
    cells: [
      "2026-05-25",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
    ].map((date) => ({
      date,
      planned: plannedDates.includes(date),
      done: doneDates.includes(date),
      skipped: skippedDates.includes(date),
      isCorrectionEditable: true,
    })),
  };
}

function cell(state: ReturnType<typeof fixtureState>, activityId: string, date: string) {
  return state.activities
    .find((activity) => activity.id === activityId)
    ?.cells.find((dayCell) => dayCell.date === date);
}

const activeWeek: WeekRecord = {
  id: "week",
  weekStartDate: "2026-05-25",
  weekEndDate: "2026-05-31",
  status: "active",
};
