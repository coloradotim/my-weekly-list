import { PlaceholderCard } from "@/components/placeholder-card";
import { ScreenShell } from "@/components/screen-shell";

export default function ReviewPage() {
  return (
    <ScreenShell
      eyebrow="Review"
      title="Review will close the loop gently."
      description="This screen is a placeholder for future weekly summaries, target counts, and the close-week flow."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PlaceholderCard
          title="Weekly summary"
          body="Later issues will compare done-day counts with weekly targets for each activity."
        />
        <PlaceholderCard
          title="Close week"
          body="Closed-week locking and review decisions are intentionally deferred until the review issue."
        />
      </div>
    </ScreenShell>
  );
}
