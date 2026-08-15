export const CSKH_HOLDING_BOOKINGS_URL =
  "https://unitestaycation.com.vn/cskh.html?status=holding";

export type BookingForNotification = {
  id: string;
  public_code: string;
  source_code: string;
  status: string;
  created_by: string | null;
  customer_name: string;
  customer_phone: string;
  checkin_at: string;
  checkout_at: string;
  package_label: string | null;
  guests: number;
  hold_expires_at: string | null;
  branches?: { name?: string | null } | { name?: string | null }[] | null;
  room_types?:
    | { code?: string | null; name?: string | null }
    | { code?: string | null; name?: string | null }[]
    | null;
  room_units?:
    | { code?: string | null; unit_name?: string | null }
    | { code?: string | null; unit_name?: string | null }[]
    | null;
};

export type DatabaseWebhookPayload = {
  type: string;
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
};

export function parseDatabaseWebhookPayload(
  value: unknown,
): DatabaseWebhookPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.type !== "string" ||
    typeof candidate.table !== "string" ||
    typeof candidate.schema !== "string" ||
    !candidate.record ||
    typeof candidate.record !== "object" ||
    Array.isArray(candidate.record)
  ) {
    return null;
  }

  return {
    type: candidate.type,
    table: candidate.table,
    schema: candidate.schema,
    record: candidate.record as Record<string, unknown>,
    old_record: candidate.old_record && typeof candidate.old_record === "object"
      ? candidate.old_record as Record<string, unknown>
      : null,
  };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

export function toDeliveryId(value: unknown): string | null {
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) return value;
  if (
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
  ) {
    return String(value);
  }
  return null;
}

export async function constantTimeEqual(
  left: string,
  right: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let mismatch = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    mismatch |= leftBytes[index] ^ rightBytes[index];
  }
  return mismatch === 0;
}

export function maskPhone(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 3) return "•••";
  return `•••${digits.slice(-3)}`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatHcmDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_booking_time");

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("hour")}:${part("minute")} ${part("day")}/${part("month")}/${
    part("year")
  }`;
}

function relationName(
  relation:
    | { name?: string | null }
    | { name?: string | null }[]
    | null
    | undefined,
): string {
  const row = Array.isArray(relation) ? relation[0] : relation;
  return String(row?.name ?? "Chưa xác định");
}

function roomLabel(
  relation:
    | { code?: string | null; name?: string | null }
    | { code?: string | null; name?: string | null }[]
    | null
    | undefined,
): string {
  const row = Array.isArray(relation) ? relation[0] : relation;
  const name = String(row?.name ?? "Chưa xác định");
  const code = String(row?.code ?? "").trim();
  return code ? `${name} (${code})` : name;
}

function roomUnitLabel(
  relation:
    | { code?: string | null; unit_name?: string | null }
    | { code?: string | null; unit_name?: string | null }[]
    | null
    | undefined,
): string {
  const row = Array.isArray(relation) ? relation[0] : relation;
  const unitName = String(row?.unit_name ?? "Chưa xếp phòng");
  const code = String(row?.code ?? "").trim();
  return code ? `${unitName} (${code})` : unitName;
}

export function buildTelegramMessage(booking: BookingForNotification): string {
  const checkin = formatHcmDateTime(booking.checkin_at);
  const checkout = formatHcmDateTime(booking.checkout_at);
  const guests = Number.isFinite(booking.guests) && booking.guests > 0
    ? Math.trunc(booking.guests)
    : 1;
  const cskhUrl = `${CSKH_HOLDING_BOOKINGS_URL}&booking=${
    encodeURIComponent(booking.public_code)
  }`;
  const holdExpiry = booking.hold_expires_at
    ? formatHcmDateTime(booking.hold_expires_at)
    : "CSKH giữ thủ công";

  return [
    "🟠 <b>ĐƠN WEB ĐANG GIỮ PHÒNG</b>",
    "",
    `Mã: <code>${escapeHtml(booking.public_code)}</code>`,
    `Khách: <b>${escapeHtml(booking.customer_name)}</b>`,
    `Zalo/WhatsApp: <code>${escapeHtml(booking.customer_phone)}</code>`,
    `Chi nhánh: ${escapeHtml(relationName(booking.branches))}`,
    `Layout: ${escapeHtml(roomLabel(booking.room_types))}`,
    `Phòng thực tế: ${escapeHtml(roomUnitLabel(booking.room_units))}`,
    `Nhận: <b>${escapeHtml(checkin)}</b>`,
    `Trả: <b>${escapeHtml(checkout)}</b>`,
    `Gói: ${
      escapeHtml(booking.package_label || "Chưa xác định")
    } · ${guests} khách`,
    `Giữ đến: <b>${escapeHtml(holdExpiry)}</b>`,
    "",
    `<a href="${escapeHtml(cskhUrl)}">Mở đúng đơn trong CSKH</a>`,
  ].join("\n");
}

export type DeliveryUpdater = (
  id: string,
  patch: Record<string, unknown>,
) => Promise<boolean>;

/**
 * Finalize a delivery only after Telegram has returned a positive message id.
 * If Supabase cannot persist `sent`, the existing `processing` claim is kept
 * non-retryable and receives a best-effort review marker instead. This avoids
 * sending a second Telegram message when the first send already succeeded.
 */
export async function finalizeTelegramDelivery(
  update: DeliveryUpdater,
  deliveryId: string,
  telegramMessageId: number,
  sentAt = new Date().toISOString(),
): Promise<boolean> {
  try {
    const finalized = await update(deliveryId, {
      status: "sent",
      sent_at: sentAt,
      telegram_message_id: telegramMessageId,
      last_error: null,
    });
    if (finalized) return true;
  } catch {
    // Telegram has already accepted the message. Do not make this delivery
    // retryable because the outcome of the external side effect is known.
  }

  try {
    await update(deliveryId, { last_error: "delivery_finalize_failed" });
  } catch {
    // The original `processing` claim is already the safe state.
  }
  return false;
}
