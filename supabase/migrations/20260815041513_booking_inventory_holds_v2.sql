-- Unite Staycation - canonical physical-room inventory and public holds.
--
-- This migration deliberately keeps public availability aggregate-only:
-- anonymous callers can see remaining capacity, never room-unit identifiers or
-- customer data. All writes which consume inventory are serialized in SQL and
-- backed by the half-open [check-in, check-out) exclusion constraint.

begin;

create extension if not exists btree_gist;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.bookings
  add column if not exists hold_expires_at timestamptz,
  add column if not exists public_request_id uuid,
  add column if not exists package_code text,
  add column if not exists adults integer,
  add column if not exists children integer,
  add column if not exists nights integer;

comment on column public.bookings.hold_expires_at
is 'Expiry of an anonymous website hold. NULL means the hold was created manually by operations and has no automatic expiry.';

comment on column public.bookings.public_request_id
is 'Client-generated UUID idempotency key for create_public_booking_v2. Never reuse it for a different request.';

create unique index if not exists bookings_public_request_id_unique_idx
  on public.bookings (public_request_id)
  where public_request_id is not null;

create index if not exists bookings_expiring_public_holds_idx
  on public.bookings (hold_expires_at, id)
  where status = 'holding' and hold_expires_at is not null;

create index if not exists bookings_website_contact_recent_idx
  on public.bookings (
    (pg_catalog.regexp_replace(pg_catalog.lower(customer_phone), '[^[:alnum:]+]+', '', 'g')),
    created_at desc
  )
  where source_code = 'website';

alter table public.booking_notification_deliveries
  add column if not exists last_dispatch_at timestamptz;

comment on column public.booking_notification_deliveries.last_dispatch_at
is 'Last time PostgreSQL successfully queued this delivery to the Edge Function through pg_net. This is dispatch metadata, not proof that Telegram sent the message.';

create index if not exists booking_notification_deliveries_retry_v2_idx
  on public.booking_notification_deliveries (
    status,
    last_attempt_at,
    last_dispatch_at,
    id
  )
  where status in ('pending', 'failed');

-- Preserve an audit note before removing ambiguous physical-room assignments
-- from non-inventory-consuming leads. The migration never changes customer,
-- schedule, money or bill fields.
insert into public.booking_notes (booking_id, note, note_type)
select
  b.id,
  pg_catalog.format(
    'System V2: gỡ phòng cụ thể %s (%s) khỏi đơn %s; trạng thái %s không giữ tồn kho. Cần xếp lại phòng trước khi giữ/cọc/thanh toán.',
    ru.unit_name,
    ru.code,
    b.public_code,
    b.status
  ),
  'system'
from public.bookings b
join public.room_units ru on ru.id = b.room_unit_id
where b.status in ('new', 'consulting')
  and b.room_unit_id is not null;

update public.bookings
set room_unit_id = null,
    hold_expires_at = null
where status in ('new', 'consulting')
  and room_unit_id is not null;

-- Historical and manually created holdings predate public_request_id and must
-- remain non-expiring. Deposits/payments/check-ins can never carry a hold lease.
update public.bookings
set hold_expires_at = null
where status <> 'holding'
   or public_request_id is null;

alter table public.bookings
  drop constraint if exists bookings_inventory_state_check;

alter table public.bookings
  add constraint bookings_inventory_state_check
  check (
    (
      status in ('new', 'consulting')
      and room_unit_id is null
      and hold_expires_at is null
    )
    or (
      status = 'holding'
      and room_unit_id is not null
      and (hold_expires_at is null or public_request_id is not null)
    )
    or (
      status in ('deposited', 'paid', 'checked_in')
      and room_unit_id is not null
      and hold_expires_at is null
    )
    or (
      status in ('checked_out', 'cancelled', 'no_show')
      and hold_expires_at is null
    )
  ) not valid;

alter table public.bookings
  drop constraint if exists bookings_public_request_source_check;

alter table public.bookings
  add constraint bookings_public_request_source_check
  check (public_request_id is null or source_code = 'website') not valid;

alter table public.bookings
  drop constraint if exists bookings_public_party_check;

alter table public.bookings
  add constraint bookings_public_party_check
  check (
    (adults is null and children is null and nights is null)
    or (
      adults between 1 and 12
      and children between 0 and 11
      and nights between 1 and 30
      and (nights = 1 or coalesce(package_code, '') = 'day')
      and guests = adults + children
      and guests between 1 and 12
    )
  ) not valid;

alter table public.bookings
  drop constraint if exists bookings_package_code_check;

alter table public.bookings
  add constraint bookings_package_code_check
  check (package_code is null or package_code in ('3h', '4h', '8h', 'night', 'day')) not valid;

-- Stop deployment instead of silently inventing a room for legacy paid rows.
-- The production preflight is expected to report zero rows here.
do $inventory_preflight$
begin
  if exists (
    select 1
    from public.bookings b
    where b.status in ('holding', 'deposited', 'paid', 'checked_in')
      and b.room_unit_id is null
  ) then
    raise exception 'BOOKING_INVENTORY_PREFLIGHT_FAILED: active booking without room_unit_id'
      using errcode = '23514',
            hint = 'Assign a physical room to every holding/deposited/paid/checked_in booking, then rerun the migration.';
  end if;
end;
$inventory_preflight$;

alter table public.bookings validate constraint bookings_inventory_state_check;
alter table public.bookings validate constraint bookings_public_request_source_check;
alter table public.bookings validate constraint bookings_public_party_check;
alter table public.bookings validate constraint bookings_package_code_check;

-- Normalize lease state before CHECK constraints run on every future write.
create or replace function private.normalize_booking_hold_v2()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.status <> 'holding' then
    new.hold_expires_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_booking_hold_v2()
  from public, anon, authenticated, service_role;

drop trigger if exists bookings_normalize_hold_v2 on public.bookings;
create trigger bookings_normalize_hold_v2
before insert or update of status, hold_expires_at on public.bookings
for each row execute function private.normalize_booking_hold_v2();

-- A physical room must belong to the selected layout/branch and must be usable
-- whenever a booking consumes current inventory. Historical terminal records
-- may retain a unit which was hidden later.
create or replace function public.validate_booking_room_unit_scope()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_unit public.room_units%rowtype;
begin
  if new.room_unit_id is null then
    return new;
  end if;

  select ru.*
  into v_unit
  from public.room_units ru
  where ru.id = new.room_unit_id;

  if v_unit.id is null
     or new.room_type_id is distinct from v_unit.room_type_id
     or new.branch_id is distinct from v_unit.branch_id then
    raise exception 'VALIDATION_ERROR: room unit is outside the selected layout or branch'
      using errcode = '23514';
  end if;

  if new.status in ('holding', 'deposited', 'paid', 'checked_in')
     and v_unit.status <> 'available' then
    raise exception 'ROOM_UNAVAILABLE: room unit is maintenance or hidden'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_booking_room_unit_scope() from public;

drop trigger if exists bookings_room_unit_scope_trigger on public.bookings;
create trigger bookings_room_unit_scope_trigger
before insert or update of room_unit_id, room_type_id, branch_id, status
on public.bookings
for each row execute function public.validate_booking_room_unit_scope();

create or replace function private.guard_room_unit_inventory_status_v2()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if old.status = 'available'
     and new.status in ('maintenance', 'hidden')
     and exists (
       select 1
       from public.bookings b
       where b.room_unit_id = old.id
         and b.status in ('holding', 'deposited', 'paid', 'checked_in')
         and (
           b.status <> 'holding'
           or b.hold_expires_at is null
           or b.hold_expires_at > pg_catalog.now()
           or (
             b.quickpay_claim_token is not null
             and b.quickpay_claimed_at > pg_catalog.now() - interval '15 minutes'
           )
         )
         and b.checkout_at > pg_catalog.now()
     ) then
    raise exception 'ROOM_UNIT_HAS_ACTIVE_BOOKINGS: cannot hide or maintain this room yet'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_room_unit_inventory_status_v2()
  from public, anon, authenticated, service_role;

drop trigger if exists room_units_guard_inventory_status_v2 on public.room_units;
create trigger room_units_guard_inventory_status_v2
before update of status on public.room_units
for each row execute function private.guard_room_unit_inventory_status_v2();

-- Recreate the authoritative half-open overlap constraint. Back-to-back stays
-- (checkout = next check-in) remain valid while every actual overlap is blocked.
alter table public.bookings
  drop constraint if exists bookings_no_overlap_per_unit;

alter table public.bookings
  add constraint bookings_no_overlap_per_unit
  exclude using gist (
    room_unit_id with =,
    tstzrange(checkin_at, checkout_at, '[)') with &&
  )
  where (
    room_unit_id is not null
    and status in ('holding', 'deposited', 'paid', 'checked_in')
  );

-- Reusable internal aggregate. Expired anonymous holds stop reserving inventory
-- immediately, even before the one-minute cleanup job runs.
create or replace function private.room_inventory_v2(
  p_room_type_id uuid,
  p_checkin_at timestamptz,
  p_checkout_at timestamptz
)
returns table(capacity integer, reserved integer, remaining integer)
language sql
stable
security invoker
set search_path = pg_catalog, pg_temp
as $$
  with inventory as (
    select pg_catalog.count(*)::integer as capacity
    from public.room_units ru
    where ru.room_type_id = p_room_type_id
      and ru.status = 'available'
  ), occupied as (
    select pg_catalog.count(distinct b.room_unit_id)::integer as reserved
    from public.bookings b
    join public.room_units ru on ru.id = b.room_unit_id
    where b.room_type_id = p_room_type_id
      and ru.status = 'available'
      and (
        b.status in ('deposited', 'paid', 'checked_in')
        or (
          b.status = 'holding'
          and (
            b.hold_expires_at is null
            or b.hold_expires_at > pg_catalog.now()
            or (
              b.quickpay_claim_token is not null
              and b.quickpay_claimed_at > pg_catalog.now() - interval '15 minutes'
            )
          )
        )
      )
      and tstzrange(b.checkin_at, b.checkout_at, '[)')
          && tstzrange(p_checkin_at, p_checkout_at, '[)')
  )
  select
    i.capacity,
    o.reserved,
    greatest(i.capacity - o.reserved, 0)::integer
  from inventory i
  cross join occupied o;
$$;

revoke all on function private.room_inventory_v2(uuid,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.booking_package_checkout_v2(
  p_checkin_at timestamptz,
  p_package_code text,
  p_nights integer
)
returns timestamptz
language sql
immutable
security invoker
set search_path = pg_catalog, pg_temp
as $$
  select case pg_catalog.lower(pg_catalog.btrim(coalesce(p_package_code, '')))
    when '3h' then p_checkin_at + interval '3 hours'
    when '4h' then p_checkin_at + interval '4 hours'
    when '8h' then p_checkin_at + interval '8 hours'
    when 'night' then p_checkin_at + interval '8 hours'
    when 'day' then p_checkin_at
      + pg_catalog.make_interval(hours => 22 + 24 * (greatest(coalesce(p_nights, 1), 1) - 1))
    else null
  end;
$$;

revoke all on function private.booking_package_checkout_v2(timestamptz,text,integer)
  from public, anon, authenticated, service_role;

create or replace function private.request_role_v2()
returns text
language plpgsql
stable
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_claims text;
  v_role text;
begin
  v_claims := nullif(pg_catalog.current_setting('request.jwt.claims', true), '');
  if v_claims is not null then
    begin
      v_role := nullif((v_claims::jsonb ->> 'role'), '');
    exception when invalid_text_representation then
      v_role := null;
    end;
  end if;

  return coalesce(
    v_role,
    nullif(pg_catalog.current_setting('request.jwt.claim.role', true), ''),
    session_user::text
  );
end;
$$;

revoke all on function private.request_role_v2()
  from public, anon, authenticated, service_role;

create or replace function public.release_expired_public_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released integer;
begin
  if private.request_role_v2() not in (
    'anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin'
  ) then
    raise exception 'FORBIDDEN: release_expired_public_holds'
      using errcode = '42501';
  end if;

  update public.bookings b
  set status = 'consulting',
      room_unit_id = null,
      hold_expires_at = null,
      quickpay_claim_token = null,
      quickpay_claimed_at = null,
      internal_note = pg_catalog.concat_ws(
        E'\n',
        nullif(b.internal_note, ''),
        pg_catalog.format(
          'System V2: giữ phòng web hết hạn lúc %s; đã trả đơn về Chờ tư vấn.',
          pg_catalog.to_char(pg_catalog.clock_timestamp() at time zone 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
        )
      )
  where b.status = 'holding'
    and b.public_request_id is not null
    and b.hold_expires_at is not null
    and b.hold_expires_at <= pg_catalog.now()
    -- QuickPay owns the booking for at most 15 minutes. Skipping an active
    -- claim prevents its guard trigger from aborting the whole bulk cleanup;
    -- the next Cron run releases it after that claim expires.
    and (
      b.quickpay_claim_token is null
      or b.quickpay_claimed_at is null
      or b.quickpay_claimed_at <= pg_catalog.now() - interval '15 minutes'
    );

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

revoke all on function public.release_expired_public_holds()
  from public, anon, authenticated, service_role;

comment on function public.release_expired_public_holds()
is 'Cron-only cleanup: releases expired anonymous website holds without deleting the lead.';

create or replace function public.public_room_availability_v2(
  p_checkin_at timestamptz,
  p_checkout_at timestamptz,
  p_guests integer default 2,
  p_room_code text default null
)
returns table(
  room_code text,
  capacity integer,
  reserved integer,
  remaining integer,
  available boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.request_role_v2() not in (
    'anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin'
  ) then
    return;
  end if;

  if p_checkin_at is null
     or p_checkout_at is null
     or p_checkout_at <= p_checkin_at
     or coalesce(p_guests, 0) < 1
     or p_guests > 12 then
    return;
  end if;

  return query
  select
    rt.code,
    inv.capacity,
    inv.reserved,
    inv.remaining,
    inv.remaining > 0
  from public.room_types rt
  join public.branches br on br.id = rt.branch_id
  cross join lateral private.room_inventory_v2(rt.id, p_checkin_at, p_checkout_at) inv
  where rt.is_published = true
    and rt.status in ('available', 'limited')
    and br.is_active = true
    and rt.max_guests >= p_guests
    and (
      nullif(pg_catalog.btrim(coalesce(p_room_code, '')), '') is null
      or rt.code = pg_catalog.btrim(p_room_code)
    )
  order by rt.sort_order, rt.code;
end;
$$;

revoke all on function public.public_room_availability_v2(timestamptz,timestamptz,integer,text)
  from public;
grant execute on function public.public_room_availability_v2(timestamptz,timestamptz,integer,text)
  to anon, authenticated;

comment on function public.public_room_availability_v2(timestamptz,timestamptz,integer,text)
is 'Public aggregate availability. Never returns physical room IDs, booking IDs, contact data or customer data.';

create or replace function public.public_room_alternatives_v2(
  p_room_code text,
  p_checkin_at timestamptz,
  p_package_code text,
  p_nights integer default 1,
  p_guests integer default 2,
  p_limit integer default 3
)
returns table(
  alternative_type text,
  room_code text,
  room_name text,
  checkin_at timestamptz,
  checkout_at timestamptz,
  remaining integer,
  sort_order integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 3), 10));
  v_checkout_at timestamptz;
begin
  if private.request_role_v2() not in (
    'anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin'
  ) then
    return;
  end if;

  if p_checkin_at is null
     or nullif(pg_catalog.btrim(coalesce(p_room_code, '')), '') is null
     or coalesce(p_nights, 0) not between 1 and 30
     or (
       pg_catalog.lower(pg_catalog.btrim(coalesce(p_package_code, ''))) <> 'day'
       and coalesce(p_nights, 0) <> 1
     )
     or coalesce(p_guests, 0) not between 1 and 12
     or extract(minute from p_checkin_at at time zone 'Asia/Ho_Chi_Minh')::integer % 30 <> 0
     or extract(second from p_checkin_at at time zone 'Asia/Ho_Chi_Minh') <> 0 then
    return;
  end if;

  v_checkout_at := private.booking_package_checkout_v2(p_checkin_at, p_package_code, p_nights);
  if v_checkout_at is null then
    return;
  end if;

  return query
  with requested as (
    select rt.id, rt.code, rt.name, rt.branch_id
    from public.room_types rt
    join public.branches br on br.id = rt.branch_id
    where rt.code = pg_catalog.btrim(p_room_code)
      and rt.is_published = true
      and rt.status in ('available', 'limited')
      and br.is_active = true
      and rt.max_guests >= p_guests
    limit 1
  ), same_room_slots as (
    select
      'same_room_time'::text as alternative_type,
      req.code as room_code,
      req.name as room_name,
      slot.slot_checkin as checkin_at,
      private.booking_package_checkout_v2(slot.slot_checkin, p_package_code, p_nights) as checkout_at,
      step.direction_order,
      step.step_number
    from requested req
    cross join generate_series(1, 336) as series(step_number)
    cross join lateral (
      values
        (series.step_number, 0, p_checkin_at + series.step_number * interval '30 minutes'),
        (series.step_number, 1, p_checkin_at - series.step_number * interval '30 minutes')
    ) as step(step_number, direction_order, slot_checkin)
    cross join lateral (
      select step.slot_checkin
    ) slot
    where step.slot_checkin >= pg_catalog.now() - interval '5 minutes'
      and step.slot_checkin <= p_checkin_at + interval '7 days'
      and step.slot_checkin >= p_checkin_at - interval '7 days'
  ), same_room_available as (
    select s.*, inv.remaining
    from same_room_slots s
    join requested req on req.code = s.room_code
    cross join lateral private.room_inventory_v2(req.id, s.checkin_at, s.checkout_at) inv
    where inv.remaining > 0
  ), other_room_available as (
    select
      'other_room_same_time'::text as alternative_type,
      rt.code as room_code,
      rt.name as room_name,
      p_checkin_at as checkin_at,
      v_checkout_at as checkout_at,
      inv.remaining,
      rt.sort_order as room_sort_order
    from requested req
    join public.room_types rt on rt.branch_id = req.branch_id and rt.id <> req.id
    join public.branches br on br.id = rt.branch_id
    cross join lateral private.room_inventory_v2(rt.id, p_checkin_at, v_checkout_at) inv
    where rt.is_published = true
      and rt.status in ('available', 'limited')
      and br.is_active = true
      and rt.max_guests >= p_guests
      and inv.remaining > 0
    order by rt.sort_order, rt.code
    limit 1
  ), candidates as (
    select
      o.alternative_type,
      o.room_code,
      o.room_name,
      o.checkin_at,
      o.checkout_at,
      o.remaining,
      1::integer as category_order,
      0::integer as step_number,
      0::integer as direction_order,
      o.room_sort_order
    from other_room_available o
    union all
    select
      s.alternative_type,
      s.room_code,
      s.room_name,
      s.checkin_at,
      s.checkout_at,
      s.remaining,
      2::integer,
      s.step_number,
      s.direction_order,
      0::integer
    from same_room_available s
  ), ranked as (
    select
      c.*,
      pg_catalog.row_number() over (
        order by c.category_order, c.step_number, c.direction_order, c.room_sort_order, c.room_code
      )::integer as result_order
    from candidates c
  )
  select
    r.alternative_type,
    r.room_code,
    r.room_name,
    r.checkin_at,
    r.checkout_at,
    r.remaining,
    r.result_order
  from ranked r
  where r.result_order <= v_limit
  order by r.result_order;
end;
$$;

revoke all on function public.public_room_alternatives_v2(text,timestamptz,text,integer,integer,integer)
  from public;
grant execute on function public.public_room_alternatives_v2(text,timestamptz,text,integer,integer,integer)
  to anon, authenticated;

comment on function public.public_room_alternatives_v2(text,timestamptz,text,integer,integer,integer)
is 'Returns up to p_limit safe alternatives: one other layout at the requested time, then nearest 30-minute slots within seven days.';

create or replace function public.create_public_booking_v2(
  p_public_request_id uuid,
  p_customer_name text,
  p_contact text,
  p_room_code text,
  p_package_code text,
  p_checkin_at timestamptz,
  p_checkout_at timestamptz,
  p_adults integer default 2,
  p_children integer default 0,
  p_nights integer default 1,
  p_customer_note text default null
)
returns table(
  ok boolean,
  error_code text,
  public_code text,
  status text,
  hold_expires_at timestamptz,
  remaining integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  v_contact text := pg_catalog.btrim(coalesce(p_contact, ''));
  v_contact_key text;
  v_room_type public.room_types%rowtype;
  v_unit public.room_units%rowtype;
  v_booking public.bookings%rowtype;
  v_expected_checkout timestamptz;
  v_package_code text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_package_code, '')));
  v_package_label text;
  v_price integer;
  v_remaining integer := 0;
  v_guests integer;
  v_recent_booking public.bookings%rowtype;
begin
  if private.request_role_v2() not in (
    'anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin'
  ) then
    return query select false, 'FORBIDDEN'::text, null::text, null::text, null::timestamptz, 0;
    return;
  end if;

  if p_public_request_id is null
     or pg_catalog.char_length(v_name) not between 2 and 120
     or pg_catalog.char_length(v_contact) not between 8 and 30
     or coalesce(p_adults, 0) not between 1 and 12
     or coalesce(p_children, -1) not between 0 and 11
     or coalesce(p_nights, 0) not between 1 and 30
     or (v_package_code <> 'day' and coalesce(p_nights, 0) <> 1) then
    return query select false, 'VALIDATION_ERROR'::text, null::text, null::text, null::timestamptz, 0;
    return;
  end if;

  v_contact_key := pg_catalog.regexp_replace(pg_catalog.lower(v_contact), '[^[:alnum:]+]+', '', 'g');
  v_guests := p_adults + p_children;
  if pg_catalog.char_length(v_contact_key) < 8 or v_guests not between 1 and 12 then
    return query select false, 'VALIDATION_ERROR'::text, null::text, null::text, null::timestamptz, 0;
    return;
  end if;

  v_expected_checkout := private.booking_package_checkout_v2(p_checkin_at, v_package_code, p_nights);
  if p_checkin_at is null
     or p_checkout_at is null
     or v_expected_checkout is null
     or p_checkout_at is distinct from v_expected_checkout
     or extract(minute from p_checkin_at at time zone 'Asia/Ho_Chi_Minh')::integer % 30 <> 0
     or extract(second from p_checkin_at at time zone 'Asia/Ho_Chi_Minh') <> 0
     or p_checkin_at < pg_catalog.now() - interval '5 minutes'
     or p_checkout_at - p_checkin_at > interval '31 days' then
    return query select false, 'VALIDATION_ERROR'::text, null::text, null::text, null::timestamptz, 0;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_public_request_id::text, 20260815)
  );

  select b.*
  into v_booking
  from public.bookings b
  where b.public_request_id = p_public_request_id
  for update;

  if v_booking.id is not null then
    if v_booking.room_type_id is not null then
      select inv.remaining
      into v_remaining
      from private.room_inventory_v2(
        v_booking.room_type_id,
        v_booking.checkin_at,
        v_booking.checkout_at
      ) inv;
    end if;
    return query
    select true, null::text, v_booking.public_code, v_booking.status,
           v_booking.hold_expires_at, coalesce(v_remaining, 0);
    return;
  end if;

  perform public.release_expired_public_holds();

  select rt.*
  into v_room_type
  from public.room_types rt
  join public.branches br on br.id = rt.branch_id
  where rt.code = pg_catalog.btrim(coalesce(p_room_code, ''))
    and rt.is_published = true
    and rt.status in ('available', 'limited')
    and br.is_active = true
    and rt.max_guests >= v_guests
  limit 1;

  if v_room_type.id is null then
    return query select false, 'ROOM_UNAVAILABLE'::text, null::text, null::text, null::timestamptz, 0;
    return;
  end if;

  -- UUID idempotency is authoritative. This short contact/slot/layout guard is
  -- an additional debounce for double clicks from clients which accidentally
  -- regenerate the UUID during retry.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_contact_key, 154)
  );

  select b.*
  into v_recent_booking
  from public.bookings b
  where b.source_code = 'website'
    and pg_catalog.regexp_replace(pg_catalog.lower(b.customer_phone), '[^[:alnum:]+]+', '', 'g') = v_contact_key
    and b.room_type_id = v_room_type.id
    and b.checkin_at = p_checkin_at
    and b.checkout_at = p_checkout_at
    and b.status = 'holding'
    and b.room_unit_id is not null
    and b.hold_expires_at > pg_catalog.now()
    and b.created_at > pg_catalog.now() - interval '90 seconds'
  order by b.created_at desc
  limit 1
  for update;

  if v_recent_booking.id is not null then
    if v_recent_booking.public_request_id is null then
      update public.bookings b
      set public_request_id = p_public_request_id
      where b.id = v_recent_booking.id
      returning b.* into v_recent_booking;
    end if;

    select inv.remaining
    into v_remaining
    from private.room_inventory_v2(
      v_recent_booking.room_type_id,
      v_recent_booking.checkin_at,
      v_recent_booking.checkout_at
    ) inv;

    return query
    select true, null::text, v_recent_booking.public_code, v_recent_booking.status,
           v_recent_booking.hold_expires_at, coalesce(v_remaining, 0);
    return;
  end if;

  select
    case when v_package_code = 'night' then 'Qua đêm'
         when v_package_code = '8h' then 'Qua đêm'
         when v_package_code = 'day' then 'Ngày'
         when v_package_code = '4h' then '4 tiếng'
         else '3 tiếng' end,
    coalesce(rp.sale_price, rp.base_price)
  into v_package_label, v_price
  from public.room_prices rp
  where rp.room_type_id = v_room_type.id
    and rp.package_code = any(
      case when v_package_code in ('8h', 'night') then array['8h', 'night']
           else array[v_package_code] end
    )
    and rp.is_active = true
    and (rp.starts_at is null or rp.starts_at <= p_checkin_at)
    and (rp.ends_at is null or rp.ends_at > p_checkin_at)
  order by
    case when rp.package_code = v_package_code then 0 else 1 end,
    rp.starts_at desc nulls last,
    rp.sort_order
  limit 1;

  if v_price is null then
    return query select false, 'VALIDATION_ERROR'::text, null::text, null::text, null::timestamptz, 0;
    return;
  end if;

  if v_package_code = 'day' then
    v_price := v_price * p_nights;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_room_type.id::text, 0)
  );

  select ru.*
  into v_unit
  from public.room_units ru
  where ru.room_type_id = v_room_type.id
    and ru.branch_id = v_room_type.branch_id
    and ru.status = 'available'
    and not exists (
      select 1
      from public.bookings other_booking
      where other_booking.room_unit_id = ru.id
        and (
          other_booking.status in ('deposited', 'paid', 'checked_in')
          or (
            other_booking.status = 'holding'
            and (
              other_booking.hold_expires_at is null
              or other_booking.hold_expires_at > pg_catalog.now()
              or (
                other_booking.quickpay_claim_token is not null
                and other_booking.quickpay_claimed_at
                    > pg_catalog.now() - interval '15 minutes'
              )
            )
          )
        )
        and tstzrange(other_booking.checkin_at, other_booking.checkout_at, '[)')
            && tstzrange(p_checkin_at, p_checkout_at, '[)')
    )
  order by ru.sort_order, ru.code
  for update of ru skip locked
  limit 1;

  if v_unit.id is null then
    return query select false, 'ROOM_UNAVAILABLE'::text, null::text, null::text, null::timestamptz, 0;
    return;
  end if;

  begin
    insert into public.bookings as b (
      public_request_id,
      source_code,
      branch_id,
      room_type_id,
      room_unit_id,
      customer_name,
      customer_phone,
      checkin_at,
      checkout_at,
      package_code,
      package_label,
      adults,
      children,
      nights,
      guests,
      status,
      total_amount,
      hold_expires_at,
      customer_note,
      internal_note,
      created_by
    ) values (
      p_public_request_id,
      'website',
      v_room_type.branch_id,
      v_room_type.id,
      v_unit.id,
      v_name,
      v_contact,
      p_checkin_at,
      p_checkout_at,
      v_package_code,
      v_package_label,
      p_adults,
      p_children,
      p_nights,
      v_guests,
      'holding',
      v_price,
      pg_catalog.now() + interval '30 minutes',
      nullif(pg_catalog.left(pg_catalog.btrim(coalesce(p_customer_note, '')), 500), ''),
      pg_catalog.format(
        'Yêu cầu web V2 | Tự giữ phòng trong 30 phút | Layout: %s (%s)',
        v_room_type.name,
        v_room_type.code
      ),
      null
    )
    returning b.* into v_booking;
  exception
    when exclusion_violation then
      return query select false, 'ROOM_UNAVAILABLE'::text, null::text, null::text, null::timestamptz, 0;
      return;
    when unique_violation then
      select b.* into v_booking
      from public.bookings b
      where b.public_request_id = p_public_request_id;
      if v_booking.id is null then
        raise;
      end if;
  end;

  select inv.remaining
  into v_remaining
  from private.room_inventory_v2(
    v_room_type.id,
    p_checkin_at,
    p_checkout_at
  ) inv;

  return query
  select true, null::text, v_booking.public_code, v_booking.status,
         v_booking.hold_expires_at, coalesce(v_remaining, 0);
end;
$$;

revoke all on function public.create_public_booking_v2(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer,integer,text)
  from public;
grant execute on function public.create_public_booking_v2(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer,integer,text)
  to anon, authenticated;

comment on function public.create_public_booking_v2(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer,integer,text)
is 'Idempotent anonymous intake. Atomically assigns one available physical room and creates a 30-minute holding booking.';

-- V15.4 accepted anonymous soft leads without idempotency or inventory
-- allocation. Keep the function for historical/operator compatibility, but
-- remove it from every Data API role so V2 is the only public intake path.
-- Some greenfield installs never loaded the standalone V15.4 script, so keep
-- this hardening conditional rather than making the migration depend on it.
do $legacy_public_intake$
begin
  if pg_catalog.to_regprocedure(
    'public.create_public_booking_request(text,text,timestamptz,timestamptz,text,text,integer,text)'
  ) is not null then
    execute 'revoke all on function public.create_public_booking_request(text,text,timestamptz,timestamptz,text,text,integer,text) from public, anon, authenticated, service_role';
    execute $comment$comment on function public.create_public_booking_request(text,text,timestamptz,timestamptz,text,text,integer,text) is 'Deprecated V15.4 intake. Data API execution revoked; use create_public_booking_v2.'$comment$;
  end if;
end;
$legacy_public_intake$;

create or replace function public.assign_booking_room_unit_v2(
  p_booking_id uuid,
  p_expected_updated_at timestamptz,
  p_room_type_id uuid,
  p_room_unit_id uuid,
  p_checkin_at timestamptz,
  p_checkout_at timestamptz
)
returns table(
  ok boolean,
  error_code text,
  booking_id uuid,
  public_code text,
  status text,
  room_unit_id uuid,
  room_unit_code text,
  room_unit_name text,
  checkin_at timestamptz,
  checkout_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_room_type public.room_types%rowtype;
  v_unit public.room_units%rowtype;
  v_next_status text;
begin
  if public.current_app_role() not in ('super_admin', 'admin', 'cskh') then
    return query
    select false, 'FORBIDDEN'::text, p_booking_id, null::text, null::text,
           null::uuid, null::text, null::text, null::timestamptz,
           null::timestamptz, null::timestamptz;
    return;
  end if;

  if p_booking_id is null
     or p_expected_updated_at is null
     or p_room_type_id is null
     or p_checkin_at is null
     or p_checkout_at is null
     or p_checkout_at <= p_checkin_at
     or extract(minute from p_checkin_at at time zone 'Asia/Ho_Chi_Minh')::integer % 30 <> 0
     or extract(second from p_checkin_at at time zone 'Asia/Ho_Chi_Minh') <> 0
     or extract(minute from p_checkout_at at time zone 'Asia/Ho_Chi_Minh')::integer % 30 <> 0
     or extract(second from p_checkout_at at time zone 'Asia/Ho_Chi_Minh') <> 0
     or p_checkout_at - p_checkin_at > interval '31 days' then
    return query
    select false, 'VALIDATION_ERROR'::text, p_booking_id, null::text, null::text,
           null::uuid, null::text, null::text, p_checkin_at,
           p_checkout_at, null::timestamptz;
    return;
  end if;

  -- Release leases before locking a specific booking. Keeping this global
  -- cleanup first gives every RPC the same lock order and avoids row-lock
  -- inversion with the Cron worker.
  perform public.release_expired_public_holds();

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if v_booking.id is null then
    return query
    select false, 'VALIDATION_ERROR'::text, p_booking_id, null::text, null::text,
           null::uuid, null::text, null::text, p_checkin_at,
           p_checkout_at, null::timestamptz;
    return;
  end if;

  if v_booking.updated_at is distinct from p_expected_updated_at then
    return query
    select false, 'BOOKING_STALE'::text, v_booking.id, v_booking.public_code,
           v_booking.status, v_booking.room_unit_id, null::text, null::text,
           v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
    return;
  end if;

  if v_booking.status not in ('new', 'consulting', 'holding', 'deposited', 'paid', 'checked_in') then
    return query
    select false, 'VALIDATION_ERROR'::text, v_booking.id, v_booking.public_code,
           v_booking.status, v_booking.room_unit_id, null::text, null::text,
           v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
    return;
  end if;

  select rt.*
  into v_room_type
  from public.room_types rt
  join public.branches br on br.id = rt.branch_id
  where rt.id = p_room_type_id
    and rt.status in ('available', 'limited')
    and br.is_active = true;

  if v_room_type.id is null then
    return query
    select false, 'ROOM_UNAVAILABLE'::text, v_booking.id, v_booking.public_code,
           v_booking.status, null::uuid, null::text, null::text,
           v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_room_type.id::text, 0)
  );

  if p_room_unit_id is not null then
    select ru.*
    into v_unit
    from public.room_units ru
    where ru.id = p_room_unit_id
    for update;

    if v_unit.id is null
       or v_unit.room_type_id is distinct from v_room_type.id
       or v_unit.branch_id is distinct from v_room_type.branch_id
       or v_unit.status <> 'available' then
      return query
      select false, 'ROOM_UNAVAILABLE'::text, v_booking.id, v_booking.public_code,
             v_booking.status, p_room_unit_id, null::text, null::text,
             v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
      return;
    end if;

    if exists (
      select 1
      from public.bookings other_booking
      where other_booking.id <> v_booking.id
        and other_booking.room_unit_id = v_unit.id
        and (
          other_booking.status in ('deposited', 'paid', 'checked_in')
          or (
            other_booking.status = 'holding'
            and (
              other_booking.hold_expires_at is null
              or other_booking.hold_expires_at > pg_catalog.now()
              or (
                other_booking.quickpay_claim_token is not null
                and other_booking.quickpay_claimed_at
                    > pg_catalog.now() - interval '15 minutes'
              )
            )
          )
        )
        and tstzrange(other_booking.checkin_at, other_booking.checkout_at, '[)')
            && tstzrange(p_checkin_at, p_checkout_at, '[)')
    ) then
      return query
      select false, 'ROOM_UNIT_CONFLICT'::text, v_booking.id, v_booking.public_code,
             v_booking.status, v_unit.id, v_unit.code, v_unit.unit_name,
             v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
      return;
    end if;
  else
    select ru.*
    into v_unit
    from public.room_units ru
    where ru.room_type_id = v_room_type.id
      and ru.branch_id = v_room_type.branch_id
      and ru.status = 'available'
      and not exists (
        select 1
        from public.bookings other_booking
        where other_booking.id <> v_booking.id
          and other_booking.room_unit_id = ru.id
          and (
            other_booking.status in ('deposited', 'paid', 'checked_in')
            or (
              other_booking.status = 'holding'
              and (
                other_booking.hold_expires_at is null
                or other_booking.hold_expires_at > pg_catalog.now()
                or (
                  other_booking.quickpay_claim_token is not null
                  and other_booking.quickpay_claimed_at
                      > pg_catalog.now() - interval '15 minutes'
                )
              )
            )
          )
          and tstzrange(other_booking.checkin_at, other_booking.checkout_at, '[)')
              && tstzrange(p_checkin_at, p_checkout_at, '[)')
      )
    order by ru.sort_order, ru.code
    for update of ru skip locked
    limit 1;

    if v_unit.id is null then
      return query
      select false, 'ROOM_UNAVAILABLE'::text, v_booking.id, v_booking.public_code,
             v_booking.status, null::uuid, null::text, null::text,
             v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
      return;
    end if;
  end if;

  v_next_status := case
    when v_booking.status in ('new', 'consulting') then 'holding'
    else v_booking.status
  end;

  begin
    update public.bookings b
    set room_type_id = v_room_type.id,
        branch_id = v_room_type.branch_id,
        room_unit_id = v_unit.id,
        checkin_at = p_checkin_at,
        checkout_at = p_checkout_at,
        status = v_next_status,
        hold_expires_at = null
    where b.id = v_booking.id
    returning b.* into v_booking;
  exception
    when exclusion_violation then
      return query
      select false, 'ROOM_UNIT_CONFLICT'::text, v_booking.id, v_booking.public_code,
             v_booking.status, v_unit.id, v_unit.code, v_unit.unit_name,
             v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
      return;
    when check_violation then
      return query
      select false, 'VALIDATION_ERROR'::text, v_booking.id, v_booking.public_code,
             v_booking.status, v_unit.id, v_unit.code, v_unit.unit_name,
             v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
      return;
  end;

  return query
  select true, null::text, v_booking.id, v_booking.public_code,
         v_booking.status, v_unit.id, v_unit.code, v_unit.unit_name,
         v_booking.checkin_at, v_booking.checkout_at, v_booking.updated_at;
end;
$$;

revoke all on function public.assign_booking_room_unit_v2(uuid,timestamptz,uuid,uuid,timestamptz,timestamptz)
  from public, anon;
grant execute on function public.assign_booking_room_unit_v2(uuid,timestamptz,uuid,uuid,timestamptz,timestamptz)
  to authenticated;

comment on function public.assign_booking_room_unit_v2(uuid,timestamptz,uuid,uuid,timestamptz,timestamptz)
is 'Operations-only CAS assignment. NULL p_room_unit_id auto-assigns; soft leads become non-expiring manual holds.';

-- Queue one delivery to the Edge Function. The function only dispatches rows
-- which the Edge Function can atomically claim (pending/failed). It never marks
-- a row processing/sent and therefore cannot bypass the Edge claim boundary.
create or replace function private.queue_booking_telegram_delivery_v2(
  p_delivery_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_delivery public.booking_notification_deliveries%rowtype;
  v_webhook_secret text;
  v_request_id bigint;
begin
  select d.*
  into v_delivery
  from public.booking_notification_deliveries d
  where d.id = p_delivery_id
    and d.status in ('pending', 'failed')
    and d.event_type = 'booking.created'
    and d.channel = 'telegram'
  for update;

  if v_delivery.id is null then
    return false;
  end if;

  select s.decrypted_secret
  into v_webhook_secret
  from vault.decrypted_secrets s
  where s.name = 'telegram_booking_webhook_secret'
  limit 1;

  if v_webhook_secret is null
     or pg_catalog.length(v_webhook_secret) < 32 then
    raise warning
      'Telegram retry secret is missing or invalid; delivery % was not dispatched',
      v_delivery.id;
    return false;
  end if;

  select net.http_post(
    url := 'https://icudxncctjselkjcbjvp.supabase.co/functions/v1/notify-booking-telegram',
    body := pg_catalog.jsonb_build_object(
      'type', 'INSERT',
      'table', 'booking_notification_deliveries',
      'schema', 'public',
      'record', pg_catalog.to_jsonb(v_delivery),
      'old_record', null
    ),
    params := '{}'::jsonb,
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-booking-webhook-secret', v_webhook_secret
    ),
    timeout_milliseconds := 10000
  )
  into v_request_id;

  if v_request_id is null then
    return false;
  end if;

  update public.booking_notification_deliveries d
  set last_dispatch_at = pg_catalog.clock_timestamp()
  where d.id = v_delivery.id
    and d.status in ('pending', 'failed');

  return found;
exception
  when others then
    -- A transport queue failure must never modify delivery state or reveal the
    -- Vault secret. Leaving the row actionable lets the next Cron run retry.
    raise warning
      'Telegram retry queue failed for delivery % (SQLSTATE %)',
      p_delivery_id,
      sqlstate;
    return false;
end;
$$;

revoke all on function private.queue_booking_telegram_delivery_v2(bigint)
  from public, anon, authenticated, service_role;

comment on function private.queue_booking_telegram_delivery_v2(bigint)
is 'Vault-authenticated pg_net dispatch. Delivery state is still claimed atomically by the Edge Function before any Telegram send.';

create or replace function private.retry_booking_telegram_notifications_v2(
  p_batch_size integer default 20
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_batch_size integer := greatest(1, least(coalesce(p_batch_size, 20), 100));
  v_delivery_id bigint;
  v_dispatched integer := 0;
begin
  if session_user::text not in ('postgres', 'supabase_admin') then
    raise exception 'FORBIDDEN: Telegram retry is cron-only'
      using errcode = '42501';
  end if;

  for v_delivery_id in
    select d.id
    from public.booking_notification_deliveries d
    where d.event_type = 'booking.created'
      and d.channel = 'telegram'
      and (
        (
          d.status = 'pending'
          and d.created_at <= pg_catalog.now() - interval '2 minutes'
          and coalesce(d.last_dispatch_at, d.created_at)
              <= pg_catalog.now() - interval '2 minutes'
        )
        or (
          d.status = 'failed'
          and d.attempt_count < 5
          and d.last_attempt_at is not null
          and d.last_attempt_at <= pg_catalog.now() - pg_catalog.make_interval(
            mins => power(2::numeric, greatest(d.attempt_count, 1))::integer
          )
          and coalesce(d.last_dispatch_at, '-infinity'::timestamptz)
              <= pg_catalog.now() - interval '1 minute'
          and pg_catalog.lower(coalesce(d.last_error, '')) not in (
            'review_required',
            'delivery_finalize_failed',
            'telegram_timeout',
            'telegram_unreachable',
            'telegram_invalid_response',
            'telegram_result_unknown'
          )
        )
      )
    order by coalesce(d.last_attempt_at, d.created_at), d.id
    for update skip locked
    limit v_batch_size
  loop
    if private.queue_booking_telegram_delivery_v2(v_delivery_id) then
      v_dispatched := v_dispatched + 1;
    end if;
  end loop;

  return v_dispatched;
end;
$$;

revoke all on function private.retry_booking_telegram_notifications_v2(integer)
  from public, anon, authenticated, service_role;

comment on function private.retry_booking_telegram_notifications_v2(integer)
is 'Cron-only deterministic retry: stale pending after 2m; failed attempts under 5 with exponential backoff; never retries processing or ambiguous outcomes.';

-- Keep the existing AFTER INSERT trigger name, but route initial delivery
-- through the same dispatcher used by Cron so last_dispatch_at is consistent
-- and there is exactly one pg_net request per trigger execution.
create or replace function private.dispatch_booking_telegram_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  perform private.queue_booking_telegram_delivery_v2(new.id);
  return new;
end;
$$;

revoke all on function private.dispatch_booking_telegram_notification()
  from public, anon, authenticated, service_role;

drop trigger if exists telegram_booking_delivery_insert
  on public.booking_notification_deliveries;
create trigger telegram_booking_delivery_insert
after insert on public.booking_notification_deliveries
for each row execute function private.dispatch_booking_telegram_notification();

-- Public holds now qualify for exactly one Telegram outbox row. The unique
-- booking/event/channel key remains the idempotency boundary.
create or replace function private.enqueue_booking_telegram_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  insert into public.booking_notification_deliveries (
    booking_id,
    booking_public_code
  )
  values (
    new.id,
    new.public_code
  )
  on conflict (booking_id, event_type, channel) do nothing;

  return new;
end;
$$;

revoke all on function private.enqueue_booking_telegram_notification()
  from public, anon, authenticated, service_role;

drop trigger if exists bookings_enqueue_telegram_notification on public.bookings;
create trigger bookings_enqueue_telegram_notification
after insert on public.bookings
for each row
when (
  new.source_code = 'website'
  and new.status = 'holding'
  and new.public_request_id is not null
  and new.created_by is null
)
execute function private.enqueue_booking_telegram_notification();

comment on trigger bookings_enqueue_telegram_notification on public.bookings
is 'Enqueues exactly one Telegram booking.created event for an anonymous website hold.';

-- Payment or check-in transitions clear public hold expiry in the same write.
-- The BEFORE trigger above is the universal backstop; this explicit assignment
-- keeps the QuickPay RPC contract self-documenting for future maintainers.
create or replace function private.clear_booking_hold_after_payment_v2()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.status in ('deposited', 'paid', 'checked_in', 'checked_out') then
    new.hold_expires_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_booking_hold_after_payment_v2()
  from public, anon, authenticated, service_role;

drop trigger if exists bookings_clear_hold_after_payment_v2 on public.bookings;
create trigger bookings_clear_hold_after_payment_v2
before insert or update of status on public.bookings
for each row execute function private.clear_booking_hold_after_payment_v2();

-- Canonical C10 3-hour price. This also updates any existing production row.
update public.room_prices rp
set base_price = 299000,
    updated_at = pg_catalog.now()
from public.room_types rt
where rt.id = rp.room_type_id
  and rt.code = 'C10-MIDNIGHT'
  and rp.package_code = '3h'
  and rp.starts_at is null
  and rp.ends_at is null;

-- Job names are case-sensitive. cron.schedule replaces the command/schedule
-- when this exact name already exists, keeping deploys idempotent.
select cron.schedule(
  'release-expired-public-booking-holds',
  '* * * * *',
  $cron$select public.release_expired_public_holds();$cron$
);

select cron.schedule(
  'retry-booking-telegram-notifications-v2',
  '* * * * *',
  $cron$select private.retry_booking_telegram_notifications_v2(20);$cron$
);

notify pgrst, 'reload schema';

commit;
