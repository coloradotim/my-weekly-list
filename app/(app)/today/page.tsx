import Link from "next/link";
import { redirect } from "next/navigation";
import { OptimisticTodayView } from "@/components/optimistic-today-view";
import { ScreenShell } from "@/components/screen-shell";
import { Notice } from "@/components/this-week-grid";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadToday } from "@/lib/today/current";
import { getTodayDateOnly } from "@/lib/week/current";
import { addDays } from "@/lib/week/date";

type TodayPageProps = {
  searchParams: Promise<{
    day?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const dayKind = getDayKind(params.day);
  const viewedDate =
    dayKind === "yesterday" ? addDays(getTodayDateOnly(), -1) : undefined;

  if (!supabase) {
    return (
      <ScreenShell
        eyebrow="Today"
        title="Supabase is not configured yet."
        description="Add the required Supabase environment variables, then restart the app."
      >
        <Notice tone="neutral" body="Today needs an authenticated Supabase session." />
      </ScreenShell>
    );
  }

  let state = await loadToday(supabase, viewedDate ? { today: viewedDate } : undefined);

  if (state.status === "no-current-week" && dayKind === "today") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login?next=%2Ftoday");
    }

    state = await loadToday(supabase, { ensureCurrentWeekForUserId: user.id });
  }

  if (state.status === "needs-setup") {
    redirect("/onboarding");
  }

  if (state.status === "no-current-week") {
    return (
      <ScreenShell
        eyebrow={dayKind === "yesterday" ? "Yesterday" : "Today"}
        title={
          dayKind === "yesterday"
            ? "Yesterday is not available here."
            : "Start this week first."
        }
        description={
          dayKind === "yesterday"
            ? "That week was not planned in the app, so there is nothing to clean up from Yesterday."
            : "Today needs an active week before it can show planned items or record what happened."
        }
      >
        <div className="flex flex-wrap gap-2">
          <Link className={primaryButtonClassName} href="/today">
            Go to Today
          </Link>
          {dayKind === "today" ? (
            <Link className={secondaryButtonClassName} href="/week">
              Go to This Week
            </Link>
          ) : null}
        </div>
      </ScreenShell>
    );
  }

  if (state.status === "error") {
    return (
      <ScreenShell
        eyebrow="Today"
        title="Today could not load just now."
        description="Your sign-in is working, but the app could not read the current week tables."
      >
        <Notice tone="error" body={state.message} />
      </ScreenShell>
    );
  }

  return <OptimisticTodayView initialState={state.state} dayKind={dayKind} />;
}

function getDayKind(day: string | string[] | undefined) {
  const raw = Array.isArray(day) ? day[0] : day;

  return raw === "yesterday" ? "yesterday" : "today";
}

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-paper";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-clay transition hover:border-clay focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-paper";
