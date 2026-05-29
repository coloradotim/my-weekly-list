"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAllowedUser } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCurrentWeekFromTemplates, setWeekCellPlanned } from "@/lib/week/current";
import type { DateOnly } from "@/lib/week/date";

export async function startThisWeekAction() {
  const { supabase, userId } = await requireAllowedUser("/week");
  const result = await createCurrentWeekFromTemplates({ supabase, userId });

  if (result.status === "needs-setup") {
    redirect("/setup");
  }

  if (result.status === "error") {
    redirect("/week?week=error");
  }

  revalidatePath("/week");
  redirect("/week?week=started");
}

export async function setWeekPlanningCellAction({
  weekActivityId,
  cellDate,
  planned,
}: {
  weekActivityId: string;
  cellDate: DateOnly;
  planned: boolean;
}) {
  if (!weekActivityId || !cellDate) {
    return { status: "error" as const };
  }

  const { supabase } = await requireAllowedUser("/week");
  const result = await setWeekCellPlanned({
    supabase,
    weekActivityId,
    cellDate,
    planned,
  });

  if (result.status === "blocked") {
    return { status: "blocked" as const };
  }

  if (result.status === "error") {
    return { status: "error" as const };
  }

  return { status: "updated" as const };
}

async function requireAllowedUser(nextPath: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const access = checkAllowedUser(user.email);

  if (access.status !== "allowed") {
    const params = new URLSearchParams();
    if (access.status === "unauthorized") {
      params.set("email", access.email);
    }
    redirect(`/unauthorized?${params.toString()}`);
  }

  return { supabase, userId: user.id };
}
