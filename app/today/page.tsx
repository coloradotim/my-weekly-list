import { PlaceholderCard } from "@/components/placeholder-card";
import { ScreenShell } from "@/components/screen-shell";

export default function TodayPage() {
  return (
    <ScreenShell
      eyebrow="Today"
      title="Today will be the quick daily view."
      description="This placeholder keeps the primary iPhone workflow front and center without implementing real activity, done, move, or week behavior yet."
      primaryHref="/week"
      primaryLabel="View week"
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <PlaceholderCard
          title="Planned for today"
          body="Future work will show today's planned activities, weekly progress, and fast done actions here."
        />
        <PlaceholderCard
          title="Still possible"
          body="Later issues can add gentle prompts for unresolved planned items without shame or heavy warning styling."
        />
      </div>
    </ScreenShell>
  );
}
