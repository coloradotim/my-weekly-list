import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildThisWeekViewModel,
  buildMissingWeekActivitySnapshotRows,
  buildWeekActivitySnapshotRows,
  buildWeekCreationPlan,
  canMutateCurrentWeekDayFacts,
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
const weekPageClient = readFileSync(
  join(process.cwd(), "components/week-page-client.tsx"),
  "utf8",
);
const weekListEditor = readFileSync(
  join(process.cwd(), "components/week-list-editor.tsx"),
  "utf8",
);
const thisWeekGrid = readFileSync(
  join(process.cwd(), "components/this-week-grid.tsx"),
  "utf8",
);
const weekModel = readFileSync(join(process.cwd(), "lib/week/current.ts"), "utf8");

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
            {
              id: "read-cell",
              cellDate: "2026-06-03",
              planned: false,
              done: true,
              skipped: false,
            },
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
            {
              id: "walk-cell",
              cellDate: "2026-06-02",
              planned: true,
              done: false,
              skipped: false,
            },
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
      skipped: false,
    });
    expect(
      getNextPlanningCellFacts({
        currentCell: { planned: true, done: false, skipped: false },
      }),
    ).toBeNull();
    expect(
      getNextPlanningCellFacts({
        currentCell: { planned: false, done: true, skipped: false },
      }),
    ).toEqual({
      planned: false,
      done: true,
      skipped: false,
    });
  });

  it("sets explicit desired planning facts without relying on blind toggles", () => {
    expect(
      getDesiredPlanningCellFacts({
        currentCell: null,
        desiredPlanned: true,
      }),
    ).toEqual({ planned: true, done: false, skipped: false });
    expect(
      getDesiredPlanningCellFacts({
        currentCell: { planned: true, done: false, skipped: false },
        desiredPlanned: false,
      }),
    ).toBeNull();
    expect(
      getDesiredPlanningCellFacts({
        currentCell: { planned: false, done: true, skipped: false },
        desiredPlanned: true,
      }),
    ).toEqual({ planned: false, done: true, skipped: false });
  });

  it("keeps skipped cells display-only in This Week", () => {
    expect(
      getCellVisualState({
        weekStatus: "active",
        date: "2026-06-04",
        today: "2026-06-04",
        planned: true,
        done: false,
        skipped: true,
      }),
    ).toBe("missed");
    expect(
      canTogglePlanningCell({
        weekStatus: "active",
        date: "2026-06-04",
        today: "2026-06-04",
        planned: true,
        done: false,
        skipped: true,
      }),
    ).toBe(false);
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
  it("allows Today to write current-week day facts without requiring literal active status", () => {
    expect(
      canMutateCurrentWeekDayFacts({
        week: weekRecord({ status: "draft", weekStartDate: "2026-06-01" }),
        today: "2026-06-05",
      }),
    ).toBe(true);
    expect(
      canMutateCurrentWeekDayFacts({
        week: weekRecord({ status: "needs_review", weekStartDate: "2026-06-01" }),
        today: "2026-06-05",
      }),
    ).toBe(true);
    expect(
      canMutateCurrentWeekDayFacts({
        week: weekRecord({ status: "closed", weekStartDate: "2026-06-01" }),
        today: "2026-06-05",
      }),
    ).toBe(false);
    expect(
      canMutateCurrentWeekDayFacts({
        week: weekRecord({ status: "active", weekStartDate: "2026-05-25" }),
        today: "2026-06-05",
      }),
    ).toBe(false);
  });

  it("runs mutations behind user and allowed-email checks without service-role keys", () => {
    expect(weekActions).toContain("supabase.auth.getUser()");
    expect(weekActions).toContain("checkAllowedUser(user.email)");
    expect(weekActions).toContain("setWeekCellPlanned");
    expect(weekActions).toContain("updateWeekActivityListItemAction");
    expect(weekActions).toContain("addWeekActivityListItemAction");
    expect(weekActions).toContain("removeWeekActivityFromFutureAction");
    expect(weekActions).toContain("reorderWeekCategoriesAction");
    expect(weekActions).toContain("reorderWeekActivitiesAction");
    expect(weekActions).not.toContain("mark_done");
    expect(weekActions).not.toContain("undo_done");
    expect(weekActions).not.toContain("SERVICE_ROLE");
    expect(weekActions).not.toContain("service_role");
  });

  it("uses an optimistic client grid instead of per-cell form navigation", () => {
    expect(weekPage).toContain("WeekPageClient");
    expect(weekPageClient).toContain("OptimisticThisWeekGrid");
    expect(weekPage).not.toContain("toggleWeekPlanningCellAction");
    expect(optimisticGrid).toContain("applyOptimisticWeekCellFacts");
    expect(optimisticGrid).toContain("setWeekCellFactsAction");
    expect(optimisticGrid).toContain("disabled={isPending}");
    expect(optimisticGrid).toContain("Couldn’t save that change. Try again.");
    expect(optimisticGrid).not.toContain("<form");
    expect(optimisticGrid).not.toContain("redirect(");
    expect(weekActions).not.toContain(
      'revalidatePath("/week");\n  return { status: "updated"',
    );
  });

  it("persists explicit desired planned state from the optimistic grid", () => {
    expect(optimisticGrid).toContain("nextFacts = getOptimisticWeekCellFacts(cell)");
    expect(optimisticGrid).toContain("...nextFacts");
    expect(weekActions).toContain("planned: boolean");
    expect(weekActions).toContain("setWeekCellFactsAction");
    expect(weekActions).not.toContain("toggle whatever");
  });

  it("renders the real Week list editor on the production Week page", () => {
    expect(weekPageClient).toContain("WeekListEditor");
    expect(weekListEditor).toContain("Edit this week’s list");
    expect(weekListEditor).toContain("Edit next week’s list");
    expect(weekListEditor).toContain("+ Add");
    expect(weekListEditor).toContain("+ Add category");
    expect(weekListEditor).toContain("initialCategoryName={category.name}");
    expect(weekListEditor).toContain("addWeekActivityListItemClientAction");
    expect(weekListEditor).toContain("Delete");
    expect(weekListEditor).toContain("min-h-9 min-w-9");
    expect(weekListEditor).not.toContain(
      "<form action={removeWeekActivityFromFutureAction}",
    );
    expect(weekListEditor).not.toContain("Remove from future weeks");
    expect(weekListEditor).not.toContain("Drag to reorder");
    expect(weekListEditor).toContain("updateWeekActivityListItemAction");
    expect(weekListEditor).toContain("updateWeekActivityListItemClientAction");
    expect(weekListEditor).toContain("addWeekActivityListItemAction");
    expect(weekListEditor).toContain("removeWeekActivityFromFutureClientAction");
    expect(weekListEditor).toContain('type="button"');
    expect(weekListEditor).toContain("reorderWeekCategoriesAction");
    expect(weekListEditor).toContain("reorderWeekActivitiesAction");
    expect(weekListEditor).toContain("data-week-list-category");
    expect(weekListEditor).toContain("data-week-list-activity");
  });

  it("keeps Week category collapse and reorder interactions local", () => {
    expect(optimisticGrid).toContain("collapsedCategoryNames");
    expect(thisWeekGrid).toContain("onToggleCategory");
    expect(weekListEditor).toContain("collapsedCategoryNames");
    expect(weekListEditor).toContain("aria-expanded={!isCollapsed}");
    expect(weekListEditor).toContain("event.stopPropagation()");
    expect(weekPageClient).toContain("onCategoriesChange");
    expect(weekListEditor).toContain("fromIndex < targetIndex");
    expect(weekListEditor).toContain("sourceIndex < targetIndex");
    expect(weekListEditor).toContain("} hidden");
    expect(weekListEditor).not.toContain("previousCollapsedCategoryNames");
    expect(weekListEditor).not.toContain(
      "current.filter((name) => name !== currentDragItem.id)",
    );
    expect(weekModel).toContain("itemIndex < targetIndex");
    expect(weekModel).toContain("dragged.activity.sortOrder < target.activity.sortOrder");
    expect(weekModel).not.toContain(
      '.from("categories")\n        .update({ sort_order: sortOrder })',
    );
    expect(weekActions).not.toContain(
      'reorderWeekCategories({\n    supabase,\n    weekId,\n    categoryName,\n    targetCategoryName,\n  });\n\n  revalidatePath("/week");',
    );
    expect(weekActions).not.toContain(
      'reorderWeekActivities({\n    supabase,\n    weekActivityId,\n    targetWeekActivityId,\n  });\n\n  revalidatePath("/week");',
    );
  });

  it("keeps categories visually merged even when a row has stale category order", () => {
    const view = buildThisWeekViewModel({
      week: activeWeek,
      today: "2026-06-03",
      activities: [
        activity({
          id: "walk",
          activityName: "Walk",
          categoryName: "Physical Health",
          categorySortOrder: 10,
          sortOrder: 10,
        }),
        activity({
          id: "run",
          activityName: "Walk or Run",
          categoryName: "Physical Health",
          categorySortOrder: 40,
          sortOrder: 20,
        }),
      ],
    });

    expect(view.categories).toHaveLength(1);
    expect(view.categories[0]).toMatchObject({
      name: "Physical Health",
      sortOrder: 10,
    });
    expect(
      view.categories[0]?.activities.map((activity) => activity.activityName),
    ).toEqual(["Walk", "Walk or Run"]);
  });

  it("uses current week category order during list edits and cleans empty categories", () => {
    expect(weekModel).toContain("getWeekCategorySortOrder");
    expect(weekModel).toContain("fallbackSortOrder: category.category.sortOrder");
    expect(weekModel).toContain("deactivateCategoryIfEmpty");
    expect(weekModel).toContain('.from("categories")');
    expect(weekModel).toContain(".update({ is_active: false })");
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

function weekRecord(overrides: Partial<WeekRecord> = {}): WeekRecord {
  return {
    id: "week",
    weekStartDate: "2026-06-01",
    weekEndDate: "2026-06-07",
    status: "active",
    ...overrides,
  };
}
