import Link from "next/link";

export const metadata = {
  title: "Install My Weekly List",
};

const steps = [
  "Open this page in Safari.",
  "Tap Share.",
  "Tap Add to Home Screen.",
  "Launch My Weekly List from the Home Screen icon.",
];

export default function InstallPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-5 py-10 sm:px-6">
      <section className="w-full rounded-2xl border border-stone-200 bg-white/85 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">Install</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
          Install My Weekly List
        </h1>
        <ol className="mt-5 space-y-3 text-base leading-7 text-stone-700">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-semibold text-clay">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow"
        >
          Open the app
        </Link>
      </section>
    </main>
  );
}
