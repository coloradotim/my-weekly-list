import { NextResponse, type NextRequest } from "next/server";
import { checkAllowedUser } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next?.startsWith("/") ? next : "/";
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
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

  return NextResponse.redirect(new URL("/login", request.url));
}
