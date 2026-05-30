"use client";

import { useMemo, useState, useTransition } from "react";
import { setReviewCellDoneAction } from "@/app/(app)/review/actions";
import {
  applyOptimisticReviewAction,
  buildReviewViewModel,
  getReviewDetailDisplayState,
  type ReviewActivityRecord,
  type ReviewDayCell,
  type ReviewState,
  type ReviewSummaryRow,
} from "@/lib/review/current";
import type { DateOnly } from "@/lib/week/date";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function OptimisticReviewView({ initialState }: { initialState: ReviewState }) {
  const [state, setState] = useState(initialState);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingCellKeys, setPendingCellKeys] = useState<Set<string>>(() => new Set());
  const [saveStatus, setSaveStatus] = useState<"idle" | "error">("idle");
  const [, startTransition] = useTransition();
  const view = useMemo(() => buildReviewViewModel(state), [state]);

  function setPending(cellKey: string, pending: boolean) {
    setPendingCellKeys((current) => {
      const next = new Set(current);

      if (pending) {
        next.add(cellKey);
      } else {
        next.delete(cellKey);
      }

      return next;
    });
  }

  function setCompletion(activityId: string, cell: ReviewDayCell, done: boolean) {
    const cellKey = `${activityId}:${cell.date}`;

    if (!cell.isCorrectionEditable || pendingCellKeys.has(cellKey)) {
      return;
    }

    setSaveStatus("idle");
    setPending(cellKey, true);
    setState((current) =>
      applyOptimisticReviewAction(current, {
        type: "set-completion",
        activityId,
        date: cell.date,
        done,
      }),
    );

    startTransition(() => {
      void setReviewCellDoneAction({
        weekActivityId: activityId,
        cellDate: cell.date,
        done,
      })
        .then((result) => {
          if (result.status === "updated") {
            return;
          }

          setSaveStatus("error");
          setState((current) =>
            applyOptimisticReviewAction(current, {
              type: "set-completion",
              activityId,
              date: cell.date,
              done: cell.done,
            }),
          );
        })
        .catch(() => {
          setSaveStatus("error");
          setState((current) =>
            applyOptimisticReviewAction(current, {
              type: "set-completion",
              activityId,
              date: cell.date,
              done: cell.done,
            }),
          );
        })
        .finally(() => {
          setPending(cellKey, false);
        });
    });
  }

  return (
    <section className="space-y-3">
      <article className="rounded-lg border border-stone-200 bg-white/90 p-3 shadow-soft sm:p-4">
        <p className="text-sm font-semibold text-clay">Review · {view.rangeLabel}</p>

        {view.isSundayCurrentWeek ? (
          <p className="mt-3 rounded-lg border border-mist bg-mist/20 px-3 py-2 text-sm leading-6 text-stone-700">
            This week is still active through today. You can update anything you complete
            later.
          </p>
        ) : null}

        <p className="mt-4 text-lg font-semibold text-ink">{view.summarySentence}</p>

        <SummarySection title="Targets met" rows={view.targetsMet} />
        <SummarySection title="Short of target" rows={view.shortOfTarget} />
      </article>

      {saveStatus === "error" ? (
        <div
          className="rounded-lg border border-clay/30 bg-clay/10 px-3 py-2 text-sm leading-6 text-stone-800"
          role="alert"
        >
          Couldn’t save that change. Try again.
        </div>
      ) : null}

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
            dayDates={view.dayDates}
            groups={view.categoryGroups}
            isSundayCurrentWeek={view.isSundayCurrentWeek}
            pendingCellKeys={pendingCellKeys}
            today={view.today}
            onSetCompletion={setCompletion}
          />
        </div>
      </details>
    </section>
  );
}

function SummarySection({ title, rows }: { title: string; rows: ReviewSummaryRow[] }) {
  return (
    <section className="mt-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-clay">{title}</h2>
      <div className="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-ink">{row.activityName}</span>
              <span className="whitespace-nowrap text-stone-700">
                {row.doneCount} of {row.targetCount} days{" "}
                {row.isTargetMet ? (
                  <span className="font-semibold text-meadow" aria-label="target met">
                    ✓
                  </span>
                ) : null}
              </span>
            </div>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-stone-600">Nothing here yet.</p>
        )}
      </div>
    </section>
  );
}

function ReviewDetailGrid({
  dayDates,
  groups,
  isSundayCurrentWeek,
  pendingCellKeys,
  today,
  onSetCompletion,
}: {
  dayDates: DateOnly[];
  groups: { categoryName: string; activities: ReviewActivityRecord[] }[];
  isSundayCurrentWeek: boolean;
  pendingCellKeys: Set<string>;
  today: DateOnly;
  onSetCompletion: (activityId: string, cell: ReviewDayCell, done: boolean) => void;
}) {
  return (
    <div className="snap-x snap-mandatory scroll-pl-[112px] overflow-x-auto rounded-lg border border-stone-200 bg-white/85 shadow-soft sm:scroll-pl-[168px]">
      <div className="grid min-w-[604px] grid-cols-[minmax(112px,0.9fr)_repeat(7,minmax(50px,1fr))] text-sm sm:min-w-[780px] sm:grid-cols-[minmax(168px,1.3fr)_repeat(7,minmax(64px,1fr))]">
        <div className="sticky left-0 z-20 border-b border-r border-stone-200 bg-white px-2 py-2 font-semibold text-stone-700 sm:px-3">
          Activity
        </div>
        {dayDates.map((date, index) => (
          <div
            key={date}
            className={`snap-start border-b border-stone-200 px-1 py-2 text-center font-semibold ${
              isSundayCurrentWeek && date === today
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

        {groups.map((group) => (
          <div key={group.categoryName} className="contents">
            <div className="sticky left-0 z-20 border-b border-r border-stone-200 bg-paper px-2 py-2 text-xs font-semibold uppercase leading-4 tracking-wide text-clay">
              {group.categoryName}
            </div>
            <div className="col-span-7 border-b border-stone-200 bg-paper" />

            {group.activities.map((activity) => (
              <div key={activity.id} className="contents">
                <div className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-2 py-2">
                  <div className="text-xs font-semibold leading-4 text-ink sm:text-sm">
                    {activity.activityName}
                  </div>
                </div>
                {activity.cells.map((cell) => {
                  const cellKey = `${activity.id}:${cell.date}`;
                  return (
                    <ReviewDayButton
                      key={cellKey}
                      activityName={activity.activityName}
                      cell={cell}
                      isPending={pendingCellKeys.has(cellKey)}
                      isToday={isSundayCurrentWeek && cell.date === today}
                      onClick={() => onSetCompletion(activity.id, cell, !cell.done)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewDayButton({
  activityName,
  cell,
  isPending,
  isToday,
  onClick,
}: {
  activityName: string;
  cell: ReviewDayCell;
  isPending: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  const label = `${activityName}, ${formatLongDate(cell.date)}: ${
    cell.done ? "completed" : "not completed"
  }. Toggle completion.`;

  return (
    <button
      type="button"
      className={`flex min-h-11 snap-start items-center justify-center border-b border-stone-200 px-1 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60 ${
        isToday ? "bg-mist/35" : "bg-white"
      }`}
      aria-label={label}
      disabled={!cell.isCorrectionEditable || isPending}
      onClick={onClick}
    >
      <ReviewCellMark cell={cell} />
    </button>
  );
}

function ReviewCellMark({ cell }: { cell: ReviewDayCell }) {
  if (getReviewDetailDisplayState(cell) === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-meadow text-sm font-bold text-white">
        ✓
      </span>
    );
  }

  return <span className="h-7 w-7 rounded-full border border-stone-300 bg-white" />;
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
