-- Unite Staycation - dispatch Telegram outbox rows through Supabase Edge Functions.
--
-- BOOKING_WEBHOOK_SECRET is deliberately not stored in this migration or in
-- trigger arguments. The same value is stored separately in Supabase Vault as
-- telegram_booking_webhook_secret and in the Edge Function environment.

begin;

create extension if not exists pg_net with schema extensions;

create or replace function private.dispatch_booking_telegram_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_webhook_secret text;
  v_request_id bigint;
begin
  select s.decrypted_secret
  into v_webhook_secret
  from vault.decrypted_secrets as s
  where s.name = 'telegram_booking_webhook_secret'
  limit 1;

  if v_webhook_secret is null
    or pg_catalog.length(v_webhook_secret) < 32 then
    raise warning
      'Telegram booking webhook secret is missing or invalid; delivery % remains pending',
      new.id;
    return new;
  end if;

  select net.http_post(
    url := 'https://icudxncctjselkjcbjvp.supabase.co/functions/v1/notify-booking-telegram',
    body := pg_catalog.jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', pg_catalog.to_jsonb(new),
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

  return new;
exception
  when others then
    -- Notification transport must never roll back a customer booking. The
    -- transactional outbox row remains pending for an operator-controlled
    -- replay after the transport issue has been resolved.
    raise warning
      'Telegram booking webhook queue failed for delivery % (SQLSTATE %); delivery remains pending',
      new.id,
      sqlstate;
    return new;
end;
$$;

comment on function private.dispatch_booking_telegram_notification()
is 'Queues an asynchronous Vault-authenticated request to the Telegram booking Edge Function without blocking booking intake.';

revoke all on function private.dispatch_booking_telegram_notification()
  from public, anon, authenticated, service_role;

drop trigger if exists telegram_booking_delivery_insert
  on public.booking_notification_deliveries;

create trigger telegram_booking_delivery_insert
after insert on public.booking_notification_deliveries
for each row
execute function private.dispatch_booking_telegram_notification();

comment on trigger telegram_booking_delivery_insert
on public.booking_notification_deliveries
is 'Dispatches each newly committed Telegram outbox row asynchronously through pg_net.';

commit;
