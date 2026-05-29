import {
  buildThisWeekViewModel,
  getNextPlanningCellFacts,
  type PersistedWeekActivity,
  type ThisWeekViewModel,
} from "@/lib/week/current";
import type { WeekStatus } from "@/lib/week/lifecycle";

export type WeekPreviewScenario = "active" | "draft" | "closed";

export function isDevPreviewEnabled(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== "production";
}

export const isDevWeekPreviewEnabled = isDevPreviewEnabled;

export function getInitialWeekPreviewView(
  scenario: WeekPreviewScenario = "active",
): ThisWeekViewModel {
  const scenarioConfig = getScenarioConfig(scenario);

  return buildThisWeekViewModel({
    week: {
      id: `preview-${scenario}-week`,
      weekStartDate: scenarioConfig.weekStartDate,
      weekEndDate: scenarioConfig.weekEndDate,
      status: scenarioConfig.status,
    },
    today: scenarioConfig.today,
    activities: getInitialWeekPreviewActivities(),
  });
}

export function applyPreviewPlanningToggle({
  view,
  activityId,
  cellDate,
}: {
  view: ThisWeekViewModel;
  activityId: string;
  cellDate: string;
}): ThisWeekViewModel {
  const activities = view.categories.flatMap((category) =>
    category.activities.map<PersistedWeekActivity>((activity) => {
      const cells = activity.cells
        .map((cell) => ({
          id: `${activity.id}-${cell.date}`,
          cellDate: cell.date,
          planned: cell.planned,
          done: cell.done,
        }))
        .filter((cell) => cell.planned || cell.done);
      const existingCell = cells.find((cell) => cell.cellDate === cellDate) ?? null;

      if (activity.id !== activityId) {
        return {
          id: activity.id,
          activityTemplateId: null,
          categoryId: null,
          categoryName: category.name,
          categorySortOrder: category.sortOrder,
          activityName: activity.activityName,
          targetCount: activity.targetCount,
          sortOrder: activity.sortOrder,
          cells,
        };
      }

      const targetCell = activity.cells.find((cell) => cell.date === cellDate);
      const nextFacts = targetCell?.isPlanningEditable
        ? getNextPlanningCellFacts({ currentCell: existingCell })
        : existingCell;
      const nextCells = cells.filter((cell) => cell.cellDate !== cellDate);

      if (nextFacts) {
        nextCells.push({
          id: `${activity.id}-${cellDate}`,
          cellDate,
          ...nextFacts,
        });
      }

      return {
        id: activity.id,
        activityTemplateId: null,
        categoryId: null,
        categoryName: category.name,
        categorySortOrder: category.sortOrder,
        activityName: activity.activityName,
        targetCount: activity.targetCount,
        sortOrder: activity.sortOrder,
        cells: nextCells,
      };
    }),
  );

  return buildThisWeekViewModel({
    week: view.week,
    today: view.today,
    activities,
  });
}

function getScenarioConfig(scenario: WeekPreviewScenario): {
  status: WeekStatus;
  weekStartDate: string;
  weekEndDate: string;
  today: string;
} {
  if (scenario === "draft") {
    return {
      status: "draft",
      weekStartDate: "2026-06-08",
      weekEndDate: "2026-06-14",
      today: "2026-06-04",
    };
  }

  if (scenario === "closed") {
    return {
      status: "closed",
      weekStartDate: "2026-05-25",
      weekEndDate: "2026-05-31",
      today: "2026-06-04",
    };
  }

  return {
    status: "active",
    weekStartDate: "2026-06-01",
    weekEndDate: "2026-06-07",
    today: "2026-06-04",
  };
}

function getInitialWeekPreviewActivities(): PersistedWeekActivity[] {
  return [
    {
      id: "preview-walk",
      activityTemplateId: "template-walk",
      categoryId: "category-physical",
      categoryName: "Physical Health",
      categorySortOrder: 10,
      activityName: "Walk",
      targetCount: 4,
      sortOrder: 10,
      cells: [
        { id: "walk-mon", cellDate: "2026-06-01", planned: true, done: true },
        { id: "walk-tue", cellDate: "2026-06-02", planned: true, done: false },
        { id: "walk-thu", cellDate: "2026-06-04", planned: true, done: false },
      ],
    },
    {
      id: "preview-yoga",
      activityTemplateId: "template-yoga",
      categoryId: "category-physical",
      categoryName: "Physical Health",
      categorySortOrder: 10,
      activityName: "Yoga",
      targetCount: 2,
      sortOrder: 30,
      cells: [
        { id: "yoga-wed", cellDate: "2026-06-03", planned: false, done: true },
        { id: "yoga-sat", cellDate: "2026-06-06", planned: true, done: false },
      ],
    },
    {
      id: "preview-read",
      activityTemplateId: "template-read",
      categoryId: "category-mental",
      categoryName: "Mental Health",
      categorySortOrder: 20,
      activityName: "Read",
      targetCount: 5,
      sortOrder: 70,
      cells: [
        { id: "read-mon", cellDate: "2026-06-01", planned: true, done: false },
        { id: "read-tue", cellDate: "2026-06-02", planned: true, done: true },
        { id: "read-thu", cellDate: "2026-06-04", planned: true, done: false },
        { id: "read-fri", cellDate: "2026-06-05", planned: true, done: false },
      ],
    },
    {
      id: "preview-journal",
      activityTemplateId: "template-journal",
      categoryId: "category-mental",
      categoryName: "Mental Health",
      categorySortOrder: 20,
      activityName: "Journal",
      targetCount: 1,
      sortOrder: 30,
      cells: [{ id: "journal-fri", cellDate: "2026-06-05", planned: true, done: false }],
    },
    {
      id: "preview-kid-time",
      activityTemplateId: "template-kid-time",
      categoryId: "category-family",
      categoryName: "Family and Home",
      categorySortOrder: 30,
      activityName: "Quality kid time",
      targetCount: 1,
      sortOrder: 10,
      cells: [{ id: "kid-time-thu", cellDate: "2026-06-04", planned: false, done: true }],
    },
    {
      id: "preview-singing",
      activityTemplateId: "template-singing",
      categoryId: "category-hobbies",
      categoryName: "Hobbies",
      categorySortOrder: 50,
      activityName: "Singing practice",
      targetCount: 4,
      sortOrder: 10,
      cells: [
        { id: "singing-wed", cellDate: "2026-06-03", planned: true, done: false },
        { id: "singing-sun", cellDate: "2026-06-07", planned: true, done: false },
      ],
    },
  ];
}
