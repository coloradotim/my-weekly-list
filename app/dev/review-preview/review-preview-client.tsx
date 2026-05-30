"use client";

import { useMemo, useState } from "react";
import { useWeekGridLayout } from "@/components/use-week-grid-layout";
import {
  weekGridColumnsClassName,
  weekGridScrollerClassName,
} from "@/components/week-grid-layout";
import {
  applyReviewCompletionToggle,
  buildReviewSummary,
  getInitialReviewPreviewState,
  getReviewDayDates,
  getReviewDetailDisplayState,
  getReviewSummarySentence,
  type ReviewCell,
  type ReviewPreviewState,
  type ReviewSummaryRow,
} from "@/lib/review/preview";
import type { DateOnly } from "@/lib/week/date";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ReviewPreviewClient({
  initialDetailsOpen = false,
  initialScenario = "past",
}: {
  initialDetailsOpen?: boolean;
  initialScenario?: "past" | "sunday";
}) {
  const [scenario, setScenario] = useState<"past" | "sunday">(initialScenario);
  const [detailsOpen, setDetailsOpen] = useState(initialDetailsOpen);
  const [state, setState] = useState<ReviewPreviewState>(() =>
    getInitialReviewPreviewState(initialScenario),
  );
  const summary = useMemo(() => buildReviewSummary(state), [state]);
  const dayDates = useMemo(() => getReviewDayDates(state.weekStartDate), [state]);

  function selectScenario(nextScenario: "past" | "sunday") {
    setScenario(nextScenario);
    setState(getInitialReviewPreviewState(nextScenario));
  }

  function toggleCompletion(activityId: string, date: DateOnly) {
    setState((current) =>
      applyReviewCompletionToggle({
        state: current,
        activityId,
        date,
      }),
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
        <div className="flex rounded-full border border-stone-200 bg-paper p-1">
          {(["past", "sunday"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
                scenario === option
                  ? "bg-meadow text-white"
                  : "text-stone-700 hover:bg-white"
              }`}
              onClick={() => selectScenario(option)}
            >
              {option === "past" ? "Past week" : "Sunday"}
            </button>
          ))}
        </div>
      </div>

      <article className="rounded-lg border border-stone-200 bg-white/90 p-4 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          Review this week
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
          {formatRange(state.weekStartDate, state.weekEndDate)}
        </h2>

        {state.isSundayCurrentWeek ? (
          <p className="mt-3 rounded-lg border border-mist bg-mist/20 px-3 py-2 text-sm leading-6 text-stone-700">
            This week is still active through today. You can update anything you complete
            later.
          </p>
        ) : null}

        <p className="mt-4 text-lg font-semibold text-ink">
          {getReviewSummarySentence(summary)}
        </p>

        <SummarySection title="Targets met" rows={summary.targetsMet} />
        <SummarySection title="Short of target" rows={summary.shortOfTarget} />
      </article>

      <details
        className="rounded-lg border border-stone-200 bg-white/90 p-3 shadow-soft"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-clay">
          Review day-by-day details
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-stone-700">
            Review what happened. Tap any day to correct whether you completed that
            activity.
          </p>
          <ReviewDetailGrid
            state={state}
            dayDates={dayDates}
            onToggle={toggleCompletion}
          />
        </div>
      </details>
    </section>
  );
}

function SummarySection({ title, rows }: { title: string; rows: ReviewSummaryRow[] }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-clay">{title}</h3>
      <div className="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-sm"
          >
            <span className="font-semibold text-ink">{row.name}</span>
            <span className="whitespace-nowrap text-stone-700">
              {row.doneCount} of {row.targetCount} days{" "}
              {row.isTargetMet ? (
                <span className="font-semibold text-meadow" aria-label="target met">
                  ✓
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewDetailGrid({
  state,
  dayDates,
  onToggle,
}: {
  state: ReviewPreviewState;
  dayDates: DateOnly[];
  onToggle: (activityId: string, date: DateOnly) => void;
}) {
  const categoryGroups = state.activities
    .toSorted(
      (left, right) =>
        left.categoryOrder - right.categoryOrder || left.sortOrder - right.sortOrder,
    )
    .reduce<
      {
        categoryName: string;
        activities: ReviewPreviewState["activities"];
      }[]
    >((groups, activity) => {
      const currentGroup = groups.at(-1);

      if (currentGroup?.categoryName === activity.categoryName) {
        currentGroup.activities.push(activity);
        return groups;
      }

      groups.push({
        categoryName: activity.categoryName,
        activities: [activity],
      });

      return groups;
    }, []);
  const gridLayout = useWeekGridLayout();

  return (
    <div
      ref={gridLayout.scrollerRef}
      className={weekGridScrollerClassName}
      style={gridLayout.scrollerStyle}
    >
      <div className={weekGridColumnsClassName} style={gridLayout.gridStyle}>
        <div className="sticky left-0 z-20 border-b border-r border-stone-200 bg-white px-2 py-2 font-semibold text-stone-700 sm:px-3">
          Activity
        </div>
        {dayDates.map((date, index) => (
          <div
            key={date}
            className={`snap-start border-b border-stone-200 px-1 py-2 text-center font-semibold ${
              state.isSundayCurrentWeek && date === state.today
                ? "bg-mist/45 text-ink"
                : "bg-white text-stone-700"
            }`}
          >
            <span className="block">{dayLabels[index]}</span>
            <span className="mt-1 block text-xs font-medium text-stone-500">
              {formatShortDate(date)}
            </span>
          </div>
        ))}

        {categoryGroups.map((group) => (
          <div key={group.categoryName} className="contents">
            <div className="sticky left-0 z-20 border-b border-r border-stone-200 bg-paper px-2 py-2 text-xs font-semibold uppercase leading-4 tracking-wide text-clay">
              {group.categoryName}
            </div>
            <div className="col-span-7 border-b border-stone-200 bg-paper" />

            {group.activities.map((activity) => (
              <div key={activity.id} className="contents">
                <div className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-2 py-2">
                  <div className="text-xs font-semibold leading-4 text-ink sm:text-sm">
                    {activity.name}
                  </div>
                </div>
                {activity.cells.map((cell) => (
                  <ReviewDayCell
                    key={`${activity.id}-${cell.date}`}
                    activityName={activity.name}
                    cell={cell}
                    isToday={state.isSundayCurrentWeek && cell.date === state.today}
                    onToggle={() => onToggle(activity.id, cell.date)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewDayCell({
  activityName,
  cell,
  isToday,
  onToggle,
}: {
  activityName: string;
  cell: ReviewCell;
  isToday: boolean;
  onToggle: () => void;
}) {
  const label = `${activityName}, ${formatLongDate(cell.date)}: ${getReviewCellLabel(
    cell,
  )}. Toggle completion.`;

  return (
    <button
      type="button"
      className={`flex min-h-11 snap-start items-center justify-center border-b border-stone-200 px-1 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-inset ${
        isToday ? "bg-mist/35" : "bg-white"
      }`}
      aria-label={label}
      onClick={onToggle}
    >
      <ReviewCellMark cell={cell} />
    </button>
  );
}

function ReviewCellMark({ cell }: { cell: ReviewCell }) {
  if (getReviewDetailDisplayState(cell) === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-meadow text-sm font-bold text-white">
        ✓
      </span>
    );
  }

  return <span className="h-7 w-7 rounded-full border border-stone-300 bg-white" />;
}

function getReviewCellLabel(cell: ReviewCell) {
  if (cell.done) {
    return "completed";
  }

  if (cell.planned || cell.skipped) {
    return "not completed";
  }

  return "blank";
}

function formatRange(start: string, end: string) {
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
