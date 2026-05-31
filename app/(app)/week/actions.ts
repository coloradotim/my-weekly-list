"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addWeekActivityListItem,
  createCurrentWeekFromTemplates,
  removeWeekActivityFromFuture,
  renameWeekCategory,
  reorderWeekActivities,
  reorderWeekCategories,
  setWeekCellFacts,
  setWeekCellPlanned,
  updateWeekActivityListItem,
} from "@/lib/week/current";
import type { DateOnly } from "@/lib/week/date";

export async function startThisWeekAction() {
  const { supabase, userId } = await requireAllowedUser("/week");
  const result = await createCurrentWeekFromTemplates({ supabase, userId });

  if (result.status === "needs-setup") {
    redirect("/onboarding");
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

export async function setWeekCellFactsAction({
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
}) {
  if (!weekActivityId || !cellDate) {
    return { status: "error" as const };
  }

  const { supabase } = await requireAllowedUser("/week");
  const result = await setWeekCellFacts({
    supabase,
    weekActivityId,
    cellDate,
    facts: { planned, done, skipped },
  });

  if (result.status === "blocked") {
    return { status: "blocked" as const };
  }

  if (result.status === "error") {
    return { status: "error" as const };
  }

  return { status: "updated" as const };
}

export async function updateWeekActivityListItemAction(formData: FormData) {
  const weekActivityId = getFormString(formData, "weekActivityId");
  const activityName = getFormString(formData, "activityName");
  const categoryName = getFormString(formData, "categoryName");
  const targetCount = getFormNumber(formData, "targetCount");

  if (!weekActivityId || !activityName || !categoryName || targetCount === null) {
    redirect("/week?list=blocked");
  }

  const { supabase, userId } = await requireAllowedUser("/week");
  const result = await updateWeekActivityListItem({
    supabase,
    userId,
    weekActivityId,
    activityName,
    categoryName,
    targetCount,
  });

  revalidatePath("/week");
  redirect(`/week?list=${toListNotice(result.status)}`);
}

export async function updateWeekActivityListItemClientAction(formData: FormData) {
  const weekActivityId = getFormString(formData, "weekActivityId");
  const activityName = getFormString(formData, "activityName");
  const categoryName = getFormString(formData, "categoryName");
  const targetCount = getFormNumber(formData, "targetCount");

  if (!weekActivityId || !activityName || !categoryName || targetCount === null) {
    return {
      status: "blocked" as const,
      message: "Activity name, category, and target are required.",
    };
  }

  const { supabase, userId } = await requireAllowedUser("/week");
  const result = await updateWeekActivityListItem({
    supabase,
    userId,
    weekActivityId,
    activityName,
    categoryName,
    targetCount,
  });

  return result.status === "updated"
    ? { status: "updated" as const }
    : {
        status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
        message:
          "message" in result ? result.message : "That activity could not be saved.",
      };
}

export async function addWeekActivityListItemAction(formData: FormData) {
  const weekId = getFormString(formData, "weekId");
  const activityName = getFormString(formData, "activityName");
  const categoryName = getFormString(formData, "categoryName");
  const targetCount = getFormNumber(formData, "targetCount");

  if (!weekId || !activityName || !categoryName || targetCount === null) {
    redirect("/week?list=blocked");
  }

  const { supabase, userId } = await requireAllowedUser("/week");
  const result = await addWeekActivityListItem({
    supabase,
    userId,
    weekId,
    activityName,
    categoryName,
    targetCount,
  });

  revalidatePath("/week");
  redirect(`/week?list=${toListNotice(result.status)}`);
}

export async function addWeekActivityListItemClientAction(formData: FormData) {
  const weekId = getFormString(formData, "weekId");
  const activityName = getFormString(formData, "activityName");
  const categoryName = getFormString(formData, "categoryName");
  const targetCount = getFormNumber(formData, "targetCount");

  if (!weekId || !activityName || !categoryName || targetCount === null) {
    return {
      status: "blocked" as const,
      message: "Activity name, category, and target are required.",
    };
  }

  const { supabase, userId } = await requireAllowedUser("/week");
  const result = await addWeekActivityListItem({
    supabase,
    userId,
    weekId,
    activityName,
    categoryName,
    targetCount,
  });

  return result.status === "updated"
    ? { status: "updated" as const, activity: result.activity ?? null }
    : {
        status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
        message:
          "message" in result ? result.message : "That activity could not be added.",
      };
}

export async function removeWeekActivityFromFutureAction(formData: FormData) {
  const weekActivityId = getFormString(formData, "weekActivityId");

  if (!weekActivityId) {
    redirect("/week?list=blocked");
  }

  const { supabase } = await requireAllowedUser("/week");
  const result = await removeWeekActivityFromFuture({
    supabase,
    weekActivityId,
  });

  revalidatePath("/week");
  redirect(`/week?list=${toListNotice(result.status)}`);
}

export async function removeWeekActivityFromFutureClientAction(weekActivityId: string) {
  if (!weekActivityId) {
    return {
      status: "blocked" as const,
      message: "That list change is missing an activity.",
    };
  }

  const { supabase } = await requireAllowedUser("/week");
  const result = await removeWeekActivityFromFuture({
    supabase,
    weekActivityId,
  });

  if (result.status === "removed") {
    return { status: "removed" as const };
  }

  if (result.status === "kept-history") {
    return {
      status: "kept-history" as const,
      message: "That activity has week history, so it stayed in this week.",
    };
  }

  return {
    status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
    message: "message" in result ? result.message : "That activity could not be deleted.",
  };
}

export async function renameWeekCategoryAction({
  weekId,
  categoryName,
  nextCategoryName,
}: {
  weekId: string;
  categoryName: string;
  nextCategoryName: string;
}) {
  if (!weekId || !categoryName || !nextCategoryName) {
    return {
      status: "blocked" as const,
      message: "Category name is required.",
    };
  }

  const { supabase, userId } = await requireAllowedUser("/week");
  const result = await renameWeekCategory({
    supabase,
    userId,
    weekId,
    categoryName,
    nextCategoryName,
  });

  return result.status === "updated"
    ? { status: "updated" as const }
    : {
        status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
        message:
          "message" in result ? result.message : "That category could not be renamed.",
      };
}

export async function reorderWeekCategoriesAction({
  weekId,
  categoryName,
  targetCategoryName,
}: {
  weekId: string;
  categoryName: string;
  targetCategoryName: string;
}) {
  if (!weekId || !categoryName || !targetCategoryName) {
    return { status: "blocked" as const };
  }

  const { supabase } = await requireAllowedUser("/week");
  const result = await reorderWeekCategories({
    supabase,
    weekId,
    categoryName,
    targetCategoryName,
  });

  if (result.status !== "updated") {
    console.error("Week category reorder failed", result);
  }

  return result.status === "updated"
    ? { status: "updated" as const }
    : {
        status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
        message: "message" in result ? result.message : "That order could not be saved.",
      };
}

export async function reorderWeekActivitiesAction({
  weekActivityId,
  targetWeekActivityId,
}: {
  weekActivityId: string;
  targetWeekActivityId: string;
}) {
  if (!weekActivityId || !targetWeekActivityId) {
    return { status: "blocked" as const };
  }

  const { supabase } = await requireAllowedUser("/week");
  const result = await reorderWeekActivities({
    supabase,
    weekActivityId,
    targetWeekActivityId,
  });

  if (result.status !== "updated") {
    console.error("Week activity reorder failed", result);
  }

  return result.status === "updated"
    ? { status: "updated" as const }
    : {
        status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
        message: "message" in result ? result.message : "That order could not be saved.",
      };
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

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormNumber(formData: FormData, key: string) {
  const value = getFormString(formData, key);
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function toListNotice(status: string) {
  if (status === "updated" || status === "removed") {
    return "updated";
  }

  if (status === "kept-history") {
    return "kept-history";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "error";
}
