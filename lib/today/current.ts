import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCurrentWeekFromTemplates,
  loadThisWeek,
  type ThisWeekLoadState,
  type WeekRecord,
} from "@/lib/week/current";
import { addDays, compareDateOnly, type DateOnly } from "@/lib/week/date";

export type TodayLoadState =
  | { status: "needs-setup" }
  | {
      status: "no-current-week";
      weekStartDate: DateOnly;
      weekEndDate: DateOnly;
      isLateStart: boolean;
    }
  | { status: "ready"; state: TodayState }
  | { status: "error"; message: string };

export type TodayDayCell = {
  date: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
};

export type TodayActivityRecord = {
  id: string;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  cells: TodayDayCell[];
};

export type TodayState = {
  week: WeekRecord;
  today: DateOnly;
  activities: TodayActivityRecord[];
};

export type TodayActivity = {
  id: string;
  categoryName: string;
  categorySortOrder: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  doneCount: number;
  progressLabel: string;
  isPlannedToday: boolean;
  isDoneToday: boolean;
  isSkippedToday: boolean;
  moveDates: TodayMoveDate[];
};

export type TodayMoveDate = {
  date: DateOnly;
  weekdayLabel: string;
};

export type TodayPickerGroup = {
  categoryName: string;
  activities: TodayActivity[];
};

export type TodayViewModel = {
  week: WeekRecord;
  today: DateOnly;
  todayLabel: string;
  weekRangeLabel: string;
  isSunday: boolean;
  remainingMoveDates: TodayMoveDate[];
  openPlannedToday: TodayActivity[];
  doneToday: TodayActivity[];
  skippedToday: TodayActivity[];
  unplannedOptions: TodayActivity[];
  pickerGroups: TodayPickerGroup[];
};

export type TodayOptimisticAction =
  | { type: "mark-done"; activityId: string }
  | { type: "undo-done"; activityId: string }
  | { type: "skip-today"; activityId: string }
  | { type: "undo-skip"; activityId: string }
  | { type: "move-today-plan"; activityId: string; toDate: DateOnly }
  | { type: "undo-move-today-plan"; activityId: string; fromDate: DateOnly };

export async function loadToday(
  supabase: SupabaseClient,
  options: { ensureCurrentWeekForUserId?: string } = {},
): Promise<TodayLoadState> {
  const weekState = await loadThisWeek(supabase);

  if (weekState.status === "no-current-week" && options.ensureCurrentWeekForUserId) {
    const created = await createCurrentWeekFromTemplates({
      supabase,
      userId: options.ensureCurrentWeekForUserId,
    });

    if (created.status === "needs-setup") {
      return { status: "needs-setup" };
    }

    if (created.status === "error") {
      return { status: "error", message: created.message };
    }

    const refreshedWeekState = await loadThisWeek(supabase);

    if (refreshedWeekState.status !== "ready") {
      return refreshedWeekState.status === "no-current-week"
        ? {
            status: "error",
            message: "Today could not find the current week after creating it.",
          }
        : refreshedWeekState;
    }

    return {
      status: "ready",
      state: toTodayState(refreshedWeekState),
    };
  }

  if (weekState.status !== "ready") {
    return weekState;
  }

  return {
    status: "ready",
    state: toTodayState(weekState),
  };
}

export function toTodayState(weekState: Extract<ThisWeekLoadState, { status: "ready" }>) {
  return {
    week: weekState.view.week,
    today: weekState.view.today,
    activities: weekState.view.categories.flatMap((category) =>
      category.activities.map<TodayActivityRecord>((activity) => ({
        id: activity.id,
        categoryName: category.name,
        categorySortOrder: category.sortOrder,
        activityName: activity.activityName,
        targetCount: activity.targetCount,
        sortOrder: activity.sortOrder,
        cells: activity.cells.map((cell) => ({
          date: cell.date,
          planned: cell.planned,
          done: cell.done,
          skipped: cell.skipped,
        })),
      })),
    ),
  } satisfies TodayState;
}

export function buildTodayViewModel(state: TodayState): TodayViewModel {
  const remainingMoveDates = getRemainingMoveDates({
    today: state.today,
    weekEndDate: state.week.weekEndDate,
  });
  const activities = state.activities
    .toSorted(compareTodayActivities)
    .map<TodayActivity>((activity) => {
      const todayCell = activity.cells.find((cell) => cell.date === state.today);
      const doneCount = activity.cells.filter((cell) => cell.done).length;

      return {
        id: activity.id,
        categoryName: activity.categoryName,
        categorySortOrder: activity.categorySortOrder,
        activityName: activity.activityName,
        targetCount: activity.targetCount,
        sortOrder: activity.sortOrder,
        doneCount,
        progressLabel: `${doneCount}/${activity.targetCount}`,
        isPlannedToday: todayCell?.planned ?? false,
        isDoneToday: todayCell?.done ?? false,
        isSkippedToday: todayCell?.skipped ?? false,
        moveDates: getAvailableMoveDates({
          today: state.today,
          weekEndDate: state.week.weekEndDate,
          cells: activity.cells,
        }),
      };
    });
  const openPlannedToday = activities.filter(
    (activity) =>
      activity.isPlannedToday && !activity.isDoneToday && !activity.isSkippedToday,
  );
  const doneToday = activities.filter((activity) => activity.isDoneToday);
  const skippedToday = activities.filter(
    (activity) =>
      activity.isPlannedToday && activity.isSkippedToday && !activity.isDoneToday,
  );
  const unplannedOptions = activities.filter(
    (activity) =>
      !activity.isDoneToday && !activity.isPlannedToday && !activity.isSkippedToday,
  );

  return {
    week: state.week,
    today: state.today,
    todayLabel: formatTodayLabel(state.today),
    weekRangeLabel: `${formatShortDate(state.week.weekStartDate)}-${formatShortDate(
      state.week.weekEndDate,
    )}`,
    isSunday: state.today === state.week.weekEndDate,
    remainingMoveDates,
    openPlannedToday,
    doneToday,
    skippedToday,
    unplannedOptions,
    pickerGroups: groupActivitiesByCategory(unplannedOptions),
  };
}

export function applyOptimisticTodayAction(
  state: TodayState,
  action: TodayOptimisticAction,
): TodayState {
  return {
    ...state,
    activities: state.activities.map((activity) => {
      if (activity.id !== action.activityId) {
        return activity;
      }

      if (action.type === "mark-done") {
        return upsertActivityCell(activity, state.today, (cell) => ({
          ...cell,
          done: true,
          skipped: false,
        }));
      }

      if (action.type === "undo-done") {
        return upsertActivityCell(activity, state.today, (cell) => ({
          ...cell,
          done: false,
          skipped: false,
        }));
      }

      if (action.type === "skip-today") {
        return upsertActivityCell(activity, state.today, (cell) => ({
          ...cell,
          planned: true,
          done: false,
          skipped: true,
        }));
      }

      if (action.type === "undo-skip") {
        return upsertActivityCell(activity, state.today, (cell) => ({
          ...cell,
          planned: true,
          skipped: false,
        }));
      }

      if (action.type === "move-today-plan") {
        return moveTodayPlan({
          activity,
          today: state.today,
          toDate: action.toDate,
          weekEndDate: state.week.weekEndDate,
        });
      }

      return undoMoveTodayPlan({
        activity,
        today: state.today,
        fromDate: action.fromDate,
      });
    }),
  };
}

export function getRemainingMoveDates({
  today,
  weekEndDate,
}: {
  today: DateOnly;
  weekEndDate: DateOnly;
}) {
  const dates: TodayMoveDate[] = [];
  let candidate = addDays(today, 1);

  while (compareDateOnly(candidate, weekEndDate) <= 0) {
    dates.push({ date: candidate, weekdayLabel: formatWeekday(candidate) });
    candidate = addDays(candidate, 1);
  }

  return dates;
}

export function getAvailableMoveDates({
  today,
  weekEndDate,
  cells,
}: {
  today: DateOnly;
  weekEndDate: DateOnly;
  cells: Pick<TodayDayCell, "date" | "planned" | "done">[];
}) {
  const blockedDates = new Set(
    cells
      .filter(
        (cell) => compareDateOnly(cell.date, today) > 0 && (cell.planned || cell.done),
      )
      .map((cell) => cell.date),
  );

  return getRemainingMoveDates({ today, weekEndDate }).filter(
    (moveDate) => !blockedDates.has(moveDate.date),
  );
}

function moveTodayPlan({
  activity,
  today,
  toDate,
  weekEndDate,
}: {
  activity: TodayActivityRecord;
  today: DateOnly;
  toDate: DateOnly;
  weekEndDate: DateOnly;
}) {
  if (compareDateOnly(toDate, today) <= 0 || compareDateOnly(toDate, weekEndDate) > 0) {
    return activity;
  }

  const destinationCell = activity.cells.find((cell) => cell.date === toDate);

  if (destinationCell?.planned || destinationCell?.done) {
    return activity;
  }

  const withoutTodayPlan = upsertActivityCell(activity, today, (cell) => ({
    ...cell,
    planned: false,
    skipped: false,
  }));

  return upsertActivityCell(withoutTodayPlan, toDate, (cell) => ({
    ...cell,
    planned: true,
    done: false,
    skipped: false,
  }));
}

function undoMoveTodayPlan({
  activity,
  today,
  fromDate,
}: {
  activity: TodayActivityRecord;
  today: DateOnly;
  fromDate: DateOnly;
}) {
  const withoutMovedPlan = upsertActivityCell(activity, fromDate, (cell) => ({
    ...cell,
    planned: false,
    skipped: false,
  }));

  return upsertActivityCell(withoutMovedPlan, today, (cell) => ({
    ...cell,
    planned: true,
    done: false,
    skipped: false,
  }));
}

function upsertActivityCell(
  activity: TodayActivityRecord,
  date: DateOnly,
  buildCell: (cell: TodayDayCell) => TodayDayCell,
) {
  const existingCell = activity.cells.find((cell) => cell.date === date);
  const nextCell = buildCell(
    existingCell ?? {
      date,
      planned: false,
      done: false,
      skipped: false,
    },
  );

  if (!nextCell.planned && !nextCell.done && !nextCell.skipped) {
    return {
      ...activity,
      cells: activity.cells.filter((cell) => cell.date !== date),
    };
  }

  if (!existingCell) {
    return {
      ...activity,
      cells: [...activity.cells, nextCell].toSorted((left, right) =>
        compareDateOnly(left.date, right.date),
      ),
    };
  }

  return {
    ...activity,
    cells: activity.cells.map((cell) => (cell.date === date ? nextCell : cell)),
  };
}

function groupActivitiesByCategory(activities: TodayActivity[]): TodayPickerGroup[] {
  const groups = new Map<string, TodayActivity[]>();

  activities.forEach((activity) => {
    const group = groups.get(activity.categoryName) ?? [];
    group.push(activity);
    groups.set(activity.categoryName, group);
  });

  return Array.from(groups.entries()).map(([categoryName, groupActivities]) => ({
    categoryName,
    activities: groupActivities,
  }));
}

function compareTodayActivities(left: TodayActivityRecord, right: TodayActivityRecord) {
  return (
    left.categorySortOrder - right.categorySortOrder ||
    left.categoryName.localeCompare(right.categoryName) ||
    left.sortOrder - right.sortOrder ||
    left.activityName.localeCompare(right.activityName)
  );
}

function formatTodayLabel(date: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatShortDate(date: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatWeekday(date: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}
