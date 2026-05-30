"use server";

import { redirect } from "next/navigation";
import {
  getDatabaseUserAccess,
  getSafeAuthNextPath,
  getUnauthorizedEmail,
} from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInWithPasswordAction(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");
  const nextPath = getSafeAuthNextPath(getFormString(formData, "next"));
  const failureUrl = getLoginFailureUrl({ email, nextPath });
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?login=missing-config");
  }

  if (!email || !password) {
    redirect(failureUrl);
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(failureUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(failureUrl);
  }

  const access = await getDatabaseUserAccess({ supabase, user });

  if (access.status === "must-change-password") {
    redirect("/change-password");
  }

  if (access.status !== "allowed") {
    await supabase.auth.signOut();
    const unauthorizedUrl = new URLSearchParams();
    const unauthorizedEmail = getUnauthorizedEmail(access);

    if (unauthorizedEmail) {
      unauthorizedUrl.set("email", unauthorizedEmail);
    }

    redirect(`/unauthorized?${unauthorizedUrl.toString()}`);
  }

  redirect(nextPath);
}

function getLoginFailureUrl({ email, nextPath }: { email: string; nextPath: string }) {
  const params = new URLSearchParams({
    login: "error",
    next: nextPath,
  });

  if (email) {
    params.set("email", email);
  }

  return `/login?${params.toString()}`;
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
