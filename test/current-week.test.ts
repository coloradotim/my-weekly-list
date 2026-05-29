import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildThisWeekViewModel,
  buildMissingWeekActivitySnapshotRows,
  buildWeekActivitySnapshotRows,
  buildWeekCreationPlan,
  canTogglePlanningCell,
  getCellVisualState,
  getDesiredPlanningCellFacts,
  getNextPlanningCellFacts,
  type ActivityTemplateSnapshot,
  type PersistedWeekActivity,
  type WeekRecord,
} from "@/lib/week/current";

const weekActions = readFileSync(
  join(process.cwd(), "app/(app)/week/actions.ts"),
  "utf8",
);
const weekPage = readFileSync(join(process.cwd(), "app/(app)/week/page.tsx"), "utf8");
const optimisticGrid = readFileSync(
  join(process.cwd(), "components/optimistic-this-week-grid.tsx"),
  "utf8",
);

const templates: ActivityTemplateSnapshot[] = [
  {
    id: "walk-template",
    categoryId: "physical-category",
    categoryName: "Physical Health",
    categorySortOrder: 10,
    activityName: "Walk",
    targetCount: 4,
    sortOrder: 10,
  },
  {
    id: "read-template",
    categoryId: "mental-category",
    categoryName: "Mental Health",
    categorySortOrder: 20,
    activityName: "Read",
    targetCount: 5,
    sortOrder: 70,
  },
];

const activeWeek: WeekRecord = {
  id: "week-1",
  weekStartDate: "2026-06-01",
  weekEndDate: "2026-06-07",
  status: "active",
};

describe("current-week creation planning", () => {
  it("hands off to setup when no active templates exist", () => {
    expect(
      buildWeekCreationPlan({
        today: "2026-06-03",
        week: null,
        templates: [],
      }),
    ).toEqual({
      status: "needs-setup",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
    });
  });

  it("plans creation of the current Monday-Sunday week from seeded templates", () => {
    expect(
      buildWeekCreationPlan({
        today: "2026-06-03",
        week: null,
        templates,
      }),
    ).toEqual({
      status: "ready",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      shouldCreateWeek: true,
      snapshotRows: [],
    });
  });

  it("snapshots category, activity, target, order, and template references", () => {
    expect(
      buildWeekActivitySnapshotRows({
        weekId: "week-1",
        templates,
      }),
    ).toEqual([
      {
        week_id: "week-1",
        activity_template_id: "walk-template",
        category_id: "physical-category",
        category_name: "Physical Health",
        category_sort_order: 10,
        activity_name: "Walk",
        target_count: 4,
        sort_order: 10,
      },
      {
        week_id: "week-1",
        activity_template_id: "read-template",
        category_id: "mental-category",
        category_name: "Mental Health",
        category_sort_order: 20,
        activity_name: "Read",
        target_count: 5,
        sort_order: 70,
      },
    ]);
  });

  it("filters existing template snapshots on retry", () => {
    expect(
      buildWeekCreationPlan({
        today: "2026-06-03",
        week: activeWeek,
        templates,
        existingTemplateIds: ["walk-template"],
      }),
    ).toEqual({
      status: "ready",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      shouldCreateWeek: false,
      snapshotRows: [
        {
          week_id: "week-1",
          activity_template_id: "read-template",
          category_id: "mental-category",
          category_name: "Mental Health",
          category_sort_order: 20,
          activity_name: "Read",
          target_count: 5,
          sort_order: 70,
        },
      ],
    });
  });

  it("repairs an existing current week with zero snapshots from active templates", () => {
    expect(
      buildMissingWeekActivitySnapshotRows({
        week: activeWeek,
        templates,
        activities: [],
      }),
    ).toEqual([
      {
        week_id: "week-1",
        activity_template_id: "walk-template",
        category_id: "physical-category",
        category_name: "Physical Health",
        category_sort_order: 10,
        activity_name: "Walk",
        target_count: 4,
        sort_order: 10,
      },
      {
        week_id: "week-1",
        activity_template_id: "read-template",
        category_id: "mental-category",
        category_name: "Mental Health",
        category_sort_order: 20,
        activity_name: "Read",
        target_count: 5,
        sort_order: 70,
      },
    ]);
  });

  it("repairs only missing snapshots for partially populated weeks", () => {
    expect(
      buildMissingWeekActivitySnapshotRows({
        week: activeWeek,
        templates,
        activities: [
          activity({
            id: "walk",
            activityTemplateId: "walk-template",
            activityName: "Walk",
          }),
        ],
      }),
    ).toEqual([
      {
        week_id: "week-1",
        activity_template_id: "read-template",
        category_id: "mental-category",
        category_name: "Mental Health",
        category_sort_order: 20,
        activity_name: "Read",
        target_count: 5,
        sort_order: 70,
      },
    ]);
  });

  it("does not duplicate healthy populated week snapshots", () => {
    expect(
      buildMissingWeekActivitySnapshotRows({
        week: activeWeek,
        templates,
        activities: [
          activity({
            id: "walk",
            activityTemplateId: "walk-template",
            activityName: "Walk",
          }),
          activity({
            id: "read",
            activityTemplateId: "read-template",
            activityName: "Read",
          }),
        ],
      }),
    ).toEqual([]);
  });

  it("repairs snapshots without creating planned day cells or missed history", () => {
    const rows = buildMissingWeekActivitySnapshotRows({
      week: activeWeek,
      templates: [templates[0]],
      activities: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("planned");
    expect(rows[0]).not.toHaveProperty("done");
    expect(rows[0]).not.toHaveProperty("cell_date");
    expect(rows[0]).not.toHaveProperty("activity_day_cells");
  });
});

describe("persisted grid state", () => {
  it("builds category rows from persisted week activity snapshots", () => {
    const view = buildThisWeekViewModel({
      week: activeWeek,
      today: "2026-06-03",
      activities: [
        activity({
          id: "read",
          categoryName: "Mental Health",
          categorySortOrder: 20,
          activityName: "Read",
          targetCount: 5,
          sortOrder: 70,
          cells: [
            { id: "read-cell", cellDate: "2026-06-03", planned: false, done: true },
          ],
        }),
        activity({
          id: "walk",
          categoryName: "Physical Health",
          categorySortOrder: 10,
          activityName: "Walk",
          targetCount: 4,
          sortOrder: 10,
          cells: [
            { id: "walk-cell", cellDate: "2026-06-02", planned: true, done: false },
          ],
        }),
      ],
    });

    expect(view.dayDates).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
    ]);
    expect(view.categories.map((category) => category.name)).toEqual([
      "Physical Health",
      "Mental Health",
    ]);
    expect(view.categories[0].activities[0]).toMatchObject({
      id: "walk",
      activityName: "Walk",
      targetCount: 4,
      doneCount: 0,
    });
    expect(view.categories[0].activities[0].cells[1]).toMatchObject({
      date: "2026-06-02",
      planned: true,
      done: false,
      state: "missed",
    });
    expect(view.categories[1].activities[0]).toMatchObject({
      id: "read",
      activityName: "Read",
      targetCount: 5,
      doneCount: 1,
    });
  });

  it("derives cell states from persisted planned/done facts", () => {
    expect(
      getCellVisualState({
        weekStatus: "active",
        date: "2026-06-02",
        today: "2026-06-03",
        planned: false,
        done: false,
      }),
    ).toBe("blank");
    expect(
      getCellVisualState({
        weekStatus: "active",
        date: "2026-06-03",
        today: "2026-06-03",
        planned: true,
        done: false,
      }),
    ).toBe("planned");
    expect(
      getCellVisualState({
        weekStatus: "active",
        date: "2026-06-02",
        today: "2026-06-03",
        planned: true,
        done: false,
      }),
    ).toBe("missed");
    expect(
      getCellVisualState({
        weekStatus: "active",
        date: "2026-06-02",
        today: "2026-06-03",
        planned: false,
        done: true,
      }),
    ).toBe("done");
  });

  it("toggles planning facts without changing done state", () => {
    expect(getNextPlanningCellFacts({ currentCell: null })).toEqual({
      planned: true,
      done: false,
    });
    expect(
      getNextPlanningCellFacts({
        currentCell: { planned: true, done: false },
      }),
    ).toBeNull();
    expect(
      getNextPlanningCellFacts({
        currentCell: { planned: false, done: true },
      }),
    ).toEqual({
      planned: false,
      done: true,
    });
  });

  it("sets explicit desired planning facts without relying on blind toggles", () => {
    expect(
      getDesiredPlanningCellFacts({
        currentCell: null,
        desiredPlanned: true,
      }),
    ).toEqual({ planned: true, done: false });
    expect(
      getDesiredPlanningCellFacts({
        currentCell: { planned: true, done: false },
        desiredPlanned: false,
      }),
    ).toBeNull();
    expect(
      getDesiredPlanningCellFacts({
        currentCell: { planned: false, done: true },
        desiredPlanned: true,
      }),
    ).toEqual({ planned: false, done: true });
  });

  it("allows direct planning toggles for draft days", () => {
    expect(
      canTogglePlanningCell({
        weekStatus: "draft",
        date: "2026-06-09",
        today: "2026-06-04",
        planned: false,
        done: false,
      }),
    ).toBe(true);
    expect(
      canTogglePlanningCell({
        weekStatus: "draft",
        date: "2026-06-09",
        today: "2026-06-04",
        planned: true,
        done: false,
      }),
    ).toBe(true);
  });

  it("allows active-week planning toggles only for today and future days", () => {
    expect(
      canTogglePlanningCell({
        weekStatus: "active",
        date: "2026-06-04",
        today: "2026-06-04",
        planned: false,
        done: false,
      }),
    ).toBe(true);
    expect(
      canTogglePlanningCell({
        weekStatus: "active",
        date: "2026-06-07",
        today: "2026-06-04",
        planned: true,
        done: false,
      }),
    ).toBe(true);
    expect(
      canTogglePlanningCell({
        weekStatus: "active",
        date: "2026-06-03",
        today: "2026-06-04",
        planned: false,
        done: false,
      }),
    ).toBe(false);
  });

  it("keeps done and missed cells display-only in This Week", () => {
    expect(
      canTogglePlanningCell({
        weekStatus: "active",
        date: "2026-06-04",
        today: "2026-06-04",
        planned: false,
        done: true,
      }),
    ).toBe(false);
    expect(
      canTogglePlanningCell({
        weekStatus: "active",
        date: "2026-06-03",
        today: "2026-06-04",
        planned: true,
        done: false,
        state: "missed",
      }),
    ).toBe(false);
  });

  it("blocks planning mutations for closed weeks", () => {
    expect(
      canTogglePlanningCell({
        weekStatus: "closed",
        date: "2026-06-03",
        today: "2026-06-04",
        planned: true,
        done: false,
      }),
    ).toBe(false);
  });
});

describe("week action guardrails", () => {
  it("runs mutations behind user and allowed-email checks without service-role keys", () => {
    expect(weekActions).toContain("supabase.auth.getUser()");
    expect(weekActions).toContain("checkAllowedUser(user.email)");
    expect(weekActions).toContain("setWeekCellPlanned");
    expect(weekActions).not.toContain("mark_done");
    expect(weekActions).not.toContain("undo_done");
    expect(weekActions).not.toContain("SERVICE_ROLE");
    expect(weekActions).not.toContain("service_role");
  });

  it("uses an optimistic client grid instead of per-cell form navigation", () => {
    expect(weekPage).toContain("OptimisticThisWeekGrid");
    expect(weekPage).not.toContain("toggleWeekPlanningCellAction");
    expect(optimisticGrid).toContain("applyOptimisticPlanningCell");
    expect(optimisticGrid).toContain("setWeekPlanningCellAction");
    expect(optimisticGrid).toContain("disabled={isPending}");
    expect(optimisticGrid).toContain("Couldn’t save that change. Try again.");
    expect(optimisticGrid).not.toContain("<form");
    expect(optimisticGrid).not.toContain("redirect(");
    expect(weekActions).not.toContain(
      'revalidatePath("/week");\n  return { status: "updated"',
    );
  });

  it("persists explicit desired planned state from the optimistic grid", () => {
    expect(optimisticGrid).toContain("planned = getOptimisticPlannedValue(cell)");
    expect(optimisticGrid).toContain("planned,");
    expect(weekActions).toContain("planned: boolean");
    expect(weekActions).toContain("setWeekPlanningCellAction");
    expect(weekActions).not.toContain("toggle whatever");
  });
});

function activity(overrides: Partial<PersistedWeekActivity> = {}): PersistedWeekActivity {
  return {
    id: "activity",
    activityTemplateId: null,
    categoryId: null,
    categoryName: "Category",
    categorySortOrder: 10,
    activityName: "Activity",
    targetCount: 1,
    sortOrder: 10,
    cells: [],
    ...overrides,
  };
}
