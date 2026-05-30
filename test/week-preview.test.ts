import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyPreviewPlanningToggle,
  getInitialWeekPreviewView,
  isDevWeekPreviewEnabled,
} from "@/lib/week/preview";

const previewPage = readFileSync(
  join(process.cwd(), "app/dev/week-preview/page.tsx"),
  "utf8",
);
const previewClient = readFileSync(
  join(process.cwd(), "app/dev/week-preview/week-preview-client.tsx"),
  "utf8",
);
const gridComponent = readFileSync(
  join(process.cwd(), "components/this-week-grid.tsx"),
  "utf8",
);
const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");

describe("development week preview", () => {
  it("is disabled in production", () => {
    expect(isDevWeekPreviewEnabled("development")).toBe(true);
    expect(isDevWeekPreviewEnabled("test")).toBe(true);
    expect(isDevWeekPreviewEnabled("production")).toBe(false);
    expect(previewPage).toContain("notFound()");
    expect(middleware).toContain('startsWith("/dev/")');
    expect(middleware).toContain("isDevPreviewEnabled()");
    expect(middleware).toContain("status: 404");
  });

  it("uses local fixture state without Supabase clients or service-role keys", () => {
    expect(previewClient).toContain("useState");
    expect(previewClient).toContain("getInitialWeekPreviewView");
    expect(previewClient).toContain("PlanPreviewClient");
    expect(previewClient).toContain("Draft/list editing");
    expect(previewClient).toContain("Grid states");
    expect(previewClient).not.toContain("createSupabase");
    expect(previewClient).not.toContain("SERVICE_ROLE");
    expect(previewClient).not.toContain("service_role");
  });

  it("renders a realistic active week fixture with all cell states", () => {
    const view = getInitialWeekPreviewView();
    const states = view.categories.flatMap((category) =>
      category.activities.flatMap((activity) => activity.cells.map((cell) => cell.state)),
    );

    expect(view.week.status).toBe("active");
    expect(view.today).toBe("2026-06-04");
    expect(view.categories.length).toBeGreaterThanOrEqual(3);
    expect(
      view.categories.flatMap((category) => category.activities).length,
    ).toBeGreaterThan(5);
    expect(states).toContain("blank");
    expect(states).toContain("planned");
    expect(states).toContain("done");
    expect(states).toContain("missed");
    expect(
      view.categories
        .flatMap((category) => category.activities)
        .flatMap((activity) => activity.cells)
        .some((cell) => cell.isPlanningEditable),
    ).toBe(true);
  });

  it("demonstrates draft, active, and closed planning rules", () => {
    const active = getInitialWeekPreviewView("active");
    const draft = getInitialWeekPreviewView("draft");
    const closed = getInitialWeekPreviewView("closed");

    expect(active.week.status).toBe("active");
    expect(draft.week.status).toBe("draft");
    expect(closed.week.status).toBe("closed");
    expect(
      draft.categories
        .flatMap((category) => category.activities)
        .flatMap((activity) => activity.cells)
        .every((cell) => cell.done || cell.state === "missed" || cell.isPlanningEditable),
    ).toBe(true);
    expect(
      closed.categories
        .flatMap((category) => category.activities)
        .flatMap((activity) => activity.cells)
        .every((cell) => !cell.isPlanningEditable),
    ).toBe(true);
  });

  it("applies direct planning toggles only to local view state", () => {
    const initialView = getInitialWeekPreviewView();
    const updatedView = applyPreviewPlanningToggle({
      view: initialView,
      activityId: "preview-walk",
      cellDate: "2026-06-05",
    });
    const updatedWalk = updatedView.categories
      .flatMap((category) => category.activities)
      .find((activity) => activity.id === "preview-walk");

    expect(updatedWalk?.cells.find((cell) => cell.date === "2026-06-05")).toMatchObject({
      planned: true,
      done: false,
      state: "planned",
    });
  });

  it("does not expose popovers or completion actions in the preview grid", () => {
    expect(previewClient).not.toContain("renderCellAction");
    expect(previewClient).not.toContain("mark_done");
    expect(previewClient).not.toContain("Mark done");
  });

  it("keeps category labels anchored and non-editable blanks visually quiet", () => {
    expect(gridComponent).toContain("sticky left-0 z-20");
    expect(gridComponent).toContain("col-span-7");
    expect(gridComponent).toContain("h-2 w-2 bg-stone-200/70");
    expect(gridComponent).toContain("snap-x snap-mandatory");
    expect(gridComponent).toContain("scroll-pl-[116px]");
  });

  it("uses keyboard-only focus rings for editable planning cells", () => {
    expect(gridComponent).toContain("focus:outline-none");
    expect(gridComponent).toContain("focus-visible:ring-2");
    expect(gridComponent).not.toContain(" focus:ring-2");
    expect(gridComponent).not.toContain("focus:ring-clay");
  });
});
