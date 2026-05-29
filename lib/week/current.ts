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
  state: CellVisualState;
  isPlanningEditable: boolean;
};

export type WeekGridActivity = {
  id: string;
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

export function getTodayDateOnly() {
  return getDateOnlyForTimeZone(new Date(), process.env.APP_TIME_ZONE);
}

export function getWeekDayDates(weekStartDate: DateOnly) {
  const start = getWeekStartDate(weekStartDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getCellVisualState({
  weekExists = true,
  weekStatus,
  date,
  today,
  planned,
  done,
}: {
  weekExists?: boolean;
  weekStatus: WeekStatus;
  date: DateOnly;
  today: DateOnly;
  planned: boolean;
  done: boolean;
}): CellVisualState {
  if (done) {
    return "done";
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
  state = getCellVisualState({ weekStatus, date, today, planned, done }),
}: {
  weekStatus: WeekStatus;
  date: DateOnly;
  today: DateOnly;
  planned: boolean;
  done: boolean;
  state?: CellVisualState;
}) {
  if (done || state === "done" || state === "missed") {
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

export function getNextPlanningCellFacts({
  currentCell,
}: {
  currentCell: Pick<PersistedDayCell, "planned" | "done"> | null;
}): { planned: boolean; done: boolean } | null {
  const current = currentCell ?? { planned: false, done: false };

  if (current.done) {
    return current;
  }

  return current.planned ? null : { planned: true, done: false };
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
    const categoryKey = `${activity.categorySortOrder}:${activity.categoryName}`;
    const category =
      categoryMap.get(categoryKey) ??
      ({
        name: activity.categoryName,
        sortOrder: activity.categorySortOrder,
        activities: [],
      } satisfies WeekGridCategory);
    const cellMap = new Map(activity.cells.map((cell) => [cell.cellDate, cell]));
    const cells = dayDates.map((date) => {
      const cell = cellMap.get(date);
      const planned = cell?.planned ?? false;
      const done = cell?.done ?? false;
      const state = getCellVisualState({
        weekStatus: week.status,
        date,
        today,
        planned,
        done,
      });

      return {
        date,
        planned,
        done,
        state,
        isPlanningEditable: canTogglePlanningCell({
          weekStatus: week.status,
          date,
          today,
          planned,
          done,
          state,
        }),
      };
    });

    category.activities.push({
      id: activity.id,
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

  return {
    status: "ready",
    view: buildThisWeekViewModel({
      week: week.week,
      activities: week.activities,
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

  const existingTemplateIds = weekResult.activities
    .map((activity) => activity.activityTemplateId)
    .filter((id): id is string => Boolean(id));
  const rows = buildWeekActivitySnapshotRows({
    weekId: weekResult.week.id,
    templates: templatesResult.templates.filter(
      (template) => !existingTemplateIds.includes(template.id),
    ),
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("week_activities").insert(rows);

    if (error) {
      return { status: "error" as const, message: error.message };
    }
  }

  return { status: "created" as const, weekId: weekResult.week.id };
}

export async function toggleWeekCellPlan({
  supabase,
  weekActivityId,
  cellDate,
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
  cellDate: DateOnly;
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
  const today = getTodayDateOnly();
  const state = getCellVisualState({
    weekStatus: week.status,
    date: cellDate,
    today,
    planned,
    done,
  });

  if (
    !canTogglePlanningCell({
      weekStatus: week.status,
      date: cellDate,
      today,
      planned,
      done,
      state,
    })
  ) {
    return { status: "blocked" as const, message: "That plan is view-only right now." };
  }

  const nextFacts = getNextPlanningCellFacts({
    currentCell: existing.cell,
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
    },
    { onConflict: "week_activity_id,cell_date" },
  );

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return { status: "updated" as const };
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
      "id, week_start_date, week_end_date, status, week_activities(id, activity_template_id, category_id, category_name, category_sort_order, activity_name, target_count, sort_order, activity_day_cells(id, cell_date, planned, done))",
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

async function getDayCell(
  supabase: SupabaseClient,
  weekActivityId: string,
  cellDate: DateOnly,
) {
  const { data, error } = await supabase
    .from("activity_day_cells")
    .select("id, cell_date, planned, done")
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
    } satisfies PersistedDayCell,
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
    })),
  };
}
