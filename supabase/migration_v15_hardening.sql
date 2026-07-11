-- Unite Staycation V15 migration for an EXISTING Supabase project
-- Run this instead of the full schema when V12 is already installed.

alter table public.bookings add column if not exists deposit_bill_path text;
alter table public.bookings add column if not exists full_payment_bill_path text;

update storage.buckets set public = false where id = 'payment-bills';

drop policy if exists "ops can delete room images" on storage.objects;
drop policy if exists "ops can delete payment bills" on storage.objects;
create policy "ops can delete room images" on storage.objects
for delete to authenticated using (bucket_id = 'room-images' and public.is_admin_user());
create policy "ops can delete payment bills" on storage.objects
for delete to authenticated using (bucket_id = 'payment-bills' and public.is_admin_user());

create or replace function public.check_booking_conflicts(
  p_room_unit_id uuid,
  p_checkin_at timestamptz,
  p_checkout_at timestamptz,
  p_ignore_booking_id uuid default null
)
returns table(id uuid, public_code text, customer_name text, checkin_at timestamptz, checkout_at timestamptz, status text)
language sql stable security definer set search_path = public as $$
  select b.id, b.public_code, b.customer_name, b.checkin_at, b.checkout_at, b.status
  from public.bookings b
  where public.is_ops_user()
    and b.room_unit_id = p_room_unit_id
    and b.status in ('holding','deposited','paid','checked_in')
    and (p_ignore_booking_id is null or b.id <> p_ignore_booking_id)
    and tstzrange(b.checkin_at, b.checkout_at, '[)') && tstzrange(p_checkin_at, p_checkout_at, '[)')
  order by b.checkin_at
$$;
revoke all on function public.check_booking_conflicts(uuid,timestamptz,timestamptz,uuid) from public;
revoke all on function public.check_booking_conflicts(uuid,timestamptz,timestamptz,uuid) from anon;
grant execute on function public.check_booking_conflicts(uuid,timestamptz,timestamptz,uuid) to authenticated;
