import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  compareDateOnly,
  getWeekStartDate,
  parseDateOnly,
  type DateOnly,
} from "@/lib/week/date";
import { getTodayDateOnly, type WeekRecord } from "@/lib/week/current";
import type { WeekStatus } from "@/lib/week/lifecycle";

export type ReviewLoadState =
  | { status: "no-review-week" }
  | { status: "ready"; state: ReviewState }
  | { status: "error"; message: string };

export type ReviewDayCell = {
  date: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
  isCorrectionEditable: boolean;
};

export type ReviewActivityRecord = {
  id: string;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  cells: ReviewDayCell[];
};

export type ReviewState = {
  week: WeekRecord;
  today: DateOnly;
  dayDates: DateOnly[];
  isCurrentWeek: boolean;
  isSundayCurrentWeek: boolean;
  activities: ReviewActivityRecord[];
};

export type ReviewSummaryRow = {
  id: string;
  activityName: string;
  doneCount: number;
  targetCount: number;
  isTargetMet: boolean;
};

export type ReviewCategoryGroup = {
  categoryName: string;
  activities: ReviewActivityRecord[];
};

export type ReviewViewModel = {
  week: WeekRecord;
  today: DateOnly;
  dayDates: DateOnly[];
  rangeLabel: string;
  completedActivityDays: number;
  summarySentence: string;
  isSundayCurrentWeek: boolean;
  targetsMet: ReviewSummaryRow[];
  shortOfTarget: ReviewSummaryRow[];
  categoryGroups: ReviewCategoryGroup[];
};

export type ReviewOptimisticAction = {
  type: "set-completion";
  activityId: string;
  date: DateOnly;
  done: boolean;
};

type WeekQueryRow = {
  id: string;
  week_start_date: string;
  week_end_date: string;
  status: WeekStatus;
  week_activities?: WeekActivityQueryRow[] | null;
};

type WeekActivityQueryRow = {
  id: string;
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

export async function loadReview({
  supabase,
  today = getTodayDateOnly(),
  weekStartDate,
}: {
  supabase: SupabaseClient;
  today?: DateOnly;
  weekStartDate?: DateOnly;
}): Promise<ReviewLoadState> {
  parseDateOnly(today);

  const weekResult = weekStartDate
    ? await getReviewWeekByStartDate(supabase, weekStartDate)
    : await getDefaultReviewWeek(supabase, today);

  if (weekResult.status === "error") {
    return { status: "error", message: weekResult.message };
  }

  if (!weekResult.week) {
    return { status: "no-review-week" };
  }

  return {
    status: "ready",
    state: buildReviewState({
      week: weekResult.week,
      activities: weekResult.activities,
      today,
    }),
  };
}

export function buildReviewState({
  week,
  activities,
  today,
}: {
  week: WeekRecord;
  activities: ReviewActivityRecord[];
  today: DateOnly;
}): ReviewState {
  const dayDates = getReviewDayDates(week.weekStartDate);
  const isCurrentWeek =
    compareDateOnly(today, week.weekStartDate) >= 0 &&
    compareDateOnly(today, week.weekEndDate) <= 0;

  return {
    week,
    today,
    dayDates,
    isCurrentWeek,
    isSundayCurrentWeek: isCurrentWeek && today === week.weekEndDate,
    activities: activities.toSorted(compareReviewActivities).map((activity) => {
      const cellMap = new Map(activity.cells.map((cell) => [cell.date, cell]));

      return {
        ...activity,
        cells: dayDates.map((date) => {
          const cell = cellMap.get(date);

          return {
            date,
            planned: cell?.planned ?? false,
            done: cell?.done ?? false,
            skipped: cell?.skipped ?? false,
            isCorrectionEditable:
              week.status !== "closed" && compareDateOnly(date, today) <= 0,
          };
        }),
      };
    }),
  };
}

export function buildReviewViewModel(state: ReviewState): ReviewViewModel {
  const rows = state.activities.toSorted(compareReviewActivities).map((activity) => {
    const doneCount = activity.cells.filter((cell) => cell.done).length;

    return {
      id: activity.id,
      activityName: activity.activityName,
      doneCount,
      targetCount: activity.targetCount,
      isTargetMet: doneCount >= activity.targetCount,
    };
  });
  const completedActivityDays = rows.reduce((total, row) => total + row.doneCount, 0);

  return {
    week: state.week,
    today: state.today,
    dayDates: state.dayDates,
    rangeLabel: formatDateRange(state.week.weekStartDate, state.week.weekEndDate),
    completedActivityDays,
    summarySentence: getReviewSummarySentence(completedActivityDays),
    isSundayCurrentWeek: state.isSundayCurrentWeek,
    targetsMet: rows.filter((row) => row.isTargetMet),
    shortOfTarget: rows.filter((row) => !row.isTargetMet),
    categoryGroups: groupActivitiesByCategory(state.activities),
  };
}

export function getReviewSummarySentence(completedActivityDays: number) {
  return `You completed ${completedActivityDays} activities this week.`;
}

export function getReviewDetailDisplayState(cell: Pick<ReviewDayCell, "done">) {
  return cell.done ? ("done" as const) : ("blank" as const);
}

export function applyOptimisticReviewAction(
  state: ReviewState,
  action: ReviewOptimisticAction,
): ReviewState {
  return {
    ...state,
    activities: state.activities.map((activity) => {
      if (activity.id !== action.activityId) {
        return activity;
      }

      return {
        ...activity,
        cells: activity.cells.map((cell) => {
          if (cell.date !== action.date || !cell.isCorrectionEditable) {
            return cell;
          }

          return {
            ...cell,
            done: action.done,
            skipped: false,
          };
        }),
      };
    }),
  };
}

export async function setReviewCellDone({
  supabase,
  weekActivityId,
  cellDate,
  done,
  today = getTodayDateOnly(),
}: {
  supabase: SupabaseClient;
  weekActivityId: string;
  cellDate: DateOnly;
  done: boolean;
  today?: DateOnly;
}) {
  parseDateOnly(cellDate);

  const owner = await getReviewWeekActivityOwner(supabase, weekActivityId);

  if (owner.status === "error") {
    return { status: "error" as const, message: owner.message };
  }

  if (!owner.activity) {
    return { status: "error" as const, message: "Activity not found." };
  }

  const week = owner.activity.week;

  if (week.status === "closed") {
    return { status: "blocked" as const, message: "That week is view-only." };
  }

  if (
    compareDateOnly(cellDate, week.weekStartDate) < 0 ||
    compareDateOnly(cellDate, week.weekEndDate) > 0
  ) {
    return { status: "blocked" as const, message: "That day is outside this week." };
  }

  if (compareDateOnly(cellDate, today) > 0) {
    return { status: "blocked" as const, message: "Future days are view-only." };
  }

  const existing = await getReviewDayCell(supabase, weekActivityId, cellDate);

  if (existing.status === "error") {
    return { status: "error" as const, message: existing.message };
  }

  const planned = existing.cell?.planned ?? false;

  if (!done && !planned) {
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
      planned,
      done,
      skipped: false,
    },
    { onConflict: "week_activity_id,cell_date" },
  );

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return { status: "updated" as const };
}

export function getReviewDayDates(weekStartDate: DateOnly) {
  const start = getWeekStartDate(weekStartDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function formatDateRange(start: DateOnly, end: DateOnly) {
  return `${formatMediumDate(start)} – ${formatMediumDate(end)}`;
}

function formatMediumDate(date: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function groupActivitiesByCategory(activities: ReviewActivityRecord[]) {
  const groups = new Map<string, ReviewCategoryGroup>();

  activities.toSorted(compareReviewActivities).forEach((activity) => {
    const key = `${activity.categorySortOrder}:${activity.categoryName}`;
    const group =
      groups.get(key) ??
      ({
        categoryName: activity.categoryName,
        activities: [],
      } satisfies ReviewCategoryGroup);

    group.activities.push(activity);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

function compareReviewActivities(
  left: ReviewActivityRecord,
  right: ReviewActivityRecord,
) {
  return (
    left.categorySortOrder - right.categorySortOrder ||
    left.categoryName.localeCompare(right.categoryName) ||
    left.sortOrder - right.sortOrder ||
    left.activityName.localeCompare(right.activityName)
  );
}

async function getDefaultReviewWeek(supabase: SupabaseClient, today: DateOnly) {
  const currentWeek = await getReviewWeekByStartDate(supabase, getWeekStartDate(today));

  if (currentWeek.status === "error" || currentWeek.week) {
    return currentWeek;
  }

  return getMostRecentPastReviewWeek(supabase, today);
}

async function getMostRecentPastReviewWeek(supabase: SupabaseClient, today: DateOnly) {
  const { data, error } = await supabase
    .from("weeks")
    .select(reviewWeekSelect)
    .lt("week_start_date", getWeekStartDate(today))
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return toReviewWeekResult(data as WeekQueryRow | null);
}

async function getReviewWeekByStartDate(
  supabase: SupabaseClient,
  weekStartDate: DateOnly,
) {
  parseDateOnly(weekStartDate);

  const { data, error } = await supabase
    .from("weeks")
    .select(reviewWeekSelect)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return toReviewWeekResult(data as WeekQueryRow | null);
}

function toReviewWeekResult(row: WeekQueryRow | null) {
  if (!row) {
    return { status: "success" as const, week: null, activities: [] };
  }

  return {
    status: "success" as const,
    week: {
      id: row.id,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      status: row.status,
    } satisfies WeekRecord,
    activities: (row.week_activities ?? []).map(toReviewActivity),
  };
}

function toReviewActivity(row: WeekActivityQueryRow): ReviewActivityRecord {
  return {
    id: row.id,
    categoryName: row.category_name,
    categorySortOrder: row.category_sort_order,
    activityName: row.activity_name,
    targetCount: row.target_count,
    sortOrder: row.sort_order,
    cells: (row.activity_day_cells ?? []).map((cell) => ({
      date: cell.cell_date,
      planned: cell.planned,
      done: cell.done,
      skipped: cell.skipped,
      isCorrectionEditable: false,
    })),
  };
}

async function getReviewWeekActivityOwner(
  supabase: SupabaseClient,
  weekActivityId: string,
) {
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

async function getReviewDayCell(
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
    },
  };
}

const reviewWeekSelect =
  "id, week_start_date, week_end_date, status, week_activities(id, category_name, category_sort_order, activity_name, target_count, sort_order, activity_day_cells(id, cell_date, planned, done, skipped))";
