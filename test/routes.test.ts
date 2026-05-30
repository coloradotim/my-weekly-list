import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routeLabels } from "@/lib/routes";
import { getSmartEntryDestination } from "@/lib/entry/smart-entry";

const appShell = readFileSync(join(process.cwd(), "components/app-shell.tsx"), "utf8");
const appLayout = readFileSync(join(process.cwd(), "app/(app)/layout.tsx"), "utf8");
const homePage = readFileSync(join(process.cwd(), "app/(app)/page.tsx"), "utf8");

describe("app routes", () => {
  it("keeps the primary app navigation focused on Today, Week, and Review", () => {
    expect(routeLabels()).toEqual(["Today", "Week", "Review"]);
  });

  it("keeps /plan as a compatibility redirect instead of a primary screen", () => {
    const planPage = readFileSync(join(process.cwd(), "app/(app)/plan/page.tsx"), "utf8");

    expect(planPage).toContain('redirect("/week")');
    expect(planPage).not.toContain("Plan next week");
  });

  it("renders mobile bottom navigation with secondary sign-out access", () => {
    expect(appLayout).toContain("AppShell");
    expect(appShell).toContain("fixed inset-x-0 bottom-0");
    expect(appShell).toContain("env(safe-area-inset-bottom)");
    expect(appShell).toContain('aria-label="Main navigation"');
    expect(appShell).toContain('aria-current={selected ? "page" : undefined}');
    expect(appShell).toContain("Account");
    expect(appShell).toContain("Sign out");
    expect(appShell).not.toContain('href="/plan"');
    expect(appShell).not.toContain(">Plan<");
  });

  it("decides smart entry destinations without a home or review blocker", () => {
    expect(getSmartEntryDestination({ weekStatus: "needs-setup" })).toBe("/setup");
    expect(getSmartEntryDestination({ weekStatus: "ready" })).toBe("/today");
    expect(
      getSmartEntryDestination({
        weekStatus: "no-current-week",
        creationStatus: "created",
      }),
    ).toBe("/today");
    expect(
      getSmartEntryDestination({
        weekStatus: "no-current-week",
        creationStatus: "needs-setup",
      }),
    ).toBe("/setup");
    expect(
      getSmartEntryDestination({
        weekStatus: "no-current-week",
        creationStatus: "error",
      }),
    ).toBe("/week");
    expect(getSmartEntryDestination({ weekStatus: "error" })).toBe("/week");
  });

  it("uses the root route to assure the current week and redirect into Today", () => {
    expect(homePage).toContain("loadThisWeek");
    expect(homePage).toContain("createCurrentWeekFromTemplates");
    expect(homePage).toContain('redirect("/login")');
    expect(homePage).toContain("getSmartEntryDestination");
    expect(homePage).not.toContain("PlaceholderCard");
    expect(homePage).not.toContain('redirect("/review")');
  });
});
