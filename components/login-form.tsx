"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseConfig } from "@/lib/supabase/env";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [message, setMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const config = getSupabaseConfig();
  const isConfigured = config.status === "configured";

  async function signInWithGoogle() {
    if (!isConfigured) {
      setMessage("Supabase auth is not configured yet. Add the env vars and restart.");
      return;
    }

    setIsSigningIn(true);
    setMessage("");

    try {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      if (nextPath?.startsWith("/")) {
        redirectUrl.searchParams.set("next", nextPath);
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl.toString(),
        },
      });

      if (error) {
        setMessage("Google sign-in did not start. Check Supabase setup and try again.");
        setIsSigningIn(false);
      }
    } catch {
      setMessage("Google sign-in is unavailable until Supabase env vars are configured.");
      setIsSigningIn(false);
    }
  }

  return (
    <section className="w-full rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-soft sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-clay">
        Private access
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
        Sign in to My Weekly List.
      </h1>
      <p className="mt-3 leading-7 text-stone-700">
        This app is private. Sign in with Google using the allowed account to open the
        weekly planning screens.
      </p>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={isSigningIn || !isConfigured}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
      >
        {isSigningIn ? "Opening Google..." : "Continue with Google"}
      </button>
      {!isConfigured ? (
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Local auth setup is missing. Add the Supabase env vars from `.env.example`, then
          restart the dev server.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm leading-6 text-stone-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
