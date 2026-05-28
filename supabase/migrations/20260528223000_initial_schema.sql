-- My Weekly List initial schema, RLS, and user-owned seed helper.

create extension if not exists pgcrypto;

do $$
begin
  create type public.week_status as enum ('draft', 'active', 'needs_review', 'closed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  week_end_date date generated always as (week_start_date + 6) stored,
  status public.week_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weeks_start_on_monday check (extract(isodow from week_start_date) = 1),
  constraint weeks_one_per_user_start unique (user_id, week_start_date)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists categories_user_name_unique
  on public.categories (user_id, lower(name));

create table if not exists public.activity_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  default_target_count integer not null default 1,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_templates_name_not_blank check (length(trim(name)) > 0),
  constraint activity_templates_target_nonnegative check (default_target_count >= 0)
);

create unique index if not exists activity_templates_user_category_name_unique
  on public.activity_templates (user_id, category_id, lower(name));

create table if not exists public.week_activities (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  activity_template_id uuid references public.activity_templates(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null,
  category_sort_order integer not null default 0,
  activity_name text not null,
  target_count integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint week_activities_category_name_not_blank check (length(trim(category_name)) > 0),
  constraint week_activities_activity_name_not_blank check (length(trim(activity_name)) > 0),
  constraint week_activities_target_nonnegative check (target_count >= 0)
);

create index if not exists week_activities_week_sort_idx
  on public.week_activities (week_id, category_sort_order, sort_order);

create table if not exists public.activity_day_cells (
  id uuid primary key default gen_random_uuid(),
  week_activity_id uuid not null references public.week_activities(id) on delete cascade,
  cell_date date not null,
  planned boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_day_cells_unique_day unique (week_activity_id, cell_date)
);

create index if not exists activity_day_cells_activity_date_idx
  on public.activity_day_cells (week_activity_id, cell_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_closed_week_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'closed' then
    raise exception 'Closed weeks are view-only.';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_closed_week_activity_changes()
returns trigger
language plpgsql
as $$
declare
  current_week_id uuid;
  current_status public.week_status;
begin
  current_week_id = coalesce(new.week_id, old.week_id);

  select status into current_status
  from public.weeks
  where id = current_week_id;

  if current_status = 'closed' then
    raise exception 'Closed weeks are view-only.';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.validate_activity_day_cell()
returns trigger
language plpgsql
as $$
declare
  week_status public.week_status;
  start_date date;
  end_date date;
begin
  select w.status, w.week_start_date, w.week_end_date
    into week_status, start_date, end_date
  from public.week_activities wa
  join public.weeks w on w.id = wa.week_id
  where wa.id = coalesce(new.week_activity_id, old.week_activity_id);

  if week_status = 'closed' then
    raise exception 'Closed weeks are view-only.';
  end if;

  if tg_op in ('INSERT', 'UPDATE') and (new.cell_date < start_date or new.cell_date > end_date) then
    raise exception 'Cell date must be inside the Monday-Sunday week.';
  end if;

  return coalesce(new, old);
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'weeks',
    'categories',
    'activity_templates',
    'week_activities',
    'activity_day_cells'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

drop trigger if exists prevent_closed_week_changes on public.weeks;
create trigger prevent_closed_week_changes
  before update or delete on public.weeks
  for each row execute function public.prevent_closed_week_changes();

drop trigger if exists prevent_closed_week_activity_changes on public.week_activities;
create trigger prevent_closed_week_activity_changes
  before insert or update or delete on public.week_activities
  for each row execute function public.prevent_closed_week_activity_changes();

drop trigger if exists validate_activity_day_cell on public.activity_day_cells;
create trigger validate_activity_day_cell
  before insert or update or delete on public.activity_day_cells
  for each row execute function public.validate_activity_day_cell();

alter table public.profiles enable row level security;
alter table public.weeks enable row level security;
alter table public.categories enable row level security;
alter table public.activity_templates enable row level security;
alter table public.week_activities enable row level security;
alter table public.activity_day_cells enable row level security;

create policy "profiles are private to their user"
  on public.profiles
  for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "weeks are private to their user"
  on public.weeks
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "categories are private to their user"
  on public.categories
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "activity templates are private to their user"
  on public.activity_templates
  for all
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.categories c
      where c.id = activity_templates.category_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.categories c
      where c.id = activity_templates.category_id
        and c.user_id = auth.uid()
    )
  );

create policy "week activities are private to their user"
  on public.week_activities
  for all
  to authenticated
  using (
    exists (
      select 1 from public.weeks w
      where w.id = week_activities.week_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.weeks w
      where w.id = week_activities.week_id
        and w.user_id = auth.uid()
    )
    and (
      activity_template_id is null
      or exists (
        select 1 from public.activity_templates at
        where at.id = week_activities.activity_template_id
          and at.user_id = auth.uid()
      )
    )
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = week_activities.category_id
          and c.user_id = auth.uid()
      )
    )
  );

create policy "activity day cells are private to their user"
  on public.activity_day_cells
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.week_activities wa
      join public.weeks w on w.id = wa.week_id
      where wa.id = activity_day_cells.week_activity_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.week_activities wa
      join public.weeks w on w.id = wa.week_id
      where wa.id = activity_day_cells.week_activity_id
        and w.user_id = auth.uid()
    )
  );

create or replace function public.seed_initial_weekly_list()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Must be authenticated to seed My Weekly List defaults.';
  end if;

  with seed_categories(name, sort_order) as (
    values
      ('Physical Health', 10),
      ('Mental Health', 20),
      ('Family and Home', 30),
      ('Relationship Health', 40),
      ('Hobbies', 50),
      ('Work', 60)
  )
  insert into public.categories (user_id, name, sort_order)
  select current_user_id, name, sort_order
  from seed_categories
  on conflict do nothing;

  with seed_activities(category_name, activity_name, target_count, sort_order) as (
    values
      ('Physical Health', 'Walk', 4, 10),
      ('Physical Health', 'Floss', 4, 20),
      ('Physical Health', 'Yoga', 2, 30),
      ('Physical Health', 'Cardio / Strength', 2, 40),
      ('Mental Health', 'Weekly calendar', 1, 10),
      ('Mental Health', 'Friends', 1, 20),
      ('Mental Health', 'Journal', 1, 30),
      ('Mental Health', 'Pivot Year', 7, 40),
      ('Mental Health', 'Meditation', 3, 50),
      ('Mental Health', 'Downtime', 2, 60),
      ('Mental Health', 'Read', 5, 70),
      ('Mental Health', 'Get out of the house', 3, 80),
      ('Family and Home', 'Quality kid time', 1, 10),
      ('Family and Home', 'Check budget', 2, 20),
      ('Family and Home', 'House upkeep', 2, 30),
      ('Relationship Health', 'Video call', 5, 10),
      ('Relationship Health', 'Check in', 1, 20),
      ('Relationship Health', 'Fun sexy times', 1, 30),
      ('Hobbies', 'Singing practice', 4, 10),
      ('Hobbies', 'Dance', 1, 20),
      ('Hobbies', 'Pickleball', 1, 30),
      ('Hobbies', 'Harmony Road work', 1, 40),
      ('Work', 'Update whiteboard', 3, 10),
      ('Work', 'Complete a big item', 1, 20)
  )
  insert into public.activity_templates (
    user_id,
    category_id,
    name,
    default_target_count,
    sort_order
  )
  select
    current_user_id,
    c.id,
    seed_activities.activity_name,
    seed_activities.target_count,
    seed_activities.sort_order
  from seed_activities
  join public.categories c
    on c.user_id = current_user_id
   and c.name = seed_activities.category_name
  on conflict do nothing;
end;
$$;

revoke all on function public.seed_initial_weekly_list() from public;
grant execute on function public.seed_initial_weekly_list() to authenticated;
