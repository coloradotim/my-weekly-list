"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { appRoutes } from "@/lib/routes";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const visualViewport = window.visualViewport;

    function updateBrowserControlOffset() {
      const viewport = window.visualViewport;
      const offset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;

      root.style.setProperty("--mobile-browser-bottom-offset", `${Math.round(offset)}px`);
    }

    updateBrowserControlOffset();
    visualViewport?.addEventListener("resize", updateBrowserControlOffset);
    visualViewport?.addEventListener("scroll", updateBrowserControlOffset);
    window.addEventListener("resize", updateBrowserControlOffset);
    window.addEventListener("orientationchange", updateBrowserControlOffset);

    return () => {
      visualViewport?.removeEventListener("resize", updateBrowserControlOffset);
      visualViewport?.removeEventListener("scroll", updateBrowserControlOffset);
      window.removeEventListener("resize", updateBrowserControlOffset);
      window.removeEventListener("orientationchange", updateBrowserControlOffset);
      root.style.removeProperty("--mobile-browser-bottom-offset");
    };
  }, []);

  return (
    <>
      <header className="hidden border-b border-stone-200/80 bg-paper/95 backdrop-blur sm:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link href="/" className="text-base font-semibold tracking-normal text-ink">
            My Weekly List
          </Link>
          <PrimaryNav pathname={pathname} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-2 pb-[calc(5.5rem+env(safe-area-inset-bottom)+var(--mobile-browser-bottom-offset,0px))] pt-3 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        {children}
      </main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-[var(--mobile-browser-bottom-offset,0px)] z-40 border-t border-stone-200 bg-paper/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(47,48,43,0.08)] backdrop-blur transition-[bottom] duration-150 sm:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {appRoutes.map((item) => {
            const selected = isSelectedRoute(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={selected ? "page" : undefined}
                  className={`flex min-h-12 touch-manipulation items-center justify-center rounded-full border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
                    selected
                      ? "border-clay bg-white text-ink shadow-soft"
                      : "border-stone-200 bg-white/70 text-stone-600 hover:border-clay hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function PrimaryNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-2">
        {appRoutes.map((item) => {
          const selected = isSelectedRoute(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
                  selected
                    ? "border-clay bg-white text-ink shadow-soft"
                    : "border-stone-200 bg-white/70 text-stone-600 hover:border-clay hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function isSelectedRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
