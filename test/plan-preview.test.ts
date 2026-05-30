import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activeDraftActivities,
  applyPlanPreviewAction,
  getInitialPlanPreviewState,
  removedDraftActivities,
  summarizeCopy,
} from "@/lib/plan/preview";
import { isDevPreviewEnabled } from "@/lib/week/preview";

const previewPage = readFileSync(
  join(process.cwd(), "app/dev/plan-preview/page.tsx"),
  "utf8",
);
const previewClient = readFileSync(
  join(process.cwd(), "app/dev/plan-preview/plan-preview-client.tsx"),
  "utf8",
);
const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");

describe("development Week planning preview", () => {
  it("is disabled in production and allowed through middleware only in development", () => {
    expect(isDevPreviewEnabled("development")).toBe(true);
    expect(isDevPreviewEnabled("test")).toBe(true);
    expect(isDevPreviewEnabled("production")).toBe(false);
    expect(previewPage).toContain("notFound()");
    expect(previewPage).toContain('redirect("/dev/week-preview")');
    expect(middleware).toContain('startsWith("/dev/")');
    expect(middleware).toContain("isDevPreviewEnabled()");
  });

  it("uses local fixture state without Supabase clients or service-role keys", () => {
    expect(previewClient).toContain("useState");
    expect(previewClient).toContain("getInitialPlanPreviewState");
    expect(previewClient).toContain("This week");
    expect(previewClient).toContain("Next week");
    expect(previewClient).toContain("Edit next week’s list");
    expect(previewClient).toContain("Preview weekly grid");
    expect(previewClient).toContain("Undo");
    expect(previewClient).not.toContain("Drag to reorder");
    expect(previewClient).not.toContain("Done editing");
    expect(previewClient).not.toContain("Ready for next week");
    expect(previewClient).not.toContain("Finalize");
    expect(previewClient).not.toContain("Future list changes");
    expect(previewClient).not.toContain("Copy this week’s list");
    expect(previewClient).not.toContain("Plan next week");
    expect(previewClient).not.toContain("This week is still active");
    expect(previewClient).not.toContain("closing this week");
    expect(previewClient).not.toContain("createSupabase");
    expect(previewClient).not.toContain("SERVICE_ROLE");
    expect(previewClient).not.toContain("service_role");
  });

  it("creates a next-week Draft from the current active Sunday week", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });

    expect(state.currentWeek?.status).toBe("active");
    expect(state.draftWeek).toMatchObject({
      status: "draft",
      weekStartDate: "2026-06-08",
      weekEndDate: "2026-06-14",
    });
  });

  it("copies snapshots, targets, and ordering into a blank Draft plan", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const draft = state.draftWeek;
    const sourceWalk = state.sourceWeek.activities.find(
      (activity) => activity.templateId === "template-walk",
    );
    const draftWalk = draft?.activities.find(
      (activity) => activity.templateId === "template-walk",
    );

    expect(draft).toBeTruthy();
    expect(summarizeCopy(draft)).toEqual({
      copiedActivities: 4,
      copiedPlannedCells: 0,
      copiedDoneCells: 0,
      copiedSkippedCells: 0,
    });
    expect(draftWalk).toMatchObject({
      templateId: "template-walk",
      categoryName: "Physical Health",
      categorySortOrder: sourceWalk?.categorySortOrder,
      activityName: "Walk",
      targetCount: sourceWalk?.targetCount,
      sortOrder: sourceWalk?.sortOrder,
    });
    expect(draftWalk?.cells.every((cell) => !cell.planned)).toBe(true);
    expect(draftWalk?.cells.every((cell) => !cell.done && !cell.skipped)).toBe(true);
  });

  it("opens an existing Draft instead of duplicating it", () => {
    const first = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const second = applyPlanPreviewAction(first, { type: "create-draft" });

    expect(second.draftWeek).toEqual(first.draftWeek);
  });

  it("allows Sunday planning toggles in the current active week preview", () => {
    const state = getInitialPlanPreviewState("sunday");
    const updated = applyPlanPreviewAction(state, {
      type: "toggle-current-plan",
      activityId: "current-active-week-walk",
      date: "2026-06-07",
    });
    const ignoredPast = applyPlanPreviewAction(updated, {
      type: "toggle-current-plan",
      activityId: "current-active-week-walk",
      date: "2026-06-03",
    });
    const updatedWalk = updated.currentWeek?.activities.find(
      (activity) => activity.id === "current-active-week-walk",
    );
    const ignoredWalk = ignoredPast.currentWeek?.activities.find(
      (activity) => activity.id === "current-active-week-walk",
    );

    expect(updatedWalk?.cells.find((cell) => cell.date === "2026-06-07")).toMatchObject({
      planned: false,
      done: false,
      skipped: false,
    });
    expect(ignoredWalk?.cells.find((cell) => cell.date === "2026-06-03")).toMatchObject({
      planned: true,
      done: false,
      skipped: true,
    });
  });

  it("keeps current-week list editing available in the preview", () => {
    const edited = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "edit-current-activity",
      activityId: "current-active-week-walk",
      activityName: "Evening walk",
      categoryName: "Movement",
      targetCount: 5,
    });
    const added = applyPlanPreviewAction(edited, {
      type: "add-current-activity",
      activityName: "Stretch",
      categoryName: "Movement",
      targetCount: 2,
    });
    const currentActivities = activeDraftActivities(added.currentWeek!);

    expect(previewClient).toContain("Edit this week’s list");
    expect(
      currentActivities.find((activity) => activity.id === "current-active-week-walk"),
    ).toMatchObject({
      activityName: "Evening walk",
      categoryName: "Movement",
      targetCount: 5,
    });
    expect(
      currentActivities.map((activity) => ({
        name: activity.activityName,
        category: activity.categoryName,
        target: activity.targetCount,
      })),
    ).toEqual(
      expect.arrayContaining([{ name: "Stretch", category: "Movement", target: 2 }]),
    );
  });

  it("supports Draft target editing", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const toggled = applyPlanPreviewAction(state, {
      type: "toggle-draft-plan",
      activityId: "draft-template-walk",
      date: "2026-06-09",
    });
    const retargeted = applyPlanPreviewAction(toggled, {
      type: "change-draft-target",
      activityId: "draft-template-walk",
      delta: 1,
    });
    const walk = retargeted.draftWeek?.activities.find(
      (activity) => activity.id === "draft-template-walk",
    );

    expect(walk?.targetCount).toBe(5);
    expect(walk?.cells.find((cell) => cell.date === "2026-06-09")).toMatchObject({
      planned: true,
      done: false,
      skipped: false,
    });
  });

  it("models Draft structural changes without rewriting historical source weeks", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const removed = applyPlanPreviewAction(state, {
      type: "remove-draft-activity",
      activityId: "draft-template-read",
    });
    const added = applyPlanPreviewAction(removed, { type: "add-draft-activity" });

    expect(
      removedDraftActivities(added.draftWeek!).map((activity) => activity.activityName),
    ).toEqual(["Read"]);
    expect(
      activeDraftActivities(added.draftWeek!).map((activity) => activity.activityName),
    ).toContain("Pickleball");
    expect(
      added.sourceWeek.activities.map((activity) => activity.activityName),
    ).not.toContain("Pickleball");
    expect(
      added.sourceWeek.activities.find((activity) => activity.activityName === "Read")
        ?.isRemovedFromFuture,
    ).toBe(false);
  });

  it("restores a removed Draft activity through the quick undo path", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const removed = applyPlanPreviewAction(state, {
      type: "remove-draft-activity",
      activityId: "draft-template-read",
    });
    const restored = applyPlanPreviewAction(removed, {
      type: "restore-draft-activity",
      activityId: "draft-template-read",
    });

    expect(
      removedDraftActivities(removed.draftWeek!).map((activity) => activity.activityName),
    ).toEqual(["Read"]);
    expect(
      activeDraftActivities(restored.draftWeek!).map((activity) => activity.activityName),
    ).toContain("Read");
  });

  it("edits an existing Draft activity name, category, and target", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const edited = applyPlanPreviewAction(state, {
      type: "edit-draft-activity",
      activityId: "draft-template-walk",
      activityName: "Morning walk",
      categoryName: "Movement",
      targetCount: 5,
    });
    const editedWalk = edited.draftWeek?.activities.find(
      (activity) => activity.id === "draft-template-walk",
    );

    expect(editedWalk).toMatchObject({
      activityName: "Morning walk",
      categoryName: "Movement",
      targetCount: 5,
    });
    expect(
      edited.sourceWeek.activities.find(
        (activity) => activity.templateId === "template-walk",
      ),
    ).toMatchObject({
      activityName: "Walk",
      categoryName: "Physical Health",
      targetCount: 4,
    });
  });

  it("adds new Draft activities in existing and new categories", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const withExistingCategory = applyPlanPreviewAction(state, {
      type: "add-draft-activity",
      activityName: "Pickleball",
      categoryName: "Mental Health",
      targetCount: 1,
    });
    const withNewCategory = applyPlanPreviewAction(withExistingCategory, {
      type: "add-draft-activity",
      activityName: "Meal prep",
      categoryName: "Food",
      targetCount: 2,
    });

    expect(
      activeDraftActivities(withNewCategory.draftWeek!).map((activity) => ({
        name: activity.activityName,
        category: activity.categoryName,
        target: activity.targetCount,
      })),
    ).toEqual(
      expect.arrayContaining([
        { name: "Pickleball", category: "Mental Health", target: 1 },
        { name: "Meal prep", category: "Food", target: 2 },
      ]),
    );
    expect(
      withNewCategory.sourceWeek.activities.map((activity) => activity.activityName),
    ).not.toEqual(expect.arrayContaining(["Pickleball", "Meal prep"]));
  });

  it("reorders Draft categories without changing historical source snapshots", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const reordered = applyPlanPreviewAction(state, {
      type: "reorder-draft-category",
      categoryName: "Family and Home",
      targetCategoryName: "Physical Health",
    });

    const draftCategoryOrder = [
      ...new Map(
        reordered
          .draftWeek!.activities.toSorted(
            (left, right) => left.categorySortOrder - right.categorySortOrder,
          )
          .map((activity) => [activity.categoryName, true]),
      ).keys(),
    ];
    const sourceCategoryOrder = [
      ...new Map(
        reordered.sourceWeek.activities
          .toSorted((left, right) => left.categorySortOrder - right.categorySortOrder)
          .map((activity) => [activity.categoryName, true]),
      ).keys(),
    ];

    expect(draftCategoryOrder[0]).toBe("Family and Home");
    expect(sourceCategoryOrder[0]).toBe("Physical Health");
  });

  it("reorders Draft activities within a category", () => {
    const state = applyPlanPreviewAction(getInitialPlanPreviewState("sunday"), {
      type: "create-draft",
    });
    const reordered = applyPlanPreviewAction(state, {
      type: "reorder-draft-activity",
      activityId: "draft-template-read",
      targetActivityId: "draft-template-meditation",
    });
    const mentalHealthOrder = activeDraftActivities(reordered.draftWeek!)
      .filter((activity) => activity.categoryName === "Mental Health")
      .toSorted((left, right) => left.sortOrder - right.sortOrder)
      .map((activity) => activity.activityName);

    expect(mentalHealthOrder).toEqual(["Read", "Meditation"]);
  });

  it("uses a Monday Draft as the current Active week automatically", () => {
    const state = getInitialPlanPreviewState("monday");

    expect(state.draftWeek).toBeNull();
    expect(state.currentWeek).toMatchObject({
      status: "active",
      weekStartDate: "2026-06-08",
      label: "Current week",
    });
    expect(previewClient).toContain("Monday opens the normal Week grid");
  });

  it("automatically rolls forward on Tuesday without elapsed-day plans or outcomes", () => {
    const state = getInitialPlanPreviewState("return");
    const week = state.currentWeek;
    const elapsedCells = week?.activities.flatMap((activity) =>
      activity.cells.filter((cell) => cell.date < "2026-06-09"),
    );

    expect(week?.status).toBe("active");
    expect(summarizeCopy(week)).toEqual({
      copiedActivities: 4,
      copiedPlannedCells: 0,
      copiedDoneCells: 0,
      copiedSkippedCells: 0,
    });
    expect(state.lateCurrentWeek).toBeNull();
    expect(
      elapsedCells?.every((cell) => !cell.planned && !cell.done && !cell.skipped),
    ).toBe(true);
  });

  it("keeps recovery automatic instead of exposing late-start or gap actions", () => {
    const state = getInitialPlanPreviewState("return");

    expect(previewClient).toContain("Tuesday return");
    expect(previewClient).not.toContain("Late start");
    expect(previewClient).not.toContain("Multi-week gap");
    expect(previewClient).not.toContain("Start from most recent week");
    expect(state.sourceWeek.weekStartDate).toBe("2026-06-01");
    expect(state.currentWeek?.weekStartDate).toBe("2026-06-08");
    expect(state.draftWeek).toBeNull();
  });

  it("does not apply Draft-only actions to automatically rolled-forward Active weeks", () => {
    const state = getInitialPlanPreviewState("return");
    const updated = applyPlanPreviewAction(state, {
      type: "change-draft-target",
      activityId: "active-template-walk",
      delta: 1,
    });

    expect(updated).toEqual(state);
  });
});
