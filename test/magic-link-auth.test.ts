import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getMagicLinkRedirectUrl,
  getSafeAuthNextPath,
  maskEmail,
  sendOwnerMagicLink,
  type MagicLinkAuthClient,
} from "@/lib/auth/magic-link";

const repoRoot = process.cwd();
const loginAction = readFileSync(join(repoRoot, "app/login/actions.ts"), "utf8");
const loginForm = readFileSync(join(repoRoot, "components/login-form.tsx"), "utf8");

function createMagicLinkClient() {
  const calls: unknown[] = [];
  const client: MagicLinkAuthClient = {
    auth: {
      async signInWithOtp(options) {
        calls.push(options);
        return { error: null };
      },
    },
  };

  return { client, calls };
}

describe("owner magic-link auth", () => {
  it("sends only to the configured allowed owner email", async () => {
    const { client, calls } = createMagicLinkClient();

    await expect(
      sendOwnerMagicLink({
        supabase: client,
        origin: "http://localhost:3000",
        nextPath: "/setup",
        allowedEmail: "cubuff98@gmail.com",
      }),
    ).resolves.toEqual({
      status: "sent",
      email: "cubuff98@gmail.com",
      redirectTo: "http://localhost:3000/auth/callback?next=%2Fsetup",
    });

    expect(calls).toEqual([
      {
        email: "cubuff98@gmail.com",
        options: {
          emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fsetup",
          shouldCreateUser: false,
        },
      },
    ]);
  });

  it("does not create new Supabase auth users", async () => {
    const { client, calls } = createMagicLinkClient();

    await sendOwnerMagicLink({
      supabase: client,
      origin: "https://my-weekly-list.example",
      allowedEmail: "cubuff98@gmail.com",
    });

    expect(calls[0]).toMatchObject({
      options: {
        shouldCreateUser: false,
      },
    });
  });

  it("keeps post-login routing on safe in-app paths", () => {
    expect(getSafeAuthNextPath("/today")).toBe("/today");
    expect(getSafeAuthNextPath("https://example.com")).toBe("/setup");
    expect(getMagicLinkRedirectUrl("http://localhost:3000", "/week")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fweek",
    );
  });

  it("masks the configured owner email for display", () => {
    expect(maskEmail("CUBUFF98@gmail.com")).toBe("cu******@gmail.com");
  });

  it("does not accept an arbitrary email from browser input", () => {
    expect(loginAction).toContain('formData.get("next")');
    expect(loginAction).not.toContain('formData.get("email")');
    expect(loginAction).not.toContain("service_role");
    expect(loginForm).not.toContain('type="email"');
    expect(loginForm).not.toContain('name="email"');
  });
});
