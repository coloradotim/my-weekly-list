import {
  addDays,
  compareDateOnly,
  daysBetween,
  getWeekEndDate,
  getWeekRange,
  getWeekRelation,
  getWeekStartDate,
  isSunday,
  maxDateOnly,
  type DateOnly,
} from "@/lib/week/date";

export const weekStatuses = ["draft", "active", "needs_review", "closed"] as const;

export type WeekStatus = (typeof weekStatuses)[number];

export type WeekLifecycleRecord = {
  id: string;
  weekStartDate: DateOnly;
  status: WeekStatus;
  createdDate?: DateOnly;
};

export type WeekLifecycleTransition =
  | {
      status: "unchanged";
      week: WeekLifecycleRecord;
    }
  | {
      status: "transition";
      from: WeekStatus;
      to: WeekStatus;
      week: WeekLifecycleRecord;
    };

export type CurrentWeekDecision =
  | {
      status: "activate_draft";
      week: WeekLifecycleRecord;
    }
  | {
      status: "use_active";
      week: WeekLifecycleRecord;
    }
  | {
      status: "create_current_week";
      weekStartDate: DateOnly;
      weekEndDate: DateOnly;
      isLateStart: boolean;
      firstPlannableDate: DateOnly;
    };

export type AppWeekStatusDecision = {
  currentWeek: CurrentWeekDecision;
  reviewableWeeks: WeekLifecycleRecord[];
  ghostWeekStartDates: DateOnly[];
};

export type ActivityCellStateInput = {
  weekExists: boolean;
  weekStatus: WeekStatus;
  cellDate: DateOnly;
  today: DateOnly;
  planned: boolean;
  done: boolean;
};

export function normalizeWeek(week: WeekLifecycleRecord): WeekLifecycleRecord {
  return {
    ...week,
    weekStartDate: getWeekStartDate(week.weekStartDate),
  };
}

export function getLifecycleTransition(
  week: WeekLifecycleRecord,
  today: DateOnly,
): WeekLifecycleTransition {
  const normalizedWeek = normalizeWeek(week);

  if (normalizedWeek.status === "closed") {
    return { status: "unchanged", week: normalizedWeek };
  }

  const relation = getWeekRelation(normalizedWeek.weekStartDate, today);

  if (normalizedWeek.status === "draft") {
    if (relation === "future") {
      return { status: "unchanged", week: normalizedWeek };
    }

    const nextStatus: WeekStatus = relation === "current" ? "active" : "needs_review";
    return {
      status: "transition",
      from: "draft",
      to: nextStatus,
      week: {
        ...normalizedWeek,
        status: nextStatus,
      },
    };
  }

  if (normalizedWeek.status === "active" && relation === "past") {
    return {
      status: "transition",
      from: "active",
      to: "needs_review",
      week: {
        ...normalizedWeek,
        status: "needs_review",
      },
    };
  }

  return { status: "unchanged", week: normalizedWeek };
}

export function closeReviewWeek(week: WeekLifecycleRecord): WeekLifecycleRecord {
  const normalizedWeek = normalizeWeek(week);

  if (normalizedWeek.status === "closed") {
    return normalizedWeek;
  }

  if (normalizedWeek.status !== "needs_review") {
    throw new Error("Only a Needs Review week can be closed.");
  }

  return {
    ...normalizedWeek,
    status: "closed",
  };
}

export function assertWeekIsEditable(week: WeekLifecycleRecord) {
  if (week.status === "closed") {
    throw new Error("Closed weeks are view-only.");
  }
}

export function canEditWeekStructure(status: WeekStatus) {
  return status === "draft";
}

export function canEditDayPlanning(status: WeekStatus) {
  return status === "draft" || status === "active";
}

export function shouldShowSundayPrompt({
  today,
  currentWeek,
}: {
  today: DateOnly;
  currentWeek: WeekLifecycleRecord | null;
}) {
  return (
    isSunday(today) &&
    currentWeek?.status === "active" &&
    getWeekRelation(currentWeek.weekStartDate, today) === "current"
  );
}

export function getCurrentWeekDecision({
  weeks,
  today,
}: {
  weeks: WeekLifecycleRecord[];
  today: DateOnly;
}): CurrentWeekDecision {
  const currentWeekStart = getWeekStartDate(today);
  const currentWeekEnd = getWeekEndDate(currentWeekStart);
  const currentPeriodWeeks = weeks
    .map(normalizeWeek)
    .filter((week) => week.weekStartDate === currentWeekStart);
  const activeWeek = currentPeriodWeeks.find((week) => week.status === "active");

  if (activeWeek) {
    return {
      status: "use_active",
      week: activeWeek,
    };
  }

  const draftWeek = currentPeriodWeeks.find((week) => week.status === "draft");

  if (draftWeek) {
    return {
      status: "activate_draft",
      week: {
        ...draftWeek,
        status: "active",
      },
    };
  }

  return {
    status: "create_current_week",
    weekStartDate: currentWeekStart,
    weekEndDate: currentWeekEnd,
    isLateStart: compareDateOnly(today, currentWeekStart) > 0,
    firstPlannableDate: getFirstPlannableDateForNewCurrentWeek({
      weekStartDate: currentWeekStart,
      createdDate: today,
    }),
  };
}

export function getAppWeekStatusDecision({
  weeks,
  today,
}: {
  weeks: WeekLifecycleRecord[];
  today: DateOnly;
}): AppWeekStatusDecision {
  const transitionedWeeks = weeks.map((week) => getLifecycleTransition(week, today).week);

  return {
    currentWeek: getCurrentWeekDecision({
      weeks: transitionedWeeks,
      today,
    }),
    reviewableWeeks: transitionedWeeks.filter((week) => week.status === "needs_review"),
    ghostWeekStartDates: [],
  };
}

export function getFirstPlannableDateForNewCurrentWeek({
  weekStartDate,
  createdDate,
}: {
  weekStartDate: DateOnly;
  createdDate: DateOnly;
}) {
  const normalizedWeekStart = getWeekStartDate(weekStartDate);
  const weekEndDate = getWeekEndDate(normalizedWeekStart);

  if (compareDateOnly(createdDate, weekEndDate) > 0) {
    return weekEndDate;
  }

  return maxDateOnly(normalizedWeekStart, createdDate);
}

export function getDefaultPlannableDatesForNewCurrentWeek({
  weekStartDate,
  createdDate,
}: {
  weekStartDate: DateOnly;
  createdDate: DateOnly;
}) {
  const firstPlannableDate = getFirstPlannableDateForNewCurrentWeek({
    weekStartDate,
    createdDate,
  });
  const weekEndDate = getWeekEndDate(weekStartDate);
  const dayCount = daysBetween(firstPlannableDate, weekEndDate);

  return Array.from({ length: dayCount + 1 }, (_, index) =>
    addDays(firstPlannableDate, index),
  );
}

export function isCellMissed({
  weekExists,
  weekStatus,
  cellDate,
  today,
  planned,
  done,
}: {
  weekExists: boolean;
  weekStatus: WeekStatus;
  cellDate: DateOnly;
  today: DateOnly;
  planned: boolean;
  done: boolean;
}) {
  return (
    weekExists &&
    weekStatus !== "draft" &&
    planned &&
    !done &&
    compareDateOnly(cellDate, today) < 0
  );
}

export function getWeekRangeForLifecycle(date: DateOnly) {
  return getWeekRange(date);
}
