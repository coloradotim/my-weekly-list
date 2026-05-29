import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getInitialListSetupState,
  getInitialListSetupStateFromCounts,
  getSetupNotice,
  type SetupCountClient,
  type SetupCountResult,
} from "@/lib/setup/initial-list";

const setupAction = readFileSync(
  join(process.cwd(), "app/(app)/setup/actions.ts"),
  "utf8",
);

function createCountClient(results: Record<string, SetupCountResult>): SetupCountClient {
  return {
    from(table) {
      return {
        select() {
          return {
            async eq() {
              return (
                results[table] ?? { count: null, error: { message: "missing mock" } }
              );
            },
          };
        },
      };
    },
  };
}

describe("initial list setup state", () => {
  it("treats active categories and activity templates as seeded", () => {
    expect(
      getInitialListSetupStateFromCounts({
        activeCategoryCount: 6,
        activeActivityTemplateCount: 24,
      }),
    ).toEqual({
      status: "seeded",
      activeCategoryCount: 6,
      activeActivityTemplateCount: 24,
    });
  });

  it("requires both active categories and activity templates", () => {
    expect(
      getInitialListSetupStateFromCounts({
        activeCategoryCount: 6,
        activeActivityTemplateCount: 0,
      }),
    ).toEqual({
      status: "not-seeded",
      activeCategoryCount: 6,
      activeActivityTemplateCount: 0,
    });
  });

  it("checks seeded state through user-scoped Supabase queries", async () => {
    await expect(
      getInitialListSetupState(
        createCountClient({
          categories: { count: 6, error: null },
          activity_templates: { count: 24, error: null },
        }),
      ),
    ).resolves.toEqual({
      status: "seeded",
      activeCategoryCount: 6,
      activeActivityTemplateCount: 24,
    });
  });

  it("returns a calm error state when either setup query fails", async () => {
    await expect(
      getInitialListSetupState(
        createCountClient({
          categories: { count: null, error: { message: "permission denied" } },
          activity_templates: { count: 24, error: null },
        }),
      ),
    ).resolves.toEqual({ status: "error" });
  });
});

describe("setup notices", () => {
  it("shows success copy after the seed action succeeds", () => {
    expect(getSetupNotice("created")).toEqual({
      tone: "success",
      title: "Your weekly list is ready",
      body: "Your starter categories and activities have been created.",
    });
  });

  it("shows retry copy without exposing raw seed errors", () => {
    expect(getSetupNotice("error")).toEqual({
      tone: "error",
      title: "That did not go through",
      body: "Your starter list was not created just now. Please try again in a moment.",
    });
  });

  it("ignores unknown notice parameters", () => {
    expect(getSetupNotice("permission denied")).toBeNull();
  });
});

describe("setup action guardrails", () => {
  it("runs the seed RPC behind user and allowed-email checks", () => {
    expect(setupAction).toContain("supabase.auth.getUser()");
    expect(setupAction).toContain("checkAllowedUser(user.email)");
    expect(setupAction).toContain('supabase.rpc("seed_initial_weekly_list")');
    expect(setupAction).not.toContain("SERVICE_ROLE");
    expect(setupAction).not.toContain("service_role");
  });
});
