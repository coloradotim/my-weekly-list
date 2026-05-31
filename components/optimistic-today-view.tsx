"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  moveTodayPlanAction,
  setTodayCellFactsAction,
  undoMoveTodayPlanAction,
} from "@/app/(app)/today/actions";
import {
  applyOptimisticTodayAction,
  buildTodayViewModel,
  type TodayActivity,
  type TodayMoveDate,
  type TodayOptimisticAction,
  type TodayState,
} from "@/lib/today/current";
import type { DateOnly } from "@/lib/week/date";

type TemporaryUndo =
  | {
      kind: "move";
      activityId: string;
      activityName: string;
      movedToDate: DateOnly;
      movedToLabel: string;
    }
  | {
      kind: "skip";
      activityId: string;
      activityName: string;
    };

type Notice = {
  tone: "error" | "neutral";
  body: string;
} | null;

export function OptimisticTodayView({ initialState }: { initialState: TodayState }) {
  const [state, setState] = useState(initialState);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [movingActivityId, setMovingActivityId] = useState<string | null>(null);
  const [temporaryUndo, setTemporaryUndo] = useState<TemporaryUndo | null>(null);
  const [pendingActivityIds, setPendingActivityIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "error">("idle");
  const [, startTransition] = useTransition();
  const stateScopeRef = useRef(getTodayStateScope(initialState));

  useEffect(() => {
    const nextScope = getTodayStateScope(initialState);
    const scopeChanged = stateScopeRef.current !== nextScope;

    stateScopeRef.current = nextScope;
    setState(initialState);

    if (scopeChanged) {
      setIsPickerOpen(false);
      setCollapsedCategories([]);
      setMovingActivityId(null);
      setTemporaryUndo(null);
    }

    setPendingActivityIds(new Set());
    setSaveStatus("idle");
  }, [initialState]);

  const view = buildTodayViewModel(state);
  const notice = useMemo<Notice>(() => {
    if (saveStatus === "error") {
      return { tone: "error", body: "Couldn’t save that change. Try again." };
    }

    return null;
  }, [saveStatus]);

  function setPending(activityId: string, pending: boolean) {
    setPendingActivityIds((current) => {
      const next = new Set(current);

      if (pending) {
        next.add(activityId);
      } else {
        next.delete(activityId);
      }

      return next;
    });
  }

  function runOptimisticUpdate({
    activityId,
    action,
    rollback,
    persist,
    afterApply,
  }: {
    activityId: string;
    action: TodayOptimisticAction;
    rollback: TodayOptimisticAction;
    persist: () => Promise<{ status: "updated" | "blocked" | "error" }>;
    afterApply?: () => void;
  }) {
    if (pendingActivityIds.has(activityId)) {
      return;
    }

    setSaveStatus("idle");
    setPending(activityId, true);
    setState((current) => applyOptimisticTodayAction(current, action));
    afterApply?.();

    startTransition(() => {
      void persist()
        .then((result) => {
          if (result.status === "updated") {
            return;
          }

          setSaveStatus("error");
          setState((current) => applyOptimisticTodayAction(current, rollback));
        })
        .catch(() => {
          setSaveStatus("error");
          setState((current) => applyOptimisticTodayAction(current, rollback));
        })
        .finally(() => {
          setPending(activityId, false);
        });
    });
  }

  function markDone(activity: TodayActivity) {
    runOptimisticUpdate({
      activityId: activity.id,
      action: { type: "mark-done", activityId: activity.id },
      rollback: { type: "undo-done", activityId: activity.id },
      persist: () =>
        setTodayCellFactsAction({
          weekActivityId: activity.id,
          cellDate: state.today,
          planned: activity.isPlannedToday,
          done: true,
          skipped: false,
        }),
      afterApply: () => {
        setMovingActivityId(null);
        setTemporaryUndo(null);
      },
    });
  }

  function undoDone(activity: TodayActivity) {
    runOptimisticUpdate({
      activityId: activity.id,
      action: { type: "undo-done", activityId: activity.id },
      rollback: { type: "mark-done", activityId: activity.id },
      persist: () =>
        setTodayCellFactsAction({
          weekActivityId: activity.id,
          cellDate: state.today,
          planned: activity.isPlannedToday,
          done: false,
          skipped: false,
        }),
      afterApply: () => setTemporaryUndo(null),
    });
  }

  function skipTodayPlan(activity: TodayActivity) {
    runOptimisticUpdate({
      activityId: activity.id,
      action: { type: "skip-today", activityId: activity.id },
      rollback: { type: "undo-skip", activityId: activity.id },
      persist: () =>
        setTodayCellFactsAction({
          weekActivityId: activity.id,
          cellDate: state.today,
          planned: true,
          done: false,
          skipped: true,
        }),
      afterApply: () => {
        setMovingActivityId(null);
        setTemporaryUndo({
          kind: "skip",
          activityId: activity.id,
          activityName: activity.activityName,
        });
      },
    });
  }

  function undoSkip(activityId: string) {
    runOptimisticUpdate({
      activityId,
      action: { type: "undo-skip", activityId },
      rollback: { type: "skip-today", activityId },
      persist: () =>
        setTodayCellFactsAction({
          weekActivityId: activityId,
          cellDate: state.today,
          planned: true,
          done: false,
          skipped: false,
        }),
      afterApply: () => setTemporaryUndo(null),
    });
  }

  function moveTodayPlan(activity: TodayActivity, moveDate: TodayMoveDate) {
    runOptimisticUpdate({
      activityId: activity.id,
      action: {
        type: "move-today-plan",
        activityId: activity.id,
        toDate: moveDate.date,
      },
      rollback: {
        type: "undo-move-today-plan",
        activityId: activity.id,
        fromDate: moveDate.date,
      },
      persist: () =>
        moveTodayPlanAction({
          weekActivityId: activity.id,
          today: state.today,
          toDate: moveDate.date,
        }),
      afterApply: () => {
        setMovingActivityId(null);
        setTemporaryUndo({
          kind: "move",
          activityId: activity.id,
          activityName: activity.activityName,
          movedToDate: moveDate.date,
          movedToLabel: moveDate.weekdayLabel,
        });
      },
    });
  }

  function undoMove(activityId: string, fromDate: DateOnly) {
    runOptimisticUpdate({
      activityId,
      action: { type: "undo-move-today-plan", activityId, fromDate },
      rollback: {
        type: "move-today-plan",
        activityId,
        toDate: fromDate,
      },
      persist: () =>
        undoMoveTodayPlanAction({
          weekActivityId: activityId,
          today: state.today,
          fromDate,
        }),
      afterApply: () => setTemporaryUndo(null),
    });
  }

  function togglePickerCategory(categoryName: string) {
    setCollapsedCategories((current) =>
      current.includes(categoryName)
        ? current.filter((name) => name !== categoryName)
        : [...current, categoryName],
    );
  }

  return (
    <div className="space-y-3">
      {notice ? <Notice tone={notice.tone} body={notice.body} /> : null}

      {view.isSunday ? (
        <p className="rounded-lg border border-mist bg-mist/35 px-3 py-2 text-sm leading-5 text-secondary">
          Sunday stays in this week. Finish today or skip what will not happen.
        </p>
      ) : null}

      <section className="space-y-2">
        <SectionHeading title="Planned for today" count={view.openPlannedToday.length} />
        {view.openPlannedToday.length > 0 ? (
          <div className="space-y-2">
            {view.openPlannedToday.map((activity) => (
              <OpenPlannedRow
                key={activity.id}
                activity={activity}
                isSunday={view.isSunday}
                isPending={pendingActivityIds.has(activity.id)}
                isMoving={movingActivityId === activity.id}
                moveDates={activity.moveDates}
                onDone={() => markDone(activity)}
                onSkip={() => skipTodayPlan(activity)}
                onToggleMove={() => {
                  setMovingActivityId((current) =>
                    current === activity.id ? null : activity.id,
                  );
                }}
                onCancelMove={() => setMovingActivityId(null)}
                onMove={(moveDate) => moveTodayPlan(activity, moveDate)}
              />
            ))}
          </div>
        ) : (
          <EmptyNote body="Nothing is open for today. You can still record something else you did." />
        )}
      </section>

      {temporaryUndo ? (
        <TemporaryUndoMessage
          undo={temporaryUndo}
          onUndo={() => {
            if (temporaryUndo.kind === "move") {
              undoMove(temporaryUndo.activityId, temporaryUndo.movedToDate);
            } else {
              undoSkip(temporaryUndo.activityId);
            }
          }}
        />
      ) : null}

      <section className="rounded-lg border border-line bg-surface/80 p-3 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-clay/40 bg-surface px-4 text-sm font-semibold text-clay transition hover:border-clay hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
            onClick={() => setIsPickerOpen((current) => !current)}
          >
            + Something else
          </button>
          {isPickerOpen ? (
            <button
              type="button"
              className="rounded-full px-2 py-1 text-sm font-semibold text-muted transition hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
              onClick={() => setIsPickerOpen(false)}
            >
              Close
            </button>
          ) : null}
        </div>
        {isPickerOpen ? (
          <div className="mt-3 border-t border-line pt-3">
            {view.pickerGroups.length > 0 ? (
              <div className="space-y-2">
                {view.pickerGroups.map((group) => {
                  const isCollapsed = collapsedCategories.includes(group.categoryName);

                  return (
                    <div
                      key={group.categoryName}
                      className="rounded-lg border border-line bg-surface/70"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                        onClick={() => togglePickerCategory(group.categoryName)}
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${
                          group.categoryName
                        }`}
                      >
                        <span aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
                        <span>{group.categoryName}</span>
                      </button>
                      {!isCollapsed ? (
                        <div className="border-t border-line-soft">
                          {group.activities.map((activity) => (
                            <button
                              key={activity.id}
                              type="button"
                              className="flex min-h-11 w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm transition hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow"
                              disabled={pendingActivityIds.has(activity.id)}
                              onClick={() => markDone(activity)}
                            >
                              <span className="font-semibold text-ink">
                                {activity.activityName}
                              </span>
                              <span className="shrink-0 text-right font-semibold text-meadow">
                                Mark done today
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyNote body="Everything eligible is already counted or resolved for today." />
            )}
          </div>
        ) : null}
      </section>

      {view.doneToday.length > 0 ? (
        <section className="space-y-2">
          <SectionHeading title="Done today" count={view.doneToday.length} />
          <div className="space-y-2">
            {view.doneToday.map((activity) => (
              <DoneTodayRow
                key={activity.id}
                activity={activity}
                isPending={pendingActivityIds.has(activity.id)}
                onUndoDone={() => undoDone(activity)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {view.skippedToday.length > 0 ? (
        <section className="space-y-2">
          <SectionHeading title="Skipped" count={view.skippedToday.length} />
          <div className="space-y-2">
            {view.skippedToday.map((activity) => (
              <SkippedRow
                key={activity.id}
                activity={activity}
                isPending={pendingActivityIds.has(activity.id)}
                onDone={() => markDone(activity)}
                onUnskip={() => undoSkip(activity.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function OpenPlannedRow({
  activity,
  isSunday,
  isPending,
  isMoving,
  moveDates,
  onDone,
  onSkip,
  onToggleMove,
  onCancelMove,
  onMove,
}: {
  activity: TodayActivity;
  isSunday: boolean;
  isPending: boolean;
  isMoving: boolean;
  moveDates: TodayMoveDate[];
  onDone: () => void;
  onSkip: () => void;
  onToggleMove: () => void;
  onCancelMove: () => void;
  onMove: (moveDate: TodayMoveDate) => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-surface/85 p-3 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-6 text-ink">
            {activity.activityName}
          </h2>
          <p className="text-sm text-muted">{activity.progressLabel} this week</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            className="min-h-11 rounded-full bg-meadow px-4 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow disabled:cursor-not-allowed"
            onClick={onDone}
            disabled={isPending}
          >
            Mark done
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-muted transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay disabled:cursor-not-allowed"
            onClick={onSkip}
            disabled={isPending}
          >
            Skip
          </button>
          {!isSunday ? (
            <button
              type="button"
              className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-muted transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay disabled:cursor-not-allowed disabled:border-line-soft disabled:bg-paper disabled:text-disabled"
              onClick={onToggleMove}
              disabled={isPending || moveDates.length === 0}
              aria-expanded={isMoving}
            >
              Move
            </button>
          ) : null}
        </div>
      </div>
      {isMoving && !isSunday && moveDates.length > 0 ? (
        <MovePlanPanel moveDates={moveDates} onCancel={onCancelMove} onMove={onMove} />
      ) : null}
    </article>
  );
}

function MovePlanPanel({
  moveDates,
  onCancel,
  onMove,
}: {
  moveDates: TodayMoveDate[];
  onCancel: () => void;
  onMove: (moveDate: TodayMoveDate) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-mist bg-mist/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Move</p>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {moveDates.map((moveDate) => (
          <button
            key={moveDate.date}
            type="button"
            className="min-h-10 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-secondary transition hover:border-meadow hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow"
            onClick={() => onMove(moveDate)}
          >
            {moveDate.weekdayLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function DoneTodayRow({
  activity,
  isPending,
  onUndoDone,
}: {
  activity: TodayActivity;
  isPending: boolean;
  onUndoDone: () => void;
}) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface/75 p-3 shadow-soft">
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-6 text-ink">
          {activity.activityName}
        </h2>
        <p className="text-sm text-muted">{activity.progressLabel} this week</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full bg-meadow/15 px-3 py-2 text-sm font-semibold text-meadow transition hover:bg-meadow/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow disabled:cursor-not-allowed"
        onClick={onUndoDone}
        disabled={isPending}
      >
        ✓ Done
      </button>
    </article>
  );
}

function SkippedRow({
  activity,
  isPending,
  onDone,
  onUnskip,
}: {
  activity: TodayActivity;
  isPending: boolean;
  onDone: () => void;
  onUnskip: () => void;
}) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface/75 p-3 shadow-soft">
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-6 text-ink">
          {activity.activityName}
        </h2>
        <p className="text-sm text-muted">{activity.progressLabel} this week</p>
        <p className="mt-1 text-sm font-semibold text-skipped">Skipped</p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full bg-meadow px-4 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow disabled:cursor-not-allowed"
          onClick={onDone}
          disabled={isPending}
        >
          Mark done
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-muted transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay disabled:cursor-not-allowed"
          onClick={onUnskip}
          disabled={isPending}
        >
          Unskip
        </button>
      </div>
    </article>
  );
}

function TemporaryUndoMessage({
  undo,
  onUndo,
}: {
  undo: TemporaryUndo;
  onUndo: () => void;
}) {
  const message =
    undo.kind === "move"
      ? `Moved ${undo.activityName} to ${undo.movedToLabel}.`
      : `Skipped ${undo.activityName}.`;

  return (
    <p className="rounded-lg border border-mist bg-mist/30 px-3 py-2 text-sm text-secondary">
      {message}{" "}
      <button
        type="button"
        className="font-semibold text-clay underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
        onClick={onUndo}
      >
        Undo
      </button>
    </p>
  );
}

function Notice({ tone, body }: { tone: "error" | "neutral"; body: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm leading-6 ${
        tone === "error"
          ? "border-clay/30 bg-clay/10 text-ink"
          : "border-line bg-paper text-secondary"
      }`}
    >
      {body}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-clay">{title}</h2>
      <span className="rounded-full bg-surface/80 px-2 py-1 text-xs font-semibold text-muted">
        {count}
      </span>
    </div>
  );
}

function EmptyNote({ body }: { body: string }) {
  return (
    <p className="rounded-lg border border-line bg-surface/75 p-3 text-sm leading-6 text-muted">
      {body}
    </p>
  );
}

function getTodayStateScope(state: TodayState) {
  return `${state.week.id}:${state.today}`;
}
