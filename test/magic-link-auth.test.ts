import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getMagicLinkRedirectUrl,
  getMagicLinkRedirectUrlFromHeaders,
  getRequestOrigin,
  getSafeAuthNextPath,
  maskEmail,
  parsePastedMagicLink,
  sendOwnerMagicLink,
  type MagicLinkAuthClient,
} from "@/lib/auth/magic-link";

const repoRoot = process.cwd();
const loginAction = readFileSync(join(repoRoot, "app/login/actions.ts"), "utf8");
const loginForm = readFileSync(join(repoRoot, "components/login-form.tsx"), "utf8");
const authCallback = readFileSync(join(repoRoot, "app/auth/callback/route.ts"), "utf8");

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

function headers(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
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
    expect(getSafeAuthNextPath("/week")).toBe("/week");
    expect(getSafeAuthNextPath("/")).toBe("/");
    expect(getSafeAuthNextPath("/my-weekly-list")).toBe("/setup");
    expect(getSafeAuthNextPath("https://example.com")).toBe("/setup");
    expect(getMagicLinkRedirectUrl("http://localhost:3000", "/week")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fweek",
    );
  });

  it("builds local 127.0.0.1 callback destinations from request headers", () => {
    expect(
      getMagicLinkRedirectUrlFromHeaders({
        headers: headers({
          origin: "http://127.0.0.1:3000",
        }),
        nextPath: "/week",
      }),
    ).toBe("http://127.0.0.1:3000/auth/callback?next=%2Fweek");
  });

  it("builds localhost callback destinations from request headers", () => {
    expect(
      getMagicLinkRedirectUrlFromHeaders({
        headers: headers({
          host: "localhost:3000",
        }),
        nextPath: "/setup",
      }),
    ).toBe("http://localhost:3000/auth/callback?next=%2Fsetup");
  });

  it("builds production Vercel callback destinations from request headers", () => {
    expect(
      getMagicLinkRedirectUrlFromHeaders({
        headers: headers({
          "x-forwarded-proto": "https",
          "x-forwarded-host": "my-weekly-list.vercel.app",
        }),
        nextPath: "/setup",
      }),
    ).toBe("https://my-weekly-list.vercel.app/auth/callback?next=%2Fsetup");
  });

  it("prefers the first forwarded host value", () => {
    expect(
      getRequestOrigin(
        headers({
          "x-forwarded-proto": "https",
          "x-forwarded-host": "my-weekly-list.vercel.app, proxy.local",
        }),
      ),
    ).toBe("https://my-weekly-list.vercel.app");
  });

  it("masks the configured owner email for display", () => {
    expect(maskEmail("CUBUFF98@gmail.com")).toBe("cu******@gmail.com");
  });

  it("does not accept an arbitrary email from browser input", () => {
    expect(loginAction).toContain('formData.get("next")');
    expect(loginAction).toContain('formData.get("magicLink")');
    expect(loginAction).toContain("parsePastedMagicLink");
    expect(loginAction).toContain("verifyOtp");
    expect(loginAction).toContain("email,");
    expect(loginAction).toContain("token: parsed.token");
    expect(loginAction).not.toContain('formData.get("email")');
    expect(loginAction).not.toContain("service_role");
    expect(loginForm).not.toContain('type="email"');
    expect(loginForm).not.toContain('name="email"');
  });

  it("lets the Home Screen app finish sign-in from a pasted app callback link", () => {
    expect(
      parsePastedMagicLink({
        value:
          "https://my-weekly-list.vercel.app/auth/callback?code=abc123&next=%2Ftoday",
        requestOrigin: "https://my-weekly-list.vercel.app",
      }),
    ).toEqual({
      status: "callback",
      callbackPath: "/auth/callback?code=abc123&next=%2Ftoday",
    });
  });

  it("extracts Supabase token-hash links and keeps the safe next path", () => {
    expect(
      parsePastedMagicLink({
        value:
          "https://project.supabase.co/auth/v1/verify?token_hash=hash123&type=email&redirect_to=https%3A%2F%2Fmy-weekly-list.vercel.app%2Fauth%2Fcallback%3Fnext%3D%252Ftoday",
        requestOrigin: "https://my-weekly-list.vercel.app",
      }),
    ).toEqual({
      status: "token-hash",
      tokenHash: "hash123",
      type: "email",
      nextPath: "/today",
    });
  });

  it("extracts Supabase plain token links from copied email text", () => {
    expect(
      parsePastedMagicLink({
        value:
          "Sign in: <https://project.supabase.co/auth/v1/verify?token=123456&type=magiclink&redirect_to=https%3A%2F%2Fmy-weekly-list.vercel.app%2Fauth%2Fcallback%3Fnext%3D%252Ftoday>",
        requestOrigin: "https://my-weekly-list.vercel.app",
      }),
    ).toEqual({
      status: "verify-url",
      verifyUrl:
        "https://project.supabase.co/auth/v1/verify?token=123456&type=magiclink&redirect_to=https%3A%2F%2Fmy-weekly-list.vercel.app%2Fauth%2Fcallback%3Fnext%3D%252Ftoday",
      token: "123456",
      type: "magiclink",
      nextPath: "/today",
    });
  });

  it("extracts magic links from Gmail-style wrapped URLs", () => {
    expect(
      parsePastedMagicLink({
        value:
          "https://www.google.com/url?q=https%3A%2F%2Fmy-weekly-list.vercel.app%2Fauth%2Fcallback%3Fcode%3Dabc123%26next%3D%252Fweek",
        requestOrigin: "https://my-weekly-list.vercel.app",
      }),
    ).toEqual({
      status: "callback",
      callbackPath: "/auth/callback?code=abc123&next=%2Fweek",
    });
  });

  it("rejects pasted callback links for another origin", () => {
    expect(
      parsePastedMagicLink({
        value: "https://evil.example/auth/callback?code=abc123&next=%2Ftoday",
        requestOrigin: "https://my-weekly-list.vercel.app",
      }),
    ).toEqual({ status: "invalid" });
  });

  it("reports callback exchange failures instead of silently returning to login", () => {
    expect(authCallback).toContain("exchangeCodeForSession");
    expect(authCallback).toContain("callback-error");
    expect(authCallback).toContain("missing-session");
    expect(loginForm).toContain("Supabase could not finish the session");
  });
});
