"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { setWeekPlanningCellAction } from "@/app/(app)/week/actions";
import { Notice, ThisWeekGrid } from "@/components/this-week-grid";
import type { ThisWeekViewModel } from "@/lib/week/current";
import type { DateOnly } from "@/lib/week/date";
import {
  applyOptimisticPlanningCell,
  getOptimisticPlannedValue,
  getPlanningCellKey,
  type PlanningCellKey,
} from "@/lib/week/optimistic";

type WeekNotice = {
  tone: "success" | "error" | "neutral";
  body: string;
} | null;

type SaveStatus = "idle" | "error";

export function OptimisticThisWeekGrid({
  initialView,
  initialNotice,
}: {
  initialView: ThisWeekViewModel;
  initialNotice: WeekNotice;
}) {
  const [view, setView] = useState(initialView);
  const [pendingCellKeys, setPendingCellKeys] = useState<Set<PlanningCellKey>>(
    () => new Set(),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [collapsedCategoryNames, setCollapsedCategoryNames] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setView(initialView);
    setPendingCellKeys(new Set());
    setSaveStatus("idle");
  }, [initialView]);

  function toggleCategory(categoryName: string) {
    setCollapsedCategoryNames((current) =>
      current.includes(categoryName)
        ? current.filter((name) => name !== categoryName)
        : [...current, categoryName],
    );
  }

  useEffect(() => {
    if (initialView.week.status !== "active") {
      return;
    }

    if (window.matchMedia("(min-width: 640px)").matches) {
      return;
    }

    const todayIndex = initialView.dayDates.indexOf(initialView.today);

    if (todayIndex < 0) {
      return;
    }

    const grid = document.querySelector<HTMLElement>("[data-week-grid-scroll]");
    const todayHeader = document.querySelector<HTMLElement>(
      `[data-week-day-index="${todayIndex}"]`,
    );

    todayHeader?.scrollIntoView({
      block: "nearest",
      inline: "start",
      behavior: "auto",
    });

    if (grid && todayIndex === 0) {
      grid.scrollLeft = 0;
    }
  }, [initialView.dayDates, initialView.today, initialView.week.status]);

  const notice = useMemo<WeekNotice>(() => {
    if (saveStatus === "error") {
      return { tone: "error", body: "Couldn’t save that change. Try again." };
    }

    return initialNotice;
  }, [initialNotice, saveStatus]);

  function setPending(key: PlanningCellKey, isPending: boolean) {
    setPendingCellKeys((current) => {
      const next = new Set(current);

      if (isPending) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }

  return (
    <>
      {notice ? <Notice tone={notice.tone} body={notice.body} /> : null}
      <ThisWeekGrid
        view={view}
        notice={null}
        showStatusPanel={false}
        collapsedCategoryNames={collapsedCategoryNames}
        onToggleCategory={toggleCategory}
        renderPlanningControl={({ activity, cell, children, className, ariaLabel }) => {
          const cellDate = cell.date as DateOnly;
          const key = getPlanningCellKey(activity.id, cellDate);
          const isPending = pendingCellKeys.has(key);

          return (
            <button
              type="button"
              className={`${className} ${isPending ? "opacity-75" : ""}`}
              aria-label={ariaLabel}
              aria-busy={isPending}
              disabled={isPending}
              onClick={() => {
                if (!cell.isPlanningEditable || isPending) {
                  return;
                }

                const previousPlanned = cell.planned;
                const planned = getOptimisticPlannedValue(cell);

                setSaveStatus("idle");
                setPending(key, true);
                setView((currentView) =>
                  applyOptimisticPlanningCell({
                    view: currentView,
                    activityId: activity.id,
                    cellDate,
                    planned,
                  }),
                );

                startTransition(() => {
                  void setWeekPlanningCellAction({
                    weekActivityId: activity.id,
                    cellDate,
                    planned,
                  })
                    .then((result) => {
                      if (result.status === "updated") {
                        return;
                      }

                      setSaveStatus("error");
                      setView((currentView) =>
                        applyOptimisticPlanningCell({
                          view: currentView,
                          activityId: activity.id,
                          cellDate,
                          planned: previousPlanned,
                        }),
                      );
                    })
                    .catch(() => {
                      setSaveStatus("error");
                      setView((currentView) =>
                        applyOptimisticPlanningCell({
                          view: currentView,
                          activityId: activity.id,
                          cellDate,
                          planned: previousPlanned,
                        }),
                      );
                    })
                    .finally(() => {
                      setPending(key, false);
                    });
                });
              }}
            >
              {children}
            </button>
          );
        }}
      />
    </>
  );
}
