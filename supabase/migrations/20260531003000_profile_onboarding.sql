-- Track first-run onboarding for manually provisioned users.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Existing users with real app data predate onboarding and should not be sent
-- through the first-run flow.
update public.profiles as profile
   set onboarding_completed_at = coalesce(profile.onboarding_completed_at, now()),
       updated_at = now()
 where profile.onboarding_completed_at is null
   and (
     exists (
       select 1
         from public.categories as category
        where category.user_id = profile.id
          and category.is_active = true
     )
     or exists (
       select 1
         from public.activity_templates as template
        where template.user_id = profile.id
          and template.is_active = true
     )
     or exists (
       select 1
         from public.weeks as week
        where week.user_id = profile.id
     )
   );

create or replace function public.mark_own_onboarding_complete()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Must be authenticated to complete onboarding.';
  end if;

  update public.profiles
     set onboarding_completed_at = coalesce(onboarding_completed_at, now()),
         updated_at = now()
   where id = current_user_id
     and is_allowed = true
     and must_change_password = false;
end;
$$;

revoke all on function public.mark_own_onboarding_complete() from public;
grant execute on function public.mark_own_onboarding_complete() to authenticated;
