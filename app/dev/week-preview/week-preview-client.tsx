"use client";

import { useEffect, useState } from "react";
import { Notice, ThisWeekGrid } from "@/components/this-week-grid";
import {
  applyPreviewPlanningToggle,
  getInitialWeekPreviewView,
  type WeekPreviewScenario,
} from "@/lib/week/preview";

const scenarios: { id: WeekPreviewScenario; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "closed", label: "Closed" },
];

export function WeekPreviewClient() {
  const [scenario, setScenario] = useState<WeekPreviewScenario>("active");
  const [view, setView] = useState(() => getInitialWeekPreviewView("active"));
  const [message, setMessage] = useState("Preview state is local to this tab.");

  useEffect(() => {
    if (window.location.hash !== "#later-days") {
      return;
    }

    window.setTimeout(() => {
      const scroller = document.querySelector<HTMLElement>("[data-week-grid-scroll]");
      const fridayHeader = scroller?.querySelector<HTMLElement>(
        "[data-week-day-index='4']",
      );
      const stickyWidth = scroller
        ?.querySelector<HTMLElement>("[data-week-day-index='0']")
        ?.previousElementSibling?.getBoundingClientRect().width;

      if (!scroller || !fridayHeader || !stickyWidth) {
        return;
      }

      scroller.scrollTo({ left: fridayHeader.offsetLeft - stickyWidth });
    }, 0);
  }, [scenario]);

  function selectScenario(nextScenario: WeekPreviewScenario) {
    setScenario(nextScenario);
    setView(getInitialWeekPreviewView(nextScenario));
    setMessage(`${scenarioLabel(nextScenario)} preview reset.`);
  }

  function togglePlan({
    activityId,
    cellDate,
  }: {
    activityId: string;
    cellDate: string;
  }) {
    setView((currentView) =>
      applyPreviewPlanningToggle({
        view: currentView,
        activityId,
        cellDate,
      }),
    );
    setMessage("Planning toggle applied in local preview state.");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2" aria-label="Preview scenario">
          {scenarios.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-clay ${
                scenario === item.id
                  ? "border-meadow bg-meadow text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-paper"
              }`}
              onClick={() => selectScenario(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Notice tone="neutral" body={message} />
      </div>
      <ThisWeekGrid
        view={view}
        notice={null}
        renderPlanningControl={({ activity, cell, children, className, ariaLabel }) => (
          <button
            type="button"
            className={className}
            aria-label={ariaLabel}
            onClick={() =>
              togglePlan({
                activityId: activity.id,
                cellDate: cell.date,
              })
            }
          >
            {children}
          </button>
        )}
      />
    </div>
  );
}

function scenarioLabel(scenario: WeekPreviewScenario) {
  return scenarios.find((item) => item.id === scenario)?.label ?? "Week";
}
