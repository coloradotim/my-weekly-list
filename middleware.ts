import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/install" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/icon-192.png" ||
    pathname === "/icon-512.png"
  ) {
    return response;
  }

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

  const access = await getDatabaseUserAccess({ supabase, user });

  if (access.status === "must-change-password") {
    if (pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    return response;
  }

  if (pathname === "/change-password") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (access.status !== "allowed") {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    const unauthorizedEmail = getUnauthorizedEmail(access);

    if (unauthorizedEmail) {
      unauthorizedUrl.searchParams.set("email", unauthorizedEmail);
    }
    return NextResponse.redirect(unauthorizedUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|unauthorized|auth).*)"],
};
