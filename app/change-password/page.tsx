import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/password-change-form";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ChangePasswordPageProps = {
  searchParams: Promise<{
    password?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: ChangePasswordPageProps) {
  const { password } = await searchParams;
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
    const params = new URLSearchParams();
    const unauthorizedEmail = getUnauthorizedEmail(access);

    if (unauthorizedEmail) {
      params.set("email", unauthorizedEmail);
    }

    redirect(`/unauthorized?${params.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 sm:px-6">
      <PasswordChangeForm status={password} />
    </main>
  );
}
