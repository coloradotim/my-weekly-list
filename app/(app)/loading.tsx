export default function AppLoading() {
  return (
    <section className="space-y-3" aria-label="Loading My Weekly List" aria-busy="true">
      <div className="rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft">
        <div className="h-3 w-20 rounded-full bg-clay/20" />
        <div className="mt-3 h-7 w-48 rounded-full bg-stone-200/70" />
        <div className="mt-2 h-4 w-36 rounded-full bg-stone-100" />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
        <div className="h-4 w-32 rounded-full bg-stone-200/80" />
        <div className="mt-4 space-y-3">
          <LoadingRow />
          <LoadingRow />
          <LoadingRow />
        </div>
      </div>
    </section>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded-full bg-stone-200/80" />
        <div className="h-3 w-20 rounded-full bg-stone-100" />
      </div>
      <div className="h-10 w-24 rounded-full bg-meadow/15" />
    </div>
  );
}
