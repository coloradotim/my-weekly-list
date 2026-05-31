import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getOnboardingStepFromFacts } from "@/lib/onboarding/current";

const repoRoot = process.cwd();
const onboardingPage = readFileSync(
  join(repoRoot, "app/(app)/onboarding/page.tsx"),
  "utf8",
);
const onboardingActions = readFileSync(
  join(repoRoot, "app/(app)/onboarding/actions.ts"),
  "utf8",
);
const onboardingActivityBuilder = readFileSync(
  join(repoRoot, "components/onboarding-activity-builder.tsx"),
  "utf8",
);
const todayPage = readFileSync(join(repoRoot, "app/(app)/today/page.tsx"), "utf8");
const weekPage = readFileSync(join(repoRoot, "app/(app)/week/page.tsx"), "utf8");
const authAccess = readFileSync(join(repoRoot, "lib/auth/access.ts"), "utf8");
const onboardingModel = readFileSync(join(repoRoot, "lib/onboarding/current.ts"), "utf8");
const weekModel = readFileSync(join(repoRoot, "lib/week/current.ts"), "utf8");

describe("first-run onboarding routing", () => {
  it("has a protected onboarding route outside primary navigation", () => {
    expect(existsSync(join(repoRoot, "app/(app)/onboarding/page.tsx"))).toBe(true);
    expect(authAccess).toContain('"/onboarding"');
    expect(onboardingPage).toContain("getDatabaseUserAccess");
    expect(onboardingPage).toContain('redirect("/change-password")');
    expect(onboardingPage).toContain("getUnauthorizedEmail");
  });

  it("routes empty allowed users from Today and Week toward onboarding", () => {
    expect(todayPage).toContain('redirect("/onboarding")');
    expect(weekPage).toContain('href="/onboarding"');
    expect(weekPage).toContain("Start onboarding");
  });

  it("keeps must-change-password before onboarding", () => {
    expect(onboardingActions).toContain('redirect("/change-password")');
    expect(onboardingPage).toContain('redirect("/change-password")');
  });
});

describe("first-run onboarding steps", () => {
  it("chooses the first category step for users with no active categories", () => {
    expect(
      getOnboardingStepFromFacts({
        onboardingCompleted: false,
        activeCategoryCount: 0,
        activeActivityCount: 0,
      }),
    ).toBe("first-category");
  });

  it("chooses the activity step once a category exists", () => {
    expect(
      getOnboardingStepFromFacts({
        onboardingCompleted: false,
        activeCategoryCount: 1,
        activeActivityCount: 0,
      }),
    ).toBe("activities");
  });

  it("chooses the planning step once activities exist", () => {
    expect(
      getOnboardingStepFromFacts({
        onboardingCompleted: false,
        activeCategoryCount: 1,
        activeActivityCount: 1,
      }),
    ).toBe("plan");
  });

  it("does not show onboarding again after completion", () => {
    expect(
      getOnboardingStepFromFacts({
        onboardingCompleted: true,
        activeCategoryCount: 0,
        activeActivityCount: 0,
      }),
    ).toBe("complete");
  });

  it("uses the approved onboarding copy and actions", () => {
    expect(onboardingPage).toContain("Welcome to My Weekly List");
    expect(onboardingPage).toContain("Let’s build your first weekly list.");
    expect(onboardingPage).toContain(
      "What is one area of life you want to pay attention to?",
    );
    expect(onboardingPage).toContain("What do you want to do this week?");
    expect(onboardingPage).toContain("OnboardingActivityBuilder");
    expect(onboardingActivityBuilder).toContain("Save activity");
    expect(onboardingActivityBuilder).toContain("className={primaryButtonClassName}");
    expect(onboardingActivityBuilder).toContain("+ Add category");
    expect(onboardingActivityBuilder).toContain(
      "Done for now? Ready to plan your first week?",
    );
    expect(onboardingActivityBuilder).toContain("Continue to planning");
    expect(onboardingPage).toContain(
      "Tap days to make a simple plan for this week. You can change this later.",
    );
    expect(onboardingPage).toContain("Tap a day to switch it between:");
    expect(onboardingPage).toContain("not planned");
    expect(onboardingPage).toContain("planned");
    expect(onboardingPage).toContain("Ready to see how you’ll use it?");
    expect(onboardingPage).toContain('href="/onboarding?step=guide"');
    expect(onboardingPage).toContain("A quick tour");
    expect(onboardingPage).toContain(
      "If nothing is planned for today, or you do something extra, use + Something else.",
    );
    expect(onboardingPage).toContain(
      "Use Week to change planned days, edit your list, and set up next week.",
    );
    expect(onboardingPage).toContain(
      "Use Review to see what happened and correct completion truth later.",
    );
    expect(onboardingPage).toContain("Ready to use My Weekly List?");
    expect(onboardingPage).toContain("Go to Today");
    expect(onboardingPage).not.toContain("Finish");
    expect(onboardingPage).not.toContain("Finalize");
    expect(onboardingPage).not.toContain("Publish");
    expect(onboardingPage).not.toContain("Activate");
    expect(onboardingPage).not.toContain("Close");
  });
});

describe("first-run onboarding data behavior", () => {
  it("creates reusable list items and current-week snapshots through production helpers", () => {
    expect(onboardingActions).toContain("createReusableCategoryForOnboarding");
    expect(onboardingActions).toContain("createReusableActivityForOnboarding");
    expect(onboardingActivityBuilder).toContain("addOnboardingActivityClientAction");
    expect(onboardingActivityBuilder).toContain("addOnboardingCategoryClientAction");
    expect(weekModel).toContain("createReusableActivityForOnboarding");
    expect(weekModel).toContain("createCurrentWeekFromTemplates");
    expect(onboardingModel).toContain("loadThisWeek");
    expect(onboardingModel).toContain("createCurrentWeekFromTemplates");
  });

  it("marks completion through an authenticated profile RPC", () => {
    expect(onboardingActions).toContain("markOnboardingComplete");
    expect(onboardingModel).toContain("mark_own_onboarding_complete");
    expect(onboardingActions).not.toContain("SERVICE_ROLE");
    expect(onboardingActions).not.toContain("service_role");
  });

  it("uses the Week grid for planning days without creating elapsed-day history", () => {
    expect(onboardingPage).toContain("OptimisticThisWeekGrid");
    expect(onboardingPage).not.toContain("activity_day_cells");
    expect(onboardingPage).not.toContain("missed");
    expect(onboardingPage).not.toContain("skipped:");
    expect(onboardingPage).not.toContain("done:");
  });

  it("uses the app target stepper and visible add feedback", () => {
    expect(onboardingActivityBuilder).toContain("Target days per week");
    expect(onboardingActivityBuilder).toContain("targetCount}/wk");
    expect(onboardingActivityBuilder).toContain("Math.max(0, value - 1)");
    expect(onboardingActivityBuilder).toContain("Math.min(7, value + 1)");
    expect(onboardingActivityBuilder).toContain("Added ${result.activity.name}.");
    expect(onboardingActivityBuilder).toContain("Added ${result.category.name}.");
    expect(onboardingActivityBuilder).toContain("bg-meadow");
    expect(onboardingActivityBuilder).toContain("✓");
    expect(onboardingActivityBuilder).toContain("onSaved");
  });
});
