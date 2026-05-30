import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSelectedRouteHref, routeLabels } from "@/lib/routes";
import { getSmartEntryDestination } from "@/lib/entry/smart-entry";
import manifest from "@/app/manifest";

const appShell = readFileSync(join(process.cwd(), "components/app-shell.tsx"), "utf8");
const appLayout = readFileSync(join(process.cwd(), "app/(app)/layout.tsx"), "utf8");
const appLoading = readFileSync(join(process.cwd(), "app/(app)/loading.tsx"), "utf8");
const rootLayout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
const rootLoading = readFileSync(join(process.cwd(), "app/loading.tsx"), "utf8");
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
    expect(installPage).toContain('href="/"');
    expect(installPage).not.toContain("redirect(");
    expect(middleware).toContain('pathname === "/install"');
    expect(middleware).toContain('pathname === "/manifest.webmanifest"');
    expect(middleware).toContain('pathname === "/apple-touch-icon.png"');
    expect(middleware).toContain('pathname === "/icon-192.png"');
    expect(middleware).toContain('pathname === "/icon-512.png"');
    expect(routeLabels()).not.toContain("Install");
  });

  it("defines standalone web app metadata and icons", () => {
    const appManifest = manifest();

    expect(appManifest).toMatchObject({
      name: "My Weekly List",
      short_name: "My Weekly List",
      start_url: "/",
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

  it("shows a lightweight loading shell while smart entry and app data resolve", () => {
    expect(rootLoading).toContain("Opening your week...");
    expect(rootLoading).toContain('aria-busy="true"');
    expect(appLoading).toContain("Loading My Weekly List");
    expect(appLoading).toContain("LoadingRow");
  });
});
