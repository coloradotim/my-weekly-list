"use client";

import { useEffect, useState } from "react";
import {
  applyTodayPreviewAction,
  formatShortDate,
  getInitialTodayPreviewState,
  getTodayPreviewView,
  type TodayPreviewActivity,
  type TodayPreviewScenario,
} from "@/lib/today/preview";
import type { DateOnly } from "@/lib/week/date";

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
  const [adjustingActivityId, setAdjustingActivityId] = useState<string | null>(null);
  const [lastRecordedActivity, setLastRecordedActivity] = useState<string | null>(null);
  const view = getTodayPreviewView(state);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash === "#picker") {
      setIsPickerOpen(true);
      return;
    }

    if (hash === "#adjust") {
      setAdjustingActivityId("today-walk");
      return;
    }

    if (hash === "#sunday-adjust") {
      setScenario("sunday");
      setState(getInitialTodayPreviewState("sunday"));
      setAdjustingActivityId("today-singing");
    }
  }, []);

  function selectScenario(nextScenario: TodayPreviewScenario) {
    setScenario(nextScenario);
    setState(getInitialTodayPreviewState(nextScenario));
    setIsPickerOpen(false);
    setAdjustingActivityId(null);
    setLastRecordedActivity(null);
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
    setLastRecordedActivity(activity.activityName);
  }

  function moveTodayPlan(activityId: string, toDate: DateOnly) {
    setState((current) =>
      applyTodayPreviewAction(current, {
        type: "move-today-plan",
        activityId,
        toDate,
      }),
    );
    setAdjustingActivityId(null);
  }

  function removeTodayPlan(activityId: string) {
    setState((current) =>
      applyTodayPreviewAction(current, {
        type: "remove-today-plan",
        activityId,
      }),
    );
    setAdjustingActivityId(null);
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
        <SectionHeading title="Planned for today" count={view.plannedToday.length} />
        {view.plannedToday.length > 0 ? (
          <div className="space-y-2">
            {view.plannedToday.map((activity) => (
              <TodayActivityCard
                key={activity.id}
                activity={activity}
                isAdjusting={adjustingActivityId === activity.id}
                moveDates={view.remainingMoveDates}
                onDone={() => markDone(activity)}
                onToggleAdjust={() =>
                  setAdjustingActivityId((current) =>
                    current === activity.id ? null : activity.id,
                  )
                }
                onMove={(date) => moveTodayPlan(activity.id, date)}
                onRemove={() => removeTodayPlan(activity.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyNote body="Nothing is planned for today. You can still record something you did." />
        )}
      </section>

      {view.completedTodayExtras.length > 0 ? (
        <section className="space-y-2">
          <SectionHeading
            title="Also done today"
            count={view.completedTodayExtras.length}
          />
          <div className="space-y-2">
            {view.completedTodayExtras.map((activity) => (
              <CompletedExtraCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-clay/40 bg-white px-4 text-sm font-semibold text-clay transition hover:border-clay hover:bg-paper focus:outline-none focus:ring-2 focus:ring-clay"
          onClick={() => setIsPickerOpen((current) => !current)}
        >
          + Something else
        </button>
        {lastRecordedActivity ? (
          <p className="mt-2 text-sm text-stone-600">
            Recorded {lastRecordedActivity} for today.
          </p>
        ) : null}
        {isPickerOpen ? (
          <div className="mt-3 border-t border-stone-200 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  What did you do today?
                </h3>
                <p className="mt-1 text-sm leading-5 text-stone-600">
                  Pick from this week&apos;s activities.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full px-2 py-1 text-sm font-semibold text-stone-500 transition hover:bg-paper hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
                onClick={() => setIsPickerOpen(false)}
              >
                Close
              </button>
            </div>
            {pickerGroups.length > 0 ? (
              <div className="mt-3 space-y-3">
                {pickerGroups.map((group) => (
                  <div key={group.categoryName}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-clay">
                      {group.categoryName}
                    </p>
                    <div className="mt-1 grid gap-2">
                      {group.activities.map((activity) => (
                        <button
                          key={activity.id}
                          type="button"
                          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm transition hover:border-meadow focus:outline-none focus:ring-2 focus:ring-meadow"
                          onClick={() => {
                            markDone(activity);
                            setIsPickerOpen(false);
                          }}
                        >
                          <span className="font-semibold text-ink">
                            {activity.activityName}
                          </span>
                          <span className="text-stone-500">
                            {activity.progressLabel} this week
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote body="Everything eligible is already counted for today." />
            )}
          </div>
        ) : null}
      </section>
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

function TodayActivityCard({
  activity,
  isAdjusting,
  moveDates,
  onDone,
  onToggleAdjust,
  onMove,
  onRemove,
}: {
  activity: TodayPreviewActivity;
  isAdjusting: boolean;
  moveDates: DateOnly[];
  onDone: () => void;
  onToggleAdjust: () => void;
  onMove: (date: DateOnly) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay">
            {activity.categoryName}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-6 text-ink">
            {activity.activityName}
          </h3>
          <p className="text-sm text-stone-600">{activity.progressLabel} this week</p>
          {activity.canAdjustTodayPlan ? (
            <button
              type="button"
              className="mt-1 text-sm font-semibold text-clay underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
              onClick={onToggleAdjust}
            >
              Adjust plan
            </button>
          ) : null}
        </div>
        {activity.isDoneToday ? (
          <span className="shrink-0 rounded-full bg-meadow/15 px-3 py-2 text-sm font-semibold text-meadow">
            ✓ Done
          </span>
        ) : (
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow"
            onClick={onDone}
          >
            Done
          </button>
        )}
      </div>
      {isAdjusting && activity.canAdjustTodayPlan ? (
        <AdjustPlanPanel moveDates={moveDates} onMove={onMove} onRemove={onRemove} />
      ) : null}
    </article>
  );
}

function AdjustPlanPanel({
  moveDates,
  onMove,
  onRemove,
}: {
  moveDates: DateOnly[];
  onMove: (date: DateOnly) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-mist bg-mist/25 p-3">
      <p className="text-sm font-semibold text-ink">Adjust today&apos;s plan</p>
      {moveDates.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {moveDates.map((date) => (
            <button
              key={date}
              type="button"
              className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
              onClick={() => onMove(date)}
            >
              Move to {formatShortDate(date)}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm leading-5 text-stone-600">
          No later days remain in this week.
        </p>
      )}
      <button
        type="button"
        className="mt-2 min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-600 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay"
        onClick={onRemove}
      >
        Remove from today
      </button>
    </div>
  );
}

function CompletedExtraCard({ activity }: { activity: TodayPreviewActivity }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white/75 p-3 shadow-soft">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-clay">
          {activity.categoryName}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-6 text-ink">
          {activity.activityName}
        </h3>
        <p className="text-sm text-stone-600">{activity.progressLabel} this week</p>
      </div>
      <span className="shrink-0 rounded-full bg-meadow/15 px-3 py-2 text-sm font-semibold text-meadow">
        ✓ Done
      </span>
    </article>
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
