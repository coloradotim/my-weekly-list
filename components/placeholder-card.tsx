type PlaceholderCardProps = {
  title: string;
  body: string;
};

export function PlaceholderCard({ title, body }: PlaceholderCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/75 p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
    </div>
  );
}
