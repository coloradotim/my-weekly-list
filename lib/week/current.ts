import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  compareDateOnly,
  getDateOnlyForTimeZone,
  getWeekEndDate,
  getWeekStartDate,
  parseDateOnly,
  type DateOnly,
} from "@/lib/week/date";
import { isCellMissed, type WeekStatus } from "@/lib/week/lifecycle";

export const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type CellVisualState = "blank" | "planned" | "done" | "missed";

export type ActivityTemplateSnapshot = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
};

export type WeekRecord = {
  id: string;
  weekStartDate: DateOnly;
  weekEndDate: DateOnly;
  status: WeekStatus;
};

export type WeekActivitySnapshotInsert = {
  week_id: string;
  activity_template_id: string;
  category_id: string;
  category_name: string;
  category_sort_order: number;
  activity_name: string;
  target_count: number;
  sort_order: number;
};

export type WeekCreationPlan =
  | {
      status: "needs-setup";
      weekStartDate: DateOnly;
      weekEndDate: DateOnly;
    }
  | {
      status: "ready";
      weekStartDate: DateOnly;
      weekEndDate: DateOnly;
      shouldCreateWeek: boolean;
      snapshotRows: WeekActivitySnapshotInsert[];
    };

export type PersistedDayCell = {
  id: string;
  cellDate: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
};

export type PersistedWeekActivity = {
  id: string;
  activityTemplateId: string | null;
  categoryId: string | null;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  cells: PersistedDayCell[];
};

export type WeekGridCell = {
  date: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
  state: CellVisualState;
  isPlanningEditable: boolean;
  isTodayCorrectionEditable: boolean;
};

export type WeekGridActivity = {
  id: string;
  activityTemplateId: string | null;
  categoryId: string | null;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  doneCount: number;
  sortOrder: number;
  cells: WeekGridCell[];
};

export type WeekGridCategory = {
  name: string;
  sortOrder: number;
  activities: WeekGridActivity[];
};

export type ThisWeekViewModel = {
  week: WeekRecord;
  today: DateOnly;
  dayDates: DateOnly[];
  categories: WeekGridCategory[];
  isEditable: boolean;
};

export type ThisWeekLoadState =
  | { status: "needs-setup" }
  | {
      status: "no-current-week";
      weekStartDate: DateOnly;
      weekEndDate: DateOnly;
      isLateStart: boolean;
    }
  | { status: "ready"; view: ThisWeekViewModel }
  | { status: "error"; message: string };

type WeekQueryRow = {
  id: string;
  week_start_date: string;
  week_end_date: string;
  status: WeekStatus;
  week_activities?: WeekActivityQueryRow[] | null;
};

type WeekActivityQueryRow = {
  id: string;
  activity_template_id: string | null;
  category_id: string | null;
  category_name: string;
  category_sort_order: number;
  activity_name: string;
  target_count: number;
  sort_order: number;
  activity_day_cells?: DayCellQueryRow[] | null;
};

type DayCellQueryRow = {
  id: string;
  cell_date: string;
  planned: boolean;
  done: boolean;
  skipped: boolean;
};

type ActivityTemplateQueryRow = {
  id: string;
  category_id: string;
  name: string;
  default_target_count: number;
  sort_order: number;
  categories:
    | {
        id: string;
        name: string;
        sort_order: number;
      }
    | {
        id: string;
        name: string;
        sort_order: number;
      }[]
    | null;
};

type WeekActivityOwnerRow = {
  id: string;
  week_id: string;
  weeks:
    | {
        status: WeekStatus;
        week_start_date: string;
        week_end_date: string;
      }
    | {
        status: WeekStatus;
        week_start_date: string;
        week_end_date: string;
      }[]
    | null;
};

type WeekActivityEditRow = {
  id: string;
  week_id: string;
  activity_template_id: string | null;
  category_id: string | null;
  category_name: string;
  category_sort_order: number;
  activity_name: string;
  target_count: number;
  sort_order: number;
  activity_day_cells?: { id: string }[] | null;
  weeks:
    | {
        status: WeekStatus;
        week_start_date: string;
        week_end_date: string;
      }
    | {
        status: WeekStatus;
        week_start_date: string;
        week_end_date: string;
      }[]
    | null;
};

type CategoryQueryRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type ActivityTemplateEditRow = {
  id: string;
  category_id: string;
  name: string;
  default_target_count: number;
  sort_order: number;
  is_active: boolean;
};

type EditableWeekActivity = {
  id: string;
  weekId: string;
  activityTemplateId: string | null;
  categoryId: string | null;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  hasCells: boolean;
  week: {
    status: WeekStatus;
    weekStartDate: string;
    weekEndDate: string;
  };
};

export function getTodayDateOnly() {
  return getDateOnlyForTimeZone(new Date(), process.env.APP_TIME_ZONE);
}

export function getWeekDayDates(weekStartDate: DateOnly) {
  const start = getWeekStartDate(weekStartDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function canMutateCurrentWeekDayFacts({
  week,
  today,
}: {
  week: Pick<WeekRecord, "status" | "weekStartDate">;
  today: DateOnly;
}) {
  return (
    week.status !== "closed" &&
    getWeekStartDate(week.weekStartDate) === getWeekStartDate(today)
  );
}

export function getCellVisualState({
  weekExists = true,
  weekStatus,
  date,
  today,
  planned,
  done,
  skipped = false,
}: {
  weekExists?: boolean;
  weekStatus: WeekStatus;
  date: DateOnly;
  today: DateOnly;
  planned: boolean;
  done: boolean;
  skipped?: boolean;
}): CellVisualState {
  if (done) {
    return "done";
  }

  if (skipped) {
    return "missed";
  }

  if (
    isCellMissed({
      weekExists,
      weekStatus,
      cellDate: date,
      today,
      planned,
      done,
    })
  ) {
    return "missed";
  }

  return planned ? "planned" : "blank";
}

export function canTogglePlanningCell({
  weekStatus,
  date,
  today,
  planned,
  done,
  skipped = false,
  state = getCellVisualState({ weekStatus, date, today, planned, done, skipped }),
}: {
  weekStatus: WeekStatus;
  date: DateOnly;
  today: DateOnly;
  planned: boolean;
  done: boolean;
  skipped?: boolean;
  state?: CellVisualState;
}) {
  if (done || skipped || state === "done" || state === "missed") {
    return false;
  }

  if (weekStatus === "draft") {
    return true;
  }

  if (weekStatus !== "active") {
    return false;
  }

  return compareDateOnly(date, today) >= 0;
}

export function canCorrectTodayCellFromWeek({
  week,
  date,
  today,
  done,
  skipped = false,
}: {
  week: Pick<WeekRecord, "status" | "weekStartDate">;
  date: DateOnly;
  today: DateOnly;
  done: boolean;
  skipped?: boolean;
}) {
  return (
    date === today && (done || skipped) && canMutateCurrentWeekDayFacts({ week, today })
  );
}

export function getNextPlanningCellFacts({
  currentCell,
}: {
  currentCell: Pick<PersistedDayCell, "planned" | "done" | "skipped"> | null;
}): { planned: boolean; done: boolean; skipped: boolean } | null {
  const current = currentCell ?? { planned: false, done: false, skipped: false };

  if (current.done || current.skipped) {
    return current;
  }

  return current.planned ? null : { planned: true, done: false, skipped: false };
}

export function getDesiredPlanningCellFacts({
  currentCell,
  desiredPlanned,
}: {
  currentCell: Pick<PersistedDayCell, "planned" | "done" | "skipped"> | null;
  desiredPlanned: boolean;
}): { planned: boolean; done: boolean; skipped: boolean } | null {
  const current = currentCell ?? { planned: false, done: false, skipped: false };

  if (current.done || current.skipped) {
    return current;
  }

  return desiredPlanned ? { planned: true, done: false, skipped: false } : null;
}

export function buildWeekCreationPlan({
  today,
  week,
  templates,
  existingTemplateIds = [],
}: {
  today: DateOnly;
  week: WeekRecord | null;
  templates: ActivityTemplateSnapshot[];
  existingTemplateIds?: string[];
}): WeekCreationPlan {
  const weekStartDate = getWeekStartDate(today);
  const weekEndDate = getWeekEndDate(weekStartDate);

  if (templates.length === 0) {
    return { status: "needs-setup", weekStartDate, weekEndDate };
  }

  const existingTemplateIdSet = new Set(existingTemplateIds);
  const snapshotRows = week
    ? buildWeekActivitySnapshotRows({
        weekId: week.id,
        templates: templates.filter(
          (template) => !existingTemplateIdSet.has(template.id),
        ),
      })
    : [];

  return {
    status: "ready",
    weekStartDate,
    weekEndDate,
    shouldCreateWeek: week === null,
    snapshotRows,
  };
}

export function buildWeekActivitySnapshotRows({
  weekId,
  templates,
}: {
  weekId: string;
  templates: ActivityTemplateSnapshot[];
}): WeekActivitySnapshotInsert[] {
  return templates.map((template) => ({
    week_id: weekId,
    activity_template_id: template.id,
    category_id: template.categoryId,
    category_name: template.categoryName,
    category_sort_order: template.categorySortOrder,
    activity_name: template.activityName,
    target_count: template.targetCount,
    sort_order: template.sortOrder,
  }));
}

export function buildMissingWeekActivitySnapshotRows({
  week,
  templates,
  activities,
}: {
  week: WeekRecord;
  templates: ActivityTemplateSnapshot[];
  activities: PersistedWeekActivity[];
}): WeekActivitySnapshotInsert[] {
  const existingTemplateIds = new Set(
    activities
      .map((activity) => activity.activityTemplateId)
      .filter((id): id is string => Boolean(id)),
  );

  return buildWeekActivitySnapshotRows({
    weekId: week.id,
    templates: templates.filter((template) => !existingTemplateIds.has(template.id)),
  });
}

export function buildThisWeekViewModel({
  week,
  activities,
  today,
}: {
  week: WeekRecord;
  activities: PersistedWeekActivity[];
  today: DateOnly;
}): ThisWeekViewModel {
  const dayDates = getWeekDayDates(week.weekStartDate);
  const categoryMap = new Map<string, WeekGridCategory>();

  activities.toSorted(compareWeekActivities).forEach((activity) => {
    const categoryKey = normalizeCategoryKey(activity.categoryName);
    const category =
      categoryMap.get(categoryKey) ??
      ({
        name: activity.categoryName,
        sortOrder: activity.categorySortOrder,
        activities: [],
      } satisfies WeekGridCategory);
    category.sortOrder = Math.min(category.sortOrder, activity.categorySortOrder);
    const cellMap = new Map(activity.cells.map((cell) => [cell.cellDate, cell]));
    const cells = dayDates.map((date) => {
      const cell = cellMap.get(date);
      const planned = cell?.planned ?? false;
      const done = cell?.done ?? false;
      const skipped = cell?.skipped ?? false;
      const state = getCellVisualState({
        weekStatus: week.status,
        date,
        today,
        planned,
        done,
        skipped,
      });

      return {
        date,
        planned,
        done,
        skipped,
        state,
        isPlanningEditable: canTogglePlanningCell({
          weekStatus: week.status,
          date,
          today,
          planned,
          done,
          skipped,
          state,
        }),
        isTodayCorrectionEditable: canCorrectTodayCellFromWeek({
          week,
          date,
          today,
          done,
          skipped,
        }),
      };
    });

    category.activities.push({
      id: activity.id,
      activityTemplateId: activity.activityTemplateId,
      categoryId: activity.categoryId,
      categoryName: activity.categoryName,
      categorySortOrder: activity.categorySortOrder,
      activityName: activity.activityName,
      targetCount: activity.targetCount,
      doneCount: cells.filter((cell) => cell.done).length,
      sortOrder: activity.sortOrder,
      cells,
    });
    categoryMap.set(categoryKey, category);
  });

  return {
    week,
    today,
    dayDates,
    categories: Array.from(categoryMap.values()).sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    ),
    isEditable: Array.from(categoryMap.values()).some((category) =>
      category.activities.some((activity) =>
        activity.cells.some((cell) => cell.isPlanningEditable),
      ),
    ),
  };
}

export async function loadThisWeek(
  supabase: SupabaseClient,
  today = getTodayDateOnly(),
): Promise<ThisWeekLoadState> {
  const templates = await getActiveTemplateSnapshots(supabase);

  if (templates.status === "error") {
    return { status: "error", message: templates.message };
  }

  if (templates.templates.length === 0) {
    return { status: "needs-setup" };
  }

  const weekStartDate = getWeekStartDate(today);
  const week = await getWeekByStartDate(supabase, weekStartDate);

  if (week.status === "error") {
    return { status: "error", message: week.message };
  }

  if (!week.week) {
    return {
      status: "no-current-week",
      weekStartDate,
      weekEndDate: getWeekEndDate(weekStartDate),
      isLateStart: compareDateOnly(today, weekStartDate) > 0,
    };
  }

  const repaired = await repairCurrentWeekSnapshots({
    supabase,
    week: week.week,
    activities: week.activities,
    templates: templates.templates,
  });

  if (repaired.status === "error") {
    return { status: "error", message: repaired.message };
  }

  return {
    status: "ready",
    view: buildThisWeekViewModel({
      week: repaired.week,
      activities: repaired.activities,
      today,
    }),
  };
}

export async function createCurrentWeekFromTemplates({
  supabase,
  userId,
  today = getTodayDateOnly(),
}: {
  supabase: SupabaseClient;
  userId: string;
  today?: DateOnly;
}) {
  const templatesResult = await getActiveTemplateSnapshots(supabase);

  if (templatesResult.status === "error") {
    return { status: "error" as const, message: templatesResult.message };
  }

  if (templatesResult.templates.length === 0) {
    return { status: "needs-setup" as const };
  }

  const weekStartDate = getWeekStartDate(today);
  let weekResult = await getWeekByStartDate(supabase, weekStartDate);

  if (weekResult.status === "error") {
    return { status: "error" as const, message: weekResult.message };
  }

  if (!weekResult.week) {
    const createdWeek = await insertActiveWeek(supabase, {
      userId,
      weekStartDate,
    });

    if (createdWeek.status === "error") {
      return { status: "error" as const, message: createdWeek.message };
    }

    weekResult = {
      status: "success",
      week: createdWeek.week,
      activities: [],
    };
  }

  const rows = buildMissingWeekActivitySnapshotRows({
    week: weekResult.week,
    templates: templatesResult.templates,
    activities: weekResult.activities,
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("week_activities").insert(rows);

    if (error) {
      return { status: "error" as const, message: error.message };
    }
  }

  return { status: "created" as const, weekId: weekResult.week.id };
}

export async function createReusableCategoryForOnboarding({
  supabase,
  userId,
  categoryName,
}: {
  supabase: SupabaseClient;
  userId: string;
  categoryName: string;
}) {
  const normalizedCategoryName = categoryName.trim();

  if (!normalizedCategoryName) {
    return { status: "blocked" as const, message: "Category name is required." };
  }

  const category = await getOrCreateCategory({
    supabase,
    userId,
    categoryName: normalizedCategoryName,
  });

  if (category.status !== "success") {
    return category;
  }

  return { status: "updated" as const, category: category.category };
}

export async function createReusableActivityForOnboarding({
  supabase,
  userId,
  activityName,
  categoryName,
  targetCount,
  today = getTodayDateOnly(),
}: {
  supabase: SupabaseClient;
  userId: string;
  activityName: string;
  categoryName: string;
  targetCount: number;
  today?: DateOnly;
}) {
  const input = normalizeListInput({ activityName, categoryName, targetCount });

  if (!input) {
    return {
      status: "blocked" as const,
      message: "Activity name, category, and target are required.",
    };
  }

  const category = await getOrCreateCategory({
    supabase,
    userId,
    categoryName: input.categoryName,
  });

  if (category.status !== "success") {
    return category;
  }

  const template = await getOrCreateActivityTemplate({
    supabase,
    userId,
    categoryId: category.category.id,
    activityName: input.activityName,
    targetCount: input.targetCount,
  });

  if (template.status !== "success") {
    return template;
  }

  const currentWeek = await createCurrentWeekFromTemplates({ supabase, userId, today });

  if (currentWeek.status === "error") {
    return currentWeek;
  }

  return {
    status: "updated" as const,
    category: category.category,
    template: template.template,
  };
}

async function repairCurrentWeekSnapshots({
  supabase,
  week,
  activities,
  templates,
}: {
  supabase: SupabaseClient;
  week: WeekRecord;
  activities: PersistedWeekActivity[];
  templates: ActivityTemplateSnapshot[];
}) {
  const rows = buildMissingWeekActivitySnapshotRows({
    week,
    activities,
    templates,
  });

  if (rows.length === 0) {
    return { status: "success" as const, week, activities };
  }

  const { error } = await supabase.from("week_activities").insert(rows);

  if (error && error.code !== "23505") {
    return { status: "error" as const, message: error.message };
  }

  const refreshedWeek = await getWeekByStartDate(supabase, week.weekStartDate);

  if (refreshedWeek.status === "error") {
    return { status: "error" as const, message: refreshedWeek.message };
  }

  if (!refreshedWeek.week) {
    return {
      status: "error" as const,
      message: "The current week could not be reloaded after repairing snapshots.",
    };
  }

  return {
    status: "success" as const,
    week: refreshedWeek.week,
    activities: refreshedWeek.activities,
  };
}

export async function setWeekCellPlanned({
  supabase,
  weekActivityId,
  cellDate,
  planned: desiredPlanned,
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
  cellDate: DateOnly;
  planned: boolean;
}) {
  parseDateOnly(cellDate);

  const owner = await getWeekActivityOwner(supabase, weekActivityId);

  if (owner.status === "error") {
    return { status: "error" as const, message: owner.message };
  }

  if (!owner.activity) {
    return { status: "error" as const, message: "Activity not found." };
  }

  const week = owner.activity.week;

  if (
    compareDateOnly(cellDate, week.weekStartDate) < 0 ||
    compareDateOnly(cellDate, week.weekEndDate) > 0
  ) {
    return { status: "blocked" as const, message: "That day is outside this week." };
  }

  const existing = await getDayCell(supabase, weekActivityId, cellDate);

  if (existing.status === "error") {
    return { status: "error" as const, message: existing.message };
  }

  const planned = existing.cell?.planned ?? false;
  const done = existing.cell?.done ?? false;
  const skipped = existing.cell?.skipped ?? false;
  const today = getTodayDateOnly();
  const state = getCellVisualState({
    weekStatus: week.status,
    date: cellDate,
    today,
    planned,
    done,
    skipped,
  });

  if (
    !canTogglePlanningCell({
      weekStatus: week.status,
      date: cellDate,
      today,
      planned,
      done,
      skipped,
      state,
    })
  ) {
    return { status: "blocked" as const, message: "That plan is view-only right now." };
  }

  const nextFacts = getDesiredPlanningCellFacts({
    currentCell: existing.cell,
    desiredPlanned,
  });

  if (!nextFacts) {
    if (existing.cell) {
      const { error } = await supabase
        .from("activity_day_cells")
        .delete()
        .eq("id", existing.cell.id);

      if (error) {
        return { status: "error" as const, message: error.message };
      }
    }

    return { status: "updated" as const };
  }

  const { error } = await supabase.from("activity_day_cells").upsert(
    {
      week_activity_id: weekActivityId,
      cell_date: cellDate,
      planned: nextFacts.planned,
      done: nextFacts.done,
      skipped: nextFacts.skipped,
    },
    { onConflict: "week_activity_id,cell_date" },
  );

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return { status: "updated" as const };
}

export async function setWeekCellFacts({
  supabase,
  weekActivityId,
  cellDate,
  facts,
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
  cellDate: DateOnly;
  facts: ActivityDayCellFacts;
}) {
  parseDateOnly(cellDate);

  if (facts.done || facts.skipped) {
    return {
      status: "blocked" as const,
      message: "Week can only clear same-day completion or skip facts.",
    };
  }

  const owner = await getWeekActivityOwner(supabase, weekActivityId);

  if (owner.status === "error") {
    return { status: "error" as const, message: owner.message };
  }

  if (!owner.activity) {
    return { status: "error" as const, message: "Activity not found." };
  }

  const week = owner.activity.week;

  if (
    compareDateOnly(cellDate, week.weekStartDate) < 0 ||
    compareDateOnly(cellDate, week.weekEndDate) > 0
  ) {
    return { status: "blocked" as const, message: "That day is outside this week." };
  }

  const existing = await getDayCell(supabase, weekActivityId, cellDate);

  if (existing.status === "error") {
    return { status: "error" as const, message: existing.message };
  }

  const current = existing.cell ?? {
    planned: false,
    done: false,
    skipped: false,
  };
  const today = getTodayDateOnly();

  if (current.done || current.skipped) {
    if (
      !canCorrectTodayCellFromWeek({
        week,
        date: cellDate,
        today,
        done: current.done,
        skipped: current.skipped,
      })
    ) {
      return { status: "blocked" as const, message: "That day is view-only right now." };
    }

    const intendedPlanned = current.skipped ? true : current.planned;

    if (facts.planned !== intendedPlanned) {
      return {
        status: "blocked" as const,
        message: "Week correction must preserve the original planned fact.",
      };
    }

    return setActivityDayCellFacts({
      supabase,
      weekActivityId,
      cellDate,
      facts,
    });
  }

  return setWeekCellPlanned({
    supabase,
    weekActivityId,
    cellDate,
    planned: facts.planned,
  });
}

export type ActivityDayCellFacts = {
  planned: boolean;
  done: boolean;
  skipped: boolean;
};

export async function setActivityDayCellFacts({
  supabase,
  weekActivityId,
  cellDate,
  facts,
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
  cellDate: DateOnly;
  facts: ActivityDayCellFacts;
}) {
  parseDateOnly(cellDate);

  if (facts.done && facts.skipped) {
    return {
      status: "blocked" as const,
      message: "Done and skipped cannot both be set.",
    };
  }

  if (facts.skipped && !facts.planned) {
    return { status: "blocked" as const, message: "Skipped requires a planned day." };
  }

  const owner = await getWeekActivityOwner(supabase, weekActivityId);

  if (owner.status === "error") {
    return { status: "error" as const, message: owner.message };
  }

  if (!owner.activity) {
    return { status: "error" as const, message: "Activity not found." };
  }

  const week = owner.activity.week;

  if (!canMutateCurrentWeekDayFacts({ week, today: getTodayDateOnly() })) {
    return { status: "blocked" as const, message: "That day is view-only right now." };
  }

  if (
    compareDateOnly(cellDate, week.weekStartDate) < 0 ||
    compareDateOnly(cellDate, week.weekEndDate) > 0
  ) {
    return { status: "blocked" as const, message: "That day is outside this week." };
  }

  if (!facts.planned && !facts.done && !facts.skipped) {
    const existing = await getDayCell(supabase, weekActivityId, cellDate);

    if (existing.status === "error") {
      return { status: "error" as const, message: existing.message };
    }

    if (existing.cell) {
      const { error } = await supabase
        .from("activity_day_cells")
        .delete()
        .eq("id", existing.cell.id);

      if (error) {
        return { status: "error" as const, message: error.message };
      }
    }

    return { status: "updated" as const };
  }

  const { error } = await supabase.from("activity_day_cells").upsert(
    {
      week_activity_id: weekActivityId,
      cell_date: cellDate,
      planned: facts.planned,
      done: facts.done,
      skipped: facts.skipped,
    },
    { onConflict: "week_activity_id,cell_date" },
  );

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return { status: "updated" as const };
}

export async function moveWeekActivityPlanDate({
  supabase,
  weekActivityId,
  fromDate,
  toDate,
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
  fromDate: DateOnly;
  toDate: DateOnly;
}) {
  parseDateOnly(fromDate);
  parseDateOnly(toDate);

  if (compareDateOnly(toDate, fromDate) <= 0) {
    return { status: "blocked" as const, message: "Move destination must be later." };
  }

  const owner = await getWeekActivityOwner(supabase, weekActivityId);

  if (owner.status === "error") {
    return { status: "error" as const, message: owner.message };
  }

  if (!owner.activity) {
    return { status: "error" as const, message: "Activity not found." };
  }

  const week = owner.activity.week;

  if (!canMutateCurrentWeekDayFacts({ week, today: getTodayDateOnly() })) {
    return { status: "blocked" as const, message: "That day is view-only right now." };
  }

  if (
    compareDateOnly(fromDate, week.weekStartDate) < 0 ||
    compareDateOnly(fromDate, week.weekEndDate) > 0 ||
    compareDateOnly(toDate, week.weekStartDate) < 0 ||
    compareDateOnly(toDate, week.weekEndDate) > 0
  ) {
    return { status: "blocked" as const, message: "That day is outside this week." };
  }

  const source = await getDayCell(supabase, weekActivityId, fromDate);

  if (source.status === "error") {
    return { status: "error" as const, message: source.message };
  }

  if (!source.cell?.planned || source.cell.done || source.cell.skipped) {
    return { status: "blocked" as const, message: "That plan cannot be moved." };
  }

  const destination = await getDayCell(supabase, weekActivityId, toDate);

  if (destination.status === "error") {
    return { status: "error" as const, message: destination.message };
  }

  if (destination.cell?.planned || destination.cell?.done) {
    return {
      status: "blocked" as const,
      message: "That day is already planned or done.",
    };
  }

  const clearSource = await setActivityDayCellFacts({
    supabase,
    weekActivityId,
    cellDate: fromDate,
    facts: { planned: false, done: false, skipped: false },
  });

  if (clearSource.status !== "updated") {
    return clearSource;
  }

  const setDestination = await setActivityDayCellFacts({
    supabase,
    weekActivityId,
    cellDate: toDate,
    facts: { planned: true, done: false, skipped: false },
  });

  if (setDestination.status !== "updated") {
    await setActivityDayCellFacts({
      supabase,
      weekActivityId,
      cellDate: fromDate,
      facts: { planned: true, done: false, skipped: false },
    });
  }

  return setDestination;
}

export type AddedWeekActivity = Pick<
  PersistedWeekActivity,
  | "id"
  | "activityTemplateId"
  | "categoryId"
  | "categoryName"
  | "categorySortOrder"
  | "activityName"
  | "targetCount"
  | "sortOrder"
>;

export type WeekListMutationResult =
  | { status: "updated"; activity?: AddedWeekActivity }
  | { status: "removed" }
  | { status: "kept-history" }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string };

export async function renameWeekCategory({
  supabase,
  userId,
  weekId,
  categoryName,
  nextCategoryName,
}: {
  supabase: SupabaseClient;
  userId: string;
  weekId: string;
  categoryName: string;
  nextCategoryName: string;
}): Promise<WeekListMutationResult> {
  const normalizedCategoryName = categoryName.trim();
  const normalizedNextCategoryName = nextCategoryName.trim();

  if (!normalizedCategoryName || !normalizedNextCategoryName) {
    return { status: "blocked", message: "Category name is required." };
  }

  if (
    normalizeCategoryKey(normalizedCategoryName) ===
    normalizeCategoryKey(normalizedNextCategoryName)
  ) {
    return { status: "updated" };
  }

  const week = await getWeekById(supabase, weekId);

  if (week.status !== "success") {
    return week;
  }

  if (!week.week) {
    return { status: "error", message: "Week not found." };
  }

  if (!canEditWeekList(week.week.status)) {
    return { status: "blocked", message: "That week list is view-only." };
  }

  const activities = await getWeekActivitiesForListEdit(supabase, weekId);

  if (activities.status !== "success") {
    return activities;
  }

  const sourceActivities = activities.activities.filter(
    (activity) =>
      normalizeCategoryKey(activity.categoryName) ===
      normalizeCategoryKey(normalizedCategoryName),
  );

  if (sourceActivities.length === 0) {
    return { status: "blocked", message: "Category not found." };
  }

  const weekAlreadyHasName = activities.activities.some(
    (activity) =>
      normalizeCategoryKey(activity.categoryName) ===
      normalizeCategoryKey(normalizedNextCategoryName),
  );

  if (weekAlreadyHasName) {
    return {
      status: "blocked",
      message: "That category name already exists.",
    };
  }

  const sourceCategoryIds = new Set(
    sourceActivities
      .map((activity) => activity.categoryId)
      .filter((id): id is string => Boolean(id)),
  );
  const userCategories = await getUserCategories(supabase);

  if (userCategories.status !== "success") {
    return userCategories;
  }

  const reusableNameConflict = userCategories.categories.some(
    (category) =>
      !sourceCategoryIds.has(category.id) &&
      normalizeCategoryKey(category.name) ===
        normalizeCategoryKey(normalizedNextCategoryName),
  );

  if (reusableNameConflict) {
    return {
      status: "blocked",
      message: "That category name already exists.",
    };
  }

  for (const categoryId of sourceCategoryIds) {
    const { error } = await supabase
      .from("categories")
      .update({ name: normalizedNextCategoryName, is_active: true })
      .eq("id", categoryId)
      .eq("user_id", userId);

    if (error) {
      if (error.code === "23505") {
        return {
          status: "blocked",
          message: "That category name already exists.",
        };
      }

      return { status: "error", message: error.message };
    }
  }

  const { error: weekActivityError } = await supabase
    .from("week_activities")
    .update({ category_name: normalizedNextCategoryName })
    .eq("week_id", weekId)
    .eq("category_name", normalizedCategoryName);

  if (weekActivityError) {
    return { status: "error", message: weekActivityError.message };
  }

  return { status: "updated" };
}

export async function updateWeekActivityListItem({
  supabase,
  userId,
  weekActivityId,
  activityName,
  categoryName,
  targetCount,
}: {
  supabase: SupabaseClient;
  userId: string;
  weekActivityId: string;
  activityName: string;
  categoryName: string;
  targetCount: number;
}): Promise<WeekListMutationResult> {
  const input = normalizeListInput({ activityName, categoryName, targetCount });

  if (!input) {
    return {
      status: "blocked",
      message: "Activity name, category, and target are required.",
    };
  }

  const activity = await getWeekActivityForEdit(supabase, weekActivityId);

  if (activity.status !== "success") {
    return activity;
  }

  if (!activity.activity) {
    return { status: "error", message: "Activity not found." };
  }

  if (!canEditWeekList(activity.activity.week.status)) {
    return { status: "blocked", message: "That week list is view-only." };
  }

  const category = await getOrCreateCategory({
    supabase,
    userId,
    categoryName: input.categoryName,
  });

  if (category.status !== "success") {
    return category;
  }

  const categorySortOrder = await getWeekCategorySortOrder({
    supabase,
    weekId: activity.activity.weekId,
    categoryName: category.category.name,
    fallbackSortOrder: category.category.sortOrder,
  });

  if (categorySortOrder.status !== "success") {
    return categorySortOrder;
  }

  const { error: weekActivityError } = await supabase
    .from("week_activities")
    .update({
      category_id: category.category.id,
      category_name: category.category.name,
      category_sort_order: categorySortOrder.sortOrder,
      activity_name: input.activityName,
      target_count: input.targetCount,
    })
    .eq("id", weekActivityId);

  if (weekActivityError) {
    return { status: "error", message: weekActivityError.message };
  }

  if (activity.activity.activityTemplateId) {
    const { error: templateError } = await supabase
      .from("activity_templates")
      .update({
        category_id: category.category.id,
        name: input.activityName,
        default_target_count: input.targetCount,
        is_active: true,
      })
      .eq("id", activity.activity.activityTemplateId);

    if (templateError) {
      return { status: "error", message: templateError.message };
    }
  }

  return { status: "updated" };
}

export async function addWeekActivityListItem({
  supabase,
  userId,
  weekId,
  activityName,
  categoryName,
  targetCount,
}: {
  supabase: SupabaseClient;
  userId: string;
  weekId: string;
  activityName: string;
  categoryName: string;
  targetCount: number;
}): Promise<WeekListMutationResult> {
  const input = normalizeListInput({ activityName, categoryName, targetCount });

  if (!input) {
    return {
      status: "blocked",
      message: "Activity name, category, and target are required.",
    };
  }

  const week = await getWeekById(supabase, weekId);

  if (week.status !== "success") {
    return week;
  }

  if (!week.week) {
    return { status: "error", message: "Week not found." };
  }

  if (!canEditWeekList(week.week.status)) {
    return { status: "blocked", message: "That week list is view-only." };
  }

  const category = await getOrCreateCategory({
    supabase,
    userId,
    categoryName: input.categoryName,
  });

  if (category.status !== "success") {
    return category;
  }

  const template = await getOrCreateActivityTemplate({
    supabase,
    userId,
    categoryId: category.category.id,
    activityName: input.activityName,
    targetCount: input.targetCount,
  });

  if (template.status !== "success") {
    return template;
  }

  const sortOrder = await getNextWeekActivitySortOrder({
    supabase,
    weekId,
    categoryName: category.category.name,
  });

  if (sortOrder.status !== "success") {
    return sortOrder;
  }

  const { data, error } = await supabase
    .from("week_activities")
    .insert({
      week_id: weekId,
      activity_template_id: template.template.id,
      category_id: category.category.id,
      category_name: category.category.name,
      category_sort_order: category.category.sortOrder,
      activity_name: input.activityName,
      target_count: input.targetCount,
      sort_order: sortOrder.sortOrder,
    })
    .select(
      "id, activity_template_id, category_id, category_name, category_sort_order, activity_name, target_count, sort_order",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return { status: "updated" };
    }

    return { status: "error", message: error.message };
  }

  const row = data as Pick<
    WeekActivityQueryRow,
    | "id"
    | "activity_template_id"
    | "category_id"
    | "category_name"
    | "category_sort_order"
    | "activity_name"
    | "target_count"
    | "sort_order"
  >;

  return {
    status: "updated",
    activity: {
      id: row.id,
      activityTemplateId: row.activity_template_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categorySortOrder: row.category_sort_order,
      activityName: row.activity_name,
      targetCount: row.target_count,
      sortOrder: row.sort_order,
    },
  };
}

export async function removeWeekActivityFromFuture({
  supabase,
  weekActivityId,
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
}): Promise<WeekListMutationResult> {
  const activity = await getWeekActivityForEdit(supabase, weekActivityId);

  if (activity.status !== "success") {
    return activity;
  }

  if (!activity.activity) {
    return { status: "error", message: "Activity not found." };
  }

  if (!canEditWeekList(activity.activity.week.status)) {
    return { status: "blocked", message: "That week list is view-only." };
  }

  if (activity.activity.activityTemplateId) {
    const { error } = await supabase
      .from("activity_templates")
      .update({ is_active: false })
      .eq("id", activity.activity.activityTemplateId);

    if (error) {
      return { status: "error", message: error.message };
    }

    if (activity.activity.categoryId) {
      const categoryCleanup = await deactivateCategoryIfEmpty({
        supabase,
        categoryId: activity.activity.categoryId,
      });

      if (categoryCleanup.status !== "success") {
        return categoryCleanup;
      }
    }
  }

  if (activity.activity.hasCells) {
    return { status: "kept-history" };
  }

  const { error } = await supabase
    .from("week_activities")
    .delete()
    .eq("id", weekActivityId);

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "removed" };
}

export async function reorderWeekCategories({
  supabase,
  weekId,
  categoryName,
  targetCategoryName,
}: {
  supabase: SupabaseClient;
  weekId: string;
  categoryName: string;
  targetCategoryName: string;
}): Promise<WeekListMutationResult> {
  if (categoryName === targetCategoryName) {
    return { status: "updated" };
  }

  const week = await getWeekById(supabase, weekId);

  if (week.status !== "success") {
    return week;
  }

  if (!week.week) {
    return { status: "error", message: "Week not found." };
  }

  if (!canEditWeekList(week.week.status)) {
    return { status: "blocked", message: "That week list is view-only." };
  }

  const activities = await getWeekActivitiesForListEdit(supabase, weekId);

  if (activities.status !== "success") {
    return activities;
  }

  const categories = uniqueCategoryOrder(activities.activities);
  const nextCategories = moveNamedItem(categories, categoryName, targetCategoryName);

  if (!nextCategories) {
    return { status: "blocked", message: "Category not found." };
  }

  for (const [index, category] of nextCategories.entries()) {
    const sortOrder = (index + 1) * 10;
    const { error } = await supabase
      .from("week_activities")
      .update({ category_sort_order: sortOrder })
      .eq("week_id", weekId)
      .eq("category_name", category.name);

    if (error) {
      return { status: "error", message: error.message };
    }
  }

  return { status: "updated" };
}

export async function reorderWeekActivities({
  supabase,
  weekActivityId,
  targetWeekActivityId,
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
  targetWeekActivityId: string;
}): Promise<WeekListMutationResult> {
  if (weekActivityId === targetWeekActivityId) {
    return { status: "updated" };
  }

  const dragged = await getWeekActivityForEdit(supabase, weekActivityId);
  const target = await getWeekActivityForEdit(supabase, targetWeekActivityId);

  if (dragged.status !== "success") {
    return dragged;
  }

  if (target.status !== "success") {
    return target;
  }

  if (!dragged.activity || !target.activity) {
    return { status: "error", message: "Activity not found." };
  }

  if (dragged.activity.weekId !== target.activity.weekId) {
    return { status: "blocked", message: "Activities must be in the same week." };
  }

  if (!canEditWeekList(dragged.activity.week.status)) {
    return { status: "blocked", message: "That week list is view-only." };
  }

  const activities = await getWeekActivitiesForListEdit(
    supabase,
    dragged.activity.weekId,
  );

  if (activities.status !== "success") {
    return activities;
  }

  const targetCategoryActivities = activities.activities.filter(
    (activity) =>
      activity.categoryName === target.activity!.categoryName &&
      activity.id !== dragged.activity!.id,
  );
  const targetIndex = targetCategoryActivities.findIndex(
    (activity) => activity.id === target.activity!.id,
  );

  if (targetIndex < 0) {
    return { status: "blocked", message: "Target activity not found." };
  }

  const nextTargetIndex =
    dragged.activity.categoryName === target.activity.categoryName &&
    dragged.activity.sortOrder < target.activity.sortOrder
      ? targetIndex + 1
      : targetIndex;

  targetCategoryActivities.splice(nextTargetIndex, 0, {
    ...dragged.activity,
    categoryId: target.activity.categoryId,
    categoryName: target.activity.categoryName,
    categorySortOrder: target.activity.categorySortOrder,
  });

  for (const [index, activity] of targetCategoryActivities.entries()) {
    const sortOrder = (index + 1) * 10;
    const update: {
      sort_order: number;
      category_id?: string | null;
      category_name?: string;
      category_sort_order?: number;
    } = { sort_order: sortOrder };

    if (activity.id === dragged.activity.id) {
      update.category_id = target.activity.categoryId;
      update.category_name = target.activity.categoryName;
      update.category_sort_order = target.activity.categorySortOrder;
    }

    const { error } = await supabase
      .from("week_activities")
      .update(update)
      .eq("id", activity.id);

    if (error) {
      return { status: "error", message: error.message };
    }

    if (activity.id === dragged.activity.id && dragged.activity.activityTemplateId) {
      const { error: templateError } = await supabase
        .from("activity_templates")
        .update({
          category_id: target.activity.categoryId,
          sort_order: sortOrder,
        })
        .eq("id", dragged.activity.activityTemplateId);

      if (templateError) {
        return { status: "error", message: templateError.message };
      }
    }
  }

  return { status: "updated" };
}

function compareWeekActivities(
  left: PersistedWeekActivity,
  right: PersistedWeekActivity,
) {
  return (
    left.categorySortOrder - right.categorySortOrder ||
    left.categoryName.localeCompare(right.categoryName) ||
    left.sortOrder - right.sortOrder ||
    left.activityName.localeCompare(right.activityName)
  );
}

async function getActiveTemplateSnapshots(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("activity_templates")
    .select(
      "id, category_id, name, default_target_count, sort_order, categories(id, name, sort_order)",
    )
    .eq("is_active", true);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    templates: ((data ?? []) as ActivityTemplateQueryRow[])
      .map(toActivityTemplateSnapshot)
      .filter((template): template is ActivityTemplateSnapshot => Boolean(template))
      .toSorted(
        (left, right) =>
          left.categorySortOrder - right.categorySortOrder ||
          left.categoryName.localeCompare(right.categoryName) ||
          left.sortOrder - right.sortOrder ||
          left.activityName.localeCompare(right.activityName),
      ),
  };
}

async function getWeekByStartDate(supabase: SupabaseClient, weekStartDate: DateOnly) {
  const { data, error } = await supabase
    .from("weeks")
    .select(
      "id, week_start_date, week_end_date, status, week_activities(id, activity_template_id, category_id, category_name, category_sort_order, activity_name, target_count, sort_order, activity_day_cells(id, cell_date, planned, done, skipped))",
    )
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  if (!data) {
    return { status: "success" as const, week: null, activities: [] };
  }

  const row = data as WeekQueryRow;

  return {
    status: "success" as const,
    week: {
      id: row.id,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      status: row.status,
    } satisfies WeekRecord,
    activities: (row.week_activities ?? []).map(toPersistedWeekActivity),
  };
}

async function getWeekById(supabase: SupabaseClient, weekId: string) {
  const { data, error } = await supabase
    .from("weeks")
    .select("id, week_start_date, week_end_date, status")
    .eq("id", weekId)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  if (!data) {
    return { status: "success" as const, week: null };
  }

  const row = data as Pick<
    WeekQueryRow,
    "id" | "week_start_date" | "week_end_date" | "status"
  >;

  return {
    status: "success" as const,
    week: {
      id: row.id,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      status: row.status,
    } satisfies WeekRecord,
  };
}

async function insertActiveWeek(
  supabase: SupabaseClient,
  {
    userId,
    weekStartDate,
  }: {
    userId: string;
    weekStartDate: DateOnly;
  },
) {
  const { data, error } = await supabase
    .from("weeks")
    .insert({
      user_id: userId,
      week_start_date: weekStartDate,
      status: "active",
    })
    .select("id, week_start_date, week_end_date, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existing = await getWeekByStartDate(supabase, weekStartDate);

      if (existing.status === "error" || !existing.week) {
        return {
          status: "error" as const,
          message:
            existing.status === "error"
              ? existing.message
              : "The current week already exists but could not be loaded.",
        };
      }

      return { status: "success" as const, week: existing.week };
    }

    return { status: "error" as const, message: error.message };
  }

  const row = data as Pick<
    WeekQueryRow,
    "id" | "week_start_date" | "week_end_date" | "status"
  >;

  return {
    status: "success" as const,
    week: {
      id: row.id,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      status: row.status,
    } satisfies WeekRecord,
  };
}

async function getWeekActivityOwner(supabase: SupabaseClient, weekActivityId: string) {
  const { data, error } = await supabase
    .from("week_activities")
    .select("id, week_id, weeks(status, week_start_date, week_end_date)")
    .eq("id", weekActivityId)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  if (!data) {
    return { status: "success" as const, activity: null };
  }

  const row = data as WeekActivityOwnerRow;
  const week = Array.isArray(row.weeks) ? row.weeks[0] : row.weeks;

  if (!week) {
    return { status: "error" as const, message: "Week not found." };
  }

  return {
    status: "success" as const,
    activity: {
      id: row.id,
      weekId: row.week_id,
      week: {
        status: week.status,
        weekStartDate: week.week_start_date,
        weekEndDate: week.week_end_date,
      },
    },
  };
}

async function getWeekActivityForEdit(supabase: SupabaseClient, weekActivityId: string) {
  const { data, error } = await supabase
    .from("week_activities")
    .select(
      "id, week_id, activity_template_id, category_id, category_name, category_sort_order, activity_name, target_count, sort_order, activity_day_cells(id), weeks(status, week_start_date, week_end_date)",
    )
    .eq("id", weekActivityId)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  if (!data) {
    return { status: "success" as const, activity: null };
  }

  const row = data as WeekActivityEditRow;
  const week = Array.isArray(row.weeks) ? row.weeks[0] : row.weeks;

  if (!week) {
    return { status: "error" as const, message: "Week not found." };
  }

  return {
    status: "success" as const,
    activity: {
      id: row.id,
      weekId: row.week_id,
      activityTemplateId: row.activity_template_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categorySortOrder: row.category_sort_order,
      activityName: row.activity_name,
      targetCount: row.target_count,
      sortOrder: row.sort_order,
      hasCells: (row.activity_day_cells ?? []).length > 0,
      week: {
        status: week.status,
        weekStartDate: week.week_start_date,
        weekEndDate: week.week_end_date,
      },
    },
  };
}

async function getWeekActivitiesForListEdit(supabase: SupabaseClient, weekId: string) {
  const { data, error } = await supabase
    .from("week_activities")
    .select(
      "id, week_id, activity_template_id, category_id, category_name, category_sort_order, activity_name, target_count, sort_order, activity_day_cells(id), weeks(status, week_start_date, week_end_date)",
    )
    .eq("week_id", weekId);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  const activities = ((data ?? []) as WeekActivityEditRow[])
    .map((row) => {
      const week = Array.isArray(row.weeks) ? row.weeks[0] : row.weeks;

      if (!week) {
        return null;
      }

      return {
        id: row.id,
        weekId: row.week_id,
        activityTemplateId: row.activity_template_id,
        categoryId: row.category_id,
        categoryName: row.category_name,
        categorySortOrder: row.category_sort_order,
        activityName: row.activity_name,
        targetCount: row.target_count,
        sortOrder: row.sort_order,
        hasCells: (row.activity_day_cells ?? []).length > 0,
        week: {
          status: week.status,
          weekStartDate: week.week_start_date,
          weekEndDate: week.week_end_date,
        },
      } satisfies EditableWeekActivity;
    })
    .filter((activity): activity is NonNullable<typeof activity> => Boolean(activity))
    .toSorted(
      (left, right) =>
        left.categorySortOrder - right.categorySortOrder ||
        left.categoryName.localeCompare(right.categoryName) ||
        left.sortOrder - right.sortOrder ||
        left.activityName.localeCompare(right.activityName),
    );

  return { status: "success" as const, activities };
}

async function getUserCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, is_active")
    .eq("is_active", true);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    categories: ((data ?? []) as CategoryQueryRow[])
      .map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order,
        isActive: category.is_active,
      }))
      .toSorted(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
      ),
  };
}

async function getOrCreateCategory({
  supabase,
  userId,
  categoryName,
}: {
  supabase: SupabaseClient;
  userId: string;
  categoryName: string;
}) {
  const categories = await getUserCategories(supabase);

  if (categories.status !== "success") {
    return categories;
  }

  const existing = categories.categories.find(
    (category) => category.name.toLowerCase() === categoryName.toLowerCase(),
  );

  if (existing) {
    return { status: "success" as const, category: existing };
  }

  const nextSortOrder =
    Math.max(0, ...categories.categories.map((category) => category.sortOrder)) + 10;
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: categoryName,
      sort_order: nextSortOrder,
      is_active: true,
    })
    .select("id, name, sort_order, is_active")
    .single();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  const row = data as CategoryQueryRow;

  return {
    status: "success" as const,
    category: {
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active,
    },
  };
}

async function getOrCreateActivityTemplate({
  supabase,
  userId,
  categoryId,
  activityName,
  targetCount,
}: {
  supabase: SupabaseClient;
  userId: string;
  categoryId: string;
  activityName: string;
  targetCount: number;
}) {
  const { data: existingData, error: existingError } = await supabase
    .from("activity_templates")
    .select("id, category_id, name, default_target_count, sort_order, is_active")
    .eq("category_id", categoryId);

  if (existingError) {
    return { status: "error" as const, message: existingError.message };
  }

  const existingRows = (existingData ?? []) as ActivityTemplateEditRow[];
  const existing = existingRows.find(
    (template) => template.name.toLowerCase() === activityName.toLowerCase(),
  );

  if (existing) {
    const { data, error } = await supabase
      .from("activity_templates")
      .update({
        name: activityName,
        default_target_count: targetCount,
        is_active: true,
      })
      .eq("id", existing.id)
      .select("id, category_id, name, default_target_count, sort_order, is_active")
      .single();

    if (error) {
      return { status: "error" as const, message: error.message };
    }

    return {
      status: "success" as const,
      template: toActivityTemplateEdit((data as ActivityTemplateEditRow) ?? existing),
    };
  }

  const nextSortOrder = Math.max(0, ...existingRows.map((row) => row.sort_order)) + 10;
  const { data, error } = await supabase
    .from("activity_templates")
    .insert({
      user_id: userId,
      category_id: categoryId,
      name: activityName,
      default_target_count: targetCount,
      sort_order: nextSortOrder,
      is_active: true,
    })
    .select("id, category_id, name, default_target_count, sort_order, is_active")
    .single();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    template: toActivityTemplateEdit(data as ActivityTemplateEditRow),
  };
}

async function getNextWeekActivitySortOrder({
  supabase,
  weekId,
  categoryName,
}: {
  supabase: SupabaseClient;
  weekId: string;
  categoryName: string;
}) {
  const { data, error } = await supabase
    .from("week_activities")
    .select("sort_order")
    .eq("week_id", weekId)
    .eq("category_name", categoryName);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    sortOrder:
      Math.max(
        0,
        ...((data ?? []) as { sort_order: number }[]).map((row) => row.sort_order),
      ) + 10,
  };
}

async function getDayCell(
  supabase: SupabaseClient,
  weekActivityId: string,
  cellDate: DateOnly,
) {
  const { data, error } = await supabase
    .from("activity_day_cells")
    .select("id, cell_date, planned, done, skipped")
    .eq("week_activity_id", weekActivityId)
    .eq("cell_date", cellDate)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  if (!data) {
    return { status: "success" as const, cell: null };
  }

  const row = data as DayCellQueryRow;

  return {
    status: "success" as const,
    cell: {
      id: row.id,
      cellDate: row.cell_date,
      planned: row.planned,
      done: row.done,
      skipped: row.skipped,
    } satisfies PersistedDayCell,
  };
}

function canEditWeekList(status: WeekStatus) {
  return status === "active" || status === "draft";
}

function uniqueCategoryOrder(activities: EditableWeekActivity[]) {
  const categories = new Map<
    string,
    { name: string; sortOrder: number; categoryId: string | null }
  >();

  activities.forEach((activity) => {
    if (!categories.has(activity.categoryName)) {
      categories.set(activity.categoryName, {
        name: activity.categoryName,
        sortOrder: activity.categorySortOrder,
        categoryId: activity.categoryId,
      });
    }
  });

  return Array.from(categories.values()).toSorted(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}

async function getWeekCategorySortOrder({
  supabase,
  weekId,
  categoryName,
  fallbackSortOrder,
}: {
  supabase: SupabaseClient;
  weekId: string;
  categoryName: string;
  fallbackSortOrder: number;
}) {
  const { data, error } = await supabase
    .from("week_activities")
    .select("category_name, category_sort_order")
    .eq("week_id", weekId);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  const normalizedCategoryName = normalizeCategoryKey(categoryName);
  const matchingSortOrders = (
    (data ?? []) as Pick<WeekActivityEditRow, "category_name" | "category_sort_order">[]
  )
    .filter(
      (activity) =>
        normalizeCategoryKey(activity.category_name) === normalizedCategoryName,
    )
    .map((activity) => activity.category_sort_order);

  return {
    status: "success" as const,
    sortOrder:
      matchingSortOrders.length > 0 ? Math.min(...matchingSortOrders) : fallbackSortOrder,
  };
}

function normalizeCategoryKey(categoryName: string) {
  return categoryName.trim().toLowerCase();
}

function moveNamedItem<T extends { name: string }>(
  items: T[],
  itemName: string,
  targetItemName: string,
) {
  const itemIndex = items.findIndex((item) => item.name === itemName);
  const targetIndex = items.findIndex((item) => item.name === targetItemName);

  if (itemIndex < 0 || targetIndex < 0) {
    return null;
  }

  const next = [...items];
  const [item] = next.splice(itemIndex, 1);
  const nextTargetIndex = next.findIndex(
    (candidate) => candidate.name === targetItemName,
  );
  next.splice(itemIndex < targetIndex ? nextTargetIndex + 1 : nextTargetIndex, 0, item);

  return next;
}

function normalizeListInput({
  activityName,
  categoryName,
  targetCount,
}: {
  activityName: string;
  categoryName: string;
  targetCount: number;
}) {
  const normalizedActivityName = activityName.trim();
  const normalizedCategoryName = categoryName.trim();
  const normalizedTargetCount = Math.max(0, Math.floor(targetCount));

  if (
    normalizedActivityName.length === 0 ||
    normalizedCategoryName.length === 0 ||
    Number.isNaN(normalizedTargetCount)
  ) {
    return null;
  }

  return {
    activityName: normalizedActivityName,
    categoryName: normalizedCategoryName,
    targetCount: normalizedTargetCount,
  };
}

async function deactivateCategoryIfEmpty({
  supabase,
  categoryId,
}: {
  supabase: SupabaseClient;
  categoryId: string;
}) {
  const { data: activeTemplates, error: countError } = await supabase
    .from("activity_templates")
    .select("id")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .limit(1);

  if (countError) {
    return { status: "error" as const, message: countError.message };
  }

  if ((activeTemplates ?? []).length > 0) {
    return { status: "success" as const };
  }

  const { error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", categoryId);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return { status: "success" as const };
}

function toActivityTemplateEdit(row: ActivityTemplateEditRow) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    targetCount: row.default_target_count,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function toActivityTemplateSnapshot(
  row: ActivityTemplateQueryRow,
): ActivityTemplateSnapshot | null {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;

  if (!category) {
    return null;
  }

  return {
    id: row.id,
    categoryId: category.id,
    categoryName: category.name,
    categorySortOrder: category.sort_order,
    activityName: row.name,
    targetCount: row.default_target_count,
    sortOrder: row.sort_order,
  };
}

function toPersistedWeekActivity(row: WeekActivityQueryRow): PersistedWeekActivity {
  return {
    id: row.id,
    activityTemplateId: row.activity_template_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySortOrder: row.category_sort_order,
    activityName: row.activity_name,
    targetCount: row.target_count,
    sortOrder: row.sort_order,
    cells: (row.activity_day_cells ?? []).map((cell) => ({
      id: cell.id,
      cellDate: cell.cell_date,
      planned: cell.planned,
      done: cell.done,
      skipped: cell.skipped,
    })),
  };
}
