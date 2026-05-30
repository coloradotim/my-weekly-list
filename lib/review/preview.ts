import { addDays, type DateOnly } from "@/lib/week/date";

export type ReviewCell = {
  date: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
};

export type ReviewActivity = {
  categoryName: string;
  categoryOrder: number;
  id: string;
  name: string;
  targetCount: number;
  sortOrder: number;
  cells: ReviewCell[];
};

export type ReviewPreviewState = {
  weekStartDate: DateOnly;
  weekEndDate: DateOnly;
  today: DateOnly;
  isSundayCurrentWeek: boolean;
  activities: ReviewActivity[];
};

export type ReviewSummaryRow = {
  id: string;
  name: string;
  doneCount: number;
  targetCount: number;
  isTargetMet: boolean;
};

export type ReviewSummary = {
  completedActivityDays: number;
  targetsMet: ReviewSummaryRow[];
  shortOfTarget: ReviewSummaryRow[];
};

export type ReviewDetailDisplayState = "done" | "blank";

export function getReviewSummarySentence(summary: ReviewSummary) {
  return `You completed ${summary.completedActivityDays} activities this week.`;
}

export function getInitialReviewPreviewState(
  scenario: "past" | "sunday" = "past",
): ReviewPreviewState {
  const weekStartDate = "2026-05-25";
  const weekEndDate = "2026-05-31";

  return {
    weekStartDate,
    weekEndDate,
    today: scenario === "sunday" ? weekEndDate : "2026-06-04",
    isSundayCurrentWeek: scenario === "sunday",
    activities: [
      activity({
        categoryName: "Mental Health",
        categoryOrder: 20,
        id: "read",
        name: "Read",
        targetCount: 5,
        sortOrder: 10,
        doneDates: [
          "2026-05-25",
          "2026-05-26",
          "2026-05-27",
          "2026-05-28",
          "2026-05-29",
          "2026-05-31",
        ],
        plannedDates: [
          "2026-05-25",
          "2026-05-26",
          "2026-05-27",
          "2026-05-28",
          "2026-05-29",
        ],
      }),
      activity({
        categoryName: "Physical Health",
        categoryOrder: 10,
        id: "walk",
        name: "Walk",
        targetCount: 4,
        sortOrder: 20,
        doneDates: ["2026-05-25", "2026-05-27", "2026-05-29", "2026-05-31"],
        plannedDates: ["2026-05-25", "2026-05-27", "2026-05-29", "2026-05-31"],
      }),
      activity({
        categoryName: "Family and Home",
        categoryOrder: 30,
        id: "quality-kid-time",
        name: "Quality kid time",
        targetCount: 2,
        sortOrder: 30,
        doneDates: ["2026-05-26", "2026-05-30"],
        plannedDates: ["2026-05-26", "2026-05-30"],
      }),
      activity({
        categoryName: "Physical Health",
        categoryOrder: 10,
        id: "yoga",
        name: "Yoga",
        targetCount: 2,
        sortOrder: 40,
        doneDates: ["2026-05-28"],
        plannedDates: ["2026-05-26", "2026-05-28"],
      }),
      activity({
        categoryName: "Mental Health",
        categoryOrder: 20,
        id: "journal",
        name: "Journal",
        targetCount: 3,
        sortOrder: 50,
        doneDates: ["2026-05-25", "2026-05-27"],
        plannedDates: ["2026-05-25", "2026-05-27", "2026-05-30"],
      }),
      activity({
        categoryName: "Mental Health",
        categoryOrder: 20,
        id: "meditation",
        name: "Meditation",
        targetCount: 3,
        sortOrder: 60,
        doneDates: ["2026-05-30", "2026-05-31"],
        plannedDates: ["2026-05-25", "2026-05-28", "2026-05-31"],
        skippedDates: ["2026-05-28"],
      }),
    ],
  };
}

export function buildReviewSummary(state: ReviewPreviewState): ReviewSummary {
  const rows = state.activities
    .toSorted((left, right) => left.sortOrder - right.sortOrder)
    .map((activity) => {
      const doneCount = activity.cells.filter((cell) => cell.done).length;

      return {
        id: activity.id,
        name: activity.name,
        doneCount,
        targetCount: activity.targetCount,
        isTargetMet: doneCount >= activity.targetCount,
      };
    });

  return {
    completedActivityDays: rows.reduce((total, row) => total + row.doneCount, 0),
    targetsMet: rows.filter((row) => row.isTargetMet),
    shortOfTarget: rows.filter((row) => !row.isTargetMet),
  };
}

export function applyReviewCompletionToggle({
  state,
  activityId,
  date,
}: {
  state: ReviewPreviewState;
  activityId: string;
  date: DateOnly;
}): ReviewPreviewState {
  return {
    ...state,
    activities: state.activities.map((activity) => {
      if (activity.id !== activityId) {
        return activity;
      }

      return {
        ...activity,
        cells: activity.cells.map((cell) => {
          if (cell.date !== date) {
            return cell;
          }

          if (cell.done) {
            return {
              ...cell,
              done: false,
              skipped: false,
            };
          }

          return {
            ...cell,
            done: true,
            skipped: false,
          };
        }),
      };
    }),
  };
}

export function getReviewDetailDisplayState(
  cell: Pick<ReviewCell, "done">,
): ReviewDetailDisplayState {
  return cell.done ? "done" : "blank";
}

export function findReviewCell(
  state: ReviewPreviewState,
  activityId: string,
  date: DateOnly,
) {
  return state.activities
    .find((activity) => activity.id === activityId)
    ?.cells.find((cell) => cell.date === date);
}

export function getReviewDayDates(weekStartDate: DateOnly) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
}

function activity({
  categoryName,
  categoryOrder,
  id,
  name,
  targetCount,
  sortOrder,
  doneDates,
  plannedDates,
  skippedDates = [],
}: {
  categoryName: string;
  categoryOrder: number;
  id: string;
  name: string;
  targetCount: number;
  sortOrder: number;
  doneDates: DateOnly[];
  plannedDates: DateOnly[];
  skippedDates?: DateOnly[];
}): ReviewActivity {
  const planned = new Set(plannedDates);
  const done = new Set(doneDates);
  const skipped = new Set(skippedDates);

  return {
    categoryName,
    categoryOrder,
    id,
    name,
    targetCount,
    sortOrder,
    cells: getReviewDayDates("2026-05-25").map((date) => ({
      date,
      planned: planned.has(date),
      done: done.has(date),
      skipped: skipped.has(date),
    })),
  };
}
