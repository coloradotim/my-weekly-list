"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { appRoutes, getSelectedRouteHref } from "@/lib/routes";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const selectedHref = pendingHref ?? getSelectedRouteHref(pathname);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-line bg-paper/95 backdrop-blur sm:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link href="/" className="text-base font-semibold tracking-normal text-ink">
            My Weekly List
          </Link>
          <PrimaryNav selectedHref={selectedHref} onNavigate={setPendingHref} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-8 sm:pt-20 lg:px-8">
        {children}
      </main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(var(--color-shadow-soft)/0.08)] backdrop-blur sm:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {appRoutes.map((item) => {
            const selected = selectedHref === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setPendingHref(item.href)}
                  aria-current={selected ? "page" : undefined}
                  className={`flex min-h-12 touch-manipulation items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
                    selected
                      ? "border-clay bg-surface text-ink shadow-soft"
                      : "border-line bg-surface/70 text-muted"
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

function PrimaryNav({
  selectedHref,
  onNavigate,
}: {
  selectedHref: string | null;
  onNavigate: (href: string) => void;
}) {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-2">
        {appRoutes.map((item) => {
          const selected = selectedHref === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => onNavigate(item.href)}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
                  selected
                    ? "border-clay bg-surface text-ink shadow-soft"
                    : "border-line bg-surface/70 text-muted hover:border-clay hover:text-ink"
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
