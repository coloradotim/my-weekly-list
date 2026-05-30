import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const loginAction = readFileSync(join(repoRoot, "app/login/actions.ts"), "utf8");
const loginForm = readFileSync(join(repoRoot, "components/login-form.tsx"), "utf8");
const changePasswordAction = readFileSync(
  join(repoRoot, "app/change-password/actions.ts"),
  "utf8",
);
const changePasswordForm = readFileSync(
  join(repoRoot, "components/password-change-form.tsx"),
  "utf8",
);
const middleware = readFileSync(join(repoRoot, "middleware.ts"), "utf8");
const createUserScript = readFileSync(join(repoRoot, "scripts/create-user.mjs"), "utf8");
const resetPasswordScript = readFileSync(
  join(repoRoot, "scripts/reset-user-password.mjs"),
  "utf8",
);
const disableUserScript = readFileSync(
  join(repoRoot, "scripts/disable-user.mjs"),
  "utf8",
);
const adminHelper = readFileSync(join(repoRoot, "scripts/lib/admin-users.mjs"), "utf8");

describe("email/password auth", () => {
  it("renders email/password login without magic-link, OTP, signup, or OAuth UI", () => {
    expect(loginForm).toContain('type="email"');
    expect(loginForm).toContain('type="password"');
    expect(loginForm).toContain("Sign in");
    expect(loginForm).toContain("Could not sign in with that email and password.");
    expect(loginForm).not.toContain("magicLink");
    expect(loginForm).not.toContain("Email me a sign-in link");
    expect(loginForm).not.toContain("OTP");
    expect(loginForm).not.toContain("Google");
    expect(loginForm).not.toContain("Create account");
    expect(loginForm).not.toContain("Sign up");
  });

  it("uses Supabase password auth and database-backed access checks", () => {
    expect(loginAction).toContain("signInWithPassword");
    expect(loginAction).toContain("getDatabaseUserAccess");
    expect(loginAction).toContain('redirect("/change-password")');
    expect(loginAction).toContain('login: "error"');
    expect(loginAction).not.toContain("signInWithOtp");
    expect(loginAction).not.toContain("verifyOtp");
    expect(loginAction).not.toContain("ALLOWED_USER_EMAIL");
  });

  it("forces temporary-password users through password change", () => {
    expect(changePasswordForm).toContain("New password");
    expect(changePasswordForm).toContain("Confirm new password");
    expect(changePasswordForm).toContain("Those passwords do not match.");
    expect(changePasswordAction).toContain("updateUser");
    expect(changePasswordAction).toContain("clear_own_password_change_required");
    expect(middleware).toContain('redirect(new URL("/change-password"');
  });

  it("removes the magic-link callback route and parser", () => {
    expect(existsSync(join(repoRoot, "app/auth/callback/route.ts"))).toBe(false);
    expect(existsSync(join(repoRoot, "lib/auth/magic-link.ts"))).toBe(false);
    expect(loginAction).not.toContain("callback");
    expect(loginAction).not.toContain("token_hash");
  });
});

describe("local admin user scripts", () => {
  it("keeps service-role credentials local to scripts", () => {
    expect(adminHelper).toContain("SUPABASE_URL");
    expect(adminHelper).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(adminHelper).not.toContain("NEXT_PUBLIC");
    expect(loginAction).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(middleware).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("creates users with allowed access and forced password change", () => {
    expect(createUserScript).toContain("createUser");
    expect(createUserScript).toContain("email_confirm: true");
    expect(createUserScript).toContain("isAllowed: true");
    expect(createUserScript).toContain("mustChangePassword: true");
    expect(createUserScript).toContain("Temporary password:");
  });

  it("resets passwords and forces another password change", () => {
    expect(resetPasswordScript).toContain("updateUserById");
    expect(resetPasswordScript).toContain("password: temporaryPassword");
    expect(resetPasswordScript).toContain("mustChangePassword: true");
    expect(resetPasswordScript).toContain("Temporary password:");
  });

  it("disables app access without deleting historical data", () => {
    expect(disableUserScript).toContain("isAllowed: false");
    expect(disableUserScript).toContain("Historical weekly-list data was not deleted");
    expect(disableUserScript).not.toContain("deleteUser");
  });
});
