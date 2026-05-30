"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function seedInitialWeeklyListAction() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/setup");
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

  const { error } = await supabase.rpc("seed_initial_weekly_list");

  if (error) {
    redirect("/setup?seed=error");
  }

  revalidatePath("/setup");
  redirect("/setup?seed=created");
}
