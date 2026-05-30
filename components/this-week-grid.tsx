import type { ReactNode } from "react";
import {
  weekDayLabels,
  type CellVisualState,
  type ThisWeekViewModel,
  type WeekGridActivity,
  type WeekGridCell,
} from "@/lib/week/current";

type WeekNotice = {
  tone: "success" | "error" | "neutral";
  body: string;
} | null;

type PlanningControlRenderer = ({
  activity,
  cell,
  children,
  className,
  ariaLabel,
}: {
  activity: WeekGridActivity;
  cell: WeekGridCell;
  children: ReactNode;
  className: string;
  ariaLabel: string;
}) => ReactNode;

export function ThisWeekGrid({
  view,
  notice,
  renderPlanningControl,
  showStatusPanel = true,
  collapsedCategoryNames = [],
  onToggleCategory,
}: {
  view: ThisWeekViewModel;
  notice: WeekNotice;
  renderPlanningControl: PlanningControlRenderer;
  showStatusPanel?: boolean;
  collapsedCategoryNames?: string[];
  onToggleCategory?: (categoryName: string) => void;
}) {
  const collapsedCategorySet = new Set(collapsedCategoryNames);
  const canCollapseCategories = Boolean(onToggleCategory);

  return (
    <section className="space-y-2 sm:space-y-3">
      {showStatusPanel ? (
        <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clay">
              {formatStatus(view.week.status)}
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-700">
              {view.isEditable
                ? "Tap blank or planned circles to adjust the plan."
                : "This week is view-only."}
            </p>
          </div>
          {notice ? <Notice tone={notice.tone} body={notice.body} /> : null}
        </div>
      ) : null}

      <div
        data-week-grid-scroll
        data-initial-scroll={view.week.status === "active" ? "today" : "monday"}
        className="snap-x snap-mandatory scroll-pl-[116px] overflow-x-auto rounded-lg border border-stone-200 bg-white/85 shadow-soft sm:scroll-pl-[172px]"
      >
        <div className="grid min-w-[620px] grid-cols-[minmax(116px,0.9fr)_repeat(7,minmax(52px,1fr))] pr-12 text-sm sm:min-w-[800px] sm:grid-cols-[minmax(172px,1.35fr)_repeat(7,minmax(66px,1fr))] sm:pr-0">
          <div className="sticky left-0 z-20 border-b border-r border-stone-200 bg-white px-2 py-2 font-semibold text-stone-700 sm:px-3 sm:py-3">
            Activity
          </div>
          {view.dayDates.map((date, index) => (
            <div
              key={date}
              data-week-day-index={index}
              className={`snap-start border-b border-stone-200 px-1 py-2 text-center font-semibold sm:px-2 sm:py-3 ${
                date === view.today ? "bg-mist/45 text-ink" : "bg-white text-stone-700"
              }`}
            >
              <span className="block">{weekDayLabels[index]}</span>
              <span className="mt-1 block text-xs font-medium text-stone-500">
                {formatShortDate(date)}
              </span>
            </div>
          ))}

          {view.categories.map((category) => {
            const isCollapsed = collapsedCategorySet.has(category.name);

            return (
              <div key={category.name} className="contents">
                <div className="sticky left-0 z-20 border-b border-r border-t border-stone-200 bg-paper px-2 py-1 text-xs font-semibold uppercase tracking-wide text-clay sm:px-3 sm:py-1.5">
                  {canCollapseCategories ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${
                        category.name
                      }`}
                      onClick={() => onToggleCategory?.(category.name)}
                    >
                      <span aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
                      <span>{category.name}</span>
                    </button>
                  ) : (
                    category.name
                  )}
                </div>
                <div
                  aria-hidden="true"
                  className="col-span-7 border-b border-t border-stone-200 bg-paper"
                />
                {!isCollapsed
                  ? category.activities.map((activity) => (
                      <ActivityRow
                        key={activity.id}
                        activity={activity}
                        today={view.today}
                        renderPlanningControl={renderPlanningControl}
                      />
                    ))
                  : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ActivityRow({
  activity,
  today,
  renderPlanningControl,
}: {
  activity: WeekGridActivity;
  today: string;
  renderPlanningControl: PlanningControlRenderer;
}) {
  return (
    <div className="contents">
      <div className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-2 py-1.5 sm:px-3 sm:py-2.5">
        <div className="text-xs font-semibold leading-4 text-ink sm:text-sm sm:leading-5">
          {activity.activityName}
        </div>
        <div className="mt-0.5 text-[11px] leading-4 text-stone-500 sm:text-xs">
          {activity.doneCount}/{activity.targetCount} done
        </div>
      </div>
      {activity.cells.map((cell) => (
        <WeekCell
          key={`${activity.id}-${cell.date}`}
          activity={activity}
          cell={cell}
          isToday={cell.date === today}
          renderPlanningControl={renderPlanningControl}
        />
      ))}
    </div>
  );
}

function WeekCell({
  activity,
  cell,
  isToday,
  renderPlanningControl,
}: {
  activity: WeekGridActivity;
  cell: WeekGridCell;
  isToday: boolean;
  renderPlanningControl: PlanningControlRenderer;
}) {
  const actionLabel = cell.planned ? "Clear planned day" : "Plan this day";
  const ariaLabel = `${activity.activityName}, ${formatLongDate(cell.date)}: ${formatCellState(
    cell.state,
  )}${cell.isPlanningEditable ? `. ${actionLabel}.` : "."}`;
  const controlClassName =
    "flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:min-h-11 sm:min-w-11";
  const mark = <CellMark editable={cell.isPlanningEditable} state={cell.state} />;

  return (
    <div
      className={`relative flex min-h-12 snap-start items-center justify-center border-b border-stone-200 px-0.5 py-1.5 sm:min-h-[4.5rem] sm:px-2 sm:py-2.5 ${
        isToday ? "bg-mist/35" : "bg-white"
      }`}
    >
      {cell.isPlanningEditable ? (
        renderPlanningControl({
          activity,
          cell,
          children: mark,
          className: controlClassName,
          ariaLabel,
        })
      ) : (
        <div
          className="flex min-h-10 min-w-10 items-center justify-center rounded-full opacity-80 sm:min-h-11 sm:min-w-11"
          aria-label={ariaLabel}
        >
          {mark}
        </div>
      )}
    </div>
  );
}

function CellMark({ editable, state }: { editable: boolean; state: CellVisualState }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-meadow text-sm font-bold text-white sm:h-8 sm:w-8">
        ✓
      </span>
    );
  }

  if (state === "planned") {
    return (
      <span
        className={`h-7 w-7 rounded-full border-2 border-sky-500 bg-sky-100 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.72)] sm:h-8 sm:w-8 ${
          editable ? "ring-1 ring-sky-200" : ""
        }`}
      />
    );
  }

  if (state === "missed") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-lg leading-none text-stone-500 sm:h-8 sm:w-8">
        /
      </span>
    );
  }

  return (
    <span
      className={`rounded-full ${
        editable
          ? "h-7 w-7 border border-stone-400 bg-white sm:h-8 sm:w-8"
          : "h-2 w-2 bg-stone-200/70"
      }`}
    />
  );
}

export function Notice({
  tone,
  body,
}: {
  tone: "success" | "error" | "neutral";
  body: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm leading-6 ${
        tone === "success"
          ? "border-meadow/25 bg-meadow/10 text-stone-800"
          : tone === "error"
            ? "border-clay/30 bg-clay/10 text-stone-800"
            : "border-stone-200 bg-paper text-stone-700"
      }`}
    >
      {body}
    </div>
  );
}

export function formatDateRange(start: string, end: string) {
  return `${formatMediumDate(start)} – ${formatMediumDate(end)}`;
}

function formatMediumDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatStatus(status: string) {
  return status.replace("_", " ");
}

function formatCellState(state: CellVisualState) {
  if (state === "done") {
    return "done";
  }

  if (state === "planned") {
    return "planned";
  }

  if (state === "missed") {
    return "missed";
  }

  return "blank";
}
