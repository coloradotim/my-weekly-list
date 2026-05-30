import { redirect } from "next/navigation";
import { getSmartEntryDestination } from "@/lib/entry/smart-entry";
import { createCurrentWeekFromTemplates, loadThisWeek } from "@/lib/week/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const weekState = await loadThisWeek(supabase);

  if (weekState.status === "needs-setup") {
    redirect(getSmartEntryDestination({ weekStatus: "needs-setup" }));
  }

  if (weekState.status === "ready") {
    redirect(getSmartEntryDestination({ weekStatus: "ready" }));
  }

  if (weekState.status === "no-current-week") {
    const created = await createCurrentWeekFromTemplates({
      supabase,
      userId: user.id,
    });

    redirect(
      getSmartEntryDestination({
        weekStatus: "no-current-week",
        creationStatus: created.status === "created" ? "created" : created.status,
      }),
    );
  }

  redirect(getSmartEntryDestination({ weekStatus: "error" }));
}
