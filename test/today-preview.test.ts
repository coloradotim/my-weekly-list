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

  it("builds an active Today view with planned, unplanned, and prior items", () => {
    const view = getTodayPreviewView(getInitialTodayPreviewState("active"));

    expect(view.status).toBe("ready");
    expect(view.today).toBe("2026-06-04");
    expect(view.plannedToday.map((activity) => activity.activityName)).toEqual([
      "Walk",
      "Read",
      "Quality kid time",
    ]);
    expect(view.unplannedOptions.map((activity) => activity.activityName)).toContain(
      "Yoga",
    );
    expect(view.priorUnresolved.map((item) => item.activityName)).toEqual([
      "Walk",
      "Singing practice",
    ]);
  });

  it("marks a planned item done while preserving weekly progress", () => {
    const state = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "mark-done",
      activityId: "today-walk",
    });
    const view = getTodayPreviewView(state);

    expect(view.status).toBe("ready");
    expect(
      view.plannedToday.find((activity) => activity.id === "today-walk"),
    ).toMatchObject({
      isDoneToday: true,
      progressLabel: "2/4",
    });
  });

  it("records unplanned done today without requiring a planned cell first", () => {
    const state = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "mark-done",
      activityId: "today-yoga",
    });
    const view = getTodayPreviewView(state);

    expect(view.status).toBe("ready");
    expect(
      view.plannedToday.find((activity) => activity.id === "today-yoga"),
    ).toMatchObject({
      isDoneToday: true,
      progressLabel: "2/2",
    });
    expect(view.unplannedOptions.some((activity) => activity.id === "today-yoga")).toBe(
      false,
    );
  });

  it("moves an unresolved prior plan to a remaining day", () => {
    const state = applyTodayPreviewAction(getInitialTodayPreviewState("active"), {
      type: "move-prior",
      activityId: "today-singing",
      fromDate: "2026-06-03",
      toDate: "2026-06-05",
    });
    const view = getTodayPreviewView(state);

    expect(view.status).toBe("ready");
    expect(view.priorUnresolved.some((item) => item.id === "today-singing")).toBe(false);
    expect(
      view.unplannedOptions.some((activity) => activity.id === "today-singing"),
    ).toBe(true);
  });

  it("handles Sunday without offering a next day in the current week", () => {
    const view = getTodayPreviewView(getInitialTodayPreviewState("sunday"));

    expect(view.status).toBe("ready");
    expect(view.isSunday).toBe(true);
    expect(view.tomorrow).toBeNull();
    expect(view.remainingMoveDates).toEqual([]);
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
