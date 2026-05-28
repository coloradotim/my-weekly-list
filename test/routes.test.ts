import { describe, expect, it } from "vitest";
import { routeLabels } from "@/lib/routes";

describe("app routes", () => {
  it("includes the MVP placeholder screens", () => {
    expect(routeLabels()).toEqual(["Today", "This Week", "Review", "Plan"]);
  });
});
