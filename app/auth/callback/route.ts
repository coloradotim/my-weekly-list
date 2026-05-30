import { NextResponse, type NextRequest } from "next/server";
import { checkAllowedUser } from "@/lib/auth/access";
import { getSafeAuthNextPath } from "@/lib/auth/magic-link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = getSafeAuthNextPath(next);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("magic", "callback-error");
      loginUrl.searchParams.set("next", safeNext);
      return NextResponse.redirect(loginUrl);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = checkAllowedUser(user?.email);

  if (access.status === "allowed") {
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  if (access.status === "unauthorized") {
    await supabase.auth.signOut();
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    unauthorizedUrl.searchParams.set("email", access.email);
    return NextResponse.redirect(unauthorizedUrl);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("magic", code ? "callback-error" : "missing-session");
  loginUrl.searchParams.set("next", safeNext);
  return NextResponse.redirect(loginUrl);
}
