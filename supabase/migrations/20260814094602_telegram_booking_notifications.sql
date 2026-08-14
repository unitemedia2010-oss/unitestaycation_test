-- Unite Staycation - transactional outbox for Telegram booking notifications.
--
-- The booking INSERT and the outbox INSERT commit atomically. A Supabase
-- Database Webhook must listen to INSERT events on
-- public.booking_notification_deliveries and call the Edge Function. No
-- network request is made by PostgreSQL code in this migration.

begin;

create schema if not exists private;

-- Keep trigger helpers out of the exposed public schema.
revoke all on schema private from public, anon, authenticated;

create table public.booking_notification_deliveries (
  id bigint generated always as identity primary key,
  booking_id uuid references public.bookings(id) on delete set null,
  booking_public_code text not null,
  event_type text not null default 'booking.created',
  channel text not null default 'telegram',
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  telegram_message_id bigint,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_notification_deliveries_public_code_check
    check (pg_catalog.btrim(booking_public_code) <> ''),
  constraint booking_notification_deliveries_event_type_check
    check (event_type = 'booking.created'),
  constraint booking_notification_deliveries_channel_check
    check (channel = 'telegram'),
  constraint booking_notification_deliveries_status_check
    check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint booking_notification_deliveries_attempt_count_check
    check (attempt_count >= 0),
  constraint booking_notification_deliveries_message_id_check
    check (telegram_message_id is null or telegram_message_id > 0),
  constraint booking_notification_deliveries_updated_at_check
    check (updated_at >= created_at),
  constraint booking_notification_deliveries_state_check
    check (
      (
        status = 'pending'
        and attempt_count = 0
        and last_attempt_at is null
        and sent_at is null
        and telegram_message_id is null
        and last_error is null
      )
      or (
        status = 'processing'
        and attempt_count > 0
        and last_attempt_at is not null
        and sent_at is null
        and telegram_message_id is null
      )
      or (
        status = 'failed'
        and attempt_count > 0
        and last_attempt_at is not null
        and sent_at is null
        and telegram_message_id is null
        and nullif(pg_catalog.btrim(last_error), '') is not null
      )
      or (
        status = 'sent'
        and attempt_count > 0
        and last_attempt_at is not null
        and sent_at is not null
        and telegram_message_id is not null
        and last_error is null
      )
    ),
  constraint booking_notification_deliveries_booking_event_channel_key
    unique (booking_id, event_type, channel)
);

comment on table public.booking_notification_deliveries
is 'Transactional outbox and delivery history for booking notifications. A Database Webhook listens to INSERT; PostgreSQL never calls Telegram directly.';

comment on column public.booking_notification_deliveries.booking_id
is 'Nullable only after a booking is deleted; ON DELETE SET NULL preserves notification history.';

comment on column public.booking_notification_deliveries.booking_public_code
is 'Immutable booking-code snapshot retained even if the source booking is later deleted.';

comment on constraint booking_notification_deliveries_booking_event_channel_key
on public.booking_notification_deliveries
is 'Idempotency boundary: at most one delivery row per booking, event and channel.';

-- The unique constraint already provides a left-prefix index for booking_id,
-- so it also covers FK lookup/ON DELETE SET NULL without a duplicate FK index.
-- This partial index serves operational retry/monitoring scans only.
create index booking_notification_deliveries_actionable_idx
  on public.booking_notification_deliveries (status, created_at, id)
  where status in ('pending', 'failed');

alter table public.booking_notification_deliveries enable row level security;

-- Explicitly neutralize legacy Supabase default grants on new public tables.
-- No anon/authenticated policy is intentionally created.
revoke all privileges on table public.booking_notification_deliveries
  from public, anon, authenticated, service_role;
revoke all privileges on sequence public.booking_notification_deliveries_id_seq
  from public, anon, authenticated, service_role;

-- The server-side Edge Function may read a delivery and advance its state,
-- but cannot alter the immutable booking/event/channel identity columns.
grant select on table public.booking_notification_deliveries to service_role;
grant update (
  status,
  attempt_count,
  last_attempt_at,
  sent_at,
  telegram_message_id,
  last_error
) on public.booking_notification_deliveries to service_role;

create or replace function private.touch_booking_notification_delivery_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

comment on function private.touch_booking_notification_delivery_updated_at()
is 'Maintains the delivery audit timestamp for server-side status transitions.';

revoke all on function private.touch_booking_notification_delivery_updated_at()
  from public, anon, authenticated, service_role;

create trigger booking_notification_deliveries_touch_updated_at
before update on public.booking_notification_deliveries
for each row
execute function private.touch_booking_notification_delivery_updated_at();

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

comment on function private.enqueue_booking_telegram_notification()
is 'Enqueues one Telegram booking.created delivery in the booking transaction; performs no network request.';

-- SECURITY DEFINER is required so public booking intake remains independent of
-- revoked outbox-table grants. The helper is trigger-only and cannot be called
-- through the Data API.
revoke all on function private.enqueue_booking_telegram_notification()
  from public, anon, authenticated, service_role;

drop trigger if exists bookings_enqueue_telegram_notification
  on public.bookings;

create trigger bookings_enqueue_telegram_notification
after insert on public.bookings
for each row
when (
  new.source_code = 'website'
  and new.status = 'new'
  and new.created_by is null
)
execute function private.enqueue_booking_telegram_notification();

comment on trigger bookings_enqueue_telegram_notification on public.bookings
is 'Transactional outbox enqueue for anonymous website booking requests only.';

notify pgrst, 'reload schema';

commit;

-- Dashboard contract (configure after applying this migration):
--   schema/table: public.booking_notification_deliveries
--   event: INSERT
--   Edge Function lookup key: payload.record.id
--   initial record state: event_type=booking.created, channel=telegram,
--                         status=pending, attempt_count=0
--
-- Verification queries and a rollback-only smoke test live in:
--   supabase/verify_telegram_booking_notifications.sql
