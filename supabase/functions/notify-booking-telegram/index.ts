import {
  type BookingForNotification,
  buildTelegramMessage,
  constantTimeEqual,
  type DatabaseWebhookPayload,
  finalizeTelegramDelivery,
  isUuid,
  parseDatabaseWebhookPayload,
  toDeliveryId,
} from "./_shared.ts";

const WEBHOOK_SECRET_HEADER = "x-booking-webhook-secret";
const MAX_REQUEST_BYTES = 64 * 1024;
const SUPABASE_TIMEOUT_MS = 8_000;
const TELEGRAM_TIMEOUT_MS = 10_000;

type Delivery = {
  id: number | string;
  booking_id: string | null;
  booking_public_code: string;
  event_type: string;
  channel: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempt_count: number;
};

type TelegramResponse = {
  ok?: boolean;
  result?: { message_id?: number };
  parameters?: { retry_after?: number };
};

class SafeError extends Error {
  constructor(
    readonly code: string,
    readonly status = 500,
    readonly telegramOutcomeUnknown = false,
  ) {
    super(code);
  }
}

function requiredSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new SafeError(`missing_${name.toLowerCase()}`, 500);
  return value;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SafeError("upstream_timeout", 504);
    }
    throw new SafeError("upstream_unreachable", 502);
  } finally {
    clearTimeout(timer);
  }
}

function supabaseSecretKey(): string {
  const namedKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (namedKeys) {
    try {
      const parsed = JSON.parse(namedKeys) as Record<string, unknown>;
      const defaultKey = parsed.default;
      if (typeof defaultKey === "string" && defaultKey.trim()) {
        return defaultKey.trim();
      }
      const firstKey = Object.values(parsed).find((value) =>
        typeof value === "string" && value.startsWith("sb_secret_")
      );
      if (typeof firstKey === "string") return firstKey;
    } catch {
      throw new SafeError("invalid_supabase_secret_keys", 500);
    }
  }

  const singleSecretKey = Deno.env.get("SUPABASE_SECRET_KEY")?.trim();
  if (singleSecretKey) return singleSecretKey;
  return requiredSecret("SUPABASE_SERVICE_ROLE_KEY");
}

function adminHeaders(extra: HeadersInit = {}): Headers {
  const apiKey = supabaseSecretKey();
  const headers = new Headers(extra);
  headers.set("apikey", apiKey);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  if (apiKey.startsWith("eyJ")) {
    // Only legacy JWT-based service_role keys belong in Authorization.
    headers.set("Authorization", `Bearer ${apiKey}`);
  } else {
    // New sb_secret_ keys must be sent only through the apikey header.
    headers.delete("Authorization");
  }
  return headers;
}

async function supabaseRest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = requiredSecret("SUPABASE_URL").replace(/\/$/, "");
  const response = await fetchWithTimeout(
    `${baseUrl}/rest/v1/${path}`,
    { ...init, headers: adminHeaders(init.headers) },
    SUPABASE_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new SafeError(`supabase_http_${response.status}`, 502);
  }
  if (response.status === 204) return null as T;
  try {
    return await response.json() as T;
  } catch {
    throw new SafeError("supabase_invalid_response", 502);
  }
}

function selectDelivery(id: string): Promise<Delivery | null> {
  const query = new URLSearchParams({
    select:
      "id,booking_id,booking_public_code,event_type,channel,status,attempt_count",
    id: `eq.${id}`,
    limit: "1",
  });
  return supabaseRest<Delivery[]>(
    `booking_notification_deliveries?${query}`,
  ).then((rows) => rows[0] ?? null);
}

async function claimDelivery(id: string): Promise<Delivery | null> {
  const current = await selectDelivery(id);
  if (
    !current ||
    (current.status !== "pending" && current.status !== "failed")
  ) {
    return null;
  }
  if (
    current.event_type !== "booking.created" ||
    current.channel !== "telegram"
  ) {
    return null;
  }

  const now = new Date().toISOString();
  const query = new URLSearchParams({
    id: `eq.${id}`,
    status: "in.(pending,failed)",
    event_type: "eq.booking.created",
    channel: "eq.telegram",
    select:
      "id,booking_id,booking_public_code,event_type,channel,status,attempt_count",
  });
  const rows = await supabaseRest<Delivery[]>(
    `booking_notification_deliveries?${query}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "processing",
        attempt_count: Math.max(0, Number(current.attempt_count) || 0) + 1,
        last_attempt_at: now,
        last_error: null,
      }),
    },
  );
  return rows[0] ?? null;
}

async function fetchBooking(
  bookingId: string,
): Promise<BookingForNotification | null> {
  const query = new URLSearchParams({
    select:
      "id,public_code,source_code,status,created_by,customer_name,customer_phone,checkin_at,checkout_at,package_label,guests,hold_expires_at,branches(name),room_types(code,name),room_units(code,unit_name)",
    id: `eq.${bookingId}`,
    limit: "1",
  });
  const rows = await supabaseRest<BookingForNotification[]>(
    `bookings?${query}`,
  );
  return rows[0] ?? null;
}

function isWebsiteHoldingBooking(booking: BookingForNotification): boolean {
  return booking.source_code === "website" && booking.status === "holding" &&
    booking.created_by === null;
}

function deliveryIdFromPayload(
  payload: DatabaseWebhookPayload,
): { deliveryId: string } | null {
  if (
    payload.type.toUpperCase() !== "INSERT" || payload.schema !== "public"
  ) {
    return null;
  }

  if (payload.table === "booking_notification_deliveries") {
    if (
      (payload.record.status !== "pending" &&
        payload.record.status !== "failed") ||
      payload.record.event_type !== "booking.created" ||
      payload.record.channel !== "telegram"
    ) {
      return null;
    }
    const deliveryId = toDeliveryId(payload.record.id);
    return deliveryId ? { deliveryId } : null;
  }

  return null;
}

async function updateDelivery(
  id: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const query = new URLSearchParams({
    id: `eq.${id}`,
    status: "eq.processing",
    select: "id",
  });
  const rows = await supabaseRest<{ id: number | string }[]>(
    `booking_notification_deliveries?${query}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    },
  );
  return rows.length === 1;
}

function telegramFailureCode(status: number): string {
  if (status === 429) return "telegram_rate_limited";
  if (status === 401 || status === 403) return "telegram_auth_failed";
  if (status >= 500) return "telegram_unavailable";
  return `telegram_http_${status}`;
}

async function sendTelegramMessage(text: string): Promise<number> {
  const botToken = requiredSecret("TELEGRAM_BOT_TOKEN");
  const chatId = requiredSecret("TELEGRAM_CHAT_ID");
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken) || !/^-?\d+$/.test(chatId)) {
    throw new SafeError("telegram_configuration_invalid", 500);
  }
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        }),
      },
      TELEGRAM_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof SafeError && error.code === "upstream_timeout") {
      throw new SafeError("telegram_timeout", 504, true);
    }
    throw new SafeError("telegram_unreachable", 502, true);
  }

  if (!response.ok) {
    throw new SafeError(telegramFailureCode(response.status), 502);
  }

  let data: TelegramResponse;
  try {
    data = await response.json() as TelegramResponse;
  } catch {
    throw new SafeError("telegram_invalid_response", 502, true);
  }
  const messageId = data.result?.message_id;
  if (data.ok === false) {
    throw new SafeError("telegram_send_failed", 502);
  }
  if (!Number.isSafeInteger(messageId) || Number(messageId) <= 0) {
    throw new SafeError("telegram_result_unknown", 502, true);
  }
  return Number(messageId);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  let configuredSecret: string;
  try {
    configuredSecret = requiredSecret("BOOKING_WEBHOOK_SECRET");
  } catch {
    console.error("telegram webhook configuration error");
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }
  if (configuredSecret.length < 32) {
    console.error("telegram webhook secret is too short");
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const suppliedSecret = request.headers.get(WEBHOOK_SECRET_HEADER) ?? "";
  if (
    !suppliedSecret ||
    !(await constantTimeEqual(suppliedSecret, configuredSecret))
  ) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  let payload: DatabaseWebhookPayload | null;
  try {
    payload = parseDatabaseWebhookPayload(JSON.parse(rawBody));
  } catch {
    payload = null;
  }
  if (!payload) return json({ ok: false, error: "invalid_payload" }, 400);

  let deliveryId: string | undefined;
  let claimed = false;
  try {
    const resolved = deliveryIdFromPayload(payload);
    if (!resolved) return json({ ok: true, ignored: true });
    deliveryId = resolved.deliveryId;

    const delivery = await claimDelivery(deliveryId);
    if (!delivery) {
      return json({ ok: true, duplicate: true });
    }
    claimed = true;

    if (!delivery.booking_id || !isUuid(delivery.booking_id)) {
      throw new SafeError("booking_missing", 422);
    }
    const booking = await fetchBooking(delivery.booking_id);
    if (!booking) throw new SafeError("booking_missing", 422);
    if (!isWebsiteHoldingBooking(booking)) {
      throw new SafeError("booking_not_eligible", 422);
    }

    const checkinAt = new Date(booking.checkin_at);
    const checkoutAt = new Date(booking.checkout_at);
    if (
      Number.isNaN(checkinAt.getTime()) || Number.isNaN(checkoutAt.getTime()) ||
      checkoutAt <= checkinAt
    ) {
      throw new SafeError("booking_time_invalid", 422);
    }

    const telegramMessageId = await sendTelegramMessage(
      buildTelegramMessage(booking),
    );
    const finalized = await finalizeTelegramDelivery(
      updateDelivery,
      deliveryId,
      telegramMessageId,
    );
    if (!finalized) {
      // Leave the row in processing so a retry cannot send the same message again.
      console.error("telegram delivery finalize failed", { deliveryId });
      return json({
        ok: false,
        error: "delivery_finalize_failed",
        status: "review_required",
      }, 202);
    }

    return json({ ok: true, delivery_id: deliveryId, status: "sent" });
  } catch (error) {
    const safeError = error instanceof SafeError
      ? error
      : new SafeError("internal_error", 500);
    if (claimed && deliveryId) {
      try {
        await updateDelivery(
          deliveryId,
          safeError.telegramOutcomeUnknown
            ? { last_error: safeError.code }
            : { status: "failed", last_error: safeError.code },
        );
      } catch {
        console.error("telegram delivery failure state was not persisted", {
          deliveryId,
        });
      }
    }
    console.error("telegram delivery failed", {
      deliveryId: deliveryId ?? null,
      code: safeError.code,
    });
    if (safeError.telegramOutcomeUnknown) {
      return json({
        ok: false,
        error: safeError.code,
        status: "review_required",
      }, 202);
    }
    return json({ ok: false, error: safeError.code }, safeError.status);
  }
}

Deno.serve(handler);
