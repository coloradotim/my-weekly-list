-- Database-backed access flags for email/password auth.

alter table public.profiles
  add column if not exists is_allowed boolean not null default false,
  add column if not exists must_change_password boolean not null default false;

-- Preserve access for users who already existed before this auth-model change.
-- New users still default to not allowed unless Tim provisions them.
update public.profiles
   set is_allowed = true,
       updated_at = now()
 where is_allowed = false;

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

drop policy if exists "profiles are private to their user" on public.profiles;
drop policy if exists "profiles can be read by their user" on public.profiles;

create policy "profiles can be read by their user"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create or replace function public.clear_own_password_change_required()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Must be authenticated to update password-change state.';
  end if;

  update public.profiles
     set must_change_password = false,
         updated_at = now()
   where id = current_user_id
     and is_allowed = true;
end;
$$;

revoke all on function public.clear_own_password_change_required() from public;
grant execute on function public.clear_own_password_change_required() to authenticated;
