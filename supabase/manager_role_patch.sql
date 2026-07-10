-- Unite Staycation role patch
-- Run this once in Supabase SQL Editor on an existing project.

alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists phone text;

alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('super_admin', 'admin', 'manager', 'cskh'));

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.user_profiles
      where id = auth.uid()
        and is_active = true
      limit 1
    ),
    'guest'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'super_admin';
$$;

create or replace function public.can_manage_bookings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('super_admin', 'admin', 'manager', 'cskh');
$$;

create or replace function public.can_manage_payments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('super_admin', 'admin', 'manager', 'cskh');
$$;

drop policy if exists "authenticated read bookings" on public.bookings;
create policy "authenticated read bookings" on public.bookings
for select using (public.current_user_role() in ('super_admin', 'admin', 'manager', 'cskh'));
