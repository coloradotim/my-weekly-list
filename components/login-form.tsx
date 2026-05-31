import { signInWithPasswordAction } from "@/app/login/actions";
import { getSupabaseConfig } from "@/lib/supabase/env";

type LoginFormProps = {
  email?: string;
  nextPath?: string;
  status?: string;
};

export function LoginForm({ email = "", nextPath, status }: LoginFormProps) {
  const config = getSupabaseConfig();
  const isConfigured = config.status === "configured";
  const message = getLoginStatusMessage(status);

  return (
    <section className="w-full rounded-2xl border border-line bg-surface/80 p-6 shadow-soft sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-clay">
        Private access
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
        Sign in to My Weekly List.
      </h1>
      <p className="mt-3 leading-7 text-secondary">
        This app is private. Sign in with the email and password Tim gave you.
      </p>
      <form action={signInWithPasswordAction} className="mt-6 space-y-4">
        {nextPath?.startsWith("/") ? (
          <input type="hidden" name="next" value={nextPath} />
        ) : null}
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-wide text-clay">
            Email
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={email}
            required
            className="mt-2 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-base text-ink outline-none transition placeholder:text-muted focus:border-clay focus:ring-2 focus:ring-clay/25"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-wide text-clay">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-base text-ink outline-none transition placeholder:text-muted focus:border-clay focus:ring-2 focus:ring-clay/25"
          />
        </label>
        <button
          type="submit"
          disabled={!isConfigured}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-paper disabled:cursor-not-allowed disabled:bg-disabled sm:w-auto"
        >
          Sign in
        </button>
      </form>
      {!isConfigured ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          Local auth setup is missing. Add the Supabase env vars from `.env.example`, then
          restart the dev server.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm leading-6 text-secondary">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function getLoginStatusMessage(status: string | undefined) {
  if (status === "error") {
    return "Could not sign in with that email and password.";
  }

  if (status === "missing-config") {
    return "Auth setup is missing. Add the Supabase env vars, then restart.";
  }

  return "";
}
