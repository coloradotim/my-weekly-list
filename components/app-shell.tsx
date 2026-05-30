"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { appRoutes } from "@/lib/routes";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <header className="hidden border-b border-stone-200/80 bg-paper/95 backdrop-blur sm:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link href="/" className="text-base font-semibold tracking-normal text-ink">
            My Weekly List
          </Link>
          <div className="flex items-center gap-3">
            <PrimaryNav pathname={pathname} />
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="fixed right-3 top-3 z-50 sm:hidden">
        <AccountMenu compact />
      </div>

      <main className="mx-auto w-full max-w-6xl px-2 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        {children}
      </main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-paper/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(47,48,43,0.08)] backdrop-blur sm:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {appRoutes.map((item) => {
            const selected = isSelectedRoute(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={selected ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-full border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
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

function AccountMenu({ compact = false }: { compact?: boolean }) {
  return (
    <details className="group relative">
      <summary
        className={`flex cursor-pointer list-none items-center justify-center rounded-full border border-stone-200 bg-white/85 text-sm font-semibold text-stone-600 shadow-soft transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay [&::-webkit-details-marker]:hidden ${
          compact ? "h-10 w-10" : "min-h-10 px-3"
        }`}
        aria-label="Account menu"
      >
        {compact ? "⋯" : "Account"}
      </summary>
      <div className="absolute right-0 mt-2 w-36 rounded-lg border border-stone-200 bg-white p-2 shadow-soft">
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-stone-600 transition hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}

function isSelectedRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
