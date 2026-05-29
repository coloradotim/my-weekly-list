import { addDays, compareDateOnly, type DateOnly } from "@/lib/week/date";
import {
  buildThisWeekViewModel,
  type PersistedDayCell,
  type PersistedWeekActivity,
  type WeekRecord,
} from "@/lib/week/current";

export type TodayPreviewScenario =
  | "active"
  | "sunday"
  | "no-current-week"
  | "setup-needed";

export type TodayPreviewAction =
  | { type: "mark-done"; activityId: string }
  | { type: "move-today-plan"; activityId: string; toDate: DateOnly }
  | { type: "remove-today-plan"; activityId: string };

export type TodayPreviewState =
  | {
      status: "ready";
      scenario: Extract<TodayPreviewScenario, "active" | "sunday">;
      week: WeekRecord;
      today: DateOnly;
      activities: PersistedWeekActivity[];
    }
  | {
      status: "no-current-week" | "setup-needed";
      scenario: Extract<TodayPreviewScenario, "no-current-week" | "setup-needed">;
    };

export type TodayPreviewActivity = {
  id: string;
  categoryName: string;
  activityName: string;
  targetCount: number;
  doneCount: number;
  progressLabel: string;
  isPlannedToday: boolean;
  isDoneToday: boolean;
  canAdjustTodayPlan: boolean;
};

export type TodayPreviewView =
  | {
      status: "ready";
      scenario: Extract<TodayPreviewScenario, "active" | "sunday">;
      today: DateOnly;
      todayLabel: string;
      weekRangeLabel: string;
      isSunday: boolean;
      tomorrow: DateOnly | null;
      remainingMoveDates: DateOnly[];
      plannedToday: TodayPreviewActivity[];
      completedTodayExtras: TodayPreviewActivity[];
      unplannedOptions: TodayPreviewActivity[];
    }
  | {
      status: "no-current-week" | "setup-needed";
      scenario: Extract<TodayPreviewScenario, "no-current-week" | "setup-needed">;
      title: string;
      body: string;
      actionLabel: string;
    };

export function getInitialTodayPreviewState(
  scenario: TodayPreviewScenario = "active",
): TodayPreviewState {
  if (scenario === "no-current-week") {
    return { status: "no-current-week", scenario };
  }

  if (scenario === "setup-needed") {
    return { status: "setup-needed", scenario };
  }

  const isSunday = scenario === "sunday";

  return {
    status: "ready",
    scenario,
    week: {
      id: `today-preview-${scenario}`,
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      status: "active",
    },
    today: isSunday ? "2026-06-07" : "2026-06-04",
    activities: getTodayPreviewActivities(),
  };
}

export function getTodayPreviewView(state: TodayPreviewState): TodayPreviewView {
  if (state.status === "no-current-week") {
    return {
      status: "no-current-week",
      scenario: state.scenario,
      title: "Start this week first",
      body: "Today needs an active week before it can show planned items or record what happened.",
      actionLabel: "Go to This Week",
    };
  }

  if (state.status === "setup-needed") {
    return {
      status: "setup-needed",
      scenario: state.scenario,
      title: "Create your starter list first",
      body: "Set up the reusable categories and activities, then Today can help with the daily check-in.",
      actionLabel: "Go to Setup",
    };
  }

  const readyState = state as Extract<TodayPreviewState, { status: "ready" }>;
  const weekView = buildThisWeekViewModel({
    week: readyState.week,
    today: readyState.today,
    activities: readyState.activities,
  });
  const activities = weekView.categories.flatMap((category) =>
    category.activities.map((activity) => ({
      id: activity.id,
      categoryName: category.name,
      activityName: activity.activityName,
      targetCount: activity.targetCount,
      doneCount: activity.doneCount,
      progressLabel: `${activity.doneCount}/${activity.targetCount}`,
      isPlannedToday:
        activity.cells.find((cell) => cell.date === readyState.today)?.planned ?? false,
      isDoneToday:
        activity.cells.find((cell) => cell.date === readyState.today)?.done ?? false,
      canAdjustTodayPlan: false,
      cells: activity.cells,
    })),
  );
  const tomorrow = addDays(readyState.today, 1);
  const hasTomorrow = compareDateOnly(tomorrow, readyState.week.weekEndDate) <= 0;
  const remainingMoveDates = weekView.dayDates.filter(
    (date) => compareDateOnly(date, readyState.today) > 0,
  );
  const withTodayBehavior = activities.map<TodayPreviewActivity>((activity) => ({
    id: activity.id,
    categoryName: activity.categoryName,
    activityName: activity.activityName,
    targetCount: activity.targetCount,
    doneCount: activity.doneCount,
    progressLabel: activity.progressLabel,
    isPlannedToday: activity.isPlannedToday,
    isDoneToday: activity.isDoneToday,
    canAdjustTodayPlan: activity.isPlannedToday && !activity.isDoneToday,
  }));
  const plannedToday = withTodayBehavior.filter((activity) => activity.isPlannedToday);
  const completedTodayExtras = withTodayBehavior.filter(
    (activity) => activity.isDoneToday && !activity.isPlannedToday,
  );
  const unplannedOptions = withTodayBehavior.filter(
    (activity) => !activity.isDoneToday && !activity.isPlannedToday,
  );

  return {
    status: "ready",
    scenario: readyState.scenario,
    today: readyState.today,
    todayLabel: formatTodayLabel(readyState.today),
    weekRangeLabel: `${formatShortDate(readyState.week.weekStartDate)}-${formatShortDate(
      readyState.week.weekEndDate,
    )}`,
    isSunday: readyState.today === readyState.week.weekEndDate,
    tomorrow: hasTomorrow ? tomorrow : null,
    remainingMoveDates,
    plannedToday,
    completedTodayExtras,
    unplannedOptions,
  };
}

export function applyTodayPreviewAction(
  state: TodayPreviewState,
  action: TodayPreviewAction,
): TodayPreviewState {
  if (state.status !== "ready") {
    return state;
  }

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

      return removeTodayPlan(activity, state.today);
    }),
  };
}

function moveTodayPlan({
  activity,
  today,
  toDate,
  weekEndDate,
}: {
  activity: PersistedWeekActivity;
  today: DateOnly;
  toDate: DateOnly;
  weekEndDate: DateOnly;
}): PersistedWeekActivity {
  const todayCell = activity.cells.find((cell) => cell.cellDate === today);

  if (!todayCell?.planned || todayCell.done) {
    return activity;
  }

  if (compareDateOnly(toDate, today) <= 0 || compareDateOnly(toDate, weekEndDate) > 0) {
    return activity;
  }

  const withoutTodayPlan = upsertActivityCell(activity, today, (cell) => ({
    ...cell,
    planned: false,
  }));

  return upsertActivityCell(withoutTodayPlan, toDate, (cell) => ({
    ...cell,
    planned: true,
  }));
}

function removeTodayPlan(
  activity: PersistedWeekActivity,
  today: DateOnly,
): PersistedWeekActivity {
  const todayCell = activity.cells.find((cell) => cell.cellDate === today);

  if (!todayCell?.planned || todayCell.done) {
    return activity;
  }

  return upsertActivityCell(activity, today, (cell) => ({
    ...cell,
    planned: false,
  }));
}

function upsertActivityCell(
  activity: PersistedWeekActivity,
  cellDate: DateOnly,
  update: (cell: PersistedDayCell) => PersistedDayCell,
): PersistedWeekActivity {
  const existingCell = activity.cells.find((cell) => cell.cellDate === cellDate) ?? {
    id: `${activity.id}-${cellDate}`,
    cellDate,
    planned: false,
    done: false,
  };
  const nextCell = update(existingCell);
  const nextCells = activity.cells
    .filter((cell) => cell.cellDate !== cellDate)
    .concat(nextCell)
    .filter((cell) => cell.planned || cell.done);

  return { ...activity, cells: nextCells };
}

function getTodayPreviewActivities(): PersistedWeekActivity[] {
  return [
    activity({
      id: "today-walk",
      categoryName: "Physical Health",
      activityName: "Walk",
      targetCount: 4,
      sortOrder: 10,
      cells: [
        cell("walk-mon", "2026-06-01", true, true),
        cell("walk-tue", "2026-06-02", true, false),
        cell("walk-thu", "2026-06-04", true, false),
      ],
    }),
    activity({
      id: "today-yoga",
      categoryName: "Physical Health",
      activityName: "Yoga",
      targetCount: 2,
      sortOrder: 30,
      cells: [
        cell("yoga-wed", "2026-06-03", false, true),
        cell("yoga-sat", "2026-06-06", true, false),
      ],
    }),
    activity({
      id: "today-read",
      categoryName: "Mental Health",
      categorySortOrder: 20,
      activityName: "Read",
      targetCount: 5,
      sortOrder: 70,
      cells: [
        cell("read-tue", "2026-06-02", true, true),
        cell("read-thu", "2026-06-04", true, false),
        cell("read-fri", "2026-06-05", true, false),
      ],
    }),
    activity({
      id: "today-journal",
      categoryName: "Mental Health",
      categorySortOrder: 20,
      activityName: "Journal",
      targetCount: 1,
      sortOrder: 30,
      cells: [cell("journal-fri", "2026-06-05", true, false)],
    }),
    activity({
      id: "today-kid-time",
      categoryName: "Family and Home",
      categorySortOrder: 30,
      activityName: "Quality kid time",
      targetCount: 1,
      sortOrder: 10,
      cells: [cell("kid-thu", "2026-06-04", true, true)],
    }),
    activity({
      id: "today-singing",
      categoryName: "Hobbies",
      categorySortOrder: 50,
      activityName: "Singing practice",
      targetCount: 4,
      sortOrder: 10,
      cells: [
        cell("sing-wed", "2026-06-03", true, false),
        cell("sing-sun", "2026-06-07", true, false),
      ],
    }),
  ];
}

function activity({
  id,
  categoryName,
  categorySortOrder = 10,
  activityName,
  targetCount,
  sortOrder,
  cells,
}: {
  id: string;
  categoryName: string;
  categorySortOrder?: number;
  activityName: string;
  targetCount: number;
  sortOrder: number;
  cells: PersistedDayCell[];
}): PersistedWeekActivity {
  return {
    id,
    activityTemplateId: `template-${id}`,
    categoryId: `category-${categorySortOrder}`,
    categoryName,
    categorySortOrder,
    activityName,
    targetCount,
    sortOrder,
    cells,
  };
}

function cell(id: string, cellDate: DateOnly, planned: boolean, done: boolean) {
  return { id, cellDate, planned, done };
}

export function formatShortDate(date: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatWeekday(date: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTodayLabel(date: DateOnly) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}
