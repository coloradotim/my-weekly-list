import { PlaceholderCard } from "@/components/placeholder-card";
import { ScreenShell } from "@/components/screen-shell";

const areas = [
  {
    title: "Fast daily check-ins",
    body: "The Today placeholder keeps the mobile entry point clear for quick marks later.",
  },
  {
    title: "Paper-like weekly shape",
    body: "The This Week placeholder reserves space for the Monday-Sunday grid without adding real week logic yet.",
  },
  {
    title: "Planning and review",
    body: "Plan and Review routes are present so navigation can settle before behavior is added.",
  },
];

export default function HomePage() {
  return (
    <ScreenShell
      eyebrow="Private weekly ritual"
      title="A calm place to return to the week."
      description="This foundation sets up the responsive app shell for My Weekly List. The real planning, completion, review, auth, and data behavior will arrive in later issues."
      primaryHref="/today"
      primaryLabel="Open Today"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {areas.map((area) => (
          <PlaceholderCard key={area.title} title={area.title} body={area.body} />
        ))}
      </div>
    </ScreenShell>
  );
}
