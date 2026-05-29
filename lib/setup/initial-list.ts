export type SetupCountResult = {
  count: number | null;
  error: { message: string } | null;
};

export type SetupCountQuery = {
  eq(column: "is_active", value: true): Promise<SetupCountResult>;
};

export type SetupCountClient = {
  from(table: "categories" | "activity_templates"): {
    select(columns: "id", options: { count: "exact"; head: true }): SetupCountQuery;
  };
};

export type InitialListSetupState =
  | {
      status: "seeded";
      activeCategoryCount: number;
      activeActivityTemplateCount: number;
    }
  | {
      status: "not-seeded";
      activeCategoryCount: number;
      activeActivityTemplateCount: number;
    }
  | {
      status: "error";
    };

export type SetupNotice =
  | {
      tone: "success";
      title: "Your weekly list is ready";
      body: "Your starter categories and activities have been created.";
    }
  | {
      tone: "error";
      title: "That did not go through";
      body: "Your starter list was not created just now. Please try again in a moment.";
    }
  | null;

export function getInitialListSetupStateFromCounts({
  activeCategoryCount,
  activeActivityTemplateCount,
}: {
  activeCategoryCount: number;
  activeActivityTemplateCount: number;
}): InitialListSetupState {
  if (activeCategoryCount > 0 && activeActivityTemplateCount > 0) {
    return {
      status: "seeded",
      activeCategoryCount,
      activeActivityTemplateCount,
    };
  }

  return {
    status: "not-seeded",
    activeCategoryCount,
    activeActivityTemplateCount,
  };
}

export function getSetupNotice(seedParam: string | string[] | undefined): SetupNotice {
  const seed = Array.isArray(seedParam) ? seedParam[0] : seedParam;

  if (seed === "created") {
    return {
      tone: "success",
      title: "Your weekly list is ready",
      body: "Your starter categories and activities have been created.",
    };
  }

  if (seed === "error") {
    return {
      tone: "error",
      title: "That did not go through",
      body: "Your starter list was not created just now. Please try again in a moment.",
    };
  }

  return null;
}

export async function getInitialListSetupState(
  supabase: SetupCountClient,
): Promise<InitialListSetupState> {
  const [categories, activityTemplates] = await Promise.all([
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("activity_templates")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  if (categories.error || activityTemplates.error) {
    return { status: "error" };
  }

  return getInitialListSetupStateFromCounts({
    activeCategoryCount: categories.count ?? 0,
    activeActivityTemplateCount: activityTemplates.count ?? 0,
  });
}
