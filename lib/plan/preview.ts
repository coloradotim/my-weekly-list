import { addDays, type DateOnly } from "@/lib/week/date";

export const planPreviewDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type PlanPreviewScenario = "sunday" | "monday" | "return";

export type PlanPreviewCell = {
  date: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
};

export type PlanPreviewActivity = {
  id: string;
  templateId: string;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  isRemovedFromFuture: boolean;
  cells: PlanPreviewCell[];
};

export type PlanPreviewWeek = {
  id: string;
  status: "active" | "draft" | "past";
  weekStartDate: DateOnly;
  weekEndDate: DateOnly;
  label: string;
  activities: PlanPreviewActivity[];
};

export type PlanPreviewState = {
  scenario: PlanPreviewScenario;
  today: DateOnly;
  currentWeek: PlanPreviewWeek | null;
  sourceWeek: PlanPreviewWeek;
  draftWeek: PlanPreviewWeek | null;
  lateCurrentWeek: PlanPreviewWeek | null;
  skippedWeekLabels: string[];
};

export type PlanPreviewCopySummary = {
  copiedActivities: number;
  copiedPlannedCells: number;
  copiedDoneCells: number;
  copiedSkippedCells: number;
};

export type PlanPreviewAction =
  | { type: "create-draft" }
  | { type: "open-existing-draft" }
  | { type: "toggle-current-plan"; activityId: string; date: DateOnly }
  | {
      type: "edit-current-activity";
      activityId: string;
      activityName: string;
      categoryName: string;
      targetCount: number;
    }
  | { type: "remove-current-activity"; activityId: string }
  | { type: "restore-current-activity"; activityId: string }
  | {
      type: "add-current-activity";
      activityName?: string;
      categoryName?: string;
      targetCount?: number;
    }
  | {
      type: "reorder-current-category";
      categoryName: string;
      targetCategoryName: string;
    }
  | {
      type: "reorder-current-activity";
      activityId: string;
      targetActivityId: string;
    }
  | { type: "toggle-draft-plan"; activityId: string; date: DateOnly }
  | { type: "change-draft-target"; activityId: string; delta: number }
  | {
      type: "edit-draft-activity";
      activityId: string;
      activityName: string;
      categoryName: string;
      targetCount: number;
    }
  | { type: "remove-draft-activity"; activityId: string }
  | { type: "restore-draft-activity"; activityId: string }
  | {
      type: "add-draft-activity";
      activityName?: string;
      categoryName?: string;
      targetCount?: number;
    }
  | {
      type: "reorder-draft-category";
      categoryName: string;
      targetCategoryName: string;
    }
  | {
      type: "reorder-draft-activity";
      activityId: string;
      targetActivityId: string;
    }
  | { type: "start-late-current-week" }
  | { type: "start-gap-current-week" };

export function getInitialPlanPreviewState(
  scenario: PlanPreviewScenario = "sunday",
): PlanPreviewState {
  if (scenario === "return") {
    const sourceWeek = buildSourceWeek({
      id: "return-source-week",
      weekStartDate: "2026-06-01",
      label: "Most recent real week",
    });

    return {
      scenario,
      today: "2026-06-09",
      currentWeek: copyWeekPlanningIntent({
        sourceWeek,
        targetWeekStartDate: "2026-06-08",
        targetStatus: "active",
        targetLabel: "This week",
      }),
      sourceWeek,
      draftWeek: null,
      lateCurrentWeek: null,
      skippedWeekLabels: [],
    };
  }

  if (scenario === "monday") {
    const sourceWeek = buildSourceWeek({
      id: "monday-source-week",
      weekStartDate: "2026-06-01",
      label: "Most recent real week",
    });

    return {
      scenario,
      today: "2026-06-08",
      currentWeek: {
        ...copyWeekPlanningIntent({
          sourceWeek,
          targetWeekStartDate: "2026-06-08",
          targetStatus: "active",
          targetLabel: "Current week",
        }),
        id: "active-2026-06-08",
      },
      sourceWeek,
      draftWeek: null,
      lateCurrentWeek: null,
      skippedWeekLabels: [],
    };
  }

  return {
    scenario,
    today: "2026-06-07",
    currentWeek: buildSourceWeek({
      id: "current-active-week",
      weekStartDate: "2026-06-01",
      label: "Current active week",
    }),
    sourceWeek: buildSourceWeek({
      id: "current-active-week",
      weekStartDate: "2026-06-01",
      label: "Current active week",
    }),
    draftWeek: null,
    lateCurrentWeek: null,
    skippedWeekLabels: [],
  };
}

export function applyPlanPreviewAction(
  state: PlanPreviewState,
  action: PlanPreviewAction,
): PlanPreviewState {
  if (action.type === "create-draft" || action.type === "open-existing-draft") {
    return {
      ...state,
      draftWeek: state.draftWeek ?? createDraftFromSourceWeek(state),
    };
  }

  if (action.type === "start-late-current-week") {
    return {
      ...state,
      lateCurrentWeek:
        state.lateCurrentWeek ??
        copyWeekPlanningIntent({
          sourceWeek: state.sourceWeek,
          targetWeekStartDate: "2026-06-01",
          targetStatus: "active",
          targetLabel: "Current week",
        }),
    };
  }

  if (action.type === "start-gap-current-week") {
    return {
      ...state,
      lateCurrentWeek:
        state.lateCurrentWeek ??
        copyWeekPlanningIntent({
          sourceWeek: state.sourceWeek,
          targetWeekStartDate: "2026-06-01",
          targetStatus: "active",
          targetLabel: "Current week",
        }),
    };
  }

  if (action.type === "toggle-current-plan") {
    return {
      ...state,
      currentWeek: state.currentWeek
        ? toggleActiveWeekPlan(
            state.currentWeek,
            action.activityId,
            action.date,
            state.today,
          )
        : null,
      lateCurrentWeek: state.lateCurrentWeek
        ? toggleActiveWeekPlan(
            state.lateCurrentWeek,
            action.activityId,
            action.date,
            state.today,
          )
        : null,
    };
  }

  if (
    action.type === "edit-current-activity" ||
    action.type === "remove-current-activity" ||
    action.type === "restore-current-activity" ||
    action.type === "add-current-activity" ||
    action.type === "reorder-current-category" ||
    action.type === "reorder-current-activity"
  ) {
    return updateCurrentWeeks(state, (week) => applyListActionToWeek(week, action));
  }

  if (!state.draftWeek) {
    return state;
  }

  if (action.type === "toggle-draft-plan") {
    return {
      ...state,
      draftWeek: {
        ...state.draftWeek,
        activities: state.draftWeek.activities.map((activity) =>
          activity.id === action.activityId
            ? toggleDraftPlan(activity, action.date)
            : activity,
        ),
      },
    };
  }

  if (action.type === "change-draft-target") {
    return {
      ...state,
      draftWeek: {
        ...state.draftWeek,
        activities: state.draftWeek.activities.map((activity) =>
          activity.id === action.activityId
            ? {
                ...activity,
                targetCount: Math.max(1, activity.targetCount + action.delta),
              }
            : activity,
        ),
      },
    };
  }

  if (action.type === "edit-draft-activity") {
    return {
      ...state,
      draftWeek: applyListActionToWeek(state.draftWeek, action),
    };
  }

  if (action.type === "remove-draft-activity") {
    return {
      ...state,
      draftWeek: applyListActionToWeek(state.draftWeek, action),
    };
  }

  if (action.type === "restore-draft-activity") {
    return {
      ...state,
      draftWeek: applyListActionToWeek(state.draftWeek, action),
    };
  }

  if (action.type === "add-draft-activity") {
    return {
      ...state,
      draftWeek: applyListActionToWeek(state.draftWeek, action),
    };
  }

  if (action.type === "reorder-draft-category") {
    return {
      ...state,
      draftWeek: applyListActionToWeek(state.draftWeek, action),
    };
  }

  if (action.type === "reorder-draft-activity") {
    return {
      ...state,
      draftWeek: applyListActionToWeek(state.draftWeek, action),
    };
  }

  return state;
}

function createDraftFromSourceWeek(state: PlanPreviewState) {
  return copyWeekPlanningIntent({
    sourceWeek: state.sourceWeek,
    targetWeekStartDate: "2026-06-08",
    targetStatus: "draft",
    targetLabel: "Next week Draft",
  });
}

export function getDraftCategoryOptions(week: PlanPreviewWeek) {
  const categoryMap = new Map<string, number>();

  week.activities.forEach((activity) => {
    categoryMap.set(activity.categoryName, activity.categorySortOrder);
  });

  return Array.from(categoryMap.entries())
    .map(([name, sortOrder]) => ({ name, sortOrder }))
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
}

export function copyWeekPlanningIntent({
  sourceWeek,
  targetWeekStartDate,
  targetStatus,
  targetLabel,
}: {
  sourceWeek: PlanPreviewWeek;
  targetWeekStartDate: DateOnly;
  targetStatus: "draft" | "active";
  targetLabel: string;
}): PlanPreviewWeek {
  const targetDates = buildWeekDates(targetWeekStartDate);

  return {
    id: `${targetStatus}-${targetWeekStartDate}`,
    status: targetStatus,
    weekStartDate: targetWeekStartDate,
    weekEndDate: addDays(targetWeekStartDate, 6),
    label: targetLabel,
    activities: sourceWeek.activities.map((activity) => ({
      id: `${targetStatus}-${activity.templateId}`,
      templateId: activity.templateId,
      categoryName: activity.categoryName,
      categorySortOrder: activity.categorySortOrder,
      activityName: activity.activityName,
      targetCount: activity.targetCount,
      sortOrder: activity.sortOrder,
      isRemovedFromFuture: false,
      cells: targetDates.map((targetDate) => ({
        date: targetDate,
        planned: false,
        done: false,
        skipped: false,
      })),
    })),
  };
}

export function summarizeCopy(week: PlanPreviewWeek | null): PlanPreviewCopySummary {
  const cells = week?.activities.flatMap((activity) => activity.cells) ?? [];

  return {
    copiedActivities: week?.activities.length ?? 0,
    copiedPlannedCells: cells.filter((cell) => cell.planned).length,
    copiedDoneCells: cells.filter((cell) => cell.done).length,
    copiedSkippedCells: cells.filter((cell) => cell.skipped).length,
  };
}

export function activeDraftActivities(week: PlanPreviewWeek) {
  return week.activities.filter((activity) => !activity.isRemovedFromFuture);
}

export function removedDraftActivities(week: PlanPreviewWeek) {
  return week.activities.filter((activity) => activity.isRemovedFromFuture);
}

function toggleDraftPlan(activity: PlanPreviewActivity, date: DateOnly) {
  return {
    ...activity,
    cells: activity.cells.map((cell) =>
      cell.date === date
        ? { ...cell, planned: !cell.planned, done: false, skipped: false }
        : cell,
    ),
  };
}

function toggleActiveWeekPlan(
  week: PlanPreviewWeek,
  activityId: string,
  date: DateOnly,
  today: DateOnly,
) {
  if (week.status !== "active" || date < today || date > week.weekEndDate) {
    return week;
  }

  return {
    ...week,
    activities: week.activities.map((activity) =>
      activity.id === activityId ? toggleDraftPlan(activity, date) : activity,
    ),
  };
}

function updateCurrentWeeks(
  state: PlanPreviewState,
  updateWeek: (week: PlanPreviewWeek) => PlanPreviewWeek,
): PlanPreviewState {
  return {
    ...state,
    currentWeek: state.currentWeek ? updateWeek(state.currentWeek) : null,
    lateCurrentWeek: state.lateCurrentWeek ? updateWeek(state.lateCurrentWeek) : null,
  };
}

function applyListActionToWeek(
  week: PlanPreviewWeek,
  action: PlanPreviewAction,
): PlanPreviewWeek {
  if (action.type === "edit-current-activity" || action.type === "edit-draft-activity") {
    const categoryName = action.categoryName.trim();
    const activityName = action.activityName.trim();

    if (!activityName || !categoryName) {
      return week;
    }

    const categorySortOrder = getCategorySortOrder(week.activities, categoryName);

    return {
      ...week,
      activities: week.activities.map((activity) =>
        activity.id === action.activityId
          ? {
              ...activity,
              activityName,
              categoryName,
              categorySortOrder,
              targetCount: Math.max(1, Math.round(action.targetCount)),
            }
          : activity,
      ),
    };
  }

  if (
    action.type === "remove-current-activity" ||
    action.type === "remove-draft-activity"
  ) {
    return {
      ...week,
      activities: week.activities.map((activity) =>
        activity.id === action.activityId
          ? { ...activity, isRemovedFromFuture: true }
          : activity,
      ),
    };
  }

  if (
    action.type === "restore-current-activity" ||
    action.type === "restore-draft-activity"
  ) {
    return {
      ...week,
      activities: week.activities.map((activity) =>
        activity.id === action.activityId
          ? { ...activity, isRemovedFromFuture: false }
          : activity,
      ),
    };
  }

  if (action.type === "add-current-activity" || action.type === "add-draft-activity") {
    const activityName = action.activityName?.trim() || "Pickleball";
    const categoryName = action.categoryName?.trim() || "Hobbies";
    const targetCount = Math.max(1, Math.round(action.targetCount ?? 1));
    const templateId = `template-${slugify(activityName)}`;
    const id = `${week.status}-${templateId}`;
    const alreadyAdded = week.activities.some((activity) => activity.id === id);

    if (alreadyAdded) {
      return week;
    }

    const categorySortOrder = getCategorySortOrder(week.activities, categoryName);
    const categoryActivities = week.activities.filter(
      (activity) => activity.categorySortOrder === categorySortOrder,
    );
    const sortOrder =
      Math.max(0, ...categoryActivities.map((activity) => activity.sortOrder)) + 10;

    return {
      ...week,
      activities: [
        ...week.activities,
        {
          id,
          templateId,
          categoryName,
          categorySortOrder,
          activityName,
          targetCount,
          sortOrder,
          isRemovedFromFuture: false,
          cells: buildWeekDates(week.weekStartDate).map((date) => ({
            date,
            planned: false,
            done: false,
            skipped: false,
          })),
        },
      ],
    };
  }

  if (
    action.type === "reorder-current-category" ||
    action.type === "reorder-draft-category"
  ) {
    return {
      ...week,
      activities: reorderCategories({
        activities: week.activities,
        categoryName: action.categoryName,
        targetCategoryName: action.targetCategoryName,
      }),
    };
  }

  if (
    action.type === "reorder-current-activity" ||
    action.type === "reorder-draft-activity"
  ) {
    return {
      ...week,
      activities: reorderActivities({
        activities: week.activities,
        activityId: action.activityId,
        targetActivityId: action.targetActivityId,
      }),
    };
  }

  return week;
}

function buildSourceWeek({
  id,
  weekStartDate,
  label,
}: {
  id: string;
  weekStartDate: DateOnly;
  label: string;
}): PlanPreviewWeek {
  const dates = buildWeekDates(weekStartDate);

  return {
    id,
    status: id === "current-active-week" ? "active" : "past",
    weekStartDate,
    weekEndDate: addDays(weekStartDate, 6),
    label,
    activities: [
      activity({
        id: `${id}-walk`,
        templateId: "template-walk",
        categoryName: "Physical Health",
        categorySortOrder: 10,
        activityName: "Walk",
        targetCount: 4,
        sortOrder: 10,
        cells: dates.map((date, index) => ({
          date,
          planned: [0, 2, 4, 6].includes(index),
          done: [0, 4].includes(index),
          skipped: index === 2,
        })),
      }),
      activity({
        id: `${id}-read`,
        templateId: "template-read",
        categoryName: "Mental Health",
        categorySortOrder: 20,
        activityName: "Read",
        targetCount: 5,
        sortOrder: 70,
        cells: dates.map((date, index) => ({
          date,
          planned: [0, 1, 2, 3, 4].includes(index),
          done: [0, 1, 3].includes(index),
          skipped: false,
        })),
      }),
      activity({
        id: `${id}-meditation`,
        templateId: "template-meditation",
        categoryName: "Mental Health",
        categorySortOrder: 20,
        activityName: "Meditation",
        targetCount: 3,
        sortOrder: 50,
        cells: dates.map((date, index) => ({
          date,
          planned: [1, 3, 5].includes(index),
          done: index === 3,
          skipped: index === 5,
        })),
      }),
      activity({
        id: `${id}-kid-time`,
        templateId: "template-kid-time",
        categoryName: "Family and Home",
        categorySortOrder: 30,
        activityName: "Quality kid time",
        targetCount: 1,
        sortOrder: 10,
        cells: dates.map((date, index) => ({
          date,
          planned: index === 6,
          done: index === 6,
          skipped: false,
        })),
      }),
    ],
  };
}

function activity(
  activity: Omit<PlanPreviewActivity, "isRemovedFromFuture">,
): PlanPreviewActivity {
  return { ...activity, isRemovedFromFuture: false };
}

function buildWeekDates(weekStartDate: DateOnly) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
}

function getCategorySortOrder(activities: PlanPreviewActivity[], categoryName: string) {
  const existing = activities.find(
    (activity) => activity.categoryName.toLowerCase() === categoryName.toLowerCase(),
  );

  if (existing) {
    return existing.categorySortOrder;
  }

  return Math.max(0, ...activities.map((activity) => activity.categorySortOrder)) + 10;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function reorderCategories({
  activities,
  categoryName,
  targetCategoryName,
}: {
  activities: PlanPreviewActivity[];
  categoryName: string;
  targetCategoryName: string;
}) {
  if (categoryName === targetCategoryName) {
    return activities;
  }

  const categories = getDraftCategoryOptions({ activities } as PlanPreviewWeek).map(
    (category) => category.name,
  );
  const fromIndex = categories.indexOf(categoryName);
  const toIndex = categories.indexOf(targetCategoryName);

  if (fromIndex < 0 || toIndex < 0) {
    return activities;
  }

  const nextCategories = [...categories];
  const [moved] = nextCategories.splice(fromIndex, 1);
  nextCategories.splice(toIndex, 0, moved);
  const sortOrderByCategory = new Map(
    nextCategories.map((category, index) => [category, (index + 1) * 10]),
  );

  return activities.map((activity) => ({
    ...activity,
    categorySortOrder:
      sortOrderByCategory.get(activity.categoryName) ?? activity.categorySortOrder,
  }));
}

function reorderActivities({
  activities,
  activityId,
  targetActivityId,
}: {
  activities: PlanPreviewActivity[];
  activityId: string;
  targetActivityId: string;
}) {
  if (activityId === targetActivityId) {
    return activities;
  }

  const movedActivity = activities.find((activity) => activity.id === activityId);
  const targetActivity = activities.find((activity) => activity.id === targetActivityId);

  if (
    !movedActivity ||
    !targetActivity ||
    movedActivity.categoryName !== targetActivity.categoryName
  ) {
    return activities;
  }

  const categoryActivities = activities
    .filter((activity) => activity.categoryName === movedActivity.categoryName)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const fromIndex = categoryActivities.findIndex(
    (activity) => activity.id === activityId,
  );
  const toIndex = categoryActivities.findIndex(
    (activity) => activity.id === targetActivityId,
  );

  if (fromIndex < 0 || toIndex < 0) {
    return activities;
  }

  const nextCategoryActivities = [...categoryActivities];
  const [moved] = nextCategoryActivities.splice(fromIndex, 1);
  nextCategoryActivities.splice(toIndex, 0, moved);
  const sortOrderByActivity = new Map(
    nextCategoryActivities.map((activity, index) => [activity.id, (index + 1) * 10]),
  );

  return activities.map((activity) => ({
    ...activity,
    sortOrder: sortOrderByActivity.get(activity.id) ?? activity.sortOrder,
  }));
}
