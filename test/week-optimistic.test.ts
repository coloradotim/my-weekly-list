import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyOptimisticWeekCellFacts,
  applyOptimisticPlanningCell,
  getOptimisticWeekCellFacts,
  getOptimisticPlannedValue,
  getPlanningCellKey,
} from "@/lib/week/optimistic";
import type { ThisWeekViewModel } from "@/lib/week/current";

const optimisticGrid = readFileSync(
  join(process.cwd(), "components/optimistic-this-week-grid.tsx"),
  "utf8",
);
const thisWeekGrid = readFileSync(
  join(process.cwd(), "components/this-week-grid.tsx"),
  "utf8",
);

describe("optimistic week planning", () => {
  it("applies a permitted blank to planned transition immediately", () => {
    const view = applyOptimisticPlanningCell({
      view: fixtureView(),
      activityId: "walk",
      cellDate: "2026-06-05",
      planned: true,
    });
    const cell = getCell(view, "walk", "2026-06-05");

    expect(cell).toMatchObject({
      planned: true,
      done: false,
      state: "planned",
      isPlanningEditable: true,
    });
  });

  it("applies a permitted planned to blank transition immediately", () => {
    const view = applyOptimisticPlanningCell({
      view: fixtureView(),
      activityId: "walk",
      cellDate: "2026-06-04",
      planned: false,
    });
    const cell = getCell(view, "walk", "2026-06-04");

    expect(cell).toMatchObject({
      planned: false,
      done: false,
      state: "blank",
      isPlanningEditable: true,
    });
  });

  it("does not mutate non-editable past, done, missed, or closed cells", () => {
    const view = fixtureView();
    const closedView = closedFixtureView();

    expect(
      applyOptimisticPlanningCell({
        view,
        activityId: "walk",
        cellDate: "2026-06-03",
        planned: true,
      }),
    ).toBe(view);
    expect(
      applyOptimisticPlanningCell({
        view,
        activityId: "walk",
        cellDate: "2026-06-01",
        planned: false,
      }),
    ).toBe(view);
    expect(
      applyOptimisticPlanningCell({
        view: closedView,
        activityId: "walk",
        cellDate: "2026-06-05",
        planned: true,
      }),
    ).toBe(closedView);
  });

  it("clears today planned completion back to an open planned cell", () => {
    const initial = fixtureView({
      walkToday: cell("2026-06-04", true, true, "done", false, true),
    });
    const nextFacts = getOptimisticWeekCellFacts(getCell(initial, "walk", "2026-06-04"));

    expect(nextFacts).toEqual({ planned: true, done: false, skipped: false });

    const view = applyOptimisticWeekCellFacts({
      view: initial,
      activityId: "walk",
      cellDate: "2026-06-04",
      ...nextFacts!,
    });

    expect(getCell(view, "walk", "2026-06-04")).toMatchObject({
      planned: true,
      done: false,
      skipped: false,
      state: "planned",
      isPlanningEditable: true,
    });
  });

  it("clears today unplanned completion back to a blank cell", () => {
    const initial = fixtureView({
      walkToday: cell("2026-06-04", false, true, "done", false, true),
    });
    const view = applyOptimisticWeekCellFacts({
      view: initial,
      activityId: "walk",
      cellDate: "2026-06-04",
      planned: false,
      done: false,
      skipped: false,
    });

    expect(getCell(view, "walk", "2026-06-04")).toMatchObject({
      planned: false,
      done: false,
      skipped: false,
      state: "blank",
      isPlanningEditable: true,
    });
  });

  it("clears today skipped state back to an open planned cell", () => {
    const initial = fixtureView({
      walkToday: cell("2026-06-04", true, false, "missed", false, true, true),
    });
    const nextFacts = getOptimisticWeekCellFacts(getCell(initial, "walk", "2026-06-04"));

    expect(nextFacts).toEqual({ planned: true, done: false, skipped: false });

    const view = applyOptimisticWeekCellFacts({
      view: initial,
      activityId: "walk",
      cellDate: "2026-06-04",
      ...nextFacts!,
    });

    expect(getCell(view, "walk", "2026-06-04")).toMatchObject({
      planned: true,
      done: false,
      skipped: false,
      state: "planned",
      isPlanningEditable: true,
    });
  });

  it("updates separate cells independently", () => {
    const first = applyOptimisticPlanningCell({
      view: fixtureView(),
      activityId: "walk",
      cellDate: "2026-06-05",
      planned: true,
    });
    const second = applyOptimisticPlanningCell({
      view: first,
      activityId: "read",
      cellDate: "2026-06-06",
      planned: true,
    });

    expect(getCell(second, "walk", "2026-06-05").planned).toBe(true);
    expect(getCell(second, "read", "2026-06-06").planned).toBe(true);
  });

  it("provides stable same-cell keys for per-cell pending state", () => {
    expect(getPlanningCellKey("walk", "2026-06-05")).toBe("walk:2026-06-05");
  });

  it("derives the next intended planned value from editable cells only", () => {
    expect(getOptimisticPlannedValue(getCell(fixtureView(), "walk", "2026-06-05"))).toBe(
      true,
    );
    expect(getOptimisticPlannedValue(getCell(fixtureView(), "walk", "2026-06-04"))).toBe(
      false,
    );
    expect(getOptimisticPlannedValue(getCell(fixtureView(), "walk", "2026-06-03"))).toBe(
      false,
    );
  });

  it("only scrolls the current active week to today on initial mobile entry", () => {
    expect(optimisticGrid).toContain('initialView.week.status !== "active"');
    expect(optimisticGrid).toContain('window.matchMedia("(min-width: 640px)")');
    expect(optimisticGrid).toContain("todayHeader.offsetLeft - stickyColumn.offsetWidth");
    expect(optimisticGrid).toContain("grid.scrollLeft = Math.min");
    expect(thisWeekGrid).toContain(
      'data-initial-scroll={view.week.status === "active" ? "today" : "monday"}',
    );
  });

  it("uses a muted x rather than a slash for missed or skipped Week cells", () => {
    expect(thisWeekGrid).toContain("×");
    expect(thisWeekGrid).not.toContain(">\n        /\n");
    expect(thisWeekGrid).not.toContain("opacity-80");
  });

  it("keeps Week day headers sticky while the grid scrolls vertically", () => {
    expect(thisWeekGrid).toContain("data-week-grid-header-scroll");
    expect(thisWeekGrid).toContain("sticky top-0 z-30 w-full max-w-full");
    expect(thisWeekGrid).toContain("rounded-t-none border-t-0");
    expect(thisWeekGrid).toContain("ref={gridLayout.headerScrollerRef}");
  });
});

function getCell(view: ThisWeekViewModel, activityId: string, cellDate: string) {
  const cell = view.categories
    .flatMap((category) => category.activities)
    .find((activity) => activity.id === activityId)
    ?.cells.find((candidate) => candidate.date === cellDate);

  if (!cell) {
    throw new Error(`Missing cell ${activityId}:${cellDate}`);
  }

  return cell;
}

function closedFixtureView() {
  return {
    ...fixtureView(),
    week: {
      id: "week-closed",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      status: "closed" as const,
    },
    categories: fixtureView().categories.map((category) => ({
      ...category,
      activities: category.activities.map((activity) => ({
        ...activity,
        cells: activity.cells.map((cell) => ({
          ...cell,
          isPlanningEditable: false,
        })),
      })),
    })),
    isEditable: false,
  } satisfies ThisWeekViewModel;
}

function fixtureView(overrides: { walkToday?: ReturnType<typeof cell> } = {}) {
  return {
    week: {
      id: "week-1",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      status: "active" as const,
    },
    today: "2026-06-04",
    dayDates: [
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
    ],
    isEditable: true,
    categories: [
      {
        name: "Physical Health",
        sortOrder: 10,
        activities: [
          {
            id: "walk",
            activityName: "Walk",
            targetCount: 4,
            doneCount: 1,
            sortOrder: 10,
            cells: [
              cell("2026-06-01", true, true, "done", false),
              cell("2026-06-02", true, false, "missed", false),
              cell("2026-06-03", false, false, "blank", false),
              overrides.walkToday ?? cell("2026-06-04", true, false, "planned", true),
              cell("2026-06-05", false, false, "blank", true),
              cell("2026-06-06", false, false, "blank", true),
              cell("2026-06-07", false, false, "blank", true),
            ],
          },
          {
            id: "read",
            activityName: "Read",
            targetCount: 5,
            doneCount: 0,
            sortOrder: 20,
            cells: [
              cell("2026-06-01", false, false, "blank", false),
              cell("2026-06-02", false, false, "blank", false),
              cell("2026-06-03", false, false, "blank", false),
              cell("2026-06-04", false, false, "blank", true),
              cell("2026-06-05", false, false, "blank", true),
              cell("2026-06-06", false, false, "blank", true),
              cell("2026-06-07", false, false, "blank", true),
            ],
          },
        ],
      },
    ],
  } satisfies ThisWeekViewModel;
}

function cell(
  date: string,
  planned: boolean,
  done: boolean,
  state: "blank" | "planned" | "done" | "missed",
  isPlanningEditable: boolean,
  isTodayCorrectionEditable = false,
  skipped = false,
) {
  return {
    date,
    planned,
    done,
    skipped,
    state,
    isPlanningEditable,
    isTodayCorrectionEditable,
  };
}
