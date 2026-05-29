"use client";

import { useState } from "react";
import {
  applyTodayPreviewAction,
  formatShortDate,
  getInitialTodayPreviewState,
  getTodayPreviewView,
  type TodayPreviewActivity,
  type TodayPreviewPriorItem,
  type TodayPreviewScenario,
} from "@/lib/today/preview";

const scenarios: { id: TodayPreviewScenario; label: string }[] = [
  { id: "active", label: "Today" },
  { id: "sunday", label: "Sunday" },
  { id: "no-current-week", label: "No week" },
  { id: "setup-needed", label: "Setup" },
];

export function TodayPreviewClient() {
  const [scenario, setScenario] = useState<TodayPreviewScenario>("active");
  const [state, setState] = useState(() => getInitialTodayPreviewState("active"));
  const view = getTodayPreviewView(state);

  function selectScenario(nextScenario: TodayPreviewScenario) {
    setScenario(nextScenario);
    setState(getInitialTodayPreviewState(nextScenario));
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

  const canMoveTomorrow = Boolean(view.tomorrow);

  return (
    <div className="space-y-3">
      <ScenarioTabs scenario={scenario} onSelect={selectScenario} />

      <header className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clay">
              Today
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
              {view.todayLabel}
            </h2>
            <p className="mt-1 text-sm text-stone-600">Week {view.weekRangeLabel}</p>
          </div>
          {view.isSunday ? (
            <p className="rounded-lg border border-mist bg-mist/35 px-3 py-2 text-sm leading-5 text-stone-700">
              Sunday is still part of this week. Finish today, then review or plan next.
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
                primaryLabel={activity.isDoneToday ? "Done" : "Done"}
                primaryDisabled={activity.isDoneToday}
                onPrimary={() =>
                  setState((current) =>
                    applyTodayPreviewAction(current, {
                      type: "mark-done",
                      activityId: activity.id,
                    }),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <EmptyNote body="Nothing is planned for today. You can still record something you did." />
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-clay">
            Also did something?
          </h3>
          <p className="mt-1 text-sm leading-5 text-stone-600">
            Record an unplanned completion for today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {view.unplannedOptions.slice(0, 5).map((activity) => (
            <button
              key={activity.id}
              type="button"
              className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-meadow hover:text-ink focus:outline-none focus:ring-2 focus:ring-meadow"
              onClick={() =>
                setState((current) =>
                  applyTodayPreviewAction(current, {
                    type: "mark-done",
                    activityId: activity.id,
                  }),
                )
              }
            >
              {activity.activityName}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeading title="Earlier this week" count={view.priorUnresolved.length} />
        {view.priorUnresolved.length > 0 ? (
          <div className="space-y-2">
            {view.priorUnresolved.map((item) => (
              <PriorItemCard
                key={`${item.id}-${item.fromDate}`}
                item={item}
                today={view.today}
                canMoveTomorrow={canMoveTomorrow}
                tomorrowLabel={view.tomorrow ? formatShortDate(view.tomorrow) : null}
                remainingMoveDates={view.remainingMoveDates}
                onMove={(toDate) =>
                  setState((current) =>
                    applyTodayPreviewAction(current, {
                      type: "move-prior",
                      activityId: item.id,
                      fromDate: item.fromDate,
                      toDate,
                    }),
                  )
                }
                onLeaveMissed={() =>
                  setState((current) =>
                    applyTodayPreviewAction(current, {
                      type: "leave-missed",
                      activityId: item.id,
                      fromDate: item.fromDate,
                    }),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <EmptyNote body="No earlier planned items need attention in this preview state." />
        )}
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
  primaryLabel,
  primaryDisabled,
  onPrimary,
}: {
  activity: TodayPreviewActivity;
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
}) {
  return (
    <article className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-clay">
          {activity.categoryName}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-6 text-ink">
          {activity.activityName}
        </h3>
        <p className="text-sm text-stone-600">{activity.progressLabel} this week</p>
      </div>
      <button
        type="button"
        disabled={primaryDisabled}
        className={`min-h-11 rounded-full px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-meadow ${
          primaryDisabled
            ? "bg-meadow/15 text-meadow"
            : "bg-meadow text-white hover:bg-meadow/90"
        }`}
        onClick={onPrimary}
      >
        {primaryDisabled ? "Done" : primaryLabel}
      </button>
    </article>
  );
}

function PriorItemCard({
  item,
  today,
  canMoveTomorrow,
  tomorrowLabel,
  remainingMoveDates,
  onMove,
  onLeaveMissed,
}: {
  item: TodayPreviewPriorItem;
  today: string;
  canMoveTomorrow: boolean;
  tomorrowLabel: string | null;
  remainingMoveDates: string[];
  onMove: (toDate: string) => void;
  onLeaveMissed: () => void;
}) {
  const otherMoveDates = remainingMoveDates.slice(0, 3);

  return (
    <article className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-clay">
            {item.categoryName}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-6 text-ink">
            {item.activityName}
          </h3>
          <p className="text-sm leading-5 text-stone-600">
            Planned {item.fromDayLabel}. {item.progressLabel} this week.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-10 rounded-full bg-meadow px-3 text-sm font-semibold text-white"
          onClick={() => onMove(today)}
        >
          Move to today
        </button>
        {canMoveTomorrow && tomorrowLabel ? (
          <button
            type="button"
            className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700"
            onClick={() => onMove(remainingMoveDates[0])}
          >
            Tomorrow
          </button>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-paper px-3 text-sm font-semibold text-stone-500">
            No tomorrow in this week
          </span>
        )}
        {otherMoveDates.slice(1).map((date) => (
          <button
            key={date}
            type="button"
            className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700"
            onClick={() => onMove(date)}
          >
            {formatShortDate(date)}
          </button>
        ))}
        <button
          type="button"
          className="min-h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-600"
          onClick={onLeaveMissed}
        >
          Leave missed
        </button>
      </div>
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
