import Link from "next/link";

type ScreenShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  children: React.ReactNode;
};

export function ScreenShell({
  title,
  eyebrow,
  description,
  primaryHref,
  primaryLabel,
  children,
}: ScreenShellProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          {eyebrow}
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
              {title}
            </h1>
            <p className="text-base leading-7 text-stone-700">{description}</p>
          </div>
          {primaryHref && primaryLabel ? (
            <Link
              href={primaryHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white"
            >
              {primaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
