import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyReviewCompletionToggle,
  buildReviewSummary,
  findReviewCell,
  getReviewDetailDisplayState,
  getInitialReviewPreviewState,
  getReviewSummarySentence,
} from "@/lib/review/preview";
import { isDevPreviewEnabled } from "@/lib/week/preview";

const previewPage = readFileSync(
  join(process.cwd(), "app/dev/review-preview/page.tsx"),
  "utf8",
);
const previewClient = readFileSync(
  join(process.cwd(), "app/dev/review-preview/review-preview-client.tsx"),
  "utf8",
);

describe("development review preview", () => {
  it("is disabled in production", () => {
    expect(isDevPreviewEnabled("development")).toBe(true);
    expect(isDevPreviewEnabled("test")).toBe(true);
    expect(isDevPreviewEnabled("production")).toBe(false);
    expect(previewPage).toContain("notFound()");
  });

  it("uses local fixture state without Supabase clients or service-role keys", () => {
    expect(previewClient).toContain("useState");
    expect(previewClient).toContain("getInitialReviewPreviewState");
    expect(previewClient).not.toContain("createSupabase");
    expect(previewClient).not.toContain("SERVICE_ROLE");
    expect(previewClient).not.toContain("service_role");
  });

  it("builds the required summary sentence and target groupings", () => {
    const summary = buildReviewSummary(getInitialReviewPreviewState("past"));

    expect(getReviewSummarySentence(summary)).toBe(
      "You completed 17 activities this week.",
    );
    expect(summary.targetsMet.map((row) => row.name)).toEqual([
      "Read",
      "Walk",
      "Quality kid time",
    ]);
    expect(summary.targetsMet.find((row) => row.name === "Read")).toMatchObject({
      doneCount: 6,
      targetCount: 5,
      isTargetMet: true,
    });
    expect(summary.shortOfTarget.map((row) => row.name)).toEqual([
      "Yoga",
      "Journal",
      "Meditation",
    ]);
  });

  it("counts planned and unplanned completions as activity-day records", () => {
    const state = getInitialReviewPreviewState("past");
    const summary = buildReviewSummary(state);

    expect(findReviewCell(state, "read", "2026-05-31")).toMatchObject({
      planned: false,
      done: true,
    });
    expect(summary.completedActivityDays).toBe(17);
  });

  it("does not expose category totals, an overall score, or lifecycle actions", () => {
    expect(previewClient).not.toContain("category total");
    expect(previewClient).not.toContain("score");
    expect(previewClient).not.toContain("Close week");
    expect(previewClient).not.toContain("Finalize");
    expect(previewClient).not.toContain("Draft");
  });

  it("renders Review details as final completion truth only", () => {
    const state = getInitialReviewPreviewState("past");

    expect(
      getReviewDetailDisplayState(findReviewCell(state, "read", "2026-05-25")!),
    ).toBe("done");
    expect(
      getReviewDetailDisplayState(findReviewCell(state, "yoga", "2026-05-26")!),
    ).toBe("blank");
    expect(
      getReviewDetailDisplayState(findReviewCell(state, "meditation", "2026-05-28")!),
    ).toBe("blank");
    expect(
      getReviewDetailDisplayState(findReviewCell(state, "walk", "2026-05-26")!),
    ).toBe("blank");

    expect(previewClient).toContain("border border-stone-300 bg-white");
    expect(previewClient).toContain("bg-meadow");
    expect(previewClient).not.toContain("bg-stone-100");
  });

  it("adds category context only inside day-by-day details", () => {
    expect(previewClient).toContain("group.categoryName");
    expect(
      getInitialReviewPreviewState("past").activities.map(
        (activity) => activity.categoryName,
      ),
    ).toContain("Physical Health");
  });

  it("shows the Sunday current-week note exactly", () => {
    const sundayState = getInitialReviewPreviewState("sunday");
    const normalizedClient = previewClient.replace(/\s+/g, " ");

    expect(sundayState.isSundayCurrentWeek).toBe(true);
    expect(normalizedClient).toContain(
      "This week is still active through today. You can update anything you complete later.",
    );
  });

  it("marks planned-not-done cells completed without changing planned state", () => {
    const updated = applyReviewCompletionToggle({
      state: getInitialReviewPreviewState("past"),
      activityId: "yoga",
      date: "2026-05-26",
    });

    expect(findReviewCell(updated, "yoga", "2026-05-26")).toMatchObject({
      planned: true,
      done: true,
      skipped: false,
    });
  });

  it("marks skipped cells completed and clears skipped", () => {
    const updated = applyReviewCompletionToggle({
      state: getInitialReviewPreviewState("past"),
      activityId: "meditation",
      date: "2026-05-28",
    });

    expect(findReviewCell(updated, "meditation", "2026-05-28")).toMatchObject({
      planned: true,
      done: true,
      skipped: false,
    });
  });

  it("marks blank unplanned cells completed as unplanned completions", () => {
    const updated = applyReviewCompletionToggle({
      state: getInitialReviewPreviewState("past"),
      activityId: "walk",
      date: "2026-05-26",
    });

    expect(findReviewCell(updated, "walk", "2026-05-26")).toMatchObject({
      planned: false,
      done: true,
      skipped: false,
    });
  });

  it("removes completion without reconstructing skipped state", () => {
    const updated = applyReviewCompletionToggle({
      state: getInitialReviewPreviewState("past"),
      activityId: "read",
      date: "2026-05-25",
    });

    expect(findReviewCell(updated, "read", "2026-05-25")).toMatchObject({
      planned: true,
      done: false,
      skipped: false,
    });
  });

  it("returns unplanned completed cells to blank when toggled off", () => {
    const updated = applyReviewCompletionToggle({
      state: getInitialReviewPreviewState("past"),
      activityId: "read",
      date: "2026-05-31",
    });

    expect(findReviewCell(updated, "read", "2026-05-31")).toMatchObject({
      planned: false,
      done: false,
      skipped: false,
    });
  });
});
