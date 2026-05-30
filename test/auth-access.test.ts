import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDatabaseUserAccess,
  getSafeAuthNextPath,
  normalizeEmail,
  type AccessProfileClient,
} from "@/lib/auth/access";
import { getSupabaseConfig } from "@/lib/supabase/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

function profileClient(
  profile: {
    email: string | null;
    is_allowed: boolean | null;
    must_change_password: boolean | null;
  } | null,
): AccessProfileClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: profile, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("database-backed access control", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  CUBUFF98@gmail.com ")).toBe("cubuff98@gmail.com");
  });

  it("allows an authenticated user with an allowed profile", async () => {
    await expect(
      getDatabaseUserAccess({
        supabase: profileClient({
          email: "USER@example.com",
          is_allowed: true,
          must_change_password: false,
        }),
        user: { id: "user-id", email: "fallback@example.com" },
      }),
    ).resolves.toEqual({ status: "allowed", email: "user@example.com" });
  });

  it("routes temporary-password users to password change", async () => {
    await expect(
      getDatabaseUserAccess({
        supabase: profileClient({
          email: "user@example.com",
          is_allowed: true,
          must_change_password: true,
        }),
        user: { id: "user-id", email: "user@example.com" },
      }),
    ).resolves.toEqual({
      status: "must-change-password",
      email: "user@example.com",
    });
  });

  it("blocks authenticated users whose profile is not allowed", async () => {
    await expect(
      getDatabaseUserAccess({
        supabase: profileClient({
          email: "user@example.com",
          is_allowed: false,
          must_change_password: false,
        }),
        user: { id: "user-id", email: "user@example.com" },
      }),
    ).resolves.toEqual({ status: "unauthorized", email: "user@example.com" });
  });

  it("keeps post-login routing on safe in-app paths", () => {
    expect(getSafeAuthNextPath("/today")).toBe("/today");
    expect(getSafeAuthNextPath("/week")).toBe("/week");
    expect(getSafeAuthNextPath("/review")).toBe("/review");
    expect(getSafeAuthNextPath("/change-password")).toBe("/change-password");
    expect(getSafeAuthNextPath("https://example.com")).toBe("/");
  });
});

describe("Supabase env configuration", () => {
  it("uses the approved publishable key variable name", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

    expect(getSupabaseConfig()).toEqual({
      status: "configured",
      url: "https://example.supabase.co",
      publishableKey: "publishable-key",
    });
  });

  it("reports the publishable key as required", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");

    expect(getSupabaseConfig()).toEqual({
      status: "missing",
      missing: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    });
  });
});
