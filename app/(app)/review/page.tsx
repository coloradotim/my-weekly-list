import Link from "next/link";
import { OptimisticReviewView } from "@/components/optimistic-review-view";
import { ScreenShell } from "@/components/screen-shell";
import { Notice } from "@/components/this-week-grid";
import { loadReview } from "@/lib/review/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseDateOnly, type DateOnly } from "@/lib/week/date";

type ReviewPageProps = {
  searchParams: Promise<{
    weekStart?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const weekStartDate = getWeekStartParam(params.weekStart);

  if (!supabase) {
    return (
      <ScreenShell
        eyebrow="Review"
        title="Supabase is not configured yet."
        description="Add the required Supabase environment variables, then restart the app."
      >
        <Notice tone="neutral" body="Review needs an authenticated Supabase session." />
      </ScreenShell>
    );
  }

  const state = await loadReview({
    supabase,
    weekStartDate: weekStartDate ?? undefined,
  });

  if (state.status === "no-review-week") {
    return (
      <ScreenShell
        eyebrow="Review"
        title="There is no week to review yet."
        description="Start a week first, then Review will summarize what happened and let you correct completion facts."
      >
        <Link className={primaryButtonClassName} href="/week">
          Go to Week
        </Link>
      </ScreenShell>
    );
  }

  if (state.status === "error") {
    return (
      <ScreenShell
        eyebrow="Review"
        title="Review could not load just now."
        description="Your sign-in is working, but the app could not read the week history tables."
      >
        <Notice tone="error" body={state.message} />
      </ScreenShell>
    );
  }

  return <OptimisticReviewView initialState={state.state} />;
}

function getWeekStartParam(value?: string | string[]): DateOnly | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return null;
  }

  try {
    parseDateOnly(raw);
    return raw;
  } catch {
    return null;
  }
}

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white";
