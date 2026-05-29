import {
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
  let changed = false;
  const nextCategories = view.categories.map((category) => ({
    ...category,
    activities: category.activities.map((activity) => {
      if (activity.id !== activityId) {
        return activity;
      }

      const nextCells = activity.cells.map((cell) => {
        if (cell.date !== cellDate || !cell.isPlanningEditable) {
          return cell;
        }

        changed = true;
        return buildOptimisticPlanningCell({
          view,
          cell,
          planned,
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

function buildOptimisticPlanningCell({
  view,
  cell,
  planned,
}: {
  view: ThisWeekViewModel;
  cell: WeekGridCell;
  planned: boolean;
}): WeekGridCell {
  return {
    ...cell,
    planned,
    state: getCellVisualState({
      weekStatus: view.week.status,
      date: cell.date,
      today: view.today,
      planned,
      done: cell.done,
    }),
  };
}
