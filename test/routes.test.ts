import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getSelectedRouteHref, routeLabels } from "@/lib/routes";
import manifest from "@/app/manifest";

const appShell = readFileSync(join(process.cwd(), "components/app-shell.tsx"), "utf8");
const appLayout = readFileSync(join(process.cwd(), "app/(app)/layout.tsx"), "utf8");
const rootLayout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
const homePage = readFileSync(join(process.cwd(), "app/(app)/page.tsx"), "utf8");
const installPage = readFileSync(join(process.cwd(), "app/install/page.tsx"), "utf8");
const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
const signOutRoute = readFileSync(
  join(process.cwd(), "app/auth/sign-out/route.ts"),
  "utf8",
);
const signOutScript = readFileSync(join(process.cwd(), "scripts/sign-out.sh"), "utf8");

describe("app routes", () => {
  it("keeps the primary app navigation focused on Today, Week, and Review", () => {
    expect(routeLabels()).toEqual(["Today", "Week", "Review"]);
  });

  it("derives one selected navigation route from the first path segment", () => {
    expect(getSelectedRouteHref("/today")).toBe("/today");
    expect(getSelectedRouteHref("/week/history")).toBe("/week");
    expect(getSelectedRouteHref("/review")).toBe("/review");
    expect(getSelectedRouteHref("/")).toBeNull();
    expect(getSelectedRouteHref("/install")).toBeNull();
  });

  it("keeps /plan as a compatibility redirect instead of a primary screen", () => {
    const planPage = readFileSync(join(process.cwd(), "app/(app)/plan/page.tsx"), "utf8");

    expect(planPage).toContain('redirect("/week")');
    expect(planPage).not.toContain("Plan next week");
  });

  it("renders mobile bottom navigation without in-app sign-out chrome", () => {
    expect(appLayout).toContain("AppShell");
    expect(appLayout).not.toContain("supabase.auth.getUser()");
    expect(appLayout).not.toContain("checkAllowedUser");
    expect(appShell).toContain("fixed inset-x-0 bottom-0");
    expect(appShell).toContain("touch-manipulation");
    expect(appShell).toContain("env(safe-area-inset-bottom)");
    expect(appShell).toContain('aria-label="Main navigation"');
    expect(appShell).toContain('aria-current={selected ? "page" : undefined}');
    expect(appShell).not.toContain("visualViewport");
    expect(appShell).not.toContain("--mobile-browser-bottom-offset");
    expect(appShell).not.toContain("h-[100dvh]");
    expect(appShell).not.toContain("overflow-y-auto overscroll-y-contain");
    expect(appShell).not.toContain("Account");
    expect(appShell).not.toContain("Sign out");
    expect(appShell).not.toContain('href="/plan"');
    expect(appShell).not.toContain(">Plan<");
  });

  it("provides a stable install route outside primary navigation", () => {
    expect(installPage).toContain("Install My Weekly List");
    expect(installPage).toContain("Open this page in Safari.");
    expect(installPage).toContain("Tap Share.");
    expect(installPage).toContain("Tap Add to Home Screen.");
    expect(installPage).toContain('href="/today"');
    expect(installPage).not.toContain("redirect(");
    expect(middleware).toContain('pathname === "/install"');
    expect(middleware).toContain('pathname === "/manifest.webmanifest"');
    expect(middleware).toContain('pathname === "/apple-touch-icon.png"');
    expect(middleware).toContain('pathname === "/icon-192.png"');
    expect(middleware).toContain('pathname === "/icon-512.png"');
    expect(routeLabels()).not.toContain("Install");
  });

  it("does not ship obsolete development preview routes", () => {
    expect(existsSync(join(process.cwd(), "app/dev"))).toBe(false);
    expect(middleware).not.toContain('startsWith("/dev/")');
    expect(middleware).not.toContain("isDevPreviewEnabled");
  });

  it("defines standalone web app metadata and icons", () => {
    const appManifest = manifest();

    expect(appManifest).toMatchObject({
      name: "My Weekly List",
      short_name: "My Weekly List",
      start_url: "/today",
      scope: "/",
      display: "standalone",
      background_color: "#fffaf2",
      theme_color: "#fffaf2",
    });
    expect(appManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icon-512.png", sizes: "512x512" }),
      ]),
    );
    expect(rootLayout).toContain('manifest: "/manifest.webmanifest"');
    expect(rootLayout).toContain('apple: [{ url: "/apple-touch-icon.png"');
    expect(rootLayout).toContain("appleWebApp");
    expect(rootLayout).toContain("capable: true");
    expect(rootLayout).toContain('"mobile-web-app-capable": "yes"');
    expect(rootLayout).toContain('viewportFit: "cover"');
    expect(rootLayout).toContain('rel="preconnect"');
    expect(rootLayout).toContain('rel="dns-prefetch"');
  });

  it("includes real Home Screen icon assets", () => {
    for (const iconPath of [
      "public/apple-touch-icon.png",
      "public/icon-192.png",
      "public/icon-512.png",
    ]) {
      expect(readFileSync(join(process.cwd(), iconPath)).subarray(1, 4).toString()).toBe(
        "PNG",
      );
    }
  });

  it("keeps sign-out available as an explicit utility instead of app chrome", () => {
    expect(signOutRoute).toContain("export async function GET");
    expect(signOutRoute).toContain('scope: "global"');
    expect(signOutScript).toContain("/auth/sign-out");
    expect(signOutScript).toContain("invalidate refresh tokens");
  });

  it("uses the root route as a lightweight authenticated redirect to Today", () => {
    expect(homePage).toContain('redirect("/today")');
    expect(homePage).not.toContain('redirect("/login")');
    expect(homePage).not.toContain("loadThisWeek");
    expect(homePage).not.toContain("createCurrentWeekFromTemplates");
    expect(homePage).not.toContain("PlaceholderCard");
    expect(homePage).not.toContain('redirect("/review")');
  });

  it("does not show textual loading interstitials during app navigation", () => {
    expect(existsSync(join(process.cwd(), "app/loading.tsx"))).toBe(false);
    expect(existsSync(join(process.cwd(), "app/(app)/loading.tsx"))).toBe(false);
  });
});
