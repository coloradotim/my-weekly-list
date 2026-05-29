import Link from "next/link";
import { seedInitialWeeklyListAction } from "@/app/(app)/setup/actions";
import {
  getInitialListSetupState,
  getSetupNotice,
  type SetupCountClient,
} from "@/lib/setup/initial-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SetupPageProps = {
  searchParams: Promise<{
    seed?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const notice = getSetupNotice(params.seed);

  if (!supabase) {
    return (
      <SetupFrame
        eyebrow="Setup needed"
        title="Supabase auth is not configured yet."
        body="Add the required Supabase environment variables, then restart the app."
      />
    );
  }

  const setupState = await getInitialListSetupState(
    supabase as unknown as SetupCountClient,
  );

  if (setupState.status === "error") {
    return (
      <SetupFrame
        eyebrow="Setup"
        title="I could not check your starter list just now."
        body="Your sign-in is working, but the app could not read the reusable list tables. Try again after confirming the Supabase migration has been applied."
      >
        <Link className={secondaryButtonClassName} href="/today">
          Go to Today
        </Link>
      </SetupFrame>
    );
  }

  if (setupState.status === "seeded") {
    return (
      <SetupFrame
        eyebrow="Setup"
        title={notice?.tone === "success" ? notice.title : "Your weekly list is ready"}
        body={
          notice?.tone === "success"
            ? notice.body
            : "Your starter categories and activities are already in place."
        }
      >
        <Link className={primaryButtonClassName} href="/today">
          Go to Today
        </Link>
        <Link className={secondaryButtonClassName} href="/week">
          Go to This Week
        </Link>
      </SetupFrame>
    );
  }

  return (
    <SetupFrame
      eyebrow="Setup"
      title="Set up your weekly list"
      body="Your database is ready. Create your starter categories and activities so you can begin planning your week."
      notice={notice}
    >
      <form action={seedInitialWeeklyListAction}>
        <button type="submit" className={primaryButtonClassName}>
          Create my weekly list
        </button>
      </form>
      <Link className={secondaryButtonClassName} href="/today">
        Not now
      </Link>
    </SetupFrame>
  );
}

function SetupFrame({
  eyebrow,
  title,
  body,
  notice,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  notice?: ReturnType<typeof getSetupNotice>;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-stone-700">{body}</p>

        {notice ? (
          <div
            className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${
              notice.tone === "success"
                ? "border-meadow/25 bg-meadow/10 text-stone-800"
                : "border-clay/30 bg-clay/10 text-stone-800"
            }`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            <p className="font-semibold text-ink">{notice.title}</p>
            <p className="mt-1">{notice.body}</p>
          </div>
        ) : null}

        {children ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">{children}</div>
        ) : null}
      </div>
    </section>
  );
}

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white/70 px-5 text-sm font-semibold text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-white";
