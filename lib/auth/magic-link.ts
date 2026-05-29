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
  nextPath,
  allowedEmail = getAllowedUserEmail(),
}: {
  supabase: MagicLinkAuthClient;
  origin: string;
  nextPath?: string | null;
  allowedEmail?: string;
}): Promise<MagicLinkResult> {
  if (!allowedEmail) {
    return { status: "missing-allowed-email" };
  }

  const redirectTo = getMagicLinkRedirectUrl(origin, getSafeAuthNextPath(nextPath));
  const { error } = await supabase.auth.signInWithOtp({
    email: allowedEmail,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { status: "error" };
  }

  return {
    status: "sent",
    email: allowedEmail,
    redirectTo,
  };
}
