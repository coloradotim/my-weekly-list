import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCurrentWeekFromTemplates,
  getTodayDateOnly,
  loadThisWeek,
  type ThisWeekViewModel,
} from "@/lib/week/current";
import type { DateOnly } from "@/lib/week/date";

export type OnboardingCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type OnboardingActivity = {
  id: string;
  name: string;
  targetCount: number;
  sortOrder: number;
  categoryId: string;
  categoryName: string;
  categorySortOrder: number;
};

export type OnboardingLoadState =
  | { status: "first-category" }
  | {
      status: "activities";
      categories: OnboardingCategory[];
      activities: OnboardingActivity[];
    }
  | {
      status: "plan";
      categories: OnboardingCategory[];
      activities: OnboardingActivity[];
      view: ThisWeekViewModel;
    }
  | {
      status: "guide";
      categories: OnboardingCategory[];
      activities: OnboardingActivity[];
    }
  | { status: "complete" }
  | { status: "error"; message: string };

type OnboardingProfileRow = {
  onboarding_completed_at: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number;
};

type TemplateRow = {
  id: string;
  category_id: string;
  name: string;
  default_target_count: number;
  sort_order: number;
  categories:
    | {
        id: string;
        name: string;
        sort_order: number;
      }
    | {
        id: string;
        name: string;
        sort_order: number;
      }[]
    | null;
};

export function getOnboardingStepFromFacts({
  onboardingCompleted,
  activeCategoryCount,
  activeActivityCount,
}: {
  onboardingCompleted: boolean;
  activeCategoryCount: number;
  activeActivityCount: number;
}) {
  if (onboardingCompleted) {
    return "complete" as const;
  }

  if (activeCategoryCount === 0) {
    return "first-category" as const;
  }

  if (activeActivityCount === 0) {
    return "activities" as const;
  }

  return "plan" as const;
}

export async function loadOnboardingState({
  supabase,
  userId,
  requestedStep,
  today = getTodayDateOnly(),
}: {
  supabase: SupabaseClient;
  userId: string;
  requestedStep?: string | null;
  today?: DateOnly;
}): Promise<OnboardingLoadState> {
  const profile = await getOnboardingProfile(supabase, userId);

  if (profile.status === "error") {
    return profile;
  }

  const [categoriesResult, activitiesResult] = await Promise.all([
    getOnboardingCategories(supabase),
    getOnboardingActivities(supabase),
  ]);

  if (categoriesResult.status === "error") {
    return categoriesResult;
  }

  if (activitiesResult.status === "error") {
    return activitiesResult;
  }

  const step = getOnboardingStepFromFacts({
    onboardingCompleted: Boolean(profile.onboardingCompletedAt),
    activeCategoryCount: categoriesResult.categories.length,
    activeActivityCount: activitiesResult.activities.length,
  });

  if (step === "complete") {
    return { status: "complete" };
  }

  if (step === "first-category") {
    return { status: "first-category" };
  }

  if (step === "activities" || (requestedStep !== "plan" && requestedStep !== "guide")) {
    return {
      status: "activities",
      categories: categoriesResult.categories,
      activities: activitiesResult.activities,
    };
  }

  const ensured = await createCurrentWeekFromTemplates({ supabase, userId, today });

  if (ensured.status === "error") {
    return { status: "error", message: ensured.message };
  }

  if (ensured.status === "needs-setup") {
    return {
      status: "activities",
      categories: categoriesResult.categories,
      activities: activitiesResult.activities,
    };
  }

  const week = await loadThisWeek(supabase, today);

  if (week.status === "ready") {
    if (requestedStep === "guide") {
      return {
        status: "guide",
        categories: categoriesResult.categories,
        activities: activitiesResult.activities,
      };
    }

    return {
      status: "plan",
      categories: categoriesResult.categories,
      activities: activitiesResult.activities,
      view: week.view,
    };
  }

  return {
    status: "error",
    message:
      week.status === "error"
        ? week.message
        : "Your weekly list could not be opened for planning just now.",
  };
}

export async function isOnboardingNeeded({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const profile = await getOnboardingProfile(supabase, userId);

  if (profile.status === "error") {
    return { status: "error" as const, message: profile.message };
  }

  if (profile.onboardingCompletedAt) {
    return { status: "ready" as const };
  }

  const [categoriesResult, activitiesResult] = await Promise.all([
    getOnboardingCategories(supabase),
    getOnboardingActivities(supabase),
  ]);

  if (categoriesResult.status === "error") {
    return categoriesResult;
  }

  if (activitiesResult.status === "error") {
    return activitiesResult;
  }

  const step = getOnboardingStepFromFacts({
    onboardingCompleted: false,
    activeCategoryCount: categoriesResult.categories.length,
    activeActivityCount: activitiesResult.activities.length,
  });

  return step === "plan" ? { status: "ready" as const } : { status: "needed" as const };
}

export async function markOnboardingComplete(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("mark_own_onboarding_complete");

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return { status: "updated" as const };
}

async function getOnboardingProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    onboardingCompletedAt:
      (data as OnboardingProfileRow | null)?.onboarding_completed_at ?? null,
  };
}

async function getOnboardingCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("is_active", true);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    categories: ((data ?? []) as CategoryRow[])
      .map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order,
      }))
      .toSorted(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
      ),
  };
}

async function getOnboardingActivities(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("activity_templates")
    .select(
      "id, category_id, name, default_target_count, sort_order, categories(id, name, sort_order)",
    )
    .eq("is_active", true);

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  return {
    status: "success" as const,
    activities: ((data ?? []) as TemplateRow[])
      .map(toOnboardingActivity)
      .filter((activity): activity is OnboardingActivity => Boolean(activity))
      .toSorted(
        (left, right) =>
          left.categorySortOrder - right.categorySortOrder ||
          left.categoryName.localeCompare(right.categoryName) ||
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name),
      ),
  };
}

function toOnboardingActivity(row: TemplateRow): OnboardingActivity | null {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;

  if (!category) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    targetCount: row.default_target_count,
    sortOrder: row.sort_order,
    categoryId: row.category_id,
    categoryName: category.name,
    categorySortOrder: category.sort_order,
  };
}
