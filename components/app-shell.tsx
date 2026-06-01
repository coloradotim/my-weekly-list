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
      <header className="sticky inset-x-0 top-0 z-50 min-h-[var(--app-mobile-nav-height)] border-b border-line bg-paper px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] shadow-[0_6px_18px_rgb(var(--color-shadow-soft)/0.06)] sm:fixed sm:min-h-0 sm:bg-paper/95 sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-4 sm:justify-between sm:px-6 sm:py-3 lg:px-8">
          <Link
            href="/"
            className="hidden text-base font-semibold tracking-normal text-ink sm:block"
          >
            My Weekly List
          </Link>
          <PrimaryNav selectedHref={selectedHref} onNavigate={setPendingHref} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-2 pb-4 pt-2 sm:px-6 sm:pb-8 sm:pt-20 lg:px-8">
        {children}
      </main>
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
      <ul className="grid w-full max-w-md grid-cols-3 gap-2 sm:flex sm:w-auto sm:max-w-none sm:items-center">
        {appRoutes.map((item) => {
          const selected = selectedHref === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => onNavigate(item.href)}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-11 touch-manipulation items-center justify-center rounded-full border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay sm:inline-flex sm:min-h-10 sm:px-4 ${
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
