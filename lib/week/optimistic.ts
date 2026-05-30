import {
  canCorrectTodayCellFromWeek,
  canTogglePlanningCell,
  getCellVisualState,
  type ThisWeekViewModel,
  type WeekGridCell,
} from "@/lib/week/current";
import type { DateOnly } from "@/lib/week/date";

export type PlanningCellKey = `${string}:${DateOnly}`;

export function getPlanningCellKey(activityId: string, cellDate: DateOnly) {
  return `${activityId}:${cellDate}` as PlanningCellKey;
}

export function getOptimisticPlannedValue(cell: WeekGridCell) {
  return cell.isPlanningEditable ? !cell.planned : cell.planned;
}

export function getOptimisticWeekCellFacts(cell: WeekGridCell) {
  if (cell.done) {
    return { planned: cell.planned, done: false, skipped: false };
  }

  if (cell.skipped) {
    return { planned: true, done: false, skipped: false };
  }

  if (cell.isPlanningEditable) {
    return { planned: !cell.planned, done: false, skipped: false };
  }

  return null;
}

export function applyOptimisticWeekCellFacts({
  view,
  activityId,
  cellDate,
  planned,
  done,
  skipped,
}: {
  view: ThisWeekViewModel;
  activityId: string;
  cellDate: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
}) {
  let changed = false;
  const nextCategories = view.categories.map((category) => ({
    ...category,
    activities: category.activities.map((activity) => {
      if (activity.id !== activityId) {
        return activity;
      }

      const nextCells = activity.cells.map((cell) => {
        if (
          cell.date !== cellDate ||
          (!cell.isPlanningEditable && !cell.isTodayCorrectionEditable)
        ) {
          return cell;
        }

        changed = true;
        return buildOptimisticWeekCell({
          view,
          cell,
          planned,
          done,
          skipped,
        });
      });

      return { ...activity, cells: nextCells };
    }),
  }));

  if (!changed) {
    return view;
  }

  return {
    ...view,
    categories: nextCategories,
    isEditable: nextCategories.some((category) =>
      category.activities.some((activity) =>
        activity.cells.some((cell) => cell.isPlanningEditable),
      ),
    ),
  };
}

export function applyOptimisticPlanningCell({
  view,
  activityId,
  cellDate,
  planned,
}: {
  view: ThisWeekViewModel;
  activityId: string;
  cellDate: DateOnly;
  planned: boolean;
}) {
  return applyOptimisticWeekCellFacts({
    view,
    activityId,
    cellDate,
    planned,
    done: false,
    skipped: false,
  });
}

function buildOptimisticWeekCell({
  view,
  cell,
  planned,
  done,
  skipped,
}: {
  view: ThisWeekViewModel;
  cell: WeekGridCell;
  planned: boolean;
  done: boolean;
  skipped: boolean;
}): WeekGridCell {
  const state = getCellVisualState({
    weekStatus: view.week.status,
    date: cell.date,
    today: view.today,
    planned,
    done,
    skipped,
  });

  return {
    ...cell,
    planned,
    done,
    skipped,
    state,
    isPlanningEditable: canTogglePlanningCell({
      weekStatus: view.week.status,
      date: cell.date,
      today: view.today,
      planned,
      done,
      skipped,
      state,
    }),
    isTodayCorrectionEditable: canCorrectTodayCellFromWeek({
      week: view.week,
      date: cell.date,
      today: view.today,
      done,
      skipped,
    }),
  };
}
