"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAllowedUser } from "@/lib/auth/access";
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

  const access = checkAllowedUser(user.email);

  if (access.status !== "allowed") {
    const params = new URLSearchParams();
    if (access.status === "unauthorized") {
      params.set("email", access.email);
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
