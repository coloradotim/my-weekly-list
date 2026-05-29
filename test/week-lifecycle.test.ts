import { describe, expect, it } from "vitest";
import {
  assertWeekIsEditable,
  canEditDayPlanning,
  canEditWeekStructure,
  closeReviewWeek,
  getAppWeekStatusDecision,
  getCurrentWeekDecision,
  getDefaultPlannableDatesForNewCurrentWeek,
  getFirstPlannableDateForNewCurrentWeek,
  getLifecycleTransition,
  isCellMissed,
  shouldShowSundayPrompt,
  type WeekLifecycleRecord,
} from "@/lib/week/lifecycle";

const week = (overrides: Partial<WeekLifecycleRecord> = {}): WeekLifecycleRecord => ({
  id: "week-1",
  weekStartDate: "2026-05-25",
  status: "active",
  ...overrides,
});

describe("week lifecycle helpers", () => {
  it("keeps a future Draft week in Draft", () => {
    expect(
      getLifecycleTransition(
        week({ status: "draft", weekStartDate: "2026-06-01" }),
        "2026-05-28",
      ),
    ).toEqual({
      status: "unchanged",
      week: week({ status: "draft", weekStartDate: "2026-06-01" }),
    });
  });

  it("activates a prepared Draft when its Monday-Sunday period starts", () => {
    expect(getLifecycleTransition(week({ status: "draft" }), "2026-05-25")).toEqual({
      status: "transition",
      from: "draft",
      to: "active",
      week: week({ status: "active" }),
    });
  });

  it("moves an Active week to Needs Review after its Sunday has passed", () => {
    expect(getLifecycleTransition(week(), "2026-06-01")).toEqual({
      status: "transition",
      from: "active",
      to: "needs_review",
      week: week({ status: "needs_review" }),
    });
  });

  it("closes only a Needs Review week and keeps Closed weeks immutable", () => {
    expect(closeReviewWeek(week({ status: "needs_review" }))).toEqual(
      week({ status: "closed" }),
    );
    expect(closeReviewWeek(week({ status: "closed" }))).toEqual(
      week({ status: "closed" }),
    );
    expect(() => closeReviewWeek(week({ status: "active" }))).toThrow(
      "Only a Needs Review week can be closed.",
    );
    expect(getLifecycleTransition(week({ status: "closed" }), "2026-06-08")).toEqual({
      status: "unchanged",
      week: week({ status: "closed" }),
    });
    expect(() => assertWeekIsEditable(week({ status: "closed" }))).toThrow(
      "Closed weeks are view-only.",
    );
  });

  it("limits structure edits to Draft while allowing day planning in Draft and Active", () => {
    expect(canEditWeekStructure("draft")).toBe(true);
    expect(canEditWeekStructure("active")).toBe(false);
    expect(canEditWeekStructure("closed")).toBe(false);
    expect(canEditDayPlanning("draft")).toBe(true);
    expect(canEditDayPlanning("active")).toBe(true);
    expect(canEditDayPlanning("needs_review")).toBe(false);
    expect(canEditDayPlanning("closed")).toBe(false);
  });

  it("shows the Sunday prompt without making Sunday review-only", () => {
    expect(
      shouldShowSundayPrompt({
        today: "2026-05-31",
        currentWeek: week(),
      }),
    ).toBe(true);
    expect(getLifecycleTransition(week(), "2026-05-31")).toEqual({
      status: "unchanged",
      week: week(),
    });
    expect(canEditDayPlanning("active")).toBe(true);
  });

  it("does not show the Sunday prompt for non-current or non-active weeks", () => {
    expect(
      shouldShowSundayPrompt({
        today: "2026-05-31",
        currentWeek: week({ status: "needs_review" }),
      }),
    ).toBe(false);
    expect(
      shouldShowSundayPrompt({
        today: "2026-05-31",
        currentWeek: week({ weekStartDate: "2026-05-18" }),
      }),
    ).toBe(false);
    expect(
      shouldShowSundayPrompt({
        today: "2026-05-30",
        currentWeek: week(),
      }),
    ).toBe(false);
  });

  it("activates a prepared Draft for Monday of the current week", () => {
    expect(
      getCurrentWeekDecision({
        weeks: [week({ status: "draft", weekStartDate: "2026-06-01" })],
        today: "2026-06-01",
      }),
    ).toEqual({
      status: "activate_draft",
      week: week({
        status: "active",
        weekStartDate: "2026-06-01",
      }),
    });
  });

  it("prompts to create the current week when Monday has no prepared week", () => {
    expect(
      getCurrentWeekDecision({
        weeks: [],
        today: "2026-06-01",
      }),
    ).toEqual({
      status: "create_current_week",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      isLateStart: false,
      firstPlannableDate: "2026-06-01",
    });
  });

  it("starts late-created weeks in the current period without backfilling earlier days", () => {
    expect(
      getCurrentWeekDecision({
        weeks: [],
        today: "2026-06-04",
      }),
    ).toEqual({
      status: "create_current_week",
      weekStartDate: "2026-06-01",
      weekEndDate: "2026-06-07",
      isLateStart: true,
      firstPlannableDate: "2026-06-04",
    });
    expect(
      getFirstPlannableDateForNewCurrentWeek({
        weekStartDate: "2026-06-01",
        createdDate: "2026-06-04",
      }),
    ).toBe("2026-06-04");
    expect(
      getDefaultPlannableDatesForNewCurrentWeek({
        weekStartDate: "2026-06-01",
        createdDate: "2026-06-04",
      }),
    ).toEqual(["2026-06-04", "2026-06-05", "2026-06-06", "2026-06-07"]);
  });

  it("does not create ghost weeks across a multi-week gap", () => {
    expect(
      getAppWeekStatusDecision({
        weeks: [week({ id: "old-week", weekStartDate: "2026-05-04" })],
        today: "2026-06-01",
      }),
    ).toEqual({
      currentWeek: {
        status: "create_current_week",
        weekStartDate: "2026-06-01",
        weekEndDate: "2026-06-07",
        isLateStart: false,
        firstPlannableDate: "2026-06-01",
      },
      reviewableWeeks: [
        week({
          id: "old-week",
          weekStartDate: "2026-05-04",
          status: "needs_review",
        }),
      ],
      ghostWeekStartDates: [],
    });
  });

  it("keeps prior reviewable weeks from blocking current-week use", () => {
    expect(
      getAppWeekStatusDecision({
        weeks: [
          week({
            id: "review-me",
            weekStartDate: "2026-05-18",
            status: "needs_review",
          }),
          week({ id: "current-week", weekStartDate: "2026-05-25" }),
        ],
        today: "2026-05-28",
      }),
    ).toEqual({
      currentWeek: {
        status: "use_active",
        week: week({ id: "current-week", weekStartDate: "2026-05-25" }),
      },
      reviewableWeeks: [
        week({
          id: "review-me",
          weekStartDate: "2026-05-18",
          status: "needs_review",
        }),
      ],
      ghostWeekStartDates: [],
    });
  });

  it("derives missed only from an existing non-draft planned undone past cell", () => {
    expect(
      isCellMissed({
        weekExists: true,
        weekStatus: "active",
        cellDate: "2026-05-27",
        today: "2026-05-28",
        planned: true,
        done: false,
      }),
    ).toBe(true);
    expect(
      isCellMissed({
        weekExists: false,
        weekStatus: "active",
        cellDate: "2026-05-27",
        today: "2026-05-28",
        planned: true,
        done: false,
      }),
    ).toBe(false);
    expect(
      isCellMissed({
        weekExists: true,
        weekStatus: "draft",
        cellDate: "2026-05-27",
        today: "2026-05-28",
        planned: true,
        done: false,
      }),
    ).toBe(false);
    expect(
      isCellMissed({
        weekExists: true,
        weekStatus: "active",
        cellDate: "2026-05-27",
        today: "2026-05-28",
        planned: false,
        done: false,
      }),
    ).toBe(false);
    expect(
      isCellMissed({
        weekExists: true,
        weekStatus: "active",
        cellDate: "2026-05-27",
        today: "2026-05-28",
        planned: true,
        done: true,
      }),
    ).toBe(false);
  });
});
