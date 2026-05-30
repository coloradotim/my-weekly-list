import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyTodayPreviewAction,
  getInitialTodayPreviewState,
  getTodayPreviewView,
} from "@/lib/today/preview";
import { isDevPreviewEnabled } from "@/lib/week/preview";

const previewPage = readFileSync(
  join(process.cwd(), "app/dev/today-preview/page.tsx"),
  "utf8",
);
const previewClient = readFileSync(
  join(process.cwd(), "app/dev/today-preview/today-preview-client.tsx"),
  "utf8",
);
const previewModel = readFileSync(join(process.cwd(), "lib/today/preview.ts"), "utf8");
const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");

describe("development today preview", () => {
  it("is disabled in production and allowed through middleware only in development", () => {
    expect(isDevPreviewEnabled("development")).toBe(true);
    expect(isDevPreviewEnabled("test")).toBe(true);
    expect(isDevPreviewEnabled("production")).toBe(false);
    expect(previewPage).toContain("notFound()");
    expect(middleware).toContain('startsWith("/dev/")');
    expect(middleware).toContain("isDevPreviewEnabled()");
  });

  it("uses local fixture state without Supabase clients or service-role keys", () => {
    expect(previewClient).toContain("useState");
    expect(previewClient).toContain("getInitialTodayPreviewState");
    expect(previewClient).not.toContain("createSupabase");
    expect(previewClient).not.toContain("SERVICE_ROLE");
    expect(previewClient).not.toContain("service_role");
  });

  it("builds the state-ordered active Today view without prior backlog", () => {
    const view = getTodayPreviewView(getInitialTodayPreviewState("active"));

    expect(view.status).toBe("ready");
    expect(view.today).toBe("2026-06-04");
    expect(view.openPlannedToday.map((activity) => activity.activityName)).toEqual([
      "Walk",
      "Meditation",
      "Downtime",
      "Read",
    ]);
    expect(view.doneToday.map((activity) => activity.activityName)).toEqual([
      "Quality kid time",
    ]);
    expect(view.skippedToday).toEqual([]);
    expect(view.unplannedOptions.map((activity) => activity.activityName)).toContain(
      "Yoga",
    );
    expect("priorUnresolved" in view).toBe(false);
  });

  it("marks an open planned item done and moves it out of open plans", () => {
    const state = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "mark-done",
      activityId: "today-walk",
    });
    const view = getTodayPreviewView(state);

    expect(view.status).toBe("ready");
    expect(view.openPlannedToday.some((activity) => activity.id === "today-walk")).toBe(
      false,
    );
    expect(view.doneToday.find((activity) => activity.id === "today-walk")).toMatchObject(
      {
        isDoneToday: true,
        isPlannedToday: true,
        isSkippedToday: false,
        progressLabel: "2/4",
      },
    );
  });

  it("lets a planned done item return to open planned today", () => {
    const doneState = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "mark-done",
      activityId: "today-walk",
    });
    const undoneState = applyTodayPreviewAction(doneState, {
      type: "undo-done",
      activityId: "today-walk",
    });
    const view = getTodayPreviewView(undoneState);

    expect(view.status).toBe("ready");
    expect(view.doneToday.some((activity) => activity.id === "today-walk")).toBe(false);
    expect(
      view.openPlannedToday.find((activity) => activity.id === "today-walk"),
    ).toMatchObject({
      isPlannedToday: true,
      isDoneToday: false,
      progressLabel: "1/4",
    });
  });

  it("records unplanned done today into unified Done today", () => {
    const state = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "mark-done",
      activityId: "today-yoga",
    });
    const view = getTodayPreviewView(state);

    expect(view.status).toBe("ready");
    expect(view.doneToday.find((activity) => activity.id === "today-yoga")).toMatchObject(
      {
        isDoneToday: true,
        isPlannedToday: false,
        progressLabel: "2/2",
      },
    );
    expect(view.unplannedOptions.some((activity) => activity.id === "today-yoga")).toBe(
      false,
    );
  });

  it("lets an unplanned done item become picker-eligible again", () => {
    const doneState = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "mark-done",
      activityId: "today-yoga",
    });
    const undoneState = applyTodayPreviewAction(doneState, {
      type: "undo-done",
      activityId: "today-yoga",
    });
    const view = getTodayPreviewView(undoneState);

    expect(view.status).toBe("ready");
    expect(view.doneToday.some((activity) => activity.id === "today-yoga")).toBe(false);
    expect(view.unplannedOptions.some((activity) => activity.id === "today-yoga")).toBe(
      true,
    );
  });

  it("moves today's incomplete plan to a remaining day with day-name choices", () => {
    const initialView = getTodayPreviewView(getInitialTodayPreviewState("active"));
    const state = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "move-today-plan",
      activityId: "today-walk",
      toDate: "2026-06-05",
    });
    const view = getTodayPreviewView(state);

    expect(view.status).toBe("ready");
    expect(initialView.status).toBe("ready");
    const walk = initialView.openPlannedToday.find(
      (activity) => activity.id === "today-walk",
    );

    expect(walk?.moveDates.map((date) => date.weekdayLabel)).toEqual(["Friday"]);
    expect(view.openPlannedToday.some((activity) => activity.id === "today-walk")).toBe(
      false,
    );
    expect(view.unplannedOptions.some((activity) => activity.id === "today-walk")).toBe(
      true,
    );
  });

  it("excludes already planned and done future days from preview move destinations", () => {
    const view = getTodayPreviewView(getInitialTodayPreviewState("active"));

    expect(view.status).toBe("ready");
    expect(
      view.openPlannedToday
        .find((activity) => activity.id === "today-read")
        ?.moveDates.map((date) => date.weekdayLabel),
    ).toEqual(["Saturday", "Sunday"]);
    expect(
      view.openPlannedToday.find((activity) => activity.id === "today-downtime")
        ?.moveDates,
    ).toEqual([]);
  });

  it("does not overwrite existing planned or done destination cells in preview state", () => {
    const state = getInitialTodayPreviewState("active");

    expect(
      applyTodayPreviewAction(state, {
        type: "move-today-plan",
        activityId: "today-walk",
        toDate: "2026-06-06",
      }),
    ).toEqual(state);
    expect(
      applyTodayPreviewAction(state, {
        type: "move-today-plan",
        activityId: "today-walk",
        toDate: "2026-06-07",
      }),
    ).toEqual(state);
  });

  it("undoes a moved planned occurrence back to today", () => {
    const movedState = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "move-today-plan",
      activityId: "today-walk",
      toDate: "2026-06-05",
    });
    const undoState = applyTodayPreviewAction(movedState, {
      type: "undo-move-today-plan",
      activityId: "today-walk",
      fromDate: "2026-06-05",
    });
    const view = getTodayPreviewView(undoState);

    expect(view.status).toBe("ready");
    expect(view.openPlannedToday.some((activity) => activity.id === "today-walk")).toBe(
      true,
    );
  });

  it("skips a planned-today occurrence without changing progress or clearing planned", () => {
    const state = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "skip-today",
      activityId: "today-meditation",
    });
    const view = getTodayPreviewView(state);

    expect(view.status).toBe("ready");
    expect(
      view.openPlannedToday.some((activity) => activity.id === "today-meditation"),
    ).toBe(false);
    expect(
      view.skippedToday.find((activity) => activity.id === "today-meditation"),
    ).toMatchObject({
      isPlannedToday: true,
      isSkippedToday: true,
      isDoneToday: false,
      progressLabel: "0/3",
    });
  });

  it("can undo Skip and can later mark a skipped occurrence done", () => {
    const skippedState = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "skip-today",
      activityId: "today-meditation",
    });
    const undoState = applyTodayPreviewAction(skippedState, {
      type: "undo-skip",
      activityId: "today-meditation",
    });
    const doneState = applyTodayPreviewAction(skippedState, {
      type: "mark-done",
      activityId: "today-meditation",
    });
    const undoView = getTodayPreviewView(undoState);
    const doneView = getTodayPreviewView(doneState);

    expect(undoView.status).toBe("ready");
    expect(
      undoView.openPlannedToday.some((activity) => activity.id === "today-meditation"),
    ).toBe(true);
    expect(doneView.status).toBe("ready");
    expect(doneView.skippedToday).toEqual([]);
    expect(
      doneView.doneToday.find((activity) => activity.id === "today-meditation"),
    ).toMatchObject({
      isDoneToday: true,
      isSkippedToday: false,
      progressLabel: "1/3",
    });
  });

  it("handles Sunday without move options or Adjust plan", () => {
    const view = getTodayPreviewView(getInitialTodayPreviewState("sunday"));

    expect(view.status).toBe("ready");
    expect(view.isSunday).toBe(true);
    expect(view.tomorrow).toBeNull();
    expect(view.remainingMoveDates).toEqual([]);
    expect(view.openPlannedToday.map((activity) => activity.activityName)).toEqual([
      "Walk",
      "Singing practice",
    ]);
  });

  it("uses approved copy and removes old backlog actions", () => {
    expect(previewClient).toContain("+ Something else");
    expect(previewClient).toContain("Mark done");
    expect(previewClient).toContain("Mark done today");
    expect(previewClient).toContain("Cancel");
    expect(previewClient).toContain("Done today");
    expect(previewClient).toContain("Skipped");
    expect(previewClient).toContain("Move to another day");
    expect(previewClient).toContain("moveDates.length > 0");
    expect(previewClient).toContain("Skip");
    expect(previewClient).not.toContain("What did you do today?");
    expect(previewClient).not.toContain("Recorded ");
    expect(previewClient).not.toContain("Also done today");
    expect(previewClient).not.toContain("Earlier this week");
    expect(previewClient).not.toContain("Move to today");
    expect(previewClient).not.toContain("Leave missed");
    expect(previewClient).not.toContain("Remove from today");
    expect(previewModel).toContain("skipped: boolean");
  });

  it("keeps Adjust plan dismissible without a required move or Skip action", () => {
    expect(previewClient).toContain("onCancelAdjust");
    expect(previewClient).toContain("setAdjustingActivityId(null)");
    expect(previewClient).toContain('setAdjustStep("choices")');
    expect(previewClient).toContain("current === activity.id ? null : activity.id");
  });

  it("shows no-current-week and setup-needed prompt states", () => {
    const noWeek = getTodayPreviewView(getInitialTodayPreviewState("no-current-week"));
    const setup = getTodayPreviewView(getInitialTodayPreviewState("setup-needed"));

    expect(noWeek.status).toBe("no-current-week");
    expect(noWeek.title).toBe("Start this week first");
    expect(setup.status).toBe("setup-needed");
    expect(setup.title).toBe("Create your starter list first");
  });
});
