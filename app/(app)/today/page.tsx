import Link from "next/link";
import { redirect } from "next/navigation";
import { OptimisticTodayView } from "@/components/optimistic-today-view";
import { ScreenShell } from "@/components/screen-shell";
import { Notice } from "@/components/this-week-grid";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadToday } from "@/lib/today/current";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();

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

  let state = await loadToday(supabase);

  if (state.status === "no-current-week") {
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
        eyebrow="Today"
        title="Start this week first."
        description="Today needs an active week before it can show planned items or record what happened."
      >
        <Link className={primaryButtonClassName} href="/week">
          Go to This Week
        </Link>
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

  return <OptimisticTodayView initialState={state.state} />;
}

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white";
