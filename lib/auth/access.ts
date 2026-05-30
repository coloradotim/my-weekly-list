import { appRoutes } from "@/lib/routes";

export type AuthAccess =
  | { status: "allowed"; email: string }
  | { status: "must-change-password"; email: string }
  | { status: "unauthorized"; email: string }
  | { status: "missing-profile"; email: string };

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

export type AccessProfileClient = {
  from(table: "profiles"): {
    select(columns: string): {
      eq(
        column: "id",
        value: string,
      ): {
        maybeSingle(): PromiseLike<{
          data: {
            email: string | null;
            is_allowed: boolean | null;
            must_change_password: boolean | null;
          } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

const allowedAuthNextPaths = new Set([
  "/",
  "/setup",
  "/change-password",
  ...appRoutes.map((route) => route.href),
]);

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getSafeAuthNextPath(nextPath: string | null | undefined) {
  return nextPath && allowedAuthNextPaths.has(nextPath) ? nextPath : "/";
}

export async function getDatabaseUserAccess({
  supabase,
  user,
}: {
  supabase: unknown;
  user: AuthenticatedUser;
}): Promise<AuthAccess> {
  const accessClient = supabase as AccessProfileClient;
  const fallbackEmail = normalizeEmail(user.email);
  const { data: profile, error } = await accessClient
    .from("profiles")
    .select("email,is_allowed,must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return { status: "missing-profile", email: fallbackEmail };
  }

  const email = normalizeEmail(profile.email) || fallbackEmail;

  if (!profile.is_allowed) {
    return { status: "unauthorized", email };
  }

  if (profile.must_change_password) {
    return { status: "must-change-password", email };
  }

  return { status: "allowed", email };
}

export function getUnauthorizedEmail(access: AuthAccess) {
  return access.status === "unauthorized" || access.status === "missing-profile"
    ? access.email
    : "";
}
