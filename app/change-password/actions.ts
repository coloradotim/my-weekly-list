"use server";

import { redirect } from "next/navigation";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function changePasswordAction(formData: FormData) {
  const password = getFormString(formData, "password");
  const confirmPassword = getFormString(formData, "confirmPassword");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?login=missing-config");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fchange-password");
  }

  const access = await getDatabaseUserAccess({ supabase, user });

  if (access.status === "allowed") {
    redirect("/");
  }

  if (access.status !== "must-change-password") {
    await supabase.auth.signOut();
    const params = new URLSearchParams();
    const unauthorizedEmail = getUnauthorizedEmail(access);

    if (unauthorizedEmail) {
      params.set("email", unauthorizedEmail);
    }

    redirect(`/unauthorized?${params.toString()}`);
  }

  if (!password || password.length < 8) {
    redirect("/change-password?password=invalid");
  }

  if (password !== confirmPassword) {
    redirect("/change-password?password=mismatch");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  if (updateError) {
    redirect("/change-password?password=error");
  }

  const { error: profileError } = await supabase.rpc(
    "clear_own_password_change_required",
  );

  if (profileError) {
    redirect("/change-password?password=profile-error");
  }

  redirect("/");
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
