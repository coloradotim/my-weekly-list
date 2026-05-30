import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routeLabels } from "@/lib/routes";

describe("app routes", () => {
  it("keeps the primary app navigation focused on Today, Week, and Review", () => {
    expect(routeLabels()).toEqual(["Today", "Week", "Review"]);
  });

  it("keeps /plan as a compatibility redirect instead of a primary screen", () => {
    const planPage = readFileSync(join(process.cwd(), "app/(app)/plan/page.tsx"), "utf8");

    expect(planPage).toContain('redirect("/week")');
    expect(planPage).not.toContain("Plan next week");
  });
});
