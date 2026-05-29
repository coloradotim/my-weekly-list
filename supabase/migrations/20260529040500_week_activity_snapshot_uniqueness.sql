-- Prevent duplicate template snapshots inside a single week during retries.

create unique index if not exists week_activities_week_template_unique
  on public.week_activities (week_id, activity_template_id);
