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

export type HistoryLoadState =
  | { status: "ready"; state: HistoryState }
  | { status: "error"; message: string };

export type HistoryState = {
  today: DateOnly;
  currentWeekStartDate: DateOnly;
  lastWeekStartDate: DateOnly;
  lastWeek: HistoryWeekSummary | null;
  previousWeeks: HistoryWeekSummary[];
  patternWindowLabel: string;
  patterns: HistoryPatternRow[];
};

export type HistoryWeekSummary = {
  id: string;
  weekStartDate: DateOnly;
  weekEndDate: DateOnly;
  rangeLabel: string;
  completedActivityDays: number;
  targetsMetCount: number;
  shortOfTargetCount: number;
  reviewHref: string;
};

export type HistoryPatternRow = {
  activityKey: string;
  activityName: string;
  completedDays: number;
  targetMetWeeks: number;
  includedWeeks: number;
  sortWeekIndex: number;
  categorySortOrder: number;
  sortOrder: number;
};

type HistoryWeekQueryRow = {
  id: string;
  week_start_date: string;
  week_end_date: string;
  status: WeekStatus;
  week_activities?: HistoryWeekActivityQueryRow[] | null;
};

type HistoryWeekActivityQueryRow = {
  id: string;
  activity_template_id: string | null;
  category_name: string;
  category_sort_order: number;
  activity_name: string;
  target_count: number;
  sort_order: number;
  activity_day_cells?: HistoryDayCellQueryRow[] | null;
};

type HistoryDayCellQueryRow = {
  id: string;
  cell_date: string;
  done: boolean;
};

type HistoryWeekRecord = WeekRecord & {
  activities: HistoryActivityRecord[];
};

type HistoryActivityRecord = {
  id: string;
  activityTemplateId: string | null;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  doneDates: DateOnly[];
};

export async function loadHistory({
  supabase,
  today = getTodayDateOnly(),
}: {
  supabase: SupabaseClient;
  today?: DateOnly;
}): Promise<HistoryLoadState> {
  parseDateOnly(today);

  const currentWeekStartDate = getWeekStartDate(today);
  const lastWeekStartDate = addDays(currentWeekStartDate, -7);
  const weeksResult = await getEndedHistoryWeeks(supabase, currentWeekStartDate);

  if (weeksResult.status === "error") {
    return weeksResult;
  }

  return {
    status: "ready",
    state: buildHistoryState({
      today,
      currentWeekStartDate,
      lastWeekStartDate,
      weeks: weeksResult.weeks,
    }),
  };
}

export function buildHistoryState({
  today,
  currentWeekStartDate,
  lastWeekStartDate = addDays(currentWeekStartDate, -7),
  weeks,
}: {
  today: DateOnly;
  currentWeekStartDate: DateOnly;
  lastWeekStartDate?: DateOnly;
  weeks: HistoryWeekRecord[];
}): HistoryState {
  const endedWeeks = weeks
    .filter((week) => compareDateOnly(week.weekStartDate, currentWeekStartDate) < 0)
    .toSorted((left, right) => compareDateOnly(right.weekStartDate, left.weekStartDate));
  const lastWeekRecord =
    endedWeeks.find((week) => week.weekStartDate === lastWeekStartDate) ?? null;
  const previousWeekRecords = endedWeeks.filter(
    (week) => compareDateOnly(week.weekStartDate, lastWeekStartDate) < 0,
  );
  const patternWeeks = endedWeeks.slice(0, 4);

  return {
    today,
    currentWeekStartDate,
    lastWeekStartDate,
    lastWeek: lastWeekRecord ? summarizeHistoryWeek(lastWeekRecord) : null,
    previousWeeks: previousWeekRecords.map(summarizeHistoryWeek),
    patternWindowLabel: "Last 4 weeks",
    patterns: buildHistoryPatterns(patternWeeks),
  };
}

export function summarizeHistoryWeek(week: HistoryWeekRecord): HistoryWeekSummary {
  const activitySummaries = week.activities.map((activity) => {
    const doneCount = activity.doneDates.length;

    return {
      doneCount,
      isTargetMet: doneCount >= activity.targetCount,
    };
  });

  return {
    id: week.id,
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    rangeLabel: formatCompactDateRange(week.weekStartDate, week.weekEndDate),
    completedActivityDays: activitySummaries.reduce(
      (total, activity) => total + activity.doneCount,
      0,
    ),
    targetsMetCount: activitySummaries.filter((activity) => activity.isTargetMet).length,
    shortOfTargetCount: activitySummaries.filter((activity) => !activity.isTargetMet)
      .length,
    reviewHref: `/review?weekStart=${week.weekStartDate}`,
  };
}

export function buildHistoryPatterns(weeks: HistoryWeekRecord[]): HistoryPatternRow[] {
  const patternMap = new Map<string, HistoryPatternRow>();

  weeks.forEach((week, weekIndex) => {
    week.activities.forEach((activity) => {
      const activityKey = getHistoryActivityKey(activity);
      const doneCount = activity.doneDates.length;
      const existing = patternMap.get(activityKey);

      if (existing) {
        existing.completedDays += doneCount;
        existing.targetMetWeeks += doneCount >= activity.targetCount ? 1 : 0;
        existing.includedWeeks += 1;
        return;
      }

      patternMap.set(activityKey, {
        activityKey,
        activityName: activity.activityName,
        completedDays: doneCount,
        targetMetWeeks: doneCount >= activity.targetCount ? 1 : 0,
        includedWeeks: 1,
        sortWeekIndex: weekIndex,
        categorySortOrder: activity.categorySortOrder,
        sortOrder: activity.sortOrder,
      });
    });
  });

  return Array.from(patternMap.values()).toSorted(compareHistoryPatternRows);
}

export function getHistoryWeekSummaryLine(week: HistoryWeekSummary) {
  return `${week.completedActivityDays} ${pluralize(
    week.completedActivityDays,
    "activity",
    "activities",
  )} completed`;
}

export function getHistoryTargetSummaryLine(week: HistoryWeekSummary) {
  return `${week.targetsMetCount} targets met · ${week.shortOfTargetCount} short of target`;
}

export function getHistoryPatternLine(pattern: HistoryPatternRow) {
  return `${pattern.completedDays} ${pluralize(
    pattern.completedDays,
    "day",
    "days",
  )} · target met ${pattern.targetMetWeeks} of ${pattern.includedWeeks} weeks`;
}

function compareHistoryPatternRows(left: HistoryPatternRow, right: HistoryPatternRow) {
  return (
    left.sortWeekIndex - right.sortWeekIndex ||
    left.categorySortOrder - right.categorySortOrder ||
    left.sortOrder - right.sortOrder ||
    left.activityName.localeCompare(right.activityName)
  );
}

async function getEndedHistoryWeeks(
  supabase: SupabaseClient,
  currentWeekStartDate: DateOnly,
) {
  const { data, error } = await supabase
    .from("weeks")
    .select(historyWeekSelect)
    .lt("week_start_date", currentWeekStartDate)
    .order("week_start_date", { ascending: false })
    .limit(12);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    weeks: ((data as HistoryWeekQueryRow[] | null) ?? []).map(toHistoryWeekRecord),
  };
}

function toHistoryWeekRecord(row: HistoryWeekQueryRow): HistoryWeekRecord {
  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    status: row.status,
    activities: (row.week_activities ?? []).map(toHistoryActivityRecord),
  };
}

function toHistoryActivityRecord(
  row: HistoryWeekActivityQueryRow,
): HistoryActivityRecord {
  return {
    id: row.id,
    activityTemplateId: row.activity_template_id,
    categoryName: row.category_name,
    categorySortOrder: row.category_sort_order,
    activityName: row.activity_name,
    targetCount: row.target_count,
    sortOrder: row.sort_order,
    doneDates: (row.activity_day_cells ?? [])
      .filter((cell) => cell.done)
      .map((cell) => cell.cell_date),
  };
}

function getHistoryActivityKey(activity: HistoryActivityRecord) {
  return (
    activity.activityTemplateId ??
    `${activity.categoryName.trim().toLowerCase()}:${activity.activityName
      .trim()
      .toLowerCase()}`
  );
}

function formatCompactDateRange(start: DateOnly, end: DateOnly) {
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(startDate);
  const endOptions: Intl.DateTimeFormatOptions =
    startDate.getUTCMonth() === endDate.getUTCMonth()
      ? { day: "numeric" }
      : { month: "short", day: "numeric" };
  const endLabel = new Intl.DateTimeFormat("en-US", endOptions).format(endDate);

  return `${startLabel}–${endLabel}`;
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

const historyWeekSelect =
  "id, week_start_date, week_end_date, status, week_activities(id, activity_template_id, category_name, category_sort_order, activity_name, target_count, sort_order, activity_day_cells(id, cell_date, done))";
