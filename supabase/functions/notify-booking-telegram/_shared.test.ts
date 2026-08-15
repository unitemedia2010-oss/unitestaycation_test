import {
  buildTelegramMessage,
  constantTimeEqual,
  finalizeTelegramDelivery,
  formatHcmDateTime,
  maskPhone,
  parseDatabaseWebhookPayload,
  toDeliveryId,
} from "./_shared.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertMatch(value: string, pattern: RegExp): void {
  if (!pattern.test(value)) {
    throw new Error(`Expected value to match ${pattern}`);
  }
}

function assertNotMatch(value: string, pattern: RegExp): void {
  if (pattern.test(value)) {
    throw new Error(`Expected value not to match ${pattern}`);
  }
}

Deno.test("parses a Supabase database webhook payload", () => {
  const payload = parseDatabaseWebhookPayload({
    type: "INSERT",
    table: "booking_notification_deliveries",
    schema: "public",
    record: { id: 12 },
  });
  assertEquals(payload?.record.id, 12);
  assertEquals(parseDatabaseWebhookPayload({ record: {} }), null);
});

Deno.test("accepts only safe positive delivery ids", () => {
  assertEquals(toDeliveryId(12), "12");
  assertEquals(toDeliveryId("90071992547409930"), "90071992547409930");
  assertEquals(toDeliveryId(0), null);
  assertEquals(toDeliveryId(9_007_199_254_740_992), null);
});

Deno.test("masks the phone and formats canonical timestamps in Ho Chi Minh City", () => {
  assertEquals(maskPhone("+84 312 456 758"), "•••758");
  assertEquals(
    formatHcmDateTime("2026-07-18T11:00:00.000Z"),
    "18:00 18/07/2026",
  );
});

Deno.test("compares webhook secrets without short-circuiting plaintext", async () => {
  assertEquals(await constantTimeEqual("a-secret", "a-secret"), true);
  assertEquals(await constantTimeEqual("a-secret", "not-it"), false);
});

Deno.test("builds an escaped private-CSKH Telegram message with full identity and no private note/email", () => {
  const booking = {
    id: "018fdb1b-7de7-7d7b-8d30-cb7f03752e2a",
    public_code: "US-<123>",
    source_code: "website",
    status: "holding",
    created_by: null,
    customer_name: "Nguyễn <An & Minh>",
    customer_phone: "0312456758",
    customer_email: "must-not-appear@example.com",
    customer_note: "Ghi chú riêng không được gửi",
    checkin_at: "2026-07-18T11:00:00.000Z",
    checkout_at: "2026-07-18T15:00:00.000Z",
    hold_expires_at: "2026-07-18T11:30:00.000Z",
    package_label: "4 tiếng",
    guests: 2,
    branches: { name: "Chi nhánh Phan Tây Hồ" },
    room_types: { code: "C8-THE-ART", name: "THE ART Layout" },
    room_units: { code: "C8-THE-ART-P1", unit_name: "Phòng 1" },
  };
  const message = buildTelegramMessage(booking);
  assertMatch(message, /US-&lt;123&gt;/);
  assertMatch(message, /Nguyễn &lt;An &amp; Minh&gt;/);
  assertMatch(message, /0312456758/);
  assertMatch(message, /Phòng 1 \(C8-THE-ART-P1\)/);
  assertMatch(message, /18:00 18\/07\/2026/);
  assertMatch(message, /22:00 18\/07\/2026/);
  assertMatch(message, /Giữ đến: <b>18:30 18\/07\/2026<\/b>/);
  assertMatch(message, /cskh\.html\?status=holding&amp;booking=US-%3C123%3E/);
  assertNotMatch(message, /must-not-appear@example\.com/);
  assertNotMatch(message, /Ghi chú riêng/);
});

Deno.test("keeps a Telegram-success delivery processing when Supabase sent finalization throws", async () => {
  const calls: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const finalized = await finalizeTelegramDelivery(
    async (id, patch) => {
      calls.push({ id, patch });
      if (calls.length === 1) throw new Error("supabase temporarily unreachable");
      return true;
    },
    "42",
    987654,
    "2026-08-15T10:30:00.000Z",
  );

  assertEquals(finalized, false);
  assertEquals(calls.length, 2);
  assertEquals(calls[0].id, "42");
  assertEquals(calls[0].patch.status, "sent");
  assertEquals(calls[0].patch.telegram_message_id, 987654);
  assertEquals(calls[1].patch.status, undefined);
  assertEquals(calls[1].patch.last_error, "delivery_finalize_failed");
});
