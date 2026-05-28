import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { appRoutes } from "@/lib/routes";
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

  return (
    <>
      <header className="border-b border-stone-200/80 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="w-fit text-xl font-semibold tracking-normal">
              My Weekly List
            </Link>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="min-h-10 rounded-full border border-stone-200 bg-white/70 px-4 text-sm font-medium text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-paper"
              >
                Sign out
              </button>
            </form>
          </div>
          <nav aria-label="Main navigation">
            <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {appRoutes.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white/70 px-4 text-sm font-medium text-stone-700 transition hover:border-clay hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-paper sm:justify-start"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
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
