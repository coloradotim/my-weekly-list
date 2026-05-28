import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { appRoutes } from "@/lib/routes";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Weekly List",
  description: "A calm weekly planning ritual for one private user.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffaf2",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-paper text-ink">
          <header className="border-b border-stone-200/80 bg-paper/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="w-fit text-xl font-semibold tracking-normal">
                My Weekly List
              </Link>
              <nav aria-label="Main navigation">
                <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {appRoutes.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white/70 px-4 text-sm font-medium text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-paper sm:justify-start"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
