// UNITESTAYCATION/js/cskh.js

const cskhRooms = Array.isArray(window.rooms)
  ? window.rooms
  : (typeof rooms !== "undefined" ? rooms : []);

const cskhState = {
  bookings: window.UniteOps.loadBookings(),
  search: "",
  status: "all",
  source: "all",
  liveResult: null,
  calendarStart: null
};

const cskhStatusOrder = [
  "new",
  "consulting",
  "holding",
  "deposited",
  "paid",
  "checked_in",
  "checked_out"
];

const cskhNumber = (value) => new Intl.NumberFormat("vi-VN").format(Number(value || 0));

const cskhToday = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const cskhDateKey = (date) => {
  const copy = new Date(date);
  if (Number.isNaN(copy.getTime())) return cskhToday();
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${copy.getFullYear()}-${month}-${day}`;
};

const cskhWeekStart = (value = new Date()) => {
  const date = new Date(value);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const cskhWeekDays = (start = cskhState.calendarStart) => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(start || cskhWeekStart());
  date.setDate(date.getDate() + index);
  return date;
});

const cskhParseMoney = (value) => Number(String(value || "").replace(/[^\d]/g, "")) || 0;

const cskhFormatMoneyInput = (value) => {
  const number = cskhParseMoney(value);
  return number ? new Intl.NumberFormat("vi-VN").format(number) : "";
};

const cskhEscapeHTML = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const cskhBillUrlFromPayment = (payment = {}) => {
  if (payment.billUrl) return payment.billUrl;
  if (payment.billStoragePath && window.UniteOps.storagePublicUrl) {
    return window.UniteOps.storagePublicUrl("booking-bills", payment.billStoragePath);
  }
  return "";
};

const cskhBookingBillUrl = (booking = {}) => {
  if (booking.billUrl) return booking.billUrl;
  const payments = Array.isArray(booking.payments) ? booking.payments : [];
  return payments.map(cskhBillUrlFromPayment).find(Boolean) || "";
};

const cskhBookingBillName = (booking = {}) => {
  if (booking.billName) return booking.billName;
  const payments = Array.isArray(booking.payments) ? booking.payments : [];
  return payments.slice().reverse().find(payment => payment.billName)?.billName || "";
};

const cskhTimeToMinutes = (time = "00:00") => {
  const [hours = 0, minutes = 0] = String(time || "00:00").split(":").map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
};

const cskhMinutesToTime = (minutes = 0) => {
  const normalized = Math.max(0, Math.min(1440, Number(minutes || 0)));
  if (normalized === 1440) return "24:00";
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
  const mm = String(normalized % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const cskhPackageHours = (label = "") => {
  if (label.includes("4")) return 4;
  if (label.includes("8")) return 8;
  if (label.includes("ngày") || label.includes("Ngày")) return 22;
  return 3;
};

const cskhAddHours = (time = "14:00", hours = 3) => {
  const total = cskhTimeToMinutes(time) + Math.round(hours * 60);
  const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const cskhBookingStartTime = (booking) => booking.startTime || "14:00";

const cskhBookingEndTime = (booking) => booking.endTime || cskhAddHours(cskhBookingStartTime(booking), cskhPackageHours(booking.packageLabel));

const cskhActiveBooking = (booking) => !["cancelled", "no_show"].includes(booking.status);

const cskhBookingTouchesDate = (booking, dateKey) => {
  const start = booking.stayDate || "";
  const end = booking.checkoutDate || booking.stayDate || "";
  return start <= dateKey && end >= dateKey;
};

const cskhRoomInventory = (roomId) => {
  const room = cskhRooms.find(item => item.id === roomId);
  return Math.max(0, Number(room?.inventory || 1));
};

const cskhDateKeysBetween = (startKey, endKey = startKey) => {
  const keys = [];
  const start = new Date(startKey);
  const end = new Date(endKey || startKey);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [startKey].filter(Boolean);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    keys.push(cskhDateKey(date));
  }
  return keys;
};

const cskhBookingRangeForDate = (booking, dateKey) => {
  if (!cskhBookingTouchesDate(booking, dateKey)) return null;
  const startDate = booking.stayDate || dateKey;
  const endDate = booking.checkoutDate || booking.stayDate || dateKey;
  const start = cskhTimeToMinutes(cskhBookingStartTime(booking));
  const end = cskhTimeToMinutes(cskhBookingEndTime(booking));

  if (startDate === endDate) return { start, end: end <= start ? 1440 : end };
  if (dateKey === startDate) return { start, end: 1440 };
  if (dateKey === endDate) return { start: 0, end: end || 1440 };
  if (dateKey > startDate && dateKey < endDate) return { start: 0, end: 1440 };
  return null;
};

const cskhRangesOverlap = (a, b) => Boolean(a && b && a.start < b.end && b.start < a.end);

const cskhBookingsOverlapOnDate = (a, b, dateKey) => cskhRangesOverlap(
  cskhBookingRangeForDate(a, dateKey),
  cskhBookingRangeForDate(b, dateKey)
);

const cskhBookingsOverlap = (a, b) => {
  const start = a.stayDate > b.stayDate ? a.stayDate : b.stayDate;
  const aEnd = a.checkoutDate || a.stayDate;
  const bEnd = b.checkoutDate || b.stayDate;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (!start || !end || start > end) return false;
  return cskhDateKeysBetween(start, end).some(dateKey => cskhBookingsOverlapOnDate(a, b, dateKey));
};

const cskhFindConflicts = (booking, list = cskhState.bookings) => {
  if (!cskhActiveBooking(booking)) return [];
  const conflicts = new Map();
  const inventory = cskhRoomInventory(booking.roomId);
  const dates = cskhDateKeysBetween(booking.stayDate, booking.checkoutDate || booking.stayDate);

  dates.forEach(dateKey => {
    const dayOverlaps = list.filter(item => {
      if (!cskhActiveBooking(item)) return false;
      if (item.id === booking.id) return false;
      if (item.roomId !== booking.roomId) return false;
      return cskhBookingsOverlapOnDate(item, booking, dateKey);
    });
    if (dayOverlaps.length >= inventory) {
      dayOverlaps.forEach(item => conflicts.set(item.id, item));
    }
  });

  return [...conflicts.values()];
};

const cskhMaxConcurrentForDay = (roomId, dateKey) => {
  const ranges = cskhState.bookings
    .filter(booking => cskhActiveBooking(booking) && booking.roomId === roomId)
    .map(booking => cskhBookingRangeForDate(booking, dateKey))
    .filter(Boolean);
  const points = ranges.flatMap(range => [
    { minute: range.start, delta: 1 },
    { minute: range.end, delta: -1 }
  ]).sort((a, b) => a.minute - b.minute || a.delta - b.delta);
  let current = 0;
  let max = 0;
  points.forEach(point => {
    current += point.delta;
    max = Math.max(max, current);
  });
  return max;
};

const cskhAddDays = (value, days) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const cskhBranches = () => [...new Set(cskhRooms.map(room => room.location).filter(Boolean))];

const cskhSources = () => [...new Set([
  ...window.UniteOps.sources,
  ...cskhState.bookings.map(item => item.source).filter(Boolean)
])];

const cskhSave = () => window.UniteOps.saveBookings(cskhState.bookings);

const cskhApplyPermissions = () => {
  window.UniteOps.applyPermissionsToDom();
  const canManage = window.UniteOps.can("manageBookings");
  document.querySelector("#bookingForm")?.querySelectorAll("input, select, textarea, button").forEach(node => {
    node.disabled = !canManage;
  });
};

const cskhApplyLiveRooms = (rows = []) => {
  rows.forEach(row => {
    const room = cskhRooms.find(item => item.id === row.code);
    if (!room) return;
    room.inventory = Math.max(0, Number(row.inventory || room.inventory || 1));
    if (row.status) room.status = row.status;
    if (row.category) room.category = row.category;
    if (row.name) room.name = row.name;
    if (row.branch) room.location = row.branch;
  });
};

const cskhHydrateRoomsFromLive = async () => {
  const result = await window.UniteOps.loadRoomsAsync();
  if (result.ok) cskhApplyLiveRooms(result.rows);
  return result;
};

const cskhFiltered = () => {
  const keyword = cskhState.search.trim().toLowerCase();
  return cskhState.bookings.filter(booking => {
    if (cskhState.status !== "all" && booking.status !== cskhState.status) return false;
    if (cskhState.source !== "all" && booking.source !== cskhState.source) return false;
    if (!keyword) return true;
    return [
      booking.id,
      booking.customerName,
      booking.phone,
      booking.roomId,
      booking.roomName,
      booking.branch,
      booking.note
    ].some(value => String(value || "").toLowerCase().includes(keyword));
  });
};

const cskhStatusLabel = (status) => window.UniteOps.statuses[status] || status;

const cskhNextStatus = (status) => {
  const index = cskhStatusOrder.indexOf(status);
  if (index < 0) return "consulting";
  return cskhStatusOrder[Math.min(index + 1, cskhStatusOrder.length - 1)];
};

const cskhBookingMessage = (booking) => [
  `Unite Staycation xác nhận thông tin booking:`,
  `Khách: ${booking.customerName} - ${booking.phone}`,
  `Phòng: ${booking.roomName} (${booking.branch})`,
  `Lịch: ${window.UniteOps.date(booking.stayDate)}${booking.checkoutDate && booking.checkoutDate !== booking.stayDate ? ` đến ${window.UniteOps.date(booking.checkoutDate)}` : ""}`,
  `Gói: ${booking.packageLabel}${booking.nights ? `, ${booking.nights} đêm` : ""}, ${booking.guests} khách`,
  `Tổng: ${window.UniteOps.money(booking.total)} - Đã thu/cọc: ${window.UniteOps.money(booking.paid || booking.deposit)}`,
  `Trạng thái: ${cskhStatusLabel(booking.status)}`,
  `Ghi chú: ${booking.note || "Không có"}`
].join("\n");

const cskhCopyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }
};

const cskhParseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(value => value !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map(item => item.trim());
  return rows.map(values => headers.reduce((item, header, index) => {
    item[header] = values[index] ?? "";
    return item;
  }, {}));
};

const cskhNormalizeImportedBooking = (row) => {
  const total = cskhParseMoney(row.total || row.total_amount || row["Tổng tiền"]);
  const deposit = cskhParseMoney(row.deposit || row.deposit_amount || row["Tiền cọc"]);
  const paid = cskhParseMoney(row.paid || row.paid_amount || row["Đã thu"] || deposit);
  return {
    id: row.id || row.public_code || cskhBookingId(),
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || new Date().toISOString(),
    stayDate: String(row.stayDate || row.stay_date || cskhToday()).slice(0, 10),
    checkoutDate: String(row.checkoutDate || row.checkout_date || row.stayDate || row.stay_date || cskhToday()).slice(0, 10),
    startTime: row.startTime || row.start_time || "14:00",
    endTime: row.endTime || row.end_time || "",
    branch: row.branch || row.branchName || row.branch_name || "Chưa chọn chi nhánh",
    roomId: row.roomId || row.room_id || row.roomCode || row.room_code || "CUSTOM",
    roomName: row.roomName || row.room_name || "Phòng nhập từ Sheet",
    customerName: row.customerName || row.customer_name || row.name || "Khách",
    phone: String(row.phone || row.customer_phone || ""),
    source: row.source || "Website",
    status: row.status || "new",
    packageLabel: row.packageLabel || row.package_label || "3 tiếng",
    nights: Number(row.nights || 0),
    guests: Number(row.guests || 2),
    total,
    deposit,
    paid,
    balance: Math.max(0, total - paid),
    paymentMethod: row.paymentMethod || row.payment_method || "Chưa thu",
    assignedTo: row.assignedTo || row.assigned_to || "CSKH",
    note: row.note || row.internal_note || "",
    externalRef: row.externalRef || row.external_ref || ""
  };
};

const cskhImportBookings = async (file) => {
  if (!file) return;
  const rows = await window.UniteOps.rowsFromFileAsync(file);
  const imported = rows.map((row, index) => window.UniteOps.normalizeImportedBooking(row, index));
  const merged = window.UniteOps.mergeBookings(cskhState.bookings, imported);
  cskhState.bookings = merged.rows;
  cskhSave();
  const remote = await window.UniteOps.importBookingsToSupabaseAsync(imported);
  cskhRenderSelects();
  cskhRender();
  cskhSetSheetStatus(remote.ok
    ? `Đã nhập ${imported.length} dòng từ ${file.name}; thêm ${merged.added}, cập nhật ${merged.updated}; Supabase thêm ${remote.inserted}, cập nhật ${remote.updated}.`
    : `Đã nhập ${imported.length} dòng từ ${file.name}; thêm ${merged.added}, cập nhật ${merged.updated}. Supabase chưa nhận: ${remote.message || remote.reason || "cần đăng nhập/quyền CSKH"}.`);
};

const cskhSetupMoneyInputs = () => {
  const form = document.querySelector("#bookingForm");
  if (!form) return;
  const total = form.elements.total;
  const deposit = form.elements.deposit;
  const balance = form.elements.balance;
  const update = () => {
    if (total) total.value = cskhFormatMoneyInput(total.value);
    if (deposit) deposit.value = cskhFormatMoneyInput(deposit.value);
    const due = Math.max(0, cskhParseMoney(total?.value) - cskhParseMoney(deposit?.value));
    if (balance) balance.value = cskhFormatMoneyInput(due);
  };
  [total, deposit].forEach(input => input?.addEventListener("input", update));
  update();
};

const cskhRenderSelects = () => {
  const sourceSelect = document.querySelector("#bookingSource");
  const sourceFilter = document.querySelector("#cskhSourceFilter");
  const statusSelect = document.querySelector("#bookingStatus");
  const statusFilter = document.querySelector("#cskhStatusFilter");
  const roomSelect = document.querySelector("#bookingRoom");

  if (sourceSelect) {
    sourceSelect.innerHTML = cskhSources().map(source => `<option value="${source}">${source}</option>`).join("");
  }

  if (sourceFilter) {
    sourceFilter.innerHTML = `<option value="all">Tất cả</option>${cskhSources().map(source => `<option value="${source}">${source}</option>`).join("")}`;
    sourceFilter.value = cskhState.source;
  }

  if (statusSelect) {
    statusSelect.innerHTML = Object.entries(window.UniteOps.statuses)
      .map(([key, label]) => `<option value="${key}">${label}</option>`)
      .join("");
    statusSelect.value = "new";
  }

  if (statusFilter) {
    statusFilter.innerHTML = `<option value="all">Tất cả</option>${Object.entries(window.UniteOps.statuses)
      .map(([key, label]) => `<option value="${key}">${label}</option>`)
      .join("")}`;
    statusFilter.value = cskhState.status;
  }

  if (roomSelect) {
    roomSelect.innerHTML = cskhRooms.map(room => `
      <option value="${room.id}">${room.name} - ${room.location}</option>
    `).join("");
  }
};

const cskhRenderKpis = () => {
  const rows = cskhState.bookings;
  const pending = rows.filter(booking => ["new", "consulting", "holding"].includes(booking.status)).length;
  const deposited = rows.filter(booking => booking.status === "deposited").length;
  const revenue = rows.reduce((sum, booking) => sum + window.UniteOps.revenue(booking), 0);
  const ota = rows.filter(booking => ["Agoda", "Airbnb", "Booking"].includes(booking.source)).length;
  const conflicts = rows.filter(booking => cskhFindConflicts(booking, rows).length).length;

  const kpis = [
    ["Cần xử lý", cskhNumber(pending), "Booking mới, đang tư vấn hoặc đang giữ phòng."],
    ["Đã cọc", cskhNumber(deposited), "Cần nhắc thanh toán/chốt hướng dẫn nhận phòng."],
    ["Doanh thu ghi nhận", window.UniteOps.money(revenue), "Tính theo đã thu hoặc booking đã thanh toán."],
    ["Cảnh báo quá sức chứa", cskhNumber(conflicts), `${ota} booking OTA cần CSKH cập nhật thủ công.`]
  ];

  document.querySelector("#cskhKpis").innerHTML = kpis.map(([label, value, desc]) => `
    <article class="kpi-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${desc}</small>
    </article>
  `).join("");
};

const cskhPaymentHTML = (booking) => {
  const payments = Array.isArray(booking.payments) ? booking.payments : [];
  if (!payments.length && !booking.billName) return "";
  const fallback = booking.billName ? [{
    type: "bill",
    amount: booking.paid || booking.deposit || 0,
    method: booking.paymentMethod || "",
    paidAt: booking.billUploadedAt || booking.updatedAt || booking.createdAt,
    billName: booking.billName,
    billUrl: booking.billUrl || ""
  }] : [];
  return `
    <div class="payment-stack">
      ${[...payments, ...fallback].map(payment => {
        const billUrl = cskhBillUrlFromPayment(payment);
        const billName = payment.billName || (billUrl ? "Xem bill" : "");
        return `
          <span class="payment-line">
            ${payment.type || "payment"} · ${window.UniteOps.money(payment.amount || 0)} · ${payment.method || "chưa rõ"}
            ${payment.paidAt ? `· ${window.UniteOps.date(payment.paidAt)}` : ""}
            ${billUrl ? `· <a href="${cskhEscapeHTML(billUrl)}" target="_blank" rel="noopener">bill: ${cskhEscapeHTML(billName)}</a>` : payment.billName ? `· bill: ${cskhEscapeHTML(payment.billName)}` : ""}
          </span>
        `;
      }).join("")}
    </div>
  `;
};

const cskhBookingRow = (booking) => {
  const paid = Number(booking.paid || booking.deposit || 0);
  const balance = Math.max(0, Number(booking.total || 0) - paid);
  const conflicts = cskhFindConflicts(booking);
  const billUrl = cskhBookingBillUrl(booking);
  const billName = cskhBookingBillName(booking);
  return `
    <article class="booking-row ${conflicts.length ? "has-conflict" : ""}" data-booking-id="${booking.id}">
      <div>
        <div class="booking-title-line">
          <h3>${booking.customerName}</h3>
          <span class="status-pill ${booking.status}">${cskhStatusLabel(booking.status)}</span>
          ${conflicts.length ? `<span class="status-pill cancelled">Trùng giờ</span>` : ""}
        </div>
        <p><strong>${booking.roomName}</strong> · ${booking.branch}</p>
        <p>${window.UniteOps.date(booking.stayDate)}${booking.checkoutDate && booking.checkoutDate !== booking.stayDate ? ` - ${window.UniteOps.date(booking.checkoutDate)}` : ""} · ${cskhBookingStartTime(booking)}-${cskhBookingEndTime(booking)} · ${booking.packageLabel}${booking.nights ? ` · ${booking.nights} đêm` : ""} · ${booking.guests} khách</p>
        <p class="booking-meta">${booking.id} · ${booking.phone} · ${booking.source} · ${booking.assignedTo || "Chưa phân công"}</p>
        <p>${window.UniteOps.money(booking.total)} · Đã thu ${window.UniteOps.money(paid)} · <span class="balance-due">Còn lại ${window.UniteOps.money(balance)}</span></p>
        ${cskhPaymentHTML(booking)}
        ${booking.note ? `<p class="booking-note">${booking.note}</p>` : ""}
      </div>
      <div class="booking-actions">
        <button class="btn soft small" type="button" data-action="next">Chuyển bước</button>
        <button class="btn soft small" type="button" data-action="deposit">Đã cọc</button>
        <button class="btn soft small" type="button" data-action="paid">Đã thanh toán</button>
        ${billUrl ? `<a class="btn soft small" href="${cskhEscapeHTML(billUrl)}" target="_blank" rel="noopener">Xem bill</a>` : billName ? `<span class="btn soft small is-disabled" title="Booking này có tên bill nhưng chưa có link file để mở.">Bill chưa có link</span>` : ""}
        <button class="btn soft small" type="button" data-action="copy">Copy tin</button>
        <button class="btn soft small danger" type="button" data-action="cancel">Hủy</button>
        ${window.UniteOps.can("deleteBookings") ? `<button class="btn soft small danger" type="button" data-action="delete">Xóa</button>` : ""}
      </div>
    </article>
  `;
};

const cskhRenderList = () => {
  const rows = cskhFiltered().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const list = document.querySelector("#bookingList");
  if (!list) return;
  list.innerHTML = rows.length
    ? rows.map(cskhBookingRow).join("")
    : `<article class="booking-row"><p>Không có booking trong bộ lọc này.</p></article>`;
};

const cskhRoomBookingsForDay = (roomId, dateKey) => cskhState.bookings
  .filter(booking => cskhActiveBooking(booking) && booking.roomId === roomId && cskhBookingTouchesDate(booking, dateKey))
  .sort((a, b) => {
    const aRange = cskhBookingRangeForDate(a, dateKey);
    const bRange = cskhBookingRangeForDate(b, dateKey);
    return Number(aRange?.start || 0) - Number(bRange?.start || 0);
  });

const cskhAvailabilityText = (room, dateKey) => {
  const inventory = cskhRoomInventory(room.id);
  const maxBusy = cskhMaxConcurrentForDay(room.id, dateKey);
  if (!inventory) return "Tạm khóa";
  if (maxBusy >= inventory) return `Có khung kín · ${maxBusy}/${inventory} phòng bận`;
  if (maxBusy > 0) return `Còn phòng · cao nhất ${maxBusy}/${inventory} phòng bận`;
  return `Trống cả ngày · ${inventory}/${inventory} phòng sẵn sàng`;
};

const cskhRenderCalendar = () => {
  const target = document.querySelector("#roomCalendar");
  if (!target) return;
  if (!cskhState.calendarStart) cskhState.calendarStart = cskhWeekStart();

  const days = cskhWeekDays();
  const conflictCount = cskhState.bookings.filter(booking => cskhFindConflicts(booking).length).length;
  const summary = document.querySelector("#calendarSummary");
  if (summary) {
    summary.textContent = `${cskhDateKey(days[0])} đến ${cskhDateKey(days[6])} · ${conflictCount} cảnh báo quá sức chứa.`;
  }

  target.innerHTML = `
    ${conflictCount ? `<p class="conflict-banner">${conflictCount} booking đang vượt số lượng phòng của layout. Kiểm tra trước khi xác nhận cho khách.</p>` : ""}
    <div class="calendar-grid">
      <div class="calendar-head">Phòng <span>Chi nhánh</span></div>
      ${days.map(day => `
        <div class="calendar-head">${new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(day)} <span>${cskhDateKey(day)}</span></div>
      `).join("")}
      ${cskhRooms.map(room => `
        <div class="calendar-room"><strong>${room.name}</strong><span>${room.location}</span></div>
        ${days.map(day => {
          const dateKey = cskhDateKey(day);
          const bookings = cskhRoomBookingsForDay(room.id, dateKey);
          const maxBusy = cskhMaxConcurrentForDay(room.id, dateKey);
          const inventory = cskhRoomInventory(room.id);
          const hasConflict = bookings.some(booking => cskhFindConflicts(booking).length);
          return `
            <div class="calendar-cell ${bookings.length ? "" : "is-free"} ${hasConflict ? "has-conflict" : ""}">
              <span class="calendar-free ${maxBusy >= inventory && inventory ? "is-full" : ""}">${cskhAvailabilityText(room, dateKey)}</span>
              ${bookings.length ? bookings.map(booking => `
                <div class="calendar-chip ${booking.status}">
                  <strong>${cskhMinutesToTime(cskhBookingRangeForDate(booking, dateKey)?.start)}-${cskhMinutesToTime(cskhBookingRangeForDate(booking, dateKey)?.end)}</strong>
                  <span>${booking.customerName || "Khách"} · ${cskhStatusLabel(booking.status)}</span>
                </div>
              `).join("") : ""}
            </div>
          `;
        }).join("")}
      `).join("")}
    </div>
  `;
};

const cskhRender = () => {
  cskhRenderKpis();
  cskhRenderList();
  cskhRenderCalendar();
  cskhApplyPermissions();
};

const cskhRenderSyncState = (result = cskhState.liveResult) => {
  const status = window.UniteOps.configStatus();
  const supabaseNode = document.querySelector("#cskhSupabaseSyncState");
  const sheetNode = document.querySelector("#cskhSheetSyncState");

  if (supabaseNode) {
    if (!status.supabaseConfigured) {
      supabaseNode.textContent = "Chưa nối Supabase. CSKH đang dùng localStorage.";
    } else if (!status.hasSession) {
      supabaseNode.textContent = "Đã có Supabase public key. Đăng nhập email/password để đọc/ghi booking live.";
    } else if (result?.ok) {
      supabaseNode.textContent = `Đang làm việc với ${result.rows.length} booking từ Supabase.`;
    } else {
      supabaseNode.textContent = result?.message
        ? `Chưa đọc được Supabase: ${result.message}. CSKH vẫn lưu local.`
        : "Đã đăng nhập. Hãy chạy schema trong SQL Editor nếu chưa có bảng.";
    }
  }

  if (sheetNode) {
    sheetNode.textContent = status.sheetConfigured
      ? "Đã có Apps Script endpoint để backup Sheet."
      : status.sheetUrl
        ? "Đã lưu link Sheet. Cần deploy Apps Script Web App để tự sync."
        : "Có thể sync cuối ngày để team quen dùng Sheet kiểm tra chéo.";
  }
};

const cskhSetSheetStatus = (message) => {
  const sheetNode = document.querySelector("#cskhSheetSyncState");
  if (sheetNode) sheetNode.textContent = message;
};

const cskhHydrateFromLive = async () => {
  await cskhHydrateRoomsFromLive();
  const result = await window.UniteOps.loadBookingsAsync();
  cskhState.liveResult = result;
  cskhState.bookings = result.rows;
  cskhRenderSelects();
  cskhRenderSyncState(result);
  cskhRender();
};

const cskhPullFromSheet = async (button) => {
  if (button) button.disabled = true;
  cskhSetSheetStatus("Đang lấy booking từ Google Sheet về app...");
  const result = await window.UniteOps.pullBookingsFromSheetAsync(cskhState.bookings);
  if (result.ok) {
    cskhState.bookings = result.rows;
    cskhState.liveResult = { ok: true, rows: result.rows };
    cskhRenderSelects();
    cskhRender();
    const remote = result.supabase || {};
    cskhSetSheetStatus(remote.ok
      ? `Đã lấy ${result.imported} dòng từ Sheet; thêm ${result.added}, cập nhật ${result.updated}; Supabase thêm ${remote.inserted}, cập nhật ${remote.updated}.`
      : `Đã lấy ${result.imported} dòng từ Sheet; thêm ${result.added}, cập nhật ${result.updated}. Supabase chưa nhận: ${remote.message || remote.reason || "cần đăng nhập/quyền CSKH"}.`);
  } else {
    cskhSetSheetStatus(`Không lấy được Sheet: ${result.message || result.reason || "kiểm tra Apps Script"}.`);
  }
  if (button) button.disabled = false;
};

const cskhFindBooking = (id) => cskhState.bookings.find(booking => booking.id === id);

const cskhHandleAction = async (id, action) => {
  const booking = cskhFindBooking(id);
  if (!booking) return;

  if (action === "delete") {
    if (!window.UniteOps.can("deleteBookings")) {
      alert("Chỉ super admin mới được xóa hẳn booking.");
      return;
    }
    if (!window.confirm(`Xóa hẳn booking ${booking.id}? Hành động này khác với Hủy booking và sẽ xóa giao dịch khỏi Supabase.`)) return;
    const remote = await window.UniteOps.deleteBookingAsync(booking);
    if (!remote.ok && remote.reason === "supabase-error") {
      cskhSetSheetStatus(`Xóa booking lỗi: ${remote.message}.`);
      return;
    }
    cskhState.bookings = cskhState.bookings.filter(item => item.id !== booking.id);
    cskhSave();
    cskhSetSheetStatus(`Đã xóa booking ${booking.id}.`);
    cskhRender();
    return;
  }

  if (action !== "copy" && !window.UniteOps.can("manageBookings")) {
    alert("Tài khoản này chưa có quyền cập nhật booking.");
    return;
  }

  if (action === "next") booking.status = cskhNextStatus(booking.status);

  if (action === "deposit") {
    booking.status = "deposited";
    if (!Number(booking.deposit || 0)) booking.deposit = Math.round(Number(booking.total || 0) * 0.4);
    booking.paid = Math.max(Number(booking.paid || 0), Number(booking.deposit || 0));
    booking.paymentMethod = booking.paymentMethod === "Chưa thu" ? "Chuyển khoản" : booking.paymentMethod;
    booking.payments = [
      ...(booking.payments || []),
      {
        type: "deposit",
        amount: booking.deposit,
        method: booking.paymentMethod,
        paidAt: new Date().toISOString()
      }
    ];
  }

  if (action === "paid") {
    booking.status = "paid";
    booking.paid = Number(booking.total || 0);
    booking.deposit = Math.max(Number(booking.deposit || 0), Number(booking.total || 0));
    booking.paymentMethod = booking.paymentMethod === "Chưa thu" ? "Chuyển khoản" : booking.paymentMethod;
    booking.payments = [
      ...(booking.payments || []),
      {
        type: "full",
        amount: booking.paid,
        method: booking.paymentMethod,
        paidAt: new Date().toISOString()
      }
    ];
  }

  if (action === "cancel") booking.status = "cancelled";

  if (action === "copy") {
    const ok = await cskhCopyText(cskhBookingMessage(booking));
    alert(ok ? "Đã copy tin nhắn booking." : "Chưa copy được, bạn copy thủ công giúp mình nhé.");
    return;
  }

  booking.balance = Math.max(0, Number(booking.total || 0) - Number(booking.paid || booking.deposit || 0));
  booking.updatedAt = new Date().toISOString();
  cskhSave();
  const remote = await window.UniteOps.updateBookingAsync(booking);
  const sheet = await window.UniteOps.syncBookingToSheetAsync(booking);
  if (!remote.ok && remote.reason === "supabase-error") {
    cskhState.liveResult = remote;
    cskhRenderSyncState(remote);
  } else if (sheet.ok) {
    cskhSetSheetStatus(`Đã gửi cập nhật ${booking.id} sang Sheet.`);
  }
  cskhRender();
};

const cskhBookingId = () => {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const next = String(cskhState.bookings.length + 1).padStart(3, "0");
  return `US-${ymd}-${next}`;
};

const cskhHandleSubmit = async (event) => {
  event.preventDefault();
  if (!window.UniteOps.can("manageBookings")) {
    alert("Tài khoản này chưa có quyền thêm booking.");
    return;
  }
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  const data = new FormData(form);
  const room = cskhRooms.find(item => item.id === data.get("roomId")) || cskhRooms[0] || {};
  const stayDate = data.get("stayDate") || cskhToday();
  const startTime = data.get("startTime") || "14:00";
  const packageLabel = data.get("packageLabel") || "3 tiếng";
  const endTime = data.get("endTime") || cskhAddHours(startTime, cskhPackageHours(packageLabel));
  const nights = Number(data.get("nights") || 0);
  const isDayStay = packageLabel === "Theo ngày";
  const total = cskhParseMoney(data.get("total"));
  const deposit = cskhParseMoney(data.get("deposit"));
  const paid = deposit;
  const billFile = form.elements.billFile?.files?.[0] || null;
  const paymentAt = data.get("paymentAt") || new Date().toISOString();
  const paymentMethod = data.get("paymentMethod") || (deposit ? "Chuyển khoản" : "Chưa thu");
  const paymentType = data.get("paymentType") || "deposit";
  const checkoutDate = isDayStay && nights
    ? cskhAddDays(stayDate, nights)
    : cskhTimeToMinutes(endTime) <= cskhTimeToMinutes(startTime)
      ? cskhAddDays(stayDate, 1)
      : stayDate;

  const booking = {
    id: cskhBookingId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stayDate,
    checkoutDate,
    startTime,
    endTime,
    branch: room.location || "Chưa chọn chi nhánh",
    roomId: room.id || "CUSTOM",
    roomName: room.name || "Phòng nhập tay",
    customerName: String(data.get("customerName") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    source: data.get("source") || "Website",
    status: data.get("status") || "new",
    packageLabel,
    nights: isDayStay ? nights : 0,
    guests: Number(data.get("guests") || 2),
    total,
    deposit,
    paid,
    balance: Math.max(0, total - paid),
    paymentMethod,
    assignedTo: "CSKH",
    note: String(data.get("note") || "").trim(),
    payments: deposit ? [{
      type: paymentType,
      amount: deposit,
      method: paymentMethod,
      paidAt: paymentAt,
      billName: billFile?.name || "",
      billUploadedAt: billFile ? new Date().toISOString() : ""
    }] : [],
    billName: billFile?.name || "",
    billUploadedAt: billFile ? new Date().toISOString() : ""
  };

  if (submitButton) submitButton.disabled = true;
  const inventory = cskhRoomInventory(booking.roomId);
  if (inventory <= 0) {
    const ok = window.confirm(`${booking.roomName} đang có số lượng phòng bằng 0.\nBạn vẫn muốn lưu giao dịch này chứ?`);
    if (!ok) {
      if (submitButton) submitButton.disabled = false;
      cskhSetSheetStatus("Đã dừng lưu booking vì layout đang hết phòng.");
      return;
    }
    booking.note = `${booking.note ? `${booking.note}\n` : ""}Cảnh báo: layout đang có số lượng phòng bằng 0.`;
  }
  const conflicts = cskhFindConflicts(booking);
  if (conflicts.length) {
    const conflictIds = conflicts.map(item => item.id).join(", ");
    const ok = window.confirm(`Khung giờ này có thể đã kín ${inventory} phòng của ${booking.roomName}.\nBooking đang vướng: ${conflictIds}.\n\nBạn vẫn muốn lưu giao dịch này chứ?`);
    if (!ok) {
      if (submitButton) submitButton.disabled = false;
      cskhSetSheetStatus("Đã dừng lưu booking vì lịch đang vướng sức chứa phòng.");
      return;
    }
    booking.note = `${booking.note ? `${booking.note}\n` : ""}Cảnh báo: có thể vượt ${inventory} phòng, vướng ${conflictIds}.`;
  }
  const billUpload = billFile ? await window.UniteOps.uploadBillAsync(billFile, booking) : { ok: false };
  if (billUpload.ok) {
    booking.billStoragePath = billUpload.path;
    booking.billUrl = billUpload.publicUrl;
    if (booking.payments?.[0]) {
      booking.payments[0].billStoragePath = billUpload.path;
      booking.payments[0].billUrl = billUpload.publicUrl;
    }
  }
  const remote = await window.UniteOps.createBookingAsync(booking);
  const finalBooking = remote.ok ? remote.row : booking;

  cskhState.bookings.unshift(finalBooking);
  cskhSave();
  const sheet = await window.UniteOps.syncBookingToSheetAsync(finalBooking);
  form.reset();
  form.querySelector("[name='stayDate']").value = cskhToday();
  form.querySelector("[name='startTime']").value = "14:00";
  form.querySelector("[name='endTime']").value = "17:00";
  form.querySelector("[name='guests']").value = 2;
  form.querySelector("[name='nights']").value = 0;
  cskhSetupMoneyInputs();
  if (!remote.ok && remote.reason === "supabase-error") {
    cskhState.liveResult = remote;
    cskhRenderSyncState(remote);
  } else if (sheet.ok) {
    cskhSetSheetStatus(`Đã gửi booking ${finalBooking.id} sang Sheet.`);
  } else {
    cskhRenderSyncState();
  }
  if (submitButton) submitButton.disabled = false;
  cskhRenderSelects();
  cskhRender();
};

document.addEventListener("DOMContentLoaded", async () => {
  cskhState.calendarStart = cskhWeekStart();
  cskhRenderSelects();
  const stayInput = document.querySelector("[name='stayDate']");
  if (stayInput && !stayInput.value) stayInput.value = cskhToday();
  const paymentAt = document.querySelector("[name='paymentAt']");
  if (paymentAt && !paymentAt.value) paymentAt.value = new Date().toISOString().slice(0, 16);
  cskhSetupMoneyInputs();
  cskhRenderSyncState();
  cskhRender();
  window.UniteOps.initAuthPanel({
    onAuthChange: cskhHydrateFromLive,
    requiredPermissions: ["manageBookings"],
    permissionLabel: "CSKH, Quản lý, Admin hoặc Super admin"
  });
  await cskhHydrateFromLive();

  document.querySelector("#bookingForm")?.addEventListener("submit", cskhHandleSubmit);

  document.querySelector("[name='packageLabel']")?.addEventListener("change", event => {
    const form = event.target.form;
    if (!form) return;
    const start = form.elements.startTime?.value || "14:00";
    if (form.elements.endTime) form.elements.endTime.value = cskhAddHours(start, cskhPackageHours(event.target.value));
  });

  document.querySelector("[name='startTime']")?.addEventListener("change", event => {
    const form = event.target.form;
    if (!form) return;
    const label = form.elements.packageLabel?.value || "3 tiếng";
    if (form.elements.endTime) form.elements.endTime.value = cskhAddHours(event.target.value || "14:00", cskhPackageHours(label));
  });

  document.querySelector("#cskhImportFile")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    try {
      await cskhImportBookings(file);
    } catch (error) {
      cskhSetSheetStatus(`Import lỗi: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  });

  document.querySelector("#calendarPrev")?.addEventListener("click", () => {
    cskhState.calendarStart.setDate(cskhState.calendarStart.getDate() - 7);
    cskhRenderCalendar();
  });

  document.querySelector("#calendarToday")?.addEventListener("click", () => {
    cskhState.calendarStart = cskhWeekStart();
    cskhRenderCalendar();
  });

  document.querySelector("#calendarNext")?.addEventListener("click", () => {
    cskhState.calendarStart.setDate(cskhState.calendarStart.getDate() + 7);
    cskhRenderCalendar();
  });

  document.querySelector("#cskhSearch")?.addEventListener("input", event => {
    cskhState.search = event.target.value;
    cskhRenderList();
  });

  document.querySelector("#cskhStatusFilter")?.addEventListener("change", event => {
    cskhState.status = event.target.value;
    cskhRenderList();
  });

  document.querySelector("#cskhSourceFilter")?.addEventListener("change", event => {
    cskhState.source = event.target.value;
    cskhRenderList();
  });

  document.querySelector("#bookingList")?.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest("[data-booking-id]");
    if (!button || !row) return;
    cskhHandleAction(row.dataset.bookingId, button.dataset.action);
  });

  document.querySelector("#cskhExport")?.addEventListener("click", () => {
    window.UniteOps.downloadCsv(cskhFiltered(), "unite-cskh-bookings.csv");
  });

  document.querySelector("#cskhSyncSheet")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    const rows = cskhFiltered();
    button.disabled = true;
    cskhSetSheetStatus(`Đang gửi ${rows.length} booking sang Google Sheet...`);
    const result = await window.UniteOps.syncBookingsToSheetAsync(rows);
    cskhSetSheetStatus(result.ok
      ? `Đã gửi ${result.synced} booking sang Sheet.`
      : `Đã gửi ${result.synced || 0}, lỗi ${result.failed || 0}. Kiểm tra Apps Script nếu Sheet chưa cập nhật.`);
    button.disabled = false;
  });

  document.querySelector("#cskhPullSheet")?.addEventListener("click", event => {
    cskhPullFromSheet(event.currentTarget);
  });
});
