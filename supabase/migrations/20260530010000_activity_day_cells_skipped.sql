-- Persist intentional same-day Skip decisions without erasing the original plan.

alter table public.activity_day_cells
  add column if not exists skipped boolean not null default false;

alter table public.activity_day_cells
  drop constraint if exists activity_day_cells_done_not_skipped;

alter table public.activity_day_cells
  add constraint activity_day_cells_done_not_skipped
  check (not (done and skipped));

alter table public.activity_day_cells
  drop constraint if exists activity_day_cells_skipped_requires_planned;

alter table public.activity_day_cells
  add constraint activity_day_cells_skipped_requires_planned
  check (not skipped or planned);
