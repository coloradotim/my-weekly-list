import { getAllowedUserEmail } from "@/lib/auth/access";
import { appRoutes } from "@/lib/routes";

export type MagicLinkAuthClient = {
  auth: {
    signInWithOtp(options: {
      email: string;
      options: {
        emailRedirectTo: string;
        shouldCreateUser: false;
      };
    }): Promise<{ error: { message: string } | null }>;
    verifyOtp?(options: {
      token_hash: string;
      type: "email" | "magiclink";
    }): Promise<{ error: { message: string } | null }>;
  };
};

export type MagicLinkResult =
  | { status: "sent"; email: string; redirectTo: string }
  | { status: "missing-allowed-email" }
  | { status: "error" };

const allowedAuthNextPaths = new Set([
  "/",
  "/setup",
  ...appRoutes.map((route) => route.href),
]);

export function getSafeAuthNextPath(nextPath: string | null | undefined) {
  return nextPath && allowedAuthNextPaths.has(nextPath) ? nextPath : "/setup";
}

export function getMagicLinkRedirectUrl(origin: string, nextPath: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", getSafeAuthNextPath(nextPath));
  return callbackUrl.toString();
}

export type PastedMagicLinkResult =
  | { status: "callback"; callbackPath: string }
  | { status: "otp"; tokenHash: string; type: "email" | "magiclink"; nextPath: string }
  | { status: "invalid" };

export function parsePastedMagicLink({
  value,
  requestOrigin,
}: {
  value: string | null | undefined;
  requestOrigin: string;
}): PastedMagicLinkResult {
  const candidates = collectMagicLinkCandidates(value, requestOrigin);

  for (const url of candidates) {
    const callback = parseCallbackCandidate(url, requestOrigin);

    if (callback) {
      return callback;
    }

    const otp = parseOtpCandidate(url);

    if (otp) {
      return otp;
    }
  }

  return { status: "invalid" };
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

function collectMagicLinkCandidates(
  value: string | null | undefined,
  requestOrigin: string,
) {
  const candidates: URL[] = [];
  const queue = [value?.trim() ?? ""];
  const seen = new Set<string>();

  while (queue.length > 0 && seen.size < 12) {
    const candidate = queue.shift();

    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);

    let url: URL;

    try {
      url = new URL(candidate, requestOrigin);
    } catch {
      continue;
    }

    candidates.push(url);

    for (const key of ["redirect_to", "redirectTo", "url", "q"]) {
      const nested = url.searchParams.get(key);

      if (nested) {
        queue.push(nested);
      }
    }
  }

  return candidates;
}

function parseCallbackCandidate(
  url: URL,
  requestOrigin: string,
): Extract<PastedMagicLinkResult, { status: "callback" }> | null {
  if (url.origin !== requestOrigin || url.pathname !== "/auth/callback") {
    return null;
  }

  if (!url.searchParams.get("code")) {
    return null;
  }

  return { status: "callback", callbackPath: `${url.pathname}${url.search}` };
}

function parseOtpCandidate(
  url: URL,
): Extract<PastedMagicLinkResult, { status: "otp" }> | null {
  if (!url.pathname.endsWith("/auth/v1/verify")) {
    return null;
  }

  const tokenHash = url.searchParams.get("token_hash");

  if (!tokenHash) {
    return null;
  }

  const type = getSupportedOtpType(url.searchParams.get("type"));
  const redirectTo = url.searchParams.get("redirect_to");
  let nextPath = "/today";

  if (redirectTo) {
    try {
      nextPath = getSafeAuthNextPath(new URL(redirectTo).searchParams.get("next"));
    } catch {
      nextPath = "/today";
    }
  }

  return { status: "otp", tokenHash, type, nextPath };
}

function getSupportedOtpType(type: string | null): "email" | "magiclink" {
  return type === "email" ? "email" : "magiclink";
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
