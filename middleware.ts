import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkAllowedUser } from "@/lib/auth/access";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const config = getSupabaseConfig();

  if (config.status === "missing") {
    return response;
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const access = checkAllowedUser(user.email);

  if (access.status !== "allowed") {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    if (access.status === "unauthorized") {
      unauthorizedUrl.searchParams.set("email", access.email);
    }
    return NextResponse.redirect(unauthorizedUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|unauthorized|auth).*)"],
};
