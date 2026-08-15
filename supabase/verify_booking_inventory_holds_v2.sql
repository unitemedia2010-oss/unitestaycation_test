-- Unite Staycation - verification for booking inventory/holds V2.
--
-- Sections 1-5 are read-only and safe for production. Section 6 is an optional
-- transactional smoke test: every fixture/write is rolled back and the website
-- fixture has created_by set, so it does not qualify for Telegram enqueue.

-- 1. Expected columns, unique idempotency index and validated CHECKs.
select
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'bookings'
  and c.column_name in (
    'hold_expires_at', 'public_request_id', 'package_code',
    'adults', 'children', 'nights'
  )
order by c.ordinal_position;

select
  con.conname,
  con.contype,
  con.convalidated,
  pg_catalog.pg_get_constraintdef(con.oid) as definition
from pg_catalog.pg_constraint con
where con.conrelid = 'public.bookings'::regclass
  and con.conname in (
    'bookings_inventory_state_check',
    'bookings_public_request_source_check',
    'bookings_public_party_check',
    'bookings_package_code_check',
    'bookings_no_overlap_per_unit'
  )
order by con.conname;

select indexname, indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename = 'bookings'
  and indexname in (
    'bookings_public_request_id_unique_idx',
    'bookings_expiring_public_holds_idx'
  )
order by indexname;

select
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'booking_notification_deliveries'
  and c.column_name = 'last_dispatch_at';

-- 2. Exact Data API signatures and fixed SECURITY DEFINER search_path.
select
  p.oid::regprocedure::text as signature,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  p.proacl as execute_acl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'public_room_availability_v2',
    'public_room_alternatives_v2',
    'create_public_booking_v2',
    'assign_booking_room_unit_v2',
    'release_expired_public_holds'
  )
order by signature;

-- Expected:
--   anon: availability/alternatives/create=true, assign/release=false
--   authenticated: availability/alternatives/create/assign=true, release=false
select
  role_name,
  pg_catalog.has_function_privilege(
    role_name,
    'public.public_room_availability_v2(timestamptz,timestamptz,integer,text)',
    'EXECUTE'
  ) as availability,
  pg_catalog.has_function_privilege(
    role_name,
    'public.public_room_alternatives_v2(text,timestamptz,text,integer,integer,integer)',
    'EXECUTE'
  ) as alternatives,
  pg_catalog.has_function_privilege(
    role_name,
    'public.create_public_booking_v2(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer,integer,text)',
    'EXECUTE'
  ) as public_create,
  pg_catalog.has_function_privilege(
    role_name,
    'public.assign_booking_room_unit_v2(uuid,timestamptz,uuid,uuid,timestamptz,timestamptz)',
    'EXECUTE'
  ) as ops_assign,
  pg_catalog.has_function_privilege(
    role_name,
    'public.release_expired_public_holds()',
    'EXECUTE'
  ) as release_holds
from (values ('anon'), ('authenticated')) as roles(role_name)
order by role_name;

-- Expected: false/false. V2 is the only Data API booking-intake path.
select
  role_name,
  coalesce(
    pg_catalog.has_function_privilege(
      role_name,
      pg_catalog.to_regprocedure(
        'public.create_public_booking_request(text,text,timestamptz,timestamptz,text,text,integer,text)'
      ),
      'EXECUTE'
    ),
    false
  ) as legacy_public_create
from (values ('anon'), ('authenticated')) as roles(role_name)
order by role_name;

-- Expected: both helpers are SECURITY DEFINER with fixed search_path; neither
-- anon nor authenticated can execute them directly.
select
  p.oid::regprocedure::text as signature,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  p.proacl as execute_acl,
  pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in (
    'queue_booking_telegram_delivery_v2',
    'retry_booking_telegram_notifications_v2'
  )
order by signature;

-- 3. Cron must be enabled and scheduled exactly once per minute.
select extname, extversion
from pg_catalog.pg_extension
where extname in ('btree_gist', 'pg_cron')
order by extname;

select jobname, schedule, command, active
from cron.job
where jobname in (
  'release-expired-public-booking-holds',
  'retry-booking-telegram-notifications-v2'
)
order by jobname;

-- 4. Telegram trigger must qualify website/public-request/holding inserts only.
select
  trg.tgname,
  pg_catalog.pg_get_triggerdef(trg.oid) as definition
from pg_catalog.pg_trigger trg
where trg.tgrelid = 'public.bookings'::regclass
  and not trg.tgisinternal
  and trg.tgname = 'bookings_enqueue_telegram_notification';

select
  trg.tgname,
  pg_catalog.pg_get_triggerdef(trg.oid) as definition
from pg_catalog.pg_trigger trg
where trg.tgrelid = 'public.booking_notification_deliveries'::regclass
  and not trg.tgisinternal
  and trg.tgname = 'telegram_booking_delivery_insert';

-- Read-only retry eligibility preview. No processing or ambiguous delivery is
-- eligible by construction; expected counts depend on current operational data.
select
  pg_catalog.count(*) filter (
    where d.status = 'pending'
      and d.created_at <= pg_catalog.now() - interval '2 minutes'
      and coalesce(d.last_dispatch_at, d.created_at)
          <= pg_catalog.now() - interval '2 minutes'
  )::integer as stale_pending,
  pg_catalog.count(*) filter (
    where d.status = 'failed'
      and d.attempt_count < 5
      and d.last_attempt_at is not null
      and d.last_attempt_at <= pg_catalog.now() - pg_catalog.make_interval(
        mins => power(2::numeric, greatest(d.attempt_count, 1))::integer
      )
      and coalesce(d.last_dispatch_at, '-infinity'::timestamptz)
          <= pg_catalog.now() - interval '1 minute'
      and pg_catalog.lower(coalesce(d.last_error, '')) not in (
        'review_required', 'delivery_finalize_failed', 'telegram_timeout',
        'telegram_unreachable', 'telegram_invalid_response',
        'telegram_result_unknown'
      )
  )::integer as retryable_failed,
  pg_catalog.count(*) filter (where d.status = 'processing')::integer as processing_not_retried
from public.booking_notification_deliveries d;

-- 5. All three queries must return zero rows after migration.
select id, public_code, status, room_unit_id
from public.bookings
where status in ('new', 'consulting')
  and room_unit_id is not null;

select id, public_code, status
from public.bookings
where status in ('holding', 'deposited', 'paid', 'checked_in')
  and room_unit_id is null;

select
  a.public_code as booking_a,
  b.public_code as booking_b,
  a.room_unit_id
from public.bookings a
join public.bookings b
  on a.id < b.id
 and a.room_unit_id = b.room_unit_id
 and a.status in ('holding', 'deposited', 'paid', 'checked_in')
 and b.status in ('holding', 'deposited', 'paid', 'checked_in')
 and tstzrange(a.checkin_at, a.checkout_at, '[)')
     && tstzrange(b.checkin_at, b.checkout_at, '[)');

-- Expected for the audited production cleanup: 4 notes. The migration is
-- data-driven, so another environment should equal its preflight soft+unit row
-- count rather than hard-coding four in a constraint.
select pg_catalog.count(*)::integer as normalized_soft_assignment_notes
from public.booking_notes
where note_type = 'system'
  and note like 'System V2: gỡ phòng cụ thể %';

-- Expected: base_price=299000. sale_price is intentionally untouched because
-- an active promotion may validly be lower.
select rt.code, rp.package_code, rp.base_price, rp.sale_price
from public.room_prices rp
join public.room_types rt on rt.id = rp.room_type_id
where rt.code = 'C10-MIDNIGHT'
  and rp.package_code = '3h'
  and rp.starts_at is null
  and rp.ends_at is null;

-- 6. Optional rollback-only smoke test.
begin;

do $booking_inventory_v2_verification$
declare
  v_suffix text := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
  v_branch_id uuid;
  v_room_type_id uuid;
  v_unit_1 uuid;
  v_unit_2 uuid;
  v_soft_booking_id uuid;
  v_soft_updated_at timestamptz;
  v_ops_user_id uuid := pg_catalog.gen_random_uuid();
  v_start timestamptz := pg_catalog.date_trunc('hour', pg_catalog.now()) + interval '10 years';
  v_assign record;
  v_released integer;
  v_count integer;
  v_failed_as_expected boolean;
  v_public_create record;
  v_availability record;
begin
  insert into public.branches (slug, name, is_active)
  values ('verify-v2-' || v_suffix, 'Verify inventory V2', true)
  returning id into v_branch_id;

  insert into public.room_types (
    branch_id, code, name, inventory_count, max_guests,
    status, is_published
  ) values (
    v_branch_id, 'VERIFY-V2-' || v_suffix, 'Verify layout V2', 2, 4,
    'available', true
  ) returning id into v_room_type_id;

  insert into public.room_units (branch_id, room_type_id, code, unit_name, status, sort_order)
  values
    (v_branch_id, v_room_type_id, 'VERIFY-V2-' || v_suffix || '-P1', 'Phòng 1', 'available', 1),
    (v_branch_id, v_room_type_id, 'VERIFY-V2-' || v_suffix || '-P2', 'Phòng 2', 'available', 2);

  select id into v_unit_1
  from public.room_units
  where code = 'VERIFY-V2-' || v_suffix || '-P1';

  select id into v_unit_2
  from public.room_units
  where code = 'VERIFY-V2-' || v_suffix || '-P2';

  insert into public.room_prices (
    room_type_id, package_code, package_label, duration_hours, base_price
  ) values (
    v_room_type_id, '3h', '3 tiếng', 3, 299000
  );

  insert into public.app_profiles (user_id, email, full_name, role, is_active)
  values (
    v_ops_user_id,
    'verify-' || v_suffix || '@example.invalid',
    'Verification CSKH',
    'cskh',
    true
  );

  -- auth.uid() versions in deployed Supabase projects may read either the
  -- canonical JSON claims GUC or the legacy per-claim GUC. Set both so this
  -- rollback-only verification exercises the same authenticated CSKH path.
  perform pg_catalog.set_config(
    'request.jwt.claims',
    pg_catalog.jsonb_build_object(
      'sub', v_ops_user_id::text,
      'role', 'authenticated'
    )::text,
    true
  );
  perform pg_catalog.set_config('request.jwt.claim.sub', v_ops_user_id::text, true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);

  -- Soft leads may exist only without a physical room.
  insert into public.bookings (
    source_code, branch_id, room_type_id, customer_name, customer_phone,
    checkin_at, checkout_at, status
  ) values (
    'walkin', v_branch_id, v_room_type_id, 'Soft lead', '0900000001',
    v_start, v_start + interval '3 hours', 'new'
  ) returning id, updated_at into v_soft_booking_id, v_soft_updated_at;

  v_failed_as_expected := false;
  begin
    update public.bookings
    set room_unit_id = v_unit_1
    where id = v_soft_booking_id;
  exception when check_violation then
    v_failed_as_expected := true;
  end;
  if not v_failed_as_expected then
    raise exception 'new + room_unit_id unexpectedly passed inventory CHECK';
  end if;

  -- Only the day package may represent multiple nights.
  select * into v_public_create
  from public.create_public_booking_v2(
    pg_catalog.gen_random_uuid(),
    'Invalid nights',
    '0900000099',
    'VERIFY-V2-' || v_suffix,
    '3h',
    v_start,
    v_start + interval '3 hours',
    2,
    0,
    2,
    null
  );
  if v_public_create.ok
     or v_public_create.error_code is distinct from 'VALIDATION_ERROR' then
    raise exception 'non-day package unexpectedly accepted nights > 1';
  end if;

  -- Manual ops assignment turns the soft lead into a non-expiring hold.
  select * into v_assign
  from public.assign_booking_room_unit_v2(
    v_soft_booking_id,
    v_soft_updated_at,
    v_room_type_id,
    v_unit_1,
    v_start,
    v_start + interval '3 hours'
  );
  if not v_assign.ok
     or v_assign.status <> 'holding'
     or v_assign.room_unit_id <> v_unit_1 then
    raise exception 'assign_booking_room_unit_v2 failed: %', v_assign.error_code;
  end if;

  -- An overlapping direct write is blocked by 23P01.
  v_failed_as_expected := false;
  begin
    insert into public.bookings (
      source_code, branch_id, room_type_id, room_unit_id,
      customer_name, customer_phone, checkin_at, checkout_at, status
    ) values (
      'walkin', v_branch_id, v_room_type_id, v_unit_1,
      'Overlap', '0900000002', v_start + interval '1 hour',
      v_start + interval '4 hours', 'holding'
    );
  exception when exclusion_violation then
    v_failed_as_expected := true;
  end;
  if not v_failed_as_expected then
    raise exception 'overlap unexpectedly passed exclusion constraint';
  end if;

  -- The half-open interval permits a booking exactly at the previous checkout.
  insert into public.bookings (
    source_code, branch_id, room_type_id, room_unit_id,
    customer_name, customer_phone, checkin_at, checkout_at, status
  ) values (
    'walkin', v_branch_id, v_room_type_id, v_unit_1,
    'Adjacent', '0900000003', v_start + interval '3 hours',
    v_start + interval '6 hours', 'holding'
  );

  -- A public hold created by an internal fixture does not enqueue Telegram and
  -- is released to consulting without deleting the booking.
  insert into public.bookings (
    public_request_id, source_code, branch_id, room_type_id, room_unit_id,
    customer_name, customer_phone, checkin_at, checkout_at,
    package_code, package_label, adults, children, nights, guests,
    status, hold_expires_at, created_by
  ) values (
    pg_catalog.gen_random_uuid(), 'website', v_branch_id, v_room_type_id, v_unit_2,
    'Expired hold', '0900000004', v_start, v_start + interval '3 hours',
    '3h', '3 tiếng', 2, 0, 1, 2,
    'holding', pg_catalog.now() - interval '1 minute', v_ops_user_id
  );

  -- An expired public hold remains untouched while an operations QuickPay
  -- claim is active. Without this predicate the legacy guard trigger aborts
  -- the entire cleanup transaction with QUICKPAY_BUSY.
  insert into public.bookings (
    public_request_id, source_code, branch_id, room_type_id, room_unit_id,
    customer_name, customer_phone, checkin_at, checkout_at,
    package_code, package_label, adults, children, nights, guests,
    status, hold_expires_at, quickpay_claim_token, quickpay_claimed_at,
    created_by
  ) values (
    pg_catalog.gen_random_uuid(), 'website', v_branch_id, v_room_type_id, v_unit_2,
    'Claimed expired hold', '0900000005', v_start + interval '1 day',
    v_start + interval '1 day 3 hours',
    '3h', '3 tiếng', 2, 0, 1, 2,
    'holding', pg_catalog.now() - interval '1 minute',
    pg_catalog.gen_random_uuid(), pg_catalog.now(), v_ops_user_id
  );

  select public.release_expired_public_holds() into v_released;
  if v_released < 1 then
    raise exception 'expired public hold was not released';
  end if;

  select pg_catalog.count(*)::integer into v_count
  from public.bookings
  where customer_phone = '0900000004'
    and status = 'consulting'
    and room_unit_id is null
    and hold_expires_at is null;
  if v_count <> 1 then
    raise exception 'released hold did not retain a consulting lead';
  end if;

  select pg_catalog.count(*)::integer into v_count
  from public.bookings
  where customer_phone = '0900000005'
    and status = 'holding'
    and room_unit_id = v_unit_2
    and hold_expires_at is not null
    and quickpay_claim_token is not null
    and quickpay_claimed_at > pg_catalog.now() - interval '15 minutes';
  if v_count <> 1 then
    raise exception 'active QuickPay claim was unexpectedly released';
  end if;

  select * into v_availability
  from public.public_room_availability_v2(
    v_start + interval '1 day',
    v_start + interval '1 day 3 hours',
    2,
    'VERIFY-V2-' || v_suffix
  );
  if v_availability.reserved <> 1 or v_availability.remaining <> 1 then
    raise exception 'active QuickPay claim was not preserved in aggregate inventory';
  end if;

  -- A room with future active inventory cannot be hidden/maintained.
  v_failed_as_expected := false;
  begin
    update public.room_units set status = 'maintenance' where id = v_unit_1;
  exception when check_violation then
    v_failed_as_expected := true;
  end;
  if not v_failed_as_expected then
    raise exception 'room with active booking unexpectedly entered maintenance';
  end if;

  raise notice 'booking inventory V2 rollback smoke test passed';
end;
$booking_inventory_v2_verification$;

rollback;
