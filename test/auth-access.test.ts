import { afterEach, describe, expect, it, vi } from "vitest";
import { checkAllowedUser, normalizeEmail } from "@/lib/auth/access";
import { getSupabaseConfig } from "@/lib/supabase/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("allowed-user access control", () => {
  it("normalizes email addresses before comparison", () => {
    expect(normalizeEmail("  CUBUFF98@gmail.com ")).toBe("cubuff98@gmail.com");
  });

  it("allows only the configured email", () => {
    expect(checkAllowedUser("cubuff98@gmail.com", "cubuff98@gmail.com")).toEqual({
      status: "allowed",
      email: "cubuff98@gmail.com",
    });
  });

  it("rejects any other authenticated email", () => {
    expect(checkAllowedUser("friend@example.com", "cubuff98@gmail.com")).toEqual({
      status: "unauthorized",
      email: "friend@example.com",
      allowedEmail: "cubuff98@gmail.com",
    });
  });

  it("reports missing allowed-user configuration", () => {
    expect(checkAllowedUser("cubuff98@gmail.com", "")).toEqual({
      status: "missing-allowed-email",
    });
  });
});

describe("Supabase env configuration", () => {
  it("uses the approved anon key variable name", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

    expect(getSupabaseConfig()).toEqual({
      status: "configured",
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });
});
