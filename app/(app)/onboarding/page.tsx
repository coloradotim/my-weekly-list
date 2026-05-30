import { redirect } from "next/navigation";
import Link from "next/link";
import {
  addOnboardingCategoryAction,
  completeOnboardingAction,
} from "@/app/(app)/onboarding/actions";
import { OnboardingActivityBuilder } from "@/components/onboarding-activity-builder";
import { OptimisticThisWeekGrid } from "@/components/optimistic-this-week-grid";
import { Notice } from "@/components/this-week-grid";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { loadOnboardingState } from "@/lib/onboarding/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams: Promise<{
    step?: string | string[];
    error?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const requestedStep = getParam(params.step);
  const error = getParam(params.error);

  if (!supabase) {
    return (
      <OnboardingFrame
        eyebrow="Welcome"
        title="Supabase is not configured yet."
        description="Add the required Supabase environment variables, then restart the app."
      />
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fonboarding");
  }

  const access = await getDatabaseUserAccess({ supabase, user });

  if (access.status === "must-change-password") {
    redirect("/change-password");
  }

  if (access.status !== "allowed") {
    const unauthorizedUrl = new URLSearchParams();
    const unauthorizedEmail = getUnauthorizedEmail(access);

    if (unauthorizedEmail) {
      unauthorizedUrl.set("email", unauthorizedEmail);
    }

    redirect(`/unauthorized?${unauthorizedUrl.toString()}`);
  }

  const state = await loadOnboardingState({
    supabase,
    userId: user.id,
    requestedStep,
  });

  if (state.status === "complete") {
    redirect("/week");
  }

  if (state.status === "error") {
    return (
      <OnboardingFrame
        eyebrow="Welcome"
        title="Your first weekly list could not load just now."
        description="Your sign-in is working, but the app could not read the weekly-list tables."
      >
        <Notice tone="error" body={state.message} />
      </OnboardingFrame>
    );
  }

  if (state.status === "first-category") {
    return (
      <OnboardingFrame
        eyebrow="Welcome"
        title="Welcome to My Weekly List"
        description="Let’s build your first weekly list."
      >
        {error ? (
          <Notice tone="error" body="That category could not be saved. Try again." />
        ) : null}
        <section className="rounded-lg border border-stone-200 bg-white/80 p-4 shadow-soft">
          <form action={addOnboardingCategoryAction} className="space-y-4">
            <label className={labelClassName} htmlFor="categoryName">
              What is one area of life you want to pay attention to?
            </label>
            <input
              id="categoryName"
              name="categoryName"
              type="text"
              required
              autoComplete="off"
              className={inputClassName}
            />
            <p className="text-sm leading-6 text-stone-600">
              Examples: Health, Home, Relationships, Work, Music
            </p>
            <button type="submit" className={primaryButtonClassName}>
              Add category
            </button>
          </form>
        </section>
      </OnboardingFrame>
    );
  }

  if (state.status === "activities") {
    return (
      <OnboardingFrame
        eyebrow="Welcome"
        title="What do you want to do this week?"
        description="Add a few activities and target days. You can change this later."
      >
        {error ? (
          <Notice tone="error" body="That activity could not be saved. Try again." />
        ) : null}
        <OnboardingActivityBuilder
          initialCategories={state.categories}
          initialActivities={state.activities}
        />
      </OnboardingFrame>
    );
  }

  if (state.status === "guide") {
    return (
      <OnboardingFrame
        eyebrow="Welcome"
        title="A quick tour"
        description="Your list is ready. Here’s where the main pieces live."
      >
        {error ? (
          <Notice tone="error" body="Onboarding could not be completed. Try again." />
        ) : null}
        <section className="space-y-3 rounded-lg border border-stone-200 bg-white/80 p-4 shadow-soft">
          <OnboardingTourItem
            title="Today"
            body="Use Today to mark planned activities done. If nothing is planned for today, or you do something extra, use + Something else."
          />
          <OnboardingTourItem
            title="Week"
            body="Use Week to change planned days, edit your list, and set up next week."
          />
          <OnboardingTourItem
            title="Review"
            body="Use Review to see what happened and correct completion truth later."
          />
        </section>
        <div className="flex flex-col gap-3 rounded-lg border border-meadow/25 bg-meadow/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-stone-800">
            Ready to use My Weekly List?
          </p>
          <form action={completeOnboardingAction}>
            <button type="submit" className={primaryButtonClassName}>
              Go to Today
            </button>
          </form>
        </div>
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      eyebrow="Welcome"
      title="Plan this week"
      description="Tap days to make a simple plan for this week. You can change this later."
    >
      {error ? (
        <Notice tone="error" body="Onboarding could not be completed. Try again." />
      ) : null}
      <PlanLegend />
      <div className="flex flex-col gap-3 rounded-lg border border-meadow/25 bg-meadow/10 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-stone-800">
          Ready to see how you’ll use it?
        </p>
        <Link href="/onboarding?step=guide" className={primaryButtonClassName}>
          Next
        </Link>
      </div>
      <OptimisticThisWeekGrid initialView={state.view} initialNotice={null} />
    </OnboardingFrame>
  );
}

function OnboardingTourItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-paper/70 px-3 py-2">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-700">{body}</p>
    </div>
  );
}

function PlanLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-stone-200 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-soft">
      <span>Tap a day to switch it between:</span>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full border border-stone-400 bg-white"
        />
        not planned
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full border-2 border-sky-500 bg-sky-100 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.72)]"
        />
        planned
      </span>
    </div>
  );
}

function OnboardingFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white/80 p-4 shadow-soft sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-base leading-7 text-stone-700">{description}</p>
      </div>
      {children}
    </section>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const labelClassName = "block text-xs font-semibold uppercase tracking-wide text-clay";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-base text-ink shadow-inner shadow-stone-100 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/40";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white";
