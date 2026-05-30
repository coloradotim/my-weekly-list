import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getDatabaseUserAccess, getSafeAuthNextPath } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    login?: string;
    email?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, login, email } = await searchParams;
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const access = await getDatabaseUserAccess({ supabase, user });

      if (access.status === "must-change-password") {
        redirect("/change-password");
      }

      if (access.status === "allowed") {
        redirect(getSafeAuthNextPath(next));
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <LoginForm email={email} nextPath={next} status={login} />
    </main>
  );
}
