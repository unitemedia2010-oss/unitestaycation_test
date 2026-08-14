-- Unite Staycation - verification for Telegram booking notification outbox.
-- Run after 20260814094602_telegram_booking_notifications.sql.
-- Every query in sections 1-4 is read-only. Section 5 writes only inside a
-- transaction that is always rolled back, so it does not notify Telegram.

-- 1. Expected: rls_enabled=true and rls_forced=false.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'booking_notification_deliveries';

-- 2. Expected: anon/authenticated have no privileges; service_role has SELECT
-- plus UPDATE only on the delivery-state columns.
select
  role_name,
  pg_catalog.has_table_privilege(
    role_name,
    'public.booking_notification_deliveries',
    'SELECT'
  ) as can_select,
  pg_catalog.has_table_privilege(
    role_name,
    'public.booking_notification_deliveries',
    'INSERT'
  ) as can_insert,
  pg_catalog.has_table_privilege(
    role_name,
    'public.booking_notification_deliveries',
    'DELETE'
  ) as can_delete
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
order by role_name;

select
  grantee,
  privilege_type,
  column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'booking_notification_deliveries'
order by grantee, privilege_type, column_name;

select
  role_name,
  pg_catalog.has_sequence_privilege(
    role_name,
    'public.booking_notification_deliveries_id_seq',
    'USAGE'
  ) as sequence_usage,
  pg_catalog.has_sequence_privilege(
    role_name,
    'public.booking_notification_deliveries_id_seq',
    'SELECT'
  ) as sequence_select
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
order by role_name;

-- Expected: zero rows. Server access is via service_role bypass + grants, not a
-- client-facing RLS policy.
select schemaname, tablename, policyname, roles, cmd
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'booking_notification_deliveries';

-- 3. Expected: one UNIQUE constraint for booking/event/channel, one FK with
-- ON DELETE SET NULL, and all state/channel/event CHECK constraints.
select
  con.conname,
  con.contype,
  pg_catalog.pg_get_constraintdef(con.oid) as definition
from pg_catalog.pg_constraint con
where con.conrelid = 'public.booking_notification_deliveries'::regclass
order by con.contype, con.conname;

-- 4. Expected: AFTER INSERT trigger with the website/new/created_by-null WHEN
-- predicate; trigger function is SECURITY DEFINER with a fixed search_path.
select
  trg.tgname,
  pg_catalog.pg_get_triggerdef(trg.oid) as definition
from pg_catalog.pg_trigger trg
where trg.tgrelid = 'public.bookings'::regclass
  and not trg.tgisinternal
  and trg.tgname = 'bookings_enqueue_telegram_notification';

select
  n.nspname as function_schema,
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  p.proacl as execute_acl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname = 'enqueue_booking_telegram_notification';

-- 5. Optional transactional smoke test.
-- Expected NOTICEs:
--   qualified booking delivery count = 1
--   duplicate insert affected rows = 0
--   internal booking delivery count = 0
--   delivery history survived booking delete = true
-- ROLLBACK prevents both fixture persistence and webhook delivery.
begin;

do $verification$
declare
  v_booking_id uuid;
  v_booking_public_code text;
  v_internal_booking_id uuid;
  v_delivery_count integer;
  v_affected_rows integer;
  v_history_preserved boolean;
begin
  insert into public.bookings (
    source_code,
    customer_name,
    customer_phone,
    checkin_at,
    checkout_at,
    status,
    created_by
  )
  values (
    'website',
    'Telegram outbox verification',
    'verification-telegram-outbox',
    pg_catalog.now() + interval '10 years',
    pg_catalog.now() + interval '10 years 3 hours',
    'new',
    null
  )
  returning id, public_code into v_booking_id, v_booking_public_code;

  select pg_catalog.count(*)::integer
  into v_delivery_count
  from public.booking_notification_deliveries d
  where d.booking_id = v_booking_id
    and d.event_type = 'booking.created'
    and d.channel = 'telegram'
    and d.status = 'pending';

  raise notice 'qualified booking delivery count = %', v_delivery_count;
  if v_delivery_count <> 1 then
    raise exception 'Expected exactly one pending Telegram delivery';
  end if;

  insert into public.booking_notification_deliveries (
    booking_id,
    booking_public_code
  )
  values (
    v_booking_id,
    v_booking_public_code
  )
  on conflict (booking_id, event_type, channel) do nothing;

  get diagnostics v_affected_rows = row_count;
  raise notice 'duplicate insert affected rows = %', v_affected_rows;
  if v_affected_rows <> 0 then
    raise exception 'Idempotency constraint allowed a duplicate delivery';
  end if;

  insert into public.bookings (
    source_code,
    customer_name,
    customer_phone,
    checkin_at,
    checkout_at,
    status,
    created_by
  )
  values (
    'website',
    'Internal booking verification',
    'verification-internal-booking',
    pg_catalog.now() + interval '10 years 1 day',
    pg_catalog.now() + interval '10 years 1 day 3 hours',
    'new',
    pg_catalog.gen_random_uuid()
  )
  returning id into v_internal_booking_id;

  select pg_catalog.count(*)::integer
  into v_delivery_count
  from public.booking_notification_deliveries d
  where d.booking_id = v_internal_booking_id;

  raise notice 'internal booking delivery count = %', v_delivery_count;
  if v_delivery_count <> 0 then
    raise exception 'Internal booking unexpectedly created a delivery';
  end if;

  delete from public.bookings where id = v_booking_id;

  select exists (
    select 1
    from public.booking_notification_deliveries d
    where d.booking_id is null
      and d.booking_public_code = v_booking_public_code
  )
  into v_history_preserved;

  raise notice 'delivery history survived booking delete = %', v_history_preserved;
  if not v_history_preserved then
    raise exception 'Delivery history was not preserved after booking deletion';
  end if;
end;
$verification$;

rollback;
