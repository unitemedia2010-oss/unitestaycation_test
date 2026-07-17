-- Unite Staycation V15.4 - public booking request + calendar safety
-- Chạy một lần trong Supabase SQL Editor sau migration V15/V15.3.

begin;

create index if not exists bookings_website_contact_recent_idx
  on public.bookings (
    (pg_catalog.regexp_replace(pg_catalog.lower(customer_phone), '[^[:alnum:]+]+', '', 'g')),
    created_at desc
  )
  where source_code = 'website';

create or replace function public.create_public_booking_request(
  p_customer_name text,
  p_contact text,
  p_checkin_at timestamptz,
  p_checkout_at timestamptz,
  p_room_code text default null,
  p_package_label text default '3 tiếng',
  p_guests integer default 2,
  p_customer_note text default null
)
returns table(public_code text)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_room_type public.room_types%rowtype;
  v_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  v_contact text := pg_catalog.btrim(coalesce(p_contact, ''));
  v_contact_key text;
  v_note text := nullif(pg_catalog.left(pg_catalog.btrim(coalesce(p_customer_note, '')), 500), '');
  v_package_label text := pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_package_label), ''), '3 tiếng'), 80);
  v_package_key text;
  v_package_codes text[];
  v_base_duration_seconds bigint;
  v_configured_hours numeric;
  v_duration_seconds bigint;
begin
  if pg_catalog.char_length(v_name) < 2 or pg_catalog.char_length(v_name) > 120 then
    raise exception 'Họ tên phải có từ 2 đến 120 ký tự';
  end if;
  if pg_catalog.char_length(v_contact) < 8 or pg_catalog.char_length(v_contact) > 30 then
    raise exception 'Số Zalo/WhatsApp chưa hợp lệ';
  end if;
  v_contact_key := pg_catalog.regexp_replace(pg_catalog.lower(v_contact), '[^[:alnum:]+]+', '', 'g');
  if pg_catalog.char_length(v_contact_key) < 8 then
    raise exception 'Số Zalo/WhatsApp chưa hợp lệ';
  end if;
  if p_guests is null or p_guests < 1 or p_guests > 12 then
    raise exception 'Số khách chưa hợp lệ';
  end if;
  if p_checkin_at is null or p_checkout_at is null or p_checkout_at <= p_checkin_at then
    raise exception 'Check-out phải sau check-in';
  end if;
  if p_checkin_at < pg_catalog.now() - interval '5 minutes' then
    raise exception 'Giờ nhận phòng không thể nằm trong quá khứ';
  end if;
  if p_checkout_at - p_checkin_at > interval '31 days' then
    raise exception 'Một yêu cầu không thể dài quá 31 ngày';
  end if;

  v_duration_seconds := extract(epoch from (p_checkout_at - p_checkin_at))::bigint;
  v_package_key := pg_catalog.lower(v_package_label);
  if v_package_key like '3%' then
    v_package_label := '3 tiếng';
    v_package_codes := array['3h'];
    v_base_duration_seconds := 3 * 60 * 60;
  elsif v_package_key like '4%' then
    v_package_label := '4 tiếng';
    v_package_codes := array['4h'];
    v_base_duration_seconds := 4 * 60 * 60;
  elsif position('qua đêm' in v_package_key) > 0 or v_package_key like '8%' then
    v_package_label := 'Qua đêm';
    v_package_codes := array['8h', 'night'];
    v_base_duration_seconds := 8 * 60 * 60;
  elsif position('ngày' in v_package_key) > 0 then
    v_package_label := 'Ngày';
    v_package_codes := array['day'];
    v_base_duration_seconds := 16 * 60 * 60;
  else
    raise exception 'Gói thời lượng chưa được hỗ trợ';
  end if;

  if nullif(pg_catalog.btrim(coalesce(p_room_code, '')), '') is not null then
    select rt.* into v_room_type
    from public.room_types as rt
    join public.branches as br on br.id = rt.branch_id
    where rt.code = pg_catalog.btrim(p_room_code)
      and rt.is_published = true
      and rt.status in ('available', 'limited')
      and rt.inventory_count > 0
      and br.is_active = true
    limit 1;
    if v_room_type.id is null then
      raise exception 'Layout đã chọn không còn khả dụng';
    end if;
    if p_guests > v_room_type.max_guests then
      raise exception 'Số khách vượt quá sức chứa của layout đã chọn';
    end if;

    select rp.duration_hours into v_configured_hours
    from public.room_prices as rp
    where rp.room_type_id = v_room_type.id
      and rp.package_code = any(v_package_codes)
      and rp.is_active = true
      and (rp.starts_at is null or rp.starts_at <= p_checkin_at)
      and (rp.ends_at is null or rp.ends_at > p_checkin_at)
    order by rp.starts_at desc nulls last, rp.sort_order asc
    limit 1;
    if v_configured_hours is null or v_configured_hours <= 0 then
      raise exception 'Gói thời lượng không còn khả dụng cho layout đã chọn';
    end if;
    v_base_duration_seconds := pg_catalog.round(v_configured_hours * 60 * 60)::bigint;
  end if;

  if v_package_codes = array['day'] then
    if v_duration_seconds < v_base_duration_seconds
       or pg_catalog.mod(v_duration_seconds - v_base_duration_seconds, 24 * 60 * 60) <> 0 then
      raise exception 'Thời lượng không khớp gói ngày đã cấu hình';
    end if;
  elsif v_duration_seconds <> v_base_duration_seconds then
    raise exception 'Thời lượng không khớp gói % đã cấu hình', v_package_label;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_contact_key, 154));
  if exists (
    select 1
    from public.bookings as b
    where b.source_code = 'website'
      and pg_catalog.regexp_replace(pg_catalog.lower(b.customer_phone), '[^[:alnum:]+]+', '', 'g') = v_contact_key
      and b.created_at > pg_catalog.now() - interval '90 seconds'
  ) then
    raise exception 'Yêu cầu vừa được gửi. Vui lòng chờ CSKH xác nhận';
  end if;

  return query
  insert into public.bookings as b (
    source_code, branch_id, room_type_id, room_unit_id,
    customer_name, customer_phone, customer_note,
    checkin_at, checkout_at, package_label, guests, status, internal_note
  ) values (
    'website', v_room_type.branch_id, v_room_type.id, null,
    v_name, v_contact, v_note,
    p_checkin_at, p_checkout_at, v_package_label, p_guests, 'new',
    case when v_room_type.id is null
      then 'Yêu cầu web V15.4 | Chưa chọn layout cụ thể'
      else pg_catalog.format('Yêu cầu web V15.4 | Phòng: %s (%s)', v_room_type.name, v_room_type.code)
    end
  )
  returning b.public_code;
end;
$$;

revoke all on function public.create_public_booking_request(text,text,timestamptz,timestamptz,text,text,integer,text) from public;
grant execute on function public.create_public_booking_request(text,text,timestamptz,timestamptz,text,text,integer,text) to anon, authenticated;

-- Chỉ RPC ở trên được tạo lead public; anon không được ghi trực tiếp mọi cột của bookings.
revoke insert on table public.bookings from public, anon;

-- Một phòng thật chỉ được gắn cho đúng layout và chi nhánh của booking.
create or replace function public.validate_booking_room_unit_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
declare
  v_unit public.room_units%rowtype;
begin
  if new.room_unit_id is null then return new; end if;
  select * into v_unit from public.room_units where id = new.room_unit_id;
  if v_unit.id is null
     or new.room_type_id is distinct from v_unit.room_type_id
     or new.branch_id is distinct from v_unit.branch_id then
    raise exception 'Phòng thực tế không thuộc layout/chi nhánh đã chọn';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_booking_room_unit_scope() from public;
drop trigger if exists bookings_room_unit_scope_trigger on public.bookings;
create trigger bookings_room_unit_scope_trigger
before insert or update of room_unit_id, room_type_id, branch_id on public.bookings
for each row execute function public.validate_booking_room_unit_scope();

-- Booking đã giữ/cọc/thu đủ phải có layout, nhưng có thể xếp phòng cụ thể sau.
-- Chỉ khi khách thực sự check-in/check-out mới bắt buộc room_unit_id.
-- NOT VALID vẫn chặn dòng mới/cập nhật nhưng không làm migration hỏng vì dữ liệu cũ cần rà soát.
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

-- Booking chưa xếp phòng vẫn giữ một suất của layout. Advisory lock tránh hai CSKH
-- cùng nhận cọc suất cuối trong một thời điểm.
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

comment on function public.create_public_booking_request(text,text,timestamptz,timestamptz,text,text,integer,text)
is 'Validated public lead intake. Creates status=new with room type/branch but leaves room unit for CSKH assignment.';

notify pgrst, 'reload schema';
commit;
