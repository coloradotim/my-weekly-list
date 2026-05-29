import { getAllowedUserEmail } from "@/lib/auth/access";

export type MagicLinkAuthClient = {
  auth: {
    signInWithOtp(options: {
      email: string;
      options: {
        emailRedirectTo: string;
        shouldCreateUser: false;
      };
    }): Promise<{ error: { message: string } | null }>;
  };
};

export type MagicLinkResult =
  | { status: "sent"; email: string; redirectTo: string }
  | { status: "missing-allowed-email" }
  | { status: "error" };

export function getSafeAuthNextPath(nextPath: string | null | undefined) {
  return nextPath?.startsWith("/") ? nextPath : "/setup";
}

export function getMagicLinkRedirectUrl(origin: string, nextPath: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", getSafeAuthNextPath(nextPath));
  return callbackUrl.toString();
}

export type MagicLinkRedirectHeaders = Pick<Headers, "get">;

export function getMagicLinkRedirectUrlFromHeaders({
  headers,
  nextPath,
}: {
  headers: MagicLinkRedirectHeaders;
  nextPath: string | null | undefined;
}) {
  return getMagicLinkRedirectUrl(
    getRequestOrigin(headers),
    getSafeAuthNextPath(nextPath),
  );
}

export function getRequestOrigin(headers: MagicLinkRedirectHeaders) {
  const explicitOrigin = getFirstHeaderValue(headers.get("origin"));

  if (explicitOrigin) {
    return explicitOrigin;
  }

  const host =
    getFirstHeaderValue(headers.get("x-forwarded-host")) ??
    getFirstHeaderValue(headers.get("host")) ??
    "localhost:3000";
  const forwardedProto = getFirstHeaderValue(headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${proto}://${host}`;
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function maskEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return "";
  }

  const [localPart, domain] = normalizedEmail.split("@");

  if (!localPart || !domain) {
    return normalizedEmail;
  }

  const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));
  return `${visiblePrefix}${"*".repeat(Math.max(3, localPart.length - visiblePrefix.length))}@${domain}`;
}

export async function sendOwnerMagicLink({
  supabase,
  origin,
  redirectTo,
  nextPath,
  allowedEmail = getAllowedUserEmail(),
}: {
  supabase: MagicLinkAuthClient;
  origin?: string;
  redirectTo?: string;
  nextPath?: string | null;
  allowedEmail?: string;
}): Promise<MagicLinkResult> {
  if (!allowedEmail) {
    return { status: "missing-allowed-email" };
  }

  const emailRedirectTo =
    redirectTo ??
    getMagicLinkRedirectUrl(
      origin ?? "http://localhost:3000",
      getSafeAuthNextPath(nextPath),
    );
  const { error } = await supabase.auth.signInWithOtp({
    email: allowedEmail,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { status: "error" };
  }

  return {
    status: "sent",
    email: allowedEmail,
    redirectTo: emailRedirectTo,
  };
}
