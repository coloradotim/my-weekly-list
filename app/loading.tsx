export default function RootLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-5 py-10">
      <section
        className="w-full px-2"
        aria-label="Opening My Weekly List"
        aria-busy="true"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          My Weekly List
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
          Opening Today...
        </h1>
      </section>
    </main>
  );
}
