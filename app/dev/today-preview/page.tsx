import { notFound } from "next/navigation";
import { isDevPreviewEnabled } from "@/lib/week/preview";
import { TodayPreviewClient } from "./today-preview-client";

export const dynamic = "force-dynamic";

export default function DevTodayPreviewPage() {
  if (!isDevPreviewEnabled()) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-6">
      <header className="mb-3 sm:mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          Development preview
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Today preview
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-700">
          Local fixture state only. This route is disabled in production and does not
          touch Supabase.
        </p>
      </header>
      <TodayPreviewClient />
    </main>
  );
}
