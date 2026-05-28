import { PlaceholderCard } from "@/components/placeholder-card";
import { ScreenShell } from "@/components/screen-shell";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ThisWeekPage() {
  return (
    <ScreenShell
      eyebrow="This Week"
      title="This Week will hold the Monday-Sunday grid."
      description="The foundation includes a responsive placeholder for the paper-like weekly view. Real cells, targets, and status behavior are intentionally out of scope for this issue."
    >
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white/75 p-4">
        <div className="grid min-w-[620px] grid-cols-[1.5fr_repeat(7,1fr)] gap-2 text-sm">
          <div className="font-semibold text-stone-600">Activity</div>
          {days.map((day) => (
            <div key={day} className="text-center font-semibold text-stone-600">
              {day}
            </div>
          ))}
          {["Walk", "Read", "Family time"].map((activity) => (
            <div key={activity} className="contents">
              <div className="rounded-xl bg-paper px-3 py-3 font-medium">{activity}</div>
              {days.map((day) => (
                <div
                  key={`${activity}-${day}`}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-stone-200 bg-white"
                  aria-label={`${activity} ${day} placeholder cell`}
                >
                  <span className="h-4 w-4 rounded-full border border-mist" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <PlaceholderCard
        title="Mobile-friendly from the start"
        body="The weekly grid can scroll horizontally on small screens while later issues refine the real interaction model."
      />
    </ScreenShell>
  );
}
