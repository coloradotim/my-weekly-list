"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAllowedUser } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCurrentWeekFromTemplates, toggleWeekCellPlan } from "@/lib/week/current";

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

export async function toggleWeekPlanningCellAction(formData: FormData) {
  const weekActivityId = String(formData.get("weekActivityId") ?? "");
  const cellDate = String(formData.get("cellDate") ?? "");

  if (!weekActivityId || !cellDate) {
    redirect("/week?cell=error");
  }

  const { supabase } = await requireAllowedUser("/week");
  const result = await toggleWeekCellPlan({
    supabase,
    weekActivityId,
    cellDate,
  });

  if (result.status === "blocked") {
    redirect("/week?cell=blocked");
  }

  if (result.status === "error") {
    redirect("/week?cell=error");
  }

  revalidatePath("/week");
  redirect("/week?cell=updated");
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
