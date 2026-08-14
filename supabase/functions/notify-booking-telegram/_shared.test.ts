import {
  buildTelegramMessage,
  constantTimeEqual,
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

Deno.test("builds an escaped Telegram message without exposing the full phone", () => {
  const bookingWithUnusedName = {
    id: "018fdb1b-7de7-7d7b-8d30-cb7f03752e2a",
    public_code: "US-<123>",
    source_code: "website",
    status: "new",
    created_by: null,
    customer_name: "FULL CUSTOMER NAME MUST NOT LEAK",
    customer_phone: "0312456758",
    checkin_at: "2026-07-18T11:00:00.000Z",
    checkout_at: "2026-07-18T15:00:00.000Z",
    package_label: "4 tiếng",
    guests: 2,
    branches: { name: "Chi nhánh Phan Tây Hồ" },
    room_types: { code: "C8-THE-ART", name: "THE ART Layout" },
  };
  const message = buildTelegramMessage(bookingWithUnusedName);
  assertMatch(message, /US-&lt;123&gt;/);
  assertNotMatch(message, /FULL CUSTOMER NAME MUST NOT LEAK/);
  assertMatch(message, /•••758/);
  assertNotMatch(message, /0312456758/);
  assertMatch(message, /18:00 18\/07\/2026/);
  assertMatch(message, /22:00 18\/07\/2026/);
  assertMatch(message, /cskh\.html\?status=new&amp;booking=US-%3C123%3E/);
});
