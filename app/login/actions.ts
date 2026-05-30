"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAllowedUserEmail } from "@/lib/auth/access";
import {
  getMagicLinkRedirectUrlFromHeaders,
  getRequestOrigin,
  getSafeAuthNextPath,
  parsePastedMagicLink,
  sendOwnerMagicLink,
} from "@/lib/auth/magic-link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendOwnerMagicLinkAction(formData: FormData) {
  const nextPath = formData.get("next");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?magic=missing-config");
  }

  const requestHeaders = await headers();
  const redirectTo = getMagicLinkRedirectUrlFromHeaders({
    headers: requestHeaders,
    nextPath: typeof nextPath === "string" ? nextPath : null,
  });
  const result = await sendOwnerMagicLink({
    supabase,
    redirectTo,
  });

  if (result.status === "sent") {
    redirect("/login?magic=sent");
  }

  if (result.status === "missing-allowed-email") {
    redirect("/login?magic=missing-config");
  }

  redirect("/login?magic=error");
}

export async function completePastedMagicLinkAction(formData: FormData) {
  const pastedLink = formData.get("magicLink");
  const requestHeaders = await headers();
  const origin = getRequestOrigin(requestHeaders);
  const nextPath = formData.get("next");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?magic=missing-config");
  }

  const parsed = parsePastedMagicLink({
    value: typeof pastedLink === "string" ? pastedLink : null,
    requestOrigin: origin,
  });

  if (parsed.status === "callback") {
    redirect(parsed.callbackPath);
  }

  if (parsed.status === "token-hash") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: parsed.tokenHash,
      type: parsed.type,
    });

    if (!error) {
      redirect(parsed.nextPath);
    }
  }

  if (parsed.status === "token") {
    const email = getAllowedUserEmail();

    if (email) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: parsed.token,
        type: parsed.type,
      });

      if (!error) {
        redirect(parsed.nextPath);
      }
    }
  }

  const safeNext = getSafeAuthNextPath(typeof nextPath === "string" ? nextPath : null);
  redirect(`/login?magic=invalid-link&next=${encodeURIComponent(safeNext)}`);
}
