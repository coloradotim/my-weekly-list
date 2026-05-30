import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { checkAllowedUser } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <AuthSetupMissing />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const access = checkAllowedUser(user.email);

  if (access.status !== "allowed") {
    const params = new URLSearchParams();
    if (access.status === "unauthorized") {
      params.set("email", access.email);
    }
    redirect(`/unauthorized?${params.toString()}`);
  }

  return <AppShell>{children}</AppShell>;
}

function AuthSetupMissing() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          Setup needed
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
          Supabase auth is not configured yet.
        </h1>
        <p className="mt-3 leading-7 text-stone-700">
          Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
          `ALLOWED_USER_EMAIL` to your local environment, then restart the dev server.
        </p>
      </section>
    </main>
  );
}
