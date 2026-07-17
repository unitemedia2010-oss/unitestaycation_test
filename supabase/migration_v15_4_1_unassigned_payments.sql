-- Unite Staycation V15.4.1
-- Cho phép nhận cọc/thu đủ trước khi xếp phòng cụ thể, nhưng vẫn giữ đúng
-- sức chứa của layout và bắt buộc room_unit_id trước check-in/check-out.

begin;

alter table public.bookings
  drop constraint if exists bookings_active_requires_room_unit;
alter table public.bookings
  drop constraint if exists bookings_committed_requires_room_type;
alter table public.bookings
  add constraint bookings_committed_requires_room_type
  check (
    status not in ('holding','deposited','paid','checked_in','checked_out')
    or room_type_id is not null
  ) not valid;

alter table public.bookings
  drop constraint if exists bookings_checkin_requires_room_unit;
alter table public.bookings
  add constraint bookings_checkin_requires_room_unit
  check (
    status not in ('checked_in','checked_out')
    or room_unit_id is not null
  ) not valid;

create or replace function public.validate_booking_room_type_capacity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_capacity integer;
  v_reserved integer;
begin
  if new.status not in ('holding','deposited','paid','checked_in') then
    return new;
  end if;
  if new.room_type_id is null then
    raise exception 'Booking đã giữ/cọc/thanh toán phải có loại phòng / layout';
  end if;

  if tg_op = 'UPDATE'
     and old.status in ('holding','deposited','paid','checked_in')
     and new.status in ('holding','deposited','paid','checked_in')
     and old.room_type_id is not distinct from new.room_type_id
     and old.checkin_at is not distinct from new.checkin_at
     and old.checkout_at is not distinct from new.checkout_at then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.room_type_id::text, 0));

  select case
    when count(ru.id) > 0
      then (count(ru.id) filter (where ru.status = 'available'))::integer
    else rt.inventory_count
  end
  into v_capacity
  from public.room_types rt
  left join public.room_units ru on ru.room_type_id = rt.id
  where rt.id = new.room_type_id
  group by rt.inventory_count;

  if v_capacity is null then
    raise exception 'Không tìm thấy loại phòng / layout';
  end if;

  select count(*)::integer
  into v_reserved
  from public.bookings b
  where b.id is distinct from new.id
    and b.public_code is distinct from new.public_code
    and b.room_type_id = new.room_type_id
    and b.status in ('holding','deposited','paid','checked_in')
    and tstzrange(b.checkin_at, b.checkout_at, '[)')
        && tstzrange(new.checkin_at, new.checkout_at, '[)');

  if v_reserved >= v_capacity then
    raise exception 'Layout đã đủ % suất trong khung giờ này', v_capacity
      using hint = 'Đổi giờ, đổi layout hoặc xử lý các booking đang Chờ xếp phòng.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_booking_room_type_capacity() from public;

drop trigger if exists bookings_room_type_capacity_trigger on public.bookings;
create trigger bookings_room_type_capacity_trigger
before insert or update of room_type_id, checkin_at, checkout_at, status on public.bookings
for each row execute function public.validate_booking_room_type_capacity();

comment on function public.validate_booking_room_type_capacity()
is 'Giữ sức chứa theo layout cho holding/deposited/paid/checked_in, kể cả khi chưa xếp room_unit_id.';

notify pgrst, 'reload schema';
commit;
