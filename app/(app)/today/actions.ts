"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { setReviewCellDone } from "@/lib/review/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getTodayDateOnly,
  moveWeekActivityPlanDate,
  setActivityDayCellFacts,
} from "@/lib/week/current";
import { addDays, compareDateOnly, type DateOnly } from "@/lib/week/date";

type TodayActionResult =
  | { status: "updated" }
  | { status: "blocked" }
  | { status: "error" };

export async function setTodayCellFactsAction({
  weekActivityId,
  cellDate,
  planned,
  done,
  skipped,
}: {
  weekActivityId: string;
  cellDate: DateOnly;
  planned: boolean;
  done: boolean;
  skipped: boolean;
}): Promise<TodayActionResult> {
  if (!weekActivityId || !cellDate) {
    return { status: "error" };
  }

  if (!canUseTodaySurfaceForDate(cellDate)) {
    return { status: "blocked" };
  }

  const { supabase } = await requireAllowedUser("/today");
  const result = await setActivityDayCellFacts({
    supabase,
    weekActivityId,
    cellDate,
    facts: { planned, done, skipped },
    mutationToday: cellDate,
  });

  if (result.status === "blocked") {
    return { status: "blocked" };
  }

  if (result.status === "error") {
    return { status: "error" };
  }

  revalidatePath("/today");
  revalidatePath("/today?day=yesterday");
  revalidatePath("/week");
  return { status: "updated" };
}

export async function setTodayCompletionCorrectionAction({
  weekActivityId,
  cellDate,
  done,
}: {
  weekActivityId: string;
  cellDate: DateOnly;
  done: boolean;
}): Promise<TodayActionResult> {
  if (!weekActivityId || !cellDate) {
    return { status: "error" };
  }

  const { supabase } = await requireAllowedUser("/today");
  const result = await setReviewCellDone({
    supabase,
    weekActivityId,
    cellDate,
    done,
  });

  if (result.status === "blocked") {
    return { status: "blocked" };
  }

  if (result.status === "error") {
    return { status: "error" };
  }

  revalidatePath("/today");
  revalidatePath("/today?day=yesterday");
  revalidatePath("/week");
  revalidatePath("/review");
  return { status: "updated" };
}

export async function moveTodayPlanAction({
  weekActivityId,
  today,
  toDate,
}: {
  weekActivityId: string;
  today: DateOnly;
  toDate: DateOnly;
}): Promise<TodayActionResult> {
  if (!weekActivityId || !today || !toDate || compareDateOnly(toDate, today) <= 0) {
    return { status: "blocked" };
  }

  if (!canUseTodaySurfaceForDate(today)) {
    return { status: "blocked" };
  }

  const { supabase } = await requireAllowedUser("/today");
  const result = await moveWeekActivityPlanDate({
    supabase,
    weekActivityId,
    fromDate: today,
    toDate,
    mutationToday: today,
  });

  if (result.status !== "updated") {
    return result.status === "blocked" ? { status: "blocked" } : { status: "error" };
  }

  revalidatePath("/today");
  revalidatePath("/today?day=yesterday");
  revalidatePath("/week");
  return { status: "updated" };
}

export async function undoMoveTodayPlanAction({
  weekActivityId,
  today,
  fromDate,
}: {
  weekActivityId: string;
  today: DateOnly;
  fromDate: DateOnly;
}): Promise<TodayActionResult> {
  if (!weekActivityId || !today || !fromDate || compareDateOnly(fromDate, today) <= 0) {
    return { status: "blocked" };
  }

  if (!canUseTodaySurfaceForDate(today)) {
    return { status: "blocked" };
  }

  const { supabase } = await requireAllowedUser("/today");
  const clearFuture = await setActivityDayCellFacts({
    supabase,
    weekActivityId,
    cellDate: fromDate,
    facts: { planned: false, done: false, skipped: false },
    mutationToday: today,
  });

  if (clearFuture.status !== "updated") {
    return clearFuture.status === "blocked" ? { status: "blocked" } : { status: "error" };
  }

  const restoreToday = await setActivityDayCellFacts({
    supabase,
    weekActivityId,
    cellDate: today,
    facts: { planned: true, done: false, skipped: false },
    mutationToday: today,
  });

  if (restoreToday.status !== "updated") {
    await setActivityDayCellFacts({
      supabase,
      weekActivityId,
      cellDate: fromDate,
      facts: { planned: true, done: false, skipped: false },
      mutationToday: today,
    });

    return restoreToday.status === "blocked"
      ? { status: "blocked" }
      : { status: "error" };
  }

  revalidatePath("/today");
  revalidatePath("/today?day=yesterday");
  revalidatePath("/week");
  return { status: "updated" };
}

function canUseTodaySurfaceForDate(cellDate: DateOnly) {
  const today = getTodayDateOnly();

  return cellDate === today || cellDate === addDays(today, -1);
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

  const access = await getDatabaseUserAccess({ supabase, user });

  if (access.status === "must-change-password") {
    redirect("/change-password");
  }

  if (access.status !== "allowed") {
    const params = new URLSearchParams();
    const unauthorizedEmail = getUnauthorizedEmail(access);
    if (unauthorizedEmail) {
      params.set("email", unauthorizedEmail);
    }
    redirect(`/unauthorized?${params.toString()}`);
  }

  return { supabase, userId: user.id };
}
