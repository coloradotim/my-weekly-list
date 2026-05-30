"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { markOnboardingComplete } from "@/lib/onboarding/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createReusableActivityForOnboarding,
  createReusableCategoryForOnboarding,
} from "@/lib/week/current";

export async function addOnboardingCategoryAction(formData: FormData) {
  const categoryName = getFormString(formData, "categoryName");

  if (!categoryName) {
    redirect("/onboarding?error=category");
  }

  const { supabase, userId } = await requireAllowedUser("/onboarding");
  const result = await createReusableCategoryForOnboarding({
    supabase,
    userId,
    categoryName,
  });

  if (result.status !== "updated") {
    redirect("/onboarding?error=category");
  }

  revalidatePath("/onboarding");
  redirect("/onboarding?step=activities");
}

export async function addOnboardingCategoryClientAction(formData: FormData) {
  const categoryName = getFormString(formData, "categoryName");

  if (!categoryName) {
    return {
      status: "blocked" as const,
      message: "Category name is required.",
    };
  }

  const { supabase, userId } = await requireAllowedUser("/onboarding");
  const result = await createReusableCategoryForOnboarding({
    supabase,
    userId,
    categoryName,
  });

  if (result.status !== "updated") {
    return {
      status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
      message: "message" in result ? result.message : "That category could not be saved.",
    };
  }

  revalidatePath("/onboarding");

  return {
    status: "updated" as const,
    category: result.category,
  };
}

export async function addOnboardingActivityAction(formData: FormData) {
  const activityName = getFormString(formData, "activityName");
  const categoryName = getFormString(formData, "categoryName");
  const targetCount = getFormNumber(formData, "targetCount") ?? 1;

  if (!activityName || !categoryName) {
    redirect("/onboarding?step=activities&error=activity");
  }

  const { supabase, userId } = await requireAllowedUser("/onboarding");
  const result = await createReusableActivityForOnboarding({
    supabase,
    userId,
    activityName,
    categoryName,
    targetCount,
  });

  if (result.status !== "updated") {
    redirect("/onboarding?step=activities&error=activity");
  }

  revalidatePath("/onboarding");
  revalidatePath("/week");
  revalidatePath("/today");
  redirect("/onboarding?step=activities");
}

export async function addOnboardingActivityClientAction(formData: FormData) {
  const activityName = getFormString(formData, "activityName");
  const categoryName = getFormString(formData, "categoryName");
  const targetCount = getFormNumber(formData, "targetCount") ?? 1;

  if (!activityName || !categoryName) {
    return {
      status: "blocked" as const,
      message: "Activity name and category are required.",
    };
  }

  const { supabase, userId } = await requireAllowedUser("/onboarding");
  const result = await createReusableActivityForOnboarding({
    supabase,
    userId,
    activityName,
    categoryName,
    targetCount,
  });

  if (result.status !== "updated") {
    return {
      status: result.status === "blocked" ? ("blocked" as const) : ("error" as const),
      message: "message" in result ? result.message : "That activity could not be saved.",
    };
  }

  revalidatePath("/onboarding");
  revalidatePath("/week");
  revalidatePath("/today");

  return {
    status: "updated" as const,
    activity: {
      id: result.template.id,
      name: result.template.name,
      targetCount: result.template.targetCount,
      sortOrder: result.template.sortOrder,
      categoryId: result.category.id,
      categoryName: result.category.name,
      categorySortOrder: result.category.sortOrder,
    },
  };
}

export async function completeOnboardingAction() {
  const { supabase } = await requireAllowedUser("/onboarding");
  const result = await markOnboardingComplete(supabase);

  if (result.status !== "updated") {
    redirect("/onboarding?step=plan&error=complete");
  }

  revalidatePath("/onboarding");
  revalidatePath("/today");
  redirect("/today");
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

  return Number.isFinite(parsed) ? parsed : null;
}
