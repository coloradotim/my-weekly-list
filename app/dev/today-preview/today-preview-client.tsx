"use client";

import { useEffect, useState } from "react";
import {
  applyTodayPreviewAction,
  getInitialTodayPreviewState,
  getTodayPreviewView,
  type TodayPreviewActivity,
  type TodayPreviewMoveDate,
  type TodayPreviewScenario,
} from "@/lib/today/preview";
import type { DateOnly } from "@/lib/week/date";

type AdjustStep = "choices" | "move";
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

const scenarios: { id: TodayPreviewScenario; label: string }[] = [
  { id: "active", label: "Today" },
  { id: "sunday", label: "Sunday" },
  { id: "no-current-week", label: "No week" },
  { id: "setup-needed", label: "Setup" },
];

export function TodayPreviewClient() {
  const [scenario, setScenario] = useState<TodayPreviewScenario>("active");
  const [state, setState] = useState(() => getInitialTodayPreviewState("active"));
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [adjustingActivityId, setAdjustingActivityId] = useState<string | null>(null);
  const [adjustStep, setAdjustStep] = useState<AdjustStep>("choices");
  const [temporaryUndo, setTemporaryUndo] = useState<TemporaryUndo | null>(null);
  const view = getTodayPreviewView(state);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash === "#picker-added") {
      setIsPickerOpen(true);
      setState((current) =>
        applyTodayPreviewAction(current, {
          type: "mark-done",
          activityId: "today-yoga",
        }),
      );
      return;
    }

    if (hash === "#adjust-step") {
      setAdjustingActivityId("today-walk");
      setAdjustStep("choices");
      return;
    }

    if (hash === "#move-step") {
      setAdjustingActivityId("today-walk");
      setAdjustStep("move");
      return;
    }

    if (hash === "#skipped") {
      setState((current) =>
        applyTodayPreviewAction(current, {
          type: "skip-today",
          activityId: "today-meditation",
        }),
      );
      setTemporaryUndo({
        kind: "skip",
        activityId: "today-meditation",
        activityName: "Meditation",
      });
      return;
    }

    if (hash === "#sunday") {
      setScenario("sunday");
      setState(getInitialTodayPreviewState("sunday"));
    }
  }, []);

  function selectScenario(nextScenario: TodayPreviewScenario) {
    setScenario(nextScenario);
    setState(getInitialTodayPreviewState(nextScenario));
    setIsPickerOpen(false);
    setCollapsedCategories([]);
    setAdjustingActivityId(null);
    setAdjustStep("choices");
    setTemporaryUndo(null);
  }

  if (view.status !== "ready") {
    return (
      <div className="space-y-3">
        <ScenarioTabs scenario={scenario} onSelect={selectScenario} />
        <section className="rounded-lg border border-stone-200 bg-white/85 p-4 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-clay">Today</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            {view.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">{view.body}</p>
          <button
            type="button"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white"
          >
            {view.actionLabel}
          </button>
        </section>
      </div>
    );
  }

  const pickerGroups = groupActivitiesByCategory(view.unplannedOptions);

  function markDone(activity: TodayPreviewActivity) {
    setState((current) =>
      applyTodayPreviewAction(current, {
        type: "mark-done",
        activityId: activity.id,
      }),
    );
    setAdjustingActivityId(null);
    setAdjustStep("choices");
    setTemporaryUndo(null);
  }

  function undoDone(activity: TodayPreviewActivity) {
    setState((current) =>
      applyTodayPreviewAction(current, {
        type: "undo-done",
        activityId: activity.id,
      }),
    );
    setTemporaryUndo(null);
  }

  function moveTodayPlan(activity: TodayPreviewActivity, moveDate: TodayPreviewMoveDate) {
    setState((current) =>
      applyTodayPreviewAction(current, {
        type: "move-today-plan",
        activityId: activity.id,
        toDate: moveDate.date,
      }),
    );
    setAdjustingActivityId(null);
    setAdjustStep("choices");
    setTemporaryUndo({
      kind: "move",
      activityId: activity.id,
      activityName: activity.activityName,
      movedToDate: moveDate.date,
      movedToLabel: moveDate.weekdayLabel,
    });
  }

  function skipTodayPlan(activity: TodayPreviewActivity) {
    setState((current) =>
      applyTodayPreviewAction(current, {
        type: "skip-today",
        activityId: activity.id,
      }),
    );
    setAdjustingActivityId(null);
    setAdjustStep("choices");
    setTemporaryUndo({
      kind: "skip",
      activityId: activity.id,
      activityName: activity.activityName,
    });
  }

  function undoTemporaryChange() {
    if (!temporaryUndo) {
      return;
    }

    if (temporaryUndo.kind === "move") {
      setState((current) =>
        applyTodayPreviewAction(current, {
          type: "undo-move-today-plan",
          activityId: temporaryUndo.activityId,
          fromDate: temporaryUndo.movedToDate,
        }),
      );
    } else {
      setState((current) =>
        applyTodayPreviewAction(current, {
          type: "undo-skip",
          activityId: temporaryUndo.activityId,
        }),
      );
    }

    setTemporaryUndo(null);
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
      <ScenarioTabs scenario={scenario} onSelect={selectScenario} />

      <header className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">Today</p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-ink">
              {view.todayLabel}
            </h2>
            <p className="text-sm text-stone-600">Week {view.weekRangeLabel}</p>
          </div>
          {view.isSunday ? (
            <p className="max-w-md rounded-lg border border-mist bg-mist/35 px-3 py-2 text-sm leading-5 text-stone-700">
              Sunday stays in this week. Finish today; no cross-week moves here.
            </p>
          ) : null}
        </div>
      </header>

      <section className="space-y-2">
        <SectionHeading title="Planned for today" count={view.openPlannedToday.length} />
        {view.openPlannedToday.length > 0 ? (
          <div className="space-y-2">
            {view.openPlannedToday.map((activity) => (
              <OpenPlannedRow
                key={activity.id}
                activity={activity}
                isSunday={view.isSunday}
                isAdjusting={adjustingActivityId === activity.id}
                adjustStep={adjustStep}
                moveDates={view.remainingMoveDates}
                onDone={() => markDone(activity)}
                onSkip={() => skipTodayPlan(activity)}
                onToggleAdjust={() => {
                  setAdjustingActivityId((current) =>
                    current === activity.id ? null : activity.id,
                  );
                  setAdjustStep("choices");
                }}
                onShowMoveDays={() => setAdjustStep("move")}
                onMove={(moveDate) => moveTodayPlan(activity, moveDate)}
              />
            ))}
          </div>
        ) : (
          <EmptyNote body="Nothing is open for today. You can still record something else you did." />
        )}
      </section>

      {temporaryUndo ? (
        <TemporaryUndoMessage undo={temporaryUndo} onUndo={undoTemporaryChange} />
      ) : null}

      <section className="rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-clay/40 bg-white px-4 text-sm font-semibold text-clay transition hover:border-clay hover:bg-paper focus:outline-none focus:ring-2 focus:ring-clay"
            onClick={() => setIsPickerOpen((current) => !current)}
          >
            + Something else
          </button>
          {isPickerOpen ? (
            <button
              type="button"
              className="rounded-full px-2 py-1 text-sm font-semibold text-stone-500 transition hover:bg-paper hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
              onClick={() => setIsPickerOpen(false)}
            >
              Close
            </button>
          ) : null}
        </div>
        {isPickerOpen ? (
          <div className="mt-3 border-t border-stone-200 pt-3">
            {pickerGroups.length > 0 ? (
              <div className="space-y-2">
                {pickerGroups.map((group) => {
                  const isCollapsed = collapsedCategories.includes(group.categoryName);

                  return (
                    <div
                      key={group.categoryName}
                      className="rounded-lg border border-stone-200 bg-white/70"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-clay focus:outline-none focus:ring-2 focus:ring-clay"
                        onClick={() => togglePickerCategory(group.categoryName)}
                        aria-expanded={!isCollapsed}
                      >
                        <span>{group.categoryName}</span>
                        <span className="text-stone-500">
                          {isCollapsed ? "Show" : "Hide"}
                        </span>
                      </button>
                      {!isCollapsed ? (
                        <div className="border-t border-stone-100">
                          {group.activities.map((activity) => (
                            <button
                              key={activity.id}
                              type="button"
                              className="flex min-h-11 w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm transition hover:bg-paper focus:outline-none focus:ring-2 focus:ring-meadow"
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
                onDone={() => markDone(activity)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ScenarioTabs({
  scenario,
  onSelect,
}: {
  scenario: TodayPreviewScenario;
  onSelect: (scenario: TodayPreviewScenario) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft">
      {scenarios.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-clay ${
            scenario === item.id
              ? "border-meadow bg-meadow text-white"
              : "border-stone-200 bg-white text-stone-700 hover:bg-paper"
          }`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function OpenPlannedRow({
  activity,
  isSunday,
  isAdjusting,
  adjustStep,
  moveDates,
  onDone,
  onSkip,
  onToggleAdjust,
  onShowMoveDays,
  onMove,
}: {
  activity: TodayPreviewActivity;
  isSunday: boolean;
  isAdjusting: boolean;
  adjustStep: AdjustStep;
  moveDates: TodayPreviewMoveDate[];
  onDone: () => void;
  onSkip: () => void;
  onToggleAdjust: () => void;
  onShowMoveDays: () => void;
  onMove: (moveDate: TodayPreviewMoveDate) => void;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-6 text-ink">
            {activity.activityName}
          </h3>
          <p className="text-sm text-stone-600">{activity.progressLabel} this week</p>
          {!isSunday && moveDates.length > 0 ? (
            <button
              type="button"
              className="mt-1 text-sm font-semibold text-clay underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
              onClick={onToggleAdjust}
            >
              Adjust plan
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            className="min-h-11 rounded-full bg-meadow px-4 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow"
            onClick={onDone}
          >
            Mark done
          </button>
          {isSunday ? (
            <button
              type="button"
              className="min-h-11 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-600 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
              onClick={onSkip}
            >
              Skip
            </button>
          ) : null}
        </div>
      </div>
      {isAdjusting && !isSunday ? (
        <AdjustPlanPanel
          step={adjustStep}
          moveDates={moveDates}
          onShowMoveDays={onShowMoveDays}
          onMove={onMove}
          onSkip={onSkip}
        />
      ) : null}
    </article>
  );
}

function AdjustPlanPanel({
  step,
  moveDates,
  onShowMoveDays,
  onMove,
  onSkip,
}: {
  step: AdjustStep;
  moveDates: TodayPreviewMoveDate[];
  onShowMoveDays: () => void;
  onMove: (moveDate: TodayPreviewMoveDate) => void;
  onSkip: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-mist bg-mist/25 p-3">
      <p className="text-sm font-semibold text-ink">
        {step === "move" ? "Move to another day" : "Adjust plan"}
      </p>
      {step === "move" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {moveDates.map((moveDate) => (
            <button
              key={moveDate.date}
              type="button"
              className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
              onClick={() => onMove(moveDate)}
            >
              {moveDate.weekdayLabel}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
            onClick={onShowMoveDays}
          >
            Move to another day
          </button>
          <button
            type="button"
            className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
            onClick={onSkip}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

function DoneTodayRow({
  activity,
  onUndoDone,
}: {
  activity: TodayPreviewActivity;
  onUndoDone: () => void;
}) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white/75 p-3 shadow-soft">
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-6 text-ink">
          {activity.activityName}
        </h3>
        <p className="text-sm text-stone-600">{activity.progressLabel} this week</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full bg-meadow/15 px-3 py-2 text-sm font-semibold text-meadow transition hover:bg-meadow/25 focus:outline-none focus:ring-2 focus:ring-meadow"
        onClick={onUndoDone}
      >
        ✓ Done
      </button>
    </article>
  );
}

function SkippedRow({
  activity,
  onDone,
}: {
  activity: TodayPreviewActivity;
  onDone: () => void;
}) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white/75 p-3 shadow-soft">
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-6 text-ink">
          {activity.activityName}
        </h3>
        <p className="text-sm text-stone-600">{activity.progressLabel} this week</p>
        <p className="mt-1 text-sm font-semibold text-stone-500">Skipped</p>
      </div>
      <button
        type="button"
        className="min-h-11 shrink-0 rounded-full bg-meadow px-4 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow"
        onClick={onDone}
      >
        Mark done
      </button>
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
    <p className="rounded-lg border border-mist bg-mist/30 px-3 py-2 text-sm text-stone-700">
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

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-clay">{title}</h3>
      <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-stone-600">
        {count}
      </span>
    </div>
  );
}

function EmptyNote({ body }: { body: string }) {
  return (
    <p className="rounded-lg border border-stone-200 bg-white/75 p-3 text-sm leading-6 text-stone-600">
      {body}
    </p>
  );
}

function groupActivitiesByCategory(activities: TodayPreviewActivity[]) {
  const groups = new Map<string, TodayPreviewActivity[]>();

  activities.forEach((activity) => {
    const group = groups.get(activity.categoryName) ?? [];
    group.push(activity);
    groups.set(activity.categoryName, group);
  });

  return Array.from(groups.entries()).map(([categoryName, groupActivities]) => ({
    categoryName,
    activities: groupActivities,
  }));
}
