export default function RootLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-5 py-10">
      <section
        className="w-full rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-soft"
        aria-label="Opening My Weekly List"
        aria-busy="true"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          My Weekly List
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
          Opening your week...
        </h1>
        <div className="mt-5 space-y-3">
          <div className="h-3 w-4/5 rounded-full bg-stone-200" />
          <div className="h-3 w-2/3 rounded-full bg-stone-100" />
          <div className="h-11 w-full rounded-full bg-meadow/15" />
        </div>
      </section>
    </main>
  );
}
