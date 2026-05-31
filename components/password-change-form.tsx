"use client";

import { useState } from "react";
import { changePasswordAction } from "@/app/change-password/actions";

type PasswordChangeFormProps = {
  status?: string;
};

export function PasswordChangeForm({ status }: PasswordChangeFormProps) {
  const [clientError, setClientError] = useState("");
  const message = clientError || getPasswordStatusMessage(status);

  return (
    <section className="w-full rounded-2xl border border-line bg-surface/80 p-6 shadow-soft sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-clay">
        Password needed
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
        Choose a new password.
      </h1>
      <p className="mt-3 leading-7 text-secondary">
        This temporary password worked. Pick your own password before using the app.
      </p>
      <form
        action={changePasswordAction}
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          const form = event.currentTarget;
          const password = new FormData(form).get("password");
          const confirmPassword = new FormData(form).get("confirmPassword");

          if (password !== confirmPassword) {
            event.preventDefault();
            setClientError("Those passwords do not match.");
          }
        }}
      >
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-wide text-clay">
            New password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-2 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-base text-ink outline-none transition placeholder:text-muted focus:border-clay focus:ring-2 focus:ring-clay/25"
            onChange={() => setClientError("")}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-wide text-clay">
            Confirm new password
          </span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-2 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-base text-ink outline-none transition placeholder:text-muted focus:border-clay focus:ring-2 focus:ring-clay/25"
            onChange={() => setClientError("")}
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-paper sm:w-auto"
        >
          Change password
        </button>
      </form>
      {message ? (
        <p role="status" className="mt-4 text-sm leading-6 text-secondary">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function getPasswordStatusMessage(status: string | undefined) {
  if (status === "mismatch") {
    return "Those passwords do not match.";
  }

  if (status === "invalid") {
    return "Use a password with at least 8 characters.";
  }

  if (status === "error" || status === "profile-error") {
    return "That password could not be saved just now. Try again.";
  }

  return "";
}
