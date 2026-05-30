import Link from "next/link";
import { startThisWeekAction } from "@/app/(app)/week/actions";
import { OptimisticThisWeekGrid } from "@/components/optimistic-this-week-grid";
import { ScreenShell } from "@/components/screen-shell";
import { formatDateRange, Notice } from "@/components/this-week-grid";
import { WeekListEditor } from "@/components/week-list-editor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadThisWeek } from "@/lib/week/current";

type ThisWeekPageProps = {
  searchParams: Promise<{
    week?: string | string[];
    cell?: string | string[];
    list?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function ThisWeekPage({ searchParams }: ThisWeekPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const notice = getWeekNotice(params);

  if (!supabase) {
    return (
      <ScreenShell
        eyebrow="This Week"
        title="Supabase is not configured yet."
        description="Add the required Supabase environment variables, then restart the app."
      >
        <Notice
          tone="neutral"
          body="The weekly grid needs an authenticated Supabase session."
        />
      </ScreenShell>
    );
  }

  const state = await loadThisWeek(supabase);

  if (state.status === "needs-setup") {
    return (
      <ScreenShell
        eyebrow="This Week"
        title="Create your starter list first."
        description="Your reusable categories and activities are not set up yet. Create the starter list, then come back to start this week."
      >
        <Link className={primaryButtonClassName} href="/setup">
          Go to setup
        </Link>
      </ScreenShell>
    );
  }

  if (state.status === "error") {
    return (
      <ScreenShell
        eyebrow="This Week"
        title="This week could not load just now."
        description="Your sign-in is working, but the app could not read the week tables. Try again after confirming the Supabase migration has been applied."
      >
        <Notice tone="error" body={state.message} />
      </ScreenShell>
    );
  }

  if (state.status === "no-current-week") {
    return (
      <ScreenShell
        eyebrow="This Week"
        title="Start this week from your list."
        description={`This will create the ${formatDateRange(
          state.weekStartDate,
          state.weekEndDate,
        )} week from your active starter activities.`}
      >
        <div className="rounded-lg border border-stone-200 bg-white/80 p-5 shadow-soft">
          {notice ? <Notice tone={notice.tone} body={notice.body} /> : null}
          <p className="text-sm leading-6 text-stone-700">
            {state.isLateStart
              ? "Because this week is already underway, earlier days will stay blank unless you intentionally record something."
              : "No days will be planned until you choose them in the grid."}
          </p>
          <form action={startThisWeekAction} className="mt-5">
            <button type="submit" className={primaryButtonClassName}>
              Start this week
            </button>
          </form>
        </div>
      </ScreenShell>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-clay">
            This Week
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
            {formatDateRange(state.view.week.weekStartDate, state.view.week.weekEndDate)}
          </h1>
        </div>
      </header>
      <OptimisticThisWeekGrid initialView={state.view} initialNotice={notice} />
      <WeekListEditor view={state.view} />
    </section>
  );
}

type WeekNotice = {
  tone: "success" | "error" | "neutral";
  body: string;
} | null;

function getWeekNotice({
  week,
  cell,
  list,
}: {
  week?: string | string[];
  cell?: string | string[];
  list?: string | string[];
}): WeekNotice {
  const weekStatus = Array.isArray(week) ? week[0] : week;
  const cellStatus = Array.isArray(cell) ? cell[0] : cell;
  const listStatus = Array.isArray(list) ? list[0] : list;

  if (weekStatus === "started") {
    return { tone: "success", body: "This week is ready." };
  }

  if (weekStatus === "error") {
    return {
      tone: "error",
      body: "This week could not be started just now. Please try again.",
    };
  }

  if (cellStatus === "updated") {
    return { tone: "success", body: "Plan updated." };
  }

  if (cellStatus === "blocked") {
    return { tone: "neutral", body: "That plan is view-only right now." };
  }

  if (cellStatus === "error") {
    return {
      tone: "error",
      body: "That plan could not be updated just now. Please try again.",
    };
  }

  if (listStatus === "updated") {
    return { tone: "success", body: "List updated." };
  }

  if (listStatus === "kept-history") {
    return {
      tone: "neutral",
      body: "Removed from future weeks. This week keeps existing history for that activity.",
    };
  }

  if (listStatus === "blocked") {
    return { tone: "neutral", body: "That list is view-only right now." };
  }

  if (listStatus === "error") {
    return {
      tone: "error",
      body: "That list change could not be saved just now. Please try again.",
    };
  }

  return null;
}

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white";
