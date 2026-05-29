import { sendOwnerMagicLinkAction } from "@/app/login/actions";
import { getAllowedUserEmail } from "@/lib/auth/access";
import { maskEmail } from "@/lib/auth/magic-link";
import { getSupabaseConfig } from "@/lib/supabase/env";

type LoginFormProps = {
  nextPath?: string;
  status?: string;
};

export function LoginForm({ nextPath, status }: LoginFormProps) {
  const config = getSupabaseConfig();
  const isConfigured = config.status === "configured";
  const maskedEmail = maskEmail(getAllowedUserEmail());
  const message = getLoginStatusMessage(status);

  return (
    <section className="w-full rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-soft sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-clay">
        Private access
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
        Sign in to My Weekly List.
      </h1>
      <p className="mt-3 leading-7 text-stone-700">
        This app is private. A sign-in link can be sent only to the configured owner
        email.
      </p>
      <form action={sendOwnerMagicLinkAction} className="mt-6">
        {nextPath?.startsWith("/") ? (
          <input type="hidden" name="next" value={nextPath} />
        ) : null}
        <button
          type="submit"
          disabled={!isConfigured}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
        >
          Email me a sign-in link
        </button>
      </form>
      {maskedEmail ? (
        <p className="mt-3 text-sm leading-6 text-stone-600">
          A private sign-in link will be sent to {maskedEmail}.
        </p>
      ) : null}
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

function getLoginStatusMessage(status: string | undefined) {
  if (status === "sent") {
    return "Check your email for a private sign-in link.";
  }

  if (status === "error") {
    return "The sign-in link could not be sent just now. Confirm the owner user exists in Supabase and try again.";
  }

  if (status === "missing-config") {
    return "Auth setup is missing. Add the Supabase env vars and allowed owner email, then restart.";
  }

  return "";
}
