import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../js/ops-data.js", import.meta.url), "utf8");

const requests = [];
let rpcResponse = null;
const localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
const window = {
  UNITE_SUPABASE_CONFIG: {
    url: "https://example.supabase.co",
    anonKey: "test-anon-key"
  },
  UniteAuth: {
    session: () => ({ access_token: "test-access-token" }),
    restFetch: async (path, options = {}) => {
      requests.push({ path, options });
      return rpcResponse;
    }
  },
  rooms: []
};

const context = vm.createContext({
  window,
  localStorage,
  fetch: async () => { throw new Error("unexpected fetch"); },
  console,
  Date,
  Intl,
  URL,
  URLSearchParams,
  Blob,
  setTimeout,
  clearTimeout,
  structuredClone
});
vm.runInContext(source, context, { filename: "js/ops-data.js" });
const ops = window.UniteOps;

const booking = (overrides = {}) => ({
  id: "US-TEST-01",
  supabaseId: "11111111-1111-4111-8111-111111111111",
  updatedAt: "2026-08-15T09:00:00.000Z",
  roomId: "C1-NOIR",
  roomUnitCode: "NOIR-P1",
  checkinAt: "2026-08-15T14:00",
  checkoutAt: "2026-08-15T17:00",
  status: "holding",
  ...overrides
});

test("availability uses half-open ranges and only hard reservations", () => {
  const rows = [
    booking({ id: "HOLD", checkinAt: "2026-08-15T14:00", checkoutAt: "2026-08-15T17:00" }),
    booking({ id: "SOFT", status: "new", checkinAt: "2026-08-15T16:00", checkoutAt: "2026-08-15T19:00" })
  ];

  assert.equal(ops.findConflicts(rows, booking({ id: "EDGE", checkinAt: "2026-08-15T17:00", checkoutAt: "2026-08-15T20:00" })).length, 0);
  assert.deepEqual(
    ops.findConflicts(rows, booking({ id: "OVERLAP", checkinAt: "2026-08-15T16:30", checkoutAt: "2026-08-15T18:00" })).map(row => row.id),
    ["HOLD"]
  );
});

test("calendar anomaly detector still exposes dirty soft overlaps", () => {
  const rows = [
    booking({ id: "HOLD", supabaseId: null }),
    booking({ id: "DIRTY-SOFT", supabaseId: null, status: "new", checkinAt: "2026-08-15T15:00", checkoutAt: "2026-08-15T16:00" }),
    booking({ id: "OTHER-UNIT", supabaseId: null, roomUnitCode: "NOIR-P2", checkinAt: "2026-08-15T15:00", checkoutAt: "2026-08-15T16:00" })
  ];
  const anomalies = ops.findUnitOverlapAnomalies(rows);

  assert.deepEqual([...anomalies.keys()].sort(), ["DIRTY-SOFT", "HOLD"]);
  assert.equal(anomalies.get("HOLD")[0].id, "DIRTY-SOFT");
});

test("CSKH assignment sends the canonical V2 RPC contract and promotes to holding", async () => {
  requests.length = 0;
  rpcResponse = [{
    ok: true,
    booking_id: "11111111-1111-4111-8111-111111111111",
    public_code: "US-TEST-01",
    status: "holding",
    room_unit_id: "33333333-3333-4333-8333-333333333333",
    room_unit_code: "NOIR-P2",
    room_unit_name: "NOIR - Phong 2",
    checkin_at: "2026-08-15T07:00:00.000Z",
    checkout_at: "2026-08-15T10:00:00.000Z",
    updated_at: "2026-08-15T09:01:00.000Z"
  }];

  const result = await ops.assignRoomUnitV2Async(
    booking({ status: "new", roomUnitCode: "" }),
    {
      roomTypeId: "22222222-2222-4222-8222-222222222222",
      roomUnitId: "33333333-3333-4333-8333-333333333333"
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.row.status, "holding");
  assert.equal(result.row.roomUnitCode, "NOIR-P2");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "rpc/assign_booking_room_unit_v2");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    p_booking_id: "11111111-1111-4111-8111-111111111111",
    p_expected_updated_at: "2026-08-15T09:00:00.000Z",
    p_room_type_id: "22222222-2222-4222-8222-222222222222",
    p_room_unit_id: "33333333-3333-4333-8333-333333333333",
    p_checkin_at: "2026-08-15T07:00:00.000Z",
    p_checkout_at: "2026-08-15T10:00:00.000Z"
  });
});

test("structured assignment conflicts stay actionable for the open modal", async () => {
  requests.length = 0;
  rpcResponse = [{ ok: false, error_code: "ROOM_UNIT_CONFLICT" }];

  const result = await ops.assignRoomUnitV2Async(booking(), {
    roomTypeId: "22222222-2222-4222-8222-222222222222",
    roomUnitId: "33333333-3333-4333-8333-333333333333"
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "ROOM_UNIT_CONFLICT");
  assert.match(result.message, /phòng|booking/i);
});

test("QuickPay keeps its claim-aware assignment and payment-proof safety path", () => {
  assert.match(source, /if \(!claimToken\)[\s\S]*assignRoomUnitV2Async/);
  assert.match(source, /rpc\/auto_assign_booking_room_unit/);
  assert.match(source, /p_claim_token:\s*claimToken/);
  assert.match(source, /rpc\/finalize_quickpay_booking/);
  assert.match(source, /quickPayClaimToken/);
});
