import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
};

const window = {
  location: new URL("https://unitestaycation.com.vn/rooms.html"),
  history: { replaceState() {} },
  addEventListener() {},
  dispatchEvent() {},
  setTimeout,
  clearTimeout,
  crypto: webcrypto
};
const document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => ({ textContent: "", querySelector: () => null, classList: { add() {}, remove() {} } }),
  body: { dataset: {}, classList: { add() {}, remove() {} } }
};
const context = vm.createContext({
  window,
  document,
  console,
  URL,
  URLSearchParams,
  Intl,
  Date,
  Math,
  JSON,
  Map,
  Set,
  WeakMap,
  AbortController,
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  localStorage: storage(),
  sessionStorage: storage(),
  navigator: {},
  crypto: webcrypto,
  fetch: async () => { throw new Error("Network is disabled in the deterministic harness"); },
  setTimeout,
  clearTimeout
});
window.window = window;
window.document = document;

vm.runInContext(read("js/rooms.js"), context, { filename: "js/rooms.js" });
vm.runInContext(read("js/app.js"), context, { filename: "js/app.js" });

const booking = window.UniteBookingState;
assert.ok(booking, "BookingState public API must be exposed");
assert.deepEqual(Object.keys(booking.packages), ["3h", "4h", "night", "day"]);

const cases = [
  ["3h", 1, "2099-01-15T14:00", "2099-01-15T17:00"],
  ["4h", 1, "2099-01-15T14:00", "2099-01-15T18:00"],
  ["night", 1, "2099-01-15T22:00", "2099-01-16T06:00"],
  ["day", 1, "2099-01-15T14:00", "2099-01-16T12:00"],
  ["day", 2, "2099-01-15T14:00", "2099-01-17T12:00"]
];
for (const [packageCode, nights, checkinAt, checkoutAt] of cases) {
  const state = booking.normalize({ packageCode, nights, checkinAt, adults: 2, children: 0 });
  assert.equal(state.checkinAt, checkinAt, `${packageCode} keeps canonical check-in`);
  assert.equal(state.checkoutAt, checkoutAt, `${packageCode} derives canonical checkout`);
  assert.equal(booking.hasExactInterval(state), true);
}

const incomplete = booking.normalize({ packageCode: "night", checkinAt: "" });
assert.equal(incomplete.checkinAt, "");
assert.equal(incomplete.checkoutAt, "");
assert.equal(booking.hasExactInterval(incomplete), false);
assert.equal(booking.normalize({ packageCode: "3h", checkinAt: "2000-01-01T14:00" }).checkinAt, "", "past public time is cleared instead of guessed");

const canonicalDetailUrl = new URL(booking.url("room.html", booking.normalize({
  branchId: "Chi nhánh Nhiêu Tứ",
  roomTypeCode: "C1-ELAN",
  packageCode: "3h",
  checkinAt: "2099-01-15T14:00"
}), { branchId: "Chi nhánh Lê Văn Sĩ", roomTypeCode: "C12-AMOR" }), "https://unitestaycation.com.vn/");
assert.equal(canonicalDetailUrl.searchParams.get("id"), "C12-AMOR", "detail URL writes the selected alternative as id");
assert.equal(canonicalDetailUrl.searchParams.has("room"), false, "detail URL never carries a competing room key");

const appSource = read("js/app.js");
assert.match(appSource, /public_room_availability_v2/);
assert.match(appSource, /public_room_alternatives_v2/);
assert.match(appSource, /create_public_booking_v2/);
for (const parameter of [
  "p_checkin_at", "p_checkout_at", "p_guests", "p_room_code",
  "p_public_request_id", "p_customer_name", "p_contact", "p_package_code",
  "p_adults", "p_children", "p_nights", "p_customer_note"
]) assert.match(appSource, new RegExp(`\\b${parameter}\\b`), `${parameter} is present in the public RPC contract`);
assert.doesNotMatch(appSource, /create_public_booking_request/);
assert.doesNotMatch(appSource, /\/rest\/v1\/bookings\?select=public_code/);
assert.doesNotMatch(appSource, /type="datetime-local"/);
assert.match(appSource, /hourCycle:\s*"h23"/);

const roomsSource = read("js/rooms.js");
assert.match(roomsSource, /C10-MIDNIGHT[\s\S]*?3 tiếng", value: "299k"/);
assert.doesNotMatch(roomsSource, /C10-MIDNIGHT[\s\S]*?3 tiếng", value: "259k"/);
for (const roomCode of ["C8-THE-ART", "C9-VELVET", "C10-MIDNIGHT"]) {
  assert.match(roomsSource, new RegExp(`id: "${roomCode}"[\\s\\S]*?status: "hidden"`), `${roomCode} stays hidden in the offline catalogue`);
}
const activeFallbackCodes = JSON.parse(JSON.stringify(vm.runInContext("syncPublicCatalogueMetadata(); rooms.map(room => room.id)", context)));
assert.deepEqual(activeFallbackCodes, ["C1-ELAN", "C1-NOIR", "C12-AMOR", "C12-ROMA"], "offline catalogue excludes every hidden Phan Tay Ho layout");
const nhieuTuRemaining = vm.runInContext(`bookingAvailabilityRowsInScope([
  { roomCode: "C1-ELAN", remaining: 3 },
  { roomCode: "C1-NOIR", remaining: 3 },
  { roomCode: "C12-AMOR", remaining: 3 },
  { roomCode: "C12-ROMA", remaining: 3 }
], { branchId: "Chi nhánh Nhiêu Tứ", roomTypeCode: "" }).reduce((sum, row) => sum + row.remaining, 0)`, context);
assert.equal(nhieuTuRemaining, 6, "branch availability sums only layouts belonging to Nhiêu Tứ");

const indexSource = read("index.html");
assert.match(read("css/custom.css"), /\.filter-btn\[hidden\][\s\S]*?display:\s*none\s*!important/, "hidden branch filters remain visually hidden despite component display rules");
assert.doesNotMatch(indexSource, /C8-THE-ART|C10-MIDNIGHT/, "static public cards and about image do not leak hidden layouts");
assert.match(read("css/custom.css"), /result-map-card[\s\S]*?C1-ELAN\/0\.jpg/, "result cover fallback uses an active layout");
assert.match(appSource, /bookingStateParams = new Set\(\[[\s\S]*?"id"/, "canonical state removes stale id and room keys before writing");

for (const page of ["index.html", "rooms.html", "room.html"]) {
  const html = read(page);
  assert.match(html, /css\/custom\.css\?v=v16\.5/);
  assert.match(html, /js\/rooms\.js\?v=v16\.5/);
  assert.match(html, /js\/app\.js\?v=v16\.6/);
}

console.log("public-booking-v16: 62 assertions passed");
