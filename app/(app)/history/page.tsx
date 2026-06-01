import Link from "next/link";
import { ScreenShell } from "@/components/screen-shell";
import { Notice } from "@/components/this-week-grid";
import {
  getHistoryPatternLine,
  getHistoryTargetSummaryLine,
  getHistoryWeekSummaryLine,
  loadHistory,
  type HistoryPatternRow,
  type HistoryWeekSummary,
} from "@/lib/history/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <ScreenShell
        eyebrow="History"
        title="Supabase is not configured yet."
        description="Add the required Supabase environment variables, then restart the app."
      >
        <Notice tone="neutral" body="History needs an authenticated Supabase session." />
      </ScreenShell>
    );
  }

  const history = await loadHistory({ supabase });

  if (history.status === "error") {
    return (
      <ScreenShell
        eyebrow="History"
        title="History could not load just now."
        description="Your sign-in is working, but the app could not read the recorded week history."
      >
        <Notice tone="error" body={history.message} />
      </ScreenShell>
    );
  }

  const { state } = history;
  const hasAnyPastWeek = Boolean(state.lastWeek || state.previousWeeks.length > 0);

  if (!hasAnyPastWeek) {
    return (
      <ScreenShell
        eyebrow="History"
        title="No previous weeks yet."
        description="After you finish your first week, this is where you’ll be able to open past reviews and see simple patterns."
      >
        <Link className={secondaryButtonClassName} href="/review">
          Back to Review
        </Link>
      </ScreenShell>
    );
  }

  return (
    <section className="space-y-3 sm:space-y-4">
      <header className="rounded-lg border border-line bg-surface/90 p-3 shadow-soft sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clay">
              History
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-normal text-ink">
              Previous weeks
            </h1>
          </div>
          <Link className={secondaryButtonClassName} href="/review">
            Review
          </Link>
        </div>
      </header>

      <section className="rounded-lg border border-line bg-surface/90 p-3 shadow-soft sm:p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-clay">
          Last week
        </h2>
        {state.lastWeek ? (
          <HistoryWeekCard week={state.lastWeek} featured />
        ) : (
          <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-3 text-sm text-muted">
            No recorded week yet.
          </p>
        )}
      </section>

      {state.previousWeeks.length > 0 ? (
        <section className="rounded-lg border border-line bg-surface/90 p-3 shadow-soft sm:p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-clay">
            Previous weeks
          </h2>
          <div className="mt-3 space-y-2">
            {state.previousWeeks.map((week) => (
              <HistoryWeekCard key={week.id} week={week} />
            ))}
          </div>
        </section>
      ) : null}

      {state.patterns.length > 0 ? (
        <section className="rounded-lg border border-line bg-surface/90 p-3 shadow-soft sm:p-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-clay">
              Patterns
            </h2>
            <p className="mt-1 text-sm text-muted">{state.patternWindowLabel}</p>
          </div>
          <div className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            {state.patterns.map((pattern) => (
              <PatternRow key={pattern.activityKey} pattern={pattern} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function HistoryWeekCard({
  week,
  featured = false,
}: {
  week: HistoryWeekSummary;
  featured?: boolean;
}) {
  return (
    <article
      className={`rounded-lg border border-line bg-surface px-3 py-3 ${
        featured ? "mt-3" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{week.rangeLabel}</h3>
          <p className="mt-2 text-sm leading-6 text-secondary">
            {getHistoryWeekSummaryLine(week)}
          </p>
          <p className="text-sm leading-6 text-muted">
            {getHistoryTargetSummaryLine(week)}
          </p>
        </div>
        <Link className={smallButtonClassName} href={week.reviewHref}>
          Open review
        </Link>
      </div>
    </article>
  );
}

function PatternRow({ pattern }: { pattern: HistoryPatternRow }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-sm">
      <span className="min-w-0 truncate font-semibold text-ink">
        {pattern.activityName}
      </span>
      <span className="whitespace-nowrap text-right text-secondary">
        {getHistoryPatternLine(pattern)}
      </span>
    </div>
  );
}

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-secondary transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay";

const smallButtonClassName =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface px-3 text-sm font-semibold text-secondary transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay";
