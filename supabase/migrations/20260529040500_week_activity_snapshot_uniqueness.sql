-- Prevent duplicate template snapshots inside a single week during retries.
--
-- A previous production retry could create duplicate week_activities before
-- this uniqueness guard existed. Merge those duplicates first so the durable
-- constraint can be applied without losing any planned/done day-cell facts.

create temp table week_activity_duplicate_map on commit drop as
with ranked_week_activities as (
  select
    id,
    week_id,
    activity_template_id,
    first_value(id) over (
      partition by week_id, activity_template_id
      order by created_at, id
    ) as keep_id,
    row_number() over (
      partition by week_id, activity_template_id
      order by created_at, id
    ) as row_number
  from public.week_activities
  where activity_template_id is not null
)
select
  id as duplicate_id,
  keep_id
from ranked_week_activities
where row_number > 1;

update public.activity_day_cells as keeper_cell
set
  planned = keeper_cell.planned or duplicate_cell.planned,
  done = keeper_cell.done or duplicate_cell.done,
  updated_at = now()
from week_activity_duplicate_map as duplicate_map
join public.activity_day_cells as duplicate_cell
  on duplicate_cell.week_activity_id = duplicate_map.duplicate_id
where keeper_cell.week_activity_id = duplicate_map.keep_id
  and keeper_cell.cell_date = duplicate_cell.cell_date;

delete from public.activity_day_cells as duplicate_cell
using week_activity_duplicate_map as duplicate_map
where duplicate_cell.week_activity_id = duplicate_map.duplicate_id
  and exists (
    select 1
    from public.activity_day_cells as keeper_cell
    where keeper_cell.week_activity_id = duplicate_map.keep_id
      and keeper_cell.cell_date = duplicate_cell.cell_date
  );

update public.activity_day_cells as duplicate_cell
set
  week_activity_id = duplicate_map.keep_id,
  updated_at = now()
from week_activity_duplicate_map as duplicate_map
where duplicate_cell.week_activity_id = duplicate_map.duplicate_id;

delete from public.week_activities as duplicate_activity
using week_activity_duplicate_map as duplicate_map
where duplicate_activity.id = duplicate_map.duplicate_id;

create unique index if not exists week_activities_week_template_unique
  on public.week_activities (week_id, activity_template_id);
