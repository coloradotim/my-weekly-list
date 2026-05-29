import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { checkAllowedUser } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    magic?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, magic } = await searchParams;
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && checkAllowedUser(user.email).status === "allowed") {
      redirect(next?.startsWith("/") ? next : "/");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <LoginForm nextPath={next} status={magic} />
    </main>
  );
}
