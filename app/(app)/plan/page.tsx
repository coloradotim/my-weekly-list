import { PlaceholderCard } from "@/components/placeholder-card";
import { ScreenShell } from "@/components/screen-shell";

export default function PlanPage() {
  return (
    <ScreenShell
      eyebrow="Plan"
      title="Plan will shape the next weekly list."
      description="This placeholder reserves the draft planning area without adding category editing, target editing, copy-week behavior, or data persistence yet."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PlaceholderCard
          title="Draft week"
          body="Future work will support planning Monday through Sunday before a week becomes active."
        />
        <PlaceholderCard
          title="List structure"
          body="Activity and category changes belong to later issues that include data modeling and product rules."
        />
      </div>
    </ScreenShell>
  );
}
