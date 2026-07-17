// UNITESTAYCATION/js/cskh.js
// V15.4 CSKH: timezone-safe booking flow, explicit room assignment, weekly calendar and proof-gated payments.

const cskhFallbackRooms = Array.isArray(window.rooms) ? window.rooms : (typeof rooms !== "undefined" ? rooms : []);
const cskhState = {
  rooms: cskhFallbackRooms,
  units: window.UniteOps.roomUnitsFromRooms(cskhFallbackRooms),
  bookings: window.UniteOps.loadBookings(),
  search: "",
  status: "all",
  source: "all",
  weekStart: null,
  calendarBranch: "all",
  selectedBookingId: "",
  liveResult: null,
  inventoryResult: null
};
let cskhSaveInFlight = 0;
const quickPayClaimTokens = new Map();
const quickPayInFlightIds = new Set();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = (value = "") => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;"
}[character]));

const cskhStatusLabel = status => window.UniteOps.statuses[status] || status;
const cskhBranches = () => [...new Set(cskhState.rooms.map(room => room.location).filter(Boolean))];
const cskhSources = () => [...new Set([...window.UniteOps.sources, ...cskhState.bookings.map(booking => booking.source).filter(Boolean)])];
const cskhUnits = () => cskhState.units;
const saveLocal = () => window.UniteOps.saveBookings(cskhState.bookings);
const syncState = (target, text) => { const element = $(target); if (element) element.textContent = text; };
const showCskhToast = (message, tone = "success") => {
  document.getElementById("cskhToast")?.remove();
  const color = tone === "error" ? "#b42318" : "#2e7d32";
  document.body.insertAdjacentHTML("beforeend", `
    <div id="cskhToast" role="status" style="position:fixed;right:18px;bottom:18px;z-index:10050;max-width:min(420px,calc(100vw - 36px));padding:13px 15px;border-radius:12px;background:${color};color:#fff;font-size:13px;font-weight:700;line-height:1.45;box-shadow:0 14px 34px rgba(0,0,0,.24);">
      ${escape(message)}
    </div>
  `);
  window.setTimeout(() => document.getElementById("cskhToast")?.remove(), 4500);
};
const currentProfileName = () => window.UniteAuth?.profile?.()?.full_name || window.UniteAuth?.profile?.()?.email || "CSKH";

const statusOrder = ["new", "consulting", "holding", "deposited", "paid", "checked_in", "checked_out"];
const statusRank = status => statusOrder.indexOf(status);
const currentEditingBooking = () => cskhState.bookings.find(row => row.id === $("#bookingForm")?.editingId?.value) || null;
const hasDepositProof = booking => Boolean(booking?.depositBillPath || booking?.depositBillUrl);
const hasFullProof = booking => Boolean(booking?.fullPaymentBillPath || booking?.fullPaymentBillUrl);
const bookingInvariantMessage = booking => {
  if (["cancelled", "no_show"].includes(booking?.status)) return "";
  if (booking?.status === "deposited" && (Number(booking.deposit || 0) <= 0 || !hasDepositProof(booking))) {
    return "Đã cọc cần có số tiền cọc và chứng từ cọc.";
  }
  if (statusRank(booking?.status) >= statusRank("paid")) {
    if (Number(booking.total || 0) <= 0 || Number(booking.paid || 0) < Number(booking.total || 0) || !hasFullProof(booking)) {
      return "Đã thanh toán/check-in/check-out cần đủ tiền và chứng từ thanh toán.";
    }
  }
  return "";
};
const pendingDepositProof = () => Boolean($("#depositBill")?.files?.[0]);
const pendingFullProof = () => Boolean($("#fullPaymentBill")?.files?.[0]);
const hasDepositProofInForm = () => pendingDepositProof() || hasDepositProof(currentEditingBooking());
const hasFullProofInForm = () => pendingFullProof() || hasFullProof(currentEditingBooking());
const setNowValue = target => {
  const input = typeof target === "string" ? document.getElementById(target) : target;
  if (input) input.value = window.UniteOps.toDatetimeLocal(new Date());
};

const parseMoney = value => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").replace(/[^0-9-]/g, "");
  const number = Number(normalized || 0);
  return Number.isFinite(number) ? number : 0;
};

const formatMoney = value => {
  const number = parseMoney(value);
  return number ? new Intl.NumberFormat("vi-VN").format(number) : "";
};

const setMoneyValue = (input, value, { zero = false } = {}) => {
  if (!input) return;
  const number = parseMoney(value);
  input.value = number || zero ? new Intl.NumberFormat("vi-VN").format(number) : "";
};

const formatMoneyWhileTyping = input => {
  const digits = String(input.value || "").replace(/\D/g, "");
  input.value = digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
};

const packageHours = () => window.UniteOps.packageHours($("#bookingPackage")?.value || "3 tiếng");

const updateProofSummary = () => {
  const form = $("#bookingForm");
  if (!form) return;
  const total = parseMoney(form.total.value);
  const deposit = parseMoney(form.deposit.value);
  const paid = Math.max(parseMoney(form.paid.value), deposit);
  const balance = Math.max(0, total - paid);
  const editing = currentEditingBooking();

  $("#depositProofAmount").textContent = window.UniteOps.money(deposit || 0);
  $("#fullProofAmount").textContent = window.UniteOps.money(balance || 0);

  const depositReady = hasDepositProofInForm();
  const fullReady = hasFullProofInForm();
  const depositStatus = $("#depositProofStatus");
  const fullStatus = $("#fullProofStatus");
  depositStatus.textContent = depositReady ? (pendingDepositProof() ? "Bill mới đã chọn" : "Đã có bill") : "Chưa có bill";
  fullStatus.textContent = fullReady ? (pendingFullProof() ? "Bill mới đã chọn" : "Đã có bill") : "Chưa có bill";
  depositStatus.classList.toggle("ready", depositReady);
  fullStatus.classList.toggle("ready", fullReady);

  const viewDeposit = $("#viewDepositProof");
  const viewFull = $("#viewFullProof");
  if (viewDeposit) viewDeposit.hidden = !hasDepositProof(editing);
  if (viewFull) viewFull.hidden = !hasFullProof(editing);

  const hint = $("#statusGuardHint");
  if (hint) {
    hint.textContent = fullReady
      ? "Đã có bill thanh toán: có thể chuyển sang Đã thanh toán."
      : depositReady
        ? "Đã có bill cọc. Cần thêm bill thanh toán trước khi đẩy lên Đã thanh toán."
        : "Đã cọc cần bill cọc; Đã thanh toán cần bill thanh toán.";
  }
};

const autoStatusFromProofs = () => {
  const form = $("#bookingForm");
  if (!form) return;
  const current = form.status.value || "new";
  if (["cancelled", "no_show", "checked_in", "checked_out"].includes(current)) return;
  const total = parseMoney(form.total.value);
  const deposit = parseMoney(form.deposit.value);
  const paid = Math.max(parseMoney(form.paid.value), deposit);
  const projectedFullPaid = pendingFullProof() ? total : paid;

  if (hasFullProofInForm() && total > 0 && projectedFullPaid >= total) {
    form.status.value = "paid";
    form.status.dataset.previous = "paid";
  } else if (deposit > 0 && hasDepositProofInForm() && statusRank(current) < statusRank("deposited")) {
    form.status.value = "deposited";
    form.status.dataset.previous = "deposited";
  }
};

const syncMoneySummary = ({ depositChanged = false } = {}) => {
  const form = $("#bookingForm");
  if (!form) return;
  const total = parseMoney(form.total.value);
  const deposit = Math.min(parseMoney(form.deposit.value), total || Number.MAX_SAFE_INTEGER);
  const paidInput = form.paid;
  const hasExtraPaid = paidInput.dataset.extraPaid === "1";

  if (depositChanged && !hasExtraPaid) paidInput.value = String(deposit);
  const paid = Math.max(parseMoney(paidInput.value), deposit);
  if (!hasExtraPaid) paidInput.value = String(paid);

  setMoneyValue($("#bookingBalance"), Math.max(0, total - paid), { zero: true });
  updateProofSummary();
  autoStatusFromProofs();
};

const ensureDateOrder = ({ forcePackageDuration = false, showMessage = true } = {}) => {
  const checkin = $("#bookingCheckin");
  const checkout = $("#bookingCheckout");
  const hint = $("#dateRangeHint");
  if (!checkin || !checkout) return true;

  checkout.min = checkin.value || "";
  if (!checkin.value) {
    checkout.setCustomValidity("");
    hint?.classList.remove("invalid", "valid");
    return true;
  }

  const start = new Date(checkin.value).getTime();
  let end = checkout.value ? new Date(checkout.value).getTime() : Number.NaN;
  if (forcePackageDuration || Number.isNaN(end) || end <= start) {
    checkout.value = window.UniteOps.addHoursLocal(checkin.value, packageHours());
    end = new Date(checkout.value).getTime();
  }

  const valid = Number.isFinite(start) && Number.isFinite(end) && end > start;
  checkout.setCustomValidity(valid ? "" : "Check-out phải sau check-in.");
  if (hint && showMessage) {
    hint.textContent = valid ? "Thời gian hợp lệ. Check-out luôn được khóa sau check-in." : "Check-out phải sau check-in. Hệ thống không cho lưu lịch ngược.";
    hint.classList.toggle("valid", valid);
    hint.classList.toggle("invalid", !valid);
  }
  return valid;
};

const resetFilePicker = root => {
  $$(".file-picker", root).forEach(picker => {
    const name = $(".file-picker-name", picker);
    if (name) name.textContent = "Chưa chọn file";
  });
};

const bindFilePickers = () => {
  $$(".file-picker input[type='file']").forEach(input => {
    input.addEventListener("change", () => {
      const label = $(".file-picker-name", input.closest(".file-picker"));
      if (label) label.textContent = input.files?.[0]?.name || "Chưa chọn file";
    });
  });
};

const loadLiveInventory = async () => {
  const result = await window.UniteOps.loadInventoryAsync();
  cskhState.inventoryResult = result;
  cskhState.rooms = result.rooms || cskhFallbackRooms;
  cskhState.units = result.units || window.UniteOps.roomUnitsFromRooms(cskhState.rooms);
  return result;
};

const loadLiveBookings = async () => {
  syncState("#cskhSupabaseSyncState", "Đang tải Supabase...");
  const result = await window.UniteOps.loadBookingsAsync();
  cskhState.liveResult = result;
  cskhState.bookings = result.rows;
  saveLocal();
  syncState("#cskhSupabaseSyncState", result.ok
    ? `Đã tải ${result.rows.length} booking live.`
    : `Đang dùng local: ${result.reason || result.message || "chưa live"}`);
  renderAll();
};

const renderSelects = () => {
  const sourceValue = $("#bookingSource")?.value;
  const statusValue = $("#bookingStatus")?.value;
  const branchValue = $("#bookingBranch")?.value;
  const statusFilterValue = $("#cskhStatusFilter")?.value || cskhState.status;
  const sourceFilterValue = $("#cskhSourceFilter")?.value || cskhState.source;
  const calendarBranchValue = $("#calendarBranch")?.value || cskhState.calendarBranch;

  if ($("#bookingSource")) $("#bookingSource").innerHTML = cskhSources().map(source => `<option value="${escape(source)}">${escape(source)}</option>`).join("");
  if ($("#bookingStatus")) $("#bookingStatus").innerHTML = Object.entries(window.UniteOps.statuses).map(([key, value]) => `<option value="${key}">${value}</option>`).join("");
  if ($("#cskhStatusFilter")) $("#cskhStatusFilter").innerHTML = `<option value="all">Tất cả</option>${Object.entries(window.UniteOps.statuses).map(([key, value]) => `<option value="${key}">${value}</option>`).join("")}`;
  if ($("#cskhSourceFilter")) $("#cskhSourceFilter").innerHTML = `<option value="all">Tất cả</option>${cskhSources().map(source => `<option value="${escape(source)}">${escape(source)}</option>`).join("")}`;
  if ($("#bookingBranch")) $("#bookingBranch").innerHTML = cskhBranches().map(branch => `<option value="${escape(branch)}">${escape(branch)}</option>`).join("");
  if ($("#calendarBranch")) $("#calendarBranch").innerHTML = `<option value="all">Tất cả chi nhánh</option>${cskhBranches().map(branch => `<option value="${escape(branch)}">${escape(branch)}</option>`).join("")}`;

  if (cskhSources().includes(sourceValue) && $("#bookingSource")) $("#bookingSource").value = sourceValue;
  if (window.UniteOps.statuses[statusValue] && $("#bookingStatus")) $("#bookingStatus").value = statusValue;
  if ($("#bookingBranch")) {
    if (cskhBranches().includes(branchValue)) $("#bookingBranch").value = branchValue;
    else $("#bookingBranch").value = cskhBranches()[0] || "";
  }
  if ($("#cskhStatusFilter")) $("#cskhStatusFilter").value = statusFilterValue;
  if ($("#cskhSourceFilter")) $("#cskhSourceFilter").value = sourceFilterValue;
  if ($("#calendarBranch")) $("#calendarBranch").value = calendarBranchValue;
  renderRoomOptions();
};

const renderRoomOptions = () => {
  const branch = $("#bookingBranch")?.value || cskhBranches()[0] || "";
  const roomSelect = $("#bookingRoom");
  if (!roomSelect) return;
  const selected = roomSelect.value;
  const roomRows = cskhState.rooms.filter(room => room.location === branch);
  roomSelect.innerHTML = roomRows.map(room => `<option value="${room.id}" ${room.status === "maintenance" ? "disabled" : ""}>${escape(room.name)} · ${room.inventory || 0} phòng${room.status === "maintenance" ? " · bảo trì" : ""}</option>`).join("");
  if (roomRows.some(room => room.id === selected)) roomSelect.value = selected;
  renderUnitOptions();
};

const draftFromForm = () => {
  const form = $("#bookingForm");
  if (!form) return {};
  const room = cskhState.rooms.find(row => row.id === form.roomId.value) || {};
  const unit = cskhUnits().find(row => row.code === form.roomUnitCode.value) || {};
  const previous = cskhState.bookings.find(booking => booking.id === form.editingId.value);
  const deposit = parseMoney(form.deposit.value);
  const paid = Math.max(parseMoney(form.paid.value), deposit);

  return {
    id: form.editingId.value || `US-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(16).slice(2, 7).toUpperCase()}`,
    supabaseId: previous?.supabaseId,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: form.source.value,
    customerName: form.customerName.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    branch: form.branch.value,
    roomId: form.roomId.value,
    roomName: room.name || form.roomId.value,
    roomUnitCode: form.roomUnitCode.value,
    roomUnitName: unit.unitName || unit.unit_name || form.roomUnitCode.value,
    checkinAt: form.checkinAt.value,
    checkoutAt: form.checkoutAt.value,
    stayDate: form.checkinAt.value ? window.UniteOps.isoDate(form.checkinAt.value) : "",
    checkoutDate: form.checkoutAt.value ? window.UniteOps.isoDate(form.checkoutAt.value) : "",
    packageLabel: form.packageLabel.value,
    guests: Number(form.guests.value || 2),
    total: parseMoney(form.total.value),
    deposit,
    paid,
    paymentMethod: form.paymentMethod.value,
    status: form.status.value,
    assignedTo: form.assignedTo.value.trim() || currentProfileName(),
    externalRef: form.externalRef.value.trim(),
    note: form.note.value.trim(),
    depositBillUrl: previous?.depositBillUrl || "",
    fullPaymentBillUrl: previous?.fullPaymentBillUrl || "",
    depositBillPath: previous?.depositBillPath || "",
    fullPaymentBillPath: previous?.fullPaymentBillPath || ""
  };
};

const renderUnitOptions = () => {
  const form = $("#bookingForm");
  if (!form) return;
  const roomId = form.roomId.value;
  const draft = { ...draftFromForm(), roomId };
  const units = cskhUnits().filter(unit => unit.roomId === roomId);
  const old = form.roomUnitCode.value;

  form.roomUnitCode.innerHTML = units.map(unit => {
    const conflicts = window.UniteOps.findConflicts(cskhState.bookings, { ...draft, roomUnitCode: unit.code }, form.editingId.value);
    const unavailable = unit.status !== "available";
    const label = `${unit.unitName} ${unavailable ? "· bảo trì" : conflicts.length ? "· bận giờ này" : "· trống"}`;
    return `<option value="${unit.code}" ${unavailable ? "disabled" : ""} ${conflicts.length ? "data-busy='1'" : ""}>${escape(label)}</option>`;
  }).join("");

  if (units.some(unit => unit.code === old)) form.roomUnitCode.value = old;
  renderConflictWarning();
};

const renderConflictWarning = () => {
  const warning = $("#conflictWarning");
  if (!warning || !$("#bookingForm")) return [];
  const draft = draftFromForm();
  const conflicts = window.UniteOps.findConflicts(cskhState.bookings, draft, $("#bookingForm").editingId.value);

  if (!conflicts.length) {
    const free = window.UniteOps.availableUnits(cskhState.bookings, draft, cskhUnits());
    warning.classList.toggle("show", free.length === 0 && Boolean(draft.roomId));
    warning.innerHTML = free.length === 0 && draft.roomId
      ? "Layout này đã kín tất cả phòng trong khung giờ đang chọn. Hãy đổi giờ hoặc đổi layout."
      : "";
    return conflicts;
  }

  warning.classList.add("show");
  warning.innerHTML = `<b>Cảnh báo trùng lịch theo giờ:</b><br>${conflicts.map(conflict => `${escape(conflict.roomUnitName || conflict.roomUnitCode)} · ${escape(conflict.customerName)} · ${window.UniteOps.dateTime(conflict.checkinAt)} → ${window.UniteOps.dateTime(conflict.checkoutAt)}`).join("<br>")}`;
  return conflicts;
};

const filteredBookings = () => {
  const query = cskhState.search.trim().toLowerCase();
  return cskhState.bookings.filter(booking => {
    if (cskhState.status !== "all" && booking.status !== cskhState.status) return false;
    if (cskhState.source !== "all" && booking.source !== cskhState.source) return false;
    if (!query) return true;
    return [booking.id, booking.customerName, booking.phone, booking.roomId, booking.roomName, booking.roomUnitCode, booking.branch, booking.note, booking.externalRef]
      .some(value => String(value || "").toLowerCase().includes(query));
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff) || diff < 0) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
};

const updateBellBadge = () => {
  const newCount = cskhState.bookings.filter(b => b.status === 'new').length;
  const badge = document.getElementById('bellBadge');
  if (!badge) return;
  if (newCount > 0) {
    badge.textContent = newCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
};

const renderBookings = () => {
  const rows = filteredBookings().sort((a, b) => new Date(b.createdAt || b.checkinAt) - new Date(a.createdAt || a.checkinAt));
  $("#bookingList").innerHTML = rows.map(booking => {
    const depositProof = hasDepositProof(booking);
    const fullProof = hasFullProof(booking);
    const currentIndex = statusOrder.indexOf(booking.status);
    const hasNextStatus = currentIndex >= 0 && currentIndex < statusOrder.length - 1;
    const nextStatus = hasNextStatus ? statusOrder[currentIndex + 1] : "";
    const nextNeedsUnit = window.UniteOps.unitRequiredStatuses?.includes(nextStatus) && !booking.roomUnitCode;
    const canAdvance = hasNextStatus
      && !(nextStatus === "deposited" && (!depositProof || Number(booking.deposit || 0) <= 0))
      && !(statusRank(nextStatus) >= statusRank("paid") && !fullProof)
      && !nextNeedsUnit;
    const advanceTitle = !hasNextStatus
      ? "Đơn đã kết thúc; mở Sửa đơn nếu cần xử lý lại có chủ đích"
      : canAdvance
        ? "Đẩy sang trạng thái kế tiếp"
        : nextNeedsUnit
          ? "Cần xếp phòng cụ thể trước khi check-in"
          : "Cần bill hợp lệ trước khi đẩy trạng thái";
    const advanceLabel = !hasNextStatus
      ? "Đã kết thúc"
      : canAdvance
        ? "Đẩy trạng thái"
        : nextNeedsUnit
          ? "Cần xếp phòng"
          : "Thiếu bill";
    const isNew = booking.status === 'new';
    const ago = timeAgo(booking.createdAt);
    return `
    <article class="booking-row ${cskhState.selectedBookingId === booking.id ? "selected" : ""}" style="${isNew ? 'border-left: 3px solid #e53935;' : ''}">
      <div class="booking-main-copy">
        <strong>${escape(booking.customerName)} · ${escape(booking.phone)}</strong>
        ${ago ? `<span style="font-size:12px;color:#999;margin-left:6px;">· ${ago}</span>` : ''}
        <p>${escape(booking.roomName)} · ${escape(booking.roomUnitName || booking.roomUnitCode || 'Chưa xếp phòng cụ thể')} · ${window.UniteOps.dateTime(booking.checkinAt)} → ${window.UniteOps.dateTime(booking.checkoutAt)}</p>
        <p>${escape(booking.source)} · <b style="${isNew ? 'color:#e53935;' : ''}">${cskhStatusLabel(booking.status)}</b> · ${escape(booking.assignedTo || '')}</p>
        ${booking.note ? `<p style="color: #0056b3; font-weight: 500; font-size: 13px; background: #e3f2fd; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">Giờ nhận / Ghi chú: ${escape(booking.note)}</p>` : ''}
        <div class="booking-proof-row">
          ${!booking.roomUnitCode ? `<span class="proof-pill missing">Chưa xếp phòng</span>` : ""}
          ${depositProof
            ? `<button class="proof-pill ready" type="button" data-open-bill="deposit" data-booking-id="${escape(booking.id)}">Xem bill cọc</button>`
            : `<span class="proof-pill missing">Chưa có bill cọc</span>`}
          ${fullProof
            ? `<button class="proof-pill ready" type="button" data-open-bill="full" data-booking-id="${escape(booking.id)}">Xem bill thanh toán</button>`
            : `<span class="proof-pill missing">Chưa có bill thanh toán</span>`}
        </div>
      </div>
      <div class="booking-meta">
        <span>${window.UniteOps.money(booking.total)}</span>
        <small>Cọc/thu: ${window.UniteOps.money(booking.paid || booking.deposit)} · Còn: ${window.UniteOps.money(window.UniteOps.bookingBalance(booking))}</small>
      </div>
      <div class="booking-actions">
        <button class="btn soft small" type="button" data-edit="${booking.id}">Sửa đơn</button>
        <button class="btn primary small" type="button" data-quick-pay="${booking.id}">💳 Thanh toán</button>
        ${!booking.roomUnitCode && ["holding", "deposited", "paid"].includes(booking.status)
          ? `<button class="btn primary small" type="button" data-auto-assign="${booking.id}" title="Kiểm tra lịch live và tự xếp một phòng cụ thể còn trống">Tự xếp phòng</button>`
          : `<button class="btn soft small ${canAdvance ? '' : 'is-locked'}" type="button" data-next="${booking.id}" title="${advanceTitle}" ${hasNextStatus ? "" : "disabled"}>${advanceLabel}</button>`}
        ${window.UniteAuth?.hasRole?.(["super_admin", "admin"]) ? `<button class="btn soft small" type="button" data-delete="${booking.id}">Xóa</button>` : ''}
      </div>
    </article>`;
  }).join('') || `<p class="sync-note">Chưa có booking phù hợp bộ lọc.</p>`;
  bindBookingButtons();
  updateBellBadge();
};

const weekDays = () => {
  const start = new Date(cskhState.weekStart || window.UniteOps.startOfWeek(new Date()));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const renderCalendar = () => {
  const days = weekDays();
  const branch = cskhState.calendarBranch;
  const units = cskhUnits().filter(unit => branch === "all" || unit.branch === branch);
  const mount = $("#bookingCalendar");
  const visibleStatuses = window.UniteOps.calendarVisibleStatuses || [...window.UniteOps.activeStatuses, "new", "consulting", "checked_out"];
  const visibleBookings = cskhState.bookings.filter(booking =>
    visibleStatuses.includes(booking.status)
    && (branch === "all" || booking.branch === branch)
  );
  const calendarStart = `${window.UniteOps.isoDate(days[0])}T00:00`;
  const calendarEnd = window.UniteOps.addHoursLocal(calendarStart, 24 * 7);
  const knownUnitCodes = new Set(units.map(unit => unit.code));
  const historicalUnits = [...new Map(
    visibleBookings
      .filter(booking =>
        booking.roomUnitCode
        && !knownUnitCodes.has(booking.roomUnitCode)
        && window.UniteOps.rangesOverlap(booking.checkinAt, booking.checkoutAt, calendarStart, calendarEnd)
      )
      .map(booking => [booking.roomUnitCode, {
        code:booking.roomUnitCode,
        roomId:booking.roomId,
        roomName:booking.roomName || booking.roomId,
        branch:booking.branch,
        unitName:booking.roomUnitName || booking.roomUnitCode,
        historical:true
      }])
  ).values()];
  const calendarUnits = [...units, ...historicalUnits];
  const timeText = value => new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit"
  }).format(window.UniteOps.asDate(value));
  const bookingMarkup = booking => {
    const kind = window.UniteOps.activeStatuses.includes(booking.status) && booking.roomUnitCode
      ? "busy"
      : booking.status === "checked_out" && booking.roomUnitCode ? "history" : "pending";
    return `<button type="button" class="calendar-booking ${kind}" data-calendar-edit="${escape(booking.id)}">
      ${escape(booking.customerName)} · ${escape(booking.phone)}
      <small>${timeText(booking.checkinAt)} → ${timeText(booking.checkoutAt)}<br>${escape(cskhStatusLabel(booking.status))} · ${window.UniteOps.money(booking.total)}</small>
    </button>`;
  };
  const cellMarkup = bookings => {
    const cellKind = bookings.some(booking => window.UniteOps.activeStatuses.includes(booking.status) && booking.roomUnitCode)
      ? "busy"
      : bookings.some(booking => ["new", "consulting"].includes(booking.status) || !booking.roomUnitCode)
        ? "pending" : bookings.length ? "history" : "free";
    return `<div class="calendar-cell ${cellKind}">${bookings.map(bookingMarkup).join("") || `<small>Trống</small>`}</div>`;
  };
  const bookingsForDay = (rows, day) => {
    const dayKey = window.UniteOps.isoDate(day);
    const dayStart = `${dayKey}T00:00`;
    const dayEnd = window.UniteOps.addHoursLocal(dayStart, 24);
    return rows.filter(booking => window.UniteOps.rangesOverlap(booking.checkinAt, booking.checkoutAt, dayStart, dayEnd));
  };
  const head = `<div class="calendar-head"><div>Phòng</div>${days.map(day => `<div>${day.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}</div>`).join("")}</div>`;
  const unitRows = calendarUnits.map(unit => {
    const unitBookings = visibleBookings.filter(booking => booking.roomUnitCode === unit.code);
    return `<div class="calendar-row${unit.historical ? " calendar-history-row" : ""}"><div class="calendar-room">${escape(unit.roomName)}<small>${escape(unit.branch)} · ${escape(unit.unitName)}${unit.historical ? " · phòng lịch sử/đã ẩn" : ""}</small></div>${days.map(day => cellMarkup(bookingsForDay(unitBookings, day))).join("")}</div>`;
  }).join("");
  const unassigned = visibleBookings.filter(booking => !booking.roomUnitCode);
  const hasUnassignedInWeek = days.some(day => bookingsForDay(unassigned, day).length);
  const unassignedRow = hasUnassignedInWeek
    ? `<div class="calendar-row calendar-unassigned-row"><div class="calendar-room">Cần xếp phòng<small>Đơn cũ/chưa hoàn tất · mở đơn và bấm Tự xếp phòng</small></div>${days.map(day => cellMarkup(bookingsForDay(unassigned, day))).join("")}</div>`
    : "";
  const weekBookings = visibleBookings.filter(booking => days.some(day => bookingsForDay([booking], day).length));
  const pendingCount = weekBookings.filter(booking => ["new", "consulting"].includes(booking.status)).length;
  const unassignedCount = weekBookings.filter(booking => !booking.roomUnitCode).length;
  const historicalCount = weekBookings.filter(booking => booking.roomUnitCode && !knownUnitCodes.has(booking.roomUnitCode)).length;
  const summary = `<div class="calendar-summary"><b>${weekBookings.length} lịch trong tuần</b><span><i class="pending"></i>${pendingCount} chờ xử lý</span><span><i class="unassigned"></i>${unassignedCount} chưa xếp phòng</span>${historicalCount ? `<span>⚠ ${historicalCount} lịch ở phòng lịch sử/đã ẩn</span>` : ""}<span><i class="busy"></i>Đỏ đậm = đang giữ/bận</span></div>`;
  mount.innerHTML = summary + head + unassignedRow + unitRows;
};

const bindBookingButtons = () => {
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => window.openCreateBookingModal(button.dataset.edit)));
  $$('[data-select-payment]').forEach(button => button.addEventListener('click', () => focusPaymentProof(button.dataset.selectPayment)));
  $$('[data-quick-pay]').forEach(button => button.addEventListener('click', () => openQuickPayModal(button.dataset.quickPay)));
  $$('[data-auto-assign]').forEach(button => button.addEventListener('click', () => autoAssignBookingFromList(button.dataset.autoAssign, button)));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => advanceStatus(button.dataset.next)));
  $$('[data-delete]').forEach(button => button.addEventListener('click', () => deleteBooking(button.dataset.delete)));
  $$('[data-open-bill]').forEach(button => button.addEventListener('click', () => {
    const booking = cskhState.bookings.find(row => row.id === button.dataset.bookingId);
    openBookingProof(booking, button.dataset.openBill);
  }));
};

const openBookingProof = async (booking, type) => {
  if (!booking) return alert("Không tìm thấy booking.");
  const isDeposit = type === "deposit";
  const path = isDeposit ? booking.depositBillPath : booking.fullPaymentBillPath;
  const url = isDeposit ? booking.depositBillUrl : booking.fullPaymentBillUrl;
  try {
    await window.UniteOps.openStoredFileAsync(window.UNITE_SUPABASE_CONFIG.paymentBillBucket || "payment-bills", path, url);
  } catch (error) {
    alert(error.message || "Không mở được bill.");
  }
};

const fillForm = booking => {
  if (!booking) return;
  const form = $("#bookingForm");
  cskhState.selectedBookingId = booking.id;
  form.editingId.value = booking.id;
  form.source.value = booking.source || "Website";
  form.customerName.value = booking.customerName || "";
  form.phone.value = booking.phone || "";
  form.email.value = booking.email || "";
  form.branch.value = booking.branch || "";
  renderRoomOptions();
  form.roomId.value = booking.roomId || "";
  renderUnitOptions();
  form.roomUnitCode.value = booking.roomUnitCode || "";
  form.checkinAt.value = window.UniteOps.toDatetimeLocal(booking.checkinAt);
  form.checkoutAt.value = window.UniteOps.toDatetimeLocal(booking.checkoutAt);
  form.packageLabel.value = booking.packageLabel || "3 tiếng";
  form.guests.value = booking.guests || 2;
  setMoneyValue(form.total, booking.total);
  setMoneyValue(form.deposit, booking.deposit);
  form.paid.value = String(Number(booking.paid || 0));
  form.paid.dataset.extraPaid = Number(booking.paid || 0) > Number(booking.deposit || 0) ? "1" : "0";
  form.paymentMethod.value = booking.paymentMethod || "Chưa thu";
  form.status.value = booking.status || "new";
  form.status.dataset.previous = form.status.value;
  form.assignedTo.value = booking.assignedTo || currentProfileName();
  form.externalRef.value = booking.externalRef || "";
  form.note.value = booking.note || "";
  setNowValue("depositPaidAt");
  setNowValue("fullPaidAt");
  resetFilePicker(form);
  syncMoneySummary();
  ensureDateOrder({ showMessage: true });
  renderConflictWarning();
  renderBookings();
  window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 105, behavior: "smooth" });
};

const clearForm = () => {
  const form = $("#bookingForm");
  form.reset();
  cskhState.selectedBookingId = "";
  form.editingId.value = "";
  form.paid.value = "0";
  form.paid.dataset.extraPaid = "0";
  form.checkinAt.value = window.UniteOps.toDatetimeLocal(new Date());
  form.checkoutAt.value = window.UniteOps.addHoursLocal(form.checkinAt.value, 3);
  form.assignedTo.value = currentProfileName();
  setMoneyValue(form.total, 0);
  setMoneyValue(form.deposit, 0);
  setNowValue("depositPaidAt");
  setNowValue("fullPaidAt");
  resetFilePicker(form);
  renderSelects();
  form.status.value = "new";
  form.status.dataset.previous = "new";
  ensureDateOrder({ showMessage: true });
  syncMoneySummary();
  renderConflictWarning();
  renderBookings();
};

const focusPaymentProof = id => {
  const booking = cskhState.bookings.find(row => row.id === id);
  if (!booking) return;
  if (!$("#bookingForm")) {
    openQuickPayModal(id);
    return;
  }
  fillForm(booking);
  setTimeout(() => $("#paymentProofSection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
};

const quickPayUsesLiveData = () => window.UniteOps.isSupabaseConfigured()
  && Boolean(window.UniteAuth?.session?.()?.access_token);

const quickPayBookingChanged = (snapshot, fresh) => {
  if (!snapshot || !fresh) return true;
  if (snapshot.updatedAt && fresh.updatedAt) {
    const before = window.UniteOps.asDate(snapshot.updatedAt).getTime();
    const after = window.UniteOps.asDate(fresh.updatedAt).getTime();
    if (Number.isFinite(before) && Number.isFinite(after)) return before !== after;
    if (String(snapshot.updatedAt) !== String(fresh.updatedAt)) return true;
  }
  return ["status","roomId","roomUnitCode","checkinAt","checkoutAt","total","deposit","paid"]
    .some(key => String(snapshot[key] ?? "") !== String(fresh[key] ?? ""));
};

const refreshQuickPayContext = async (snapshot, { rejectIfChanged = true } = {}) => {
  if (!quickPayUsesLiveData()) {
    return cskhState.bookings.find(row =>
      row.id === snapshot.id || (snapshot.supabaseId && row.supabaseId === snapshot.supabaseId)
    ) || snapshot;
  }

  const [bookingsResult, inventoryResult] = await Promise.all([
    window.UniteOps.loadBookingsAsync(),
    window.UniteOps.loadInventoryAsync()
  ]);
  if (!bookingsResult.ok) {
    throw new Error(`Không tải được booking live: ${bookingsResult.message || bookingsResult.reason || "lỗi Supabase"}.`);
  }
  if (!inventoryResult.ok) {
    throw new Error(`Không tải được danh sách phòng live: ${inventoryResult.message || inventoryResult.reason || "lỗi Supabase"}.`);
  }

  cskhState.bookings = bookingsResult.rows;
  cskhState.rooms = inventoryResult.rooms;
  cskhState.units = inventoryResult.units;
  cskhState.liveResult = bookingsResult;
  cskhState.inventoryResult = inventoryResult;
  saveLocal();
  renderAll();

  const fresh = cskhState.bookings.find(row =>
    row.id === snapshot.id || (snapshot.supabaseId && row.supabaseId === snapshot.supabaseId)
  );
  if (!fresh) throw new Error("Booking không còn tồn tại trên Supabase.");
  const ownedClaimToken = quickPayClaimTokens.get(snapshot.id);
  if (ownedClaimToken) fresh.quickPayClaimToken = ownedClaimToken;
  if (rejectIfChanged && quickPayBookingChanged(snapshot, fresh)) {
    throw new Error("Đơn vừa được tài khoản khác cập nhật. Hãy đóng QuickPay và mở lại để tránh ghi đè dữ liệu mới.");
  }
  return fresh;
};

const mergeQuickPayBooking = booking => {
  const index = cskhState.bookings.findIndex(row =>
    row.id === booking.id || (booking.supabaseId && row.supabaseId === booking.supabaseId)
  );
  if (index >= 0) cskhState.bookings[index] = booking;
  else cskhState.bookings.unshift(booking);
  saveLocal();
  renderAll();
  return booking;
};

const makeQuickPayClaimToken = () => window.crypto?.randomUUID?.()
  || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const value = Math.floor(Math.random() * 16);
    return (character === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });

const autoAssignQuickPayBooking = async (booking, { claimForPayment = false } = {}) => {
  if (!claimForPayment && window.UniteOps.unitRequiredStatuses?.includes(booking.status) && booking.roomUnitCode) {
    return booking;
  }
  if (quickPayUsesLiveData()) {
    if (claimForPayment && quickPayClaimTokens.has(booking.id)) {
      booking = await releaseQuickPayClaim(booking);
      if (quickPayClaimTokens.has(booking.id)) {
        throw new Error("Chưa nhả được khóa QuickPay của lần trước. Vui lòng kiểm tra mạng rồi thử lại.");
      }
    }
    const claimToken = claimForPayment ? makeQuickPayClaimToken() : null;
    if (claimToken) quickPayClaimTokens.set(booking.id, claimToken);
    const result = await window.UniteOps.autoAssignRoomUnitAsync(booking, { claimToken });
    if (!result.ok) {
      if (claimToken) await releaseQuickPayClaim(booking);
      const migrationHint = /auto_assign_booking_room_unit|schema cache|function/i.test(result.message || "")
        ? " Cần chạy migration V15.4.2 trên Supabase rồi thử lại."
        : "";
      throw new Error(`${result.message || "Không tự xếp được phòng."}${migrationHint}`);
    }
    return mergeQuickPayBooking(result.row);
  }

  const nextStatus = ["new", "consulting"].includes(booking.status) ? "holding" : booking.status;
  if (booking.roomUnitCode) return saveBooking({ ...booking, status:nextStatus });
  const candidates = window.UniteOps.availableUnits(
    cskhState.bookings,
    { ...booking, status:nextStatus },
    cskhUnits()
  );
  const unit = candidates[0];
  if (!unit) throw new Error("Không còn phòng cụ thể trống trong khung giờ này.");
  return saveBooking({
    ...booking,
    status:nextStatus,
    roomUnitCode:unit.code,
    roomUnitName:unit.unitName || unit.label || unit.code
  });
};

const releaseQuickPayClaim = async (booking, explicitToken = "") => {
  const token = explicitToken
    || booking?.quickPayClaimToken
    || quickPayClaimTokens.get(booking?.id);
  if (!token) return booking;
  const ownsCurrentMapToken = () => quickPayClaimTokens.get(booking?.id) === token;
  const result = await window.UniteOps.releaseQuickPayClaimAsync(booking, token);
  if (!result.ok) {
    if (result.reason === "claim-not-owned" && ownsCurrentMapToken()) {
      quickPayClaimTokens.delete(booking.id);
    }
    showCskhToast("Chưa nhả được khóa QuickPay; khóa sẽ tự hết hạn sau 15 phút.");
    return booking;
  }
  if (ownsCurrentMapToken()) quickPayClaimTokens.delete(booking.id);
  try {
    return await refreshQuickPayContext(booking, { rejectIfChanged:false });
  } catch {
    showCskhToast("Đã nhả khóa QuickPay; danh sách sẽ tự tải lại dữ liệu mới.");
    return booking;
  }
};

const completeFinalizedQuickPayClaim = booking => {
  const token = booking?.quickPayClaimToken || "";
  if (!token || quickPayClaimTokens.get(booking?.id) === token) {
    quickPayClaimTokens.delete(booking?.id);
  }
  const cleared = { ...booking };
  delete cleared.quickPayClaimToken;
  return mergeQuickPayBooking(cleared);
};

const beginQuickPayOperation = bookingId => {
  if (quickPayInFlightIds.size > 0) {
    showCskhToast("Một thao tác QuickPay đang chạy. Vui lòng chờ hệ thống hoàn tất.");
    return false;
  }
  quickPayInFlightIds.add(bookingId);
  return true;
};

const endQuickPayOperation = bookingId => {
  quickPayInFlightIds.delete(bookingId);
};

const cleanupSupersededQuickPayProofs = async (paymentRow, originalBooking, finalizedBooking, type) => {
  const finalPath = type === "deposit"
    ? finalizedBooking?.depositBillPath
    : finalizedBooking?.fullPaymentBillPath;
  if (!paymentRow?.billPath || finalPath !== paymentRow.billPath) return;

  const originalPath = type === "deposit"
    ? originalBooking?.depositBillPath
    : originalBooking?.fullPaymentBillPath;
  const stillReferencedPaths = new Set([
    finalizedBooking?.depositBillPath || "",
    finalizedBooking?.fullPaymentBillPath || ""
  ].filter(Boolean));
  const stalePaths = [...new Set([
    paymentRow.previousBillPath || "",
    originalPath || ""
  ])].filter(path =>
    path
    && path !== paymentRow.billPath
    && !stillReferencedPaths.has(path)
  );
  const bucket = window.UNITE_SUPABASE_CONFIG?.paymentBillBucket || "payment-bills";
  await Promise.allSettled(stalePaths.map(path =>
    window.UniteOps.deleteFileAsync(bucket, path)
  ));
};

const quickPayFieldsMatch = (left, right, fields) => fields.every(field =>
  String(left?.[field] ?? "") === String(right?.[field] ?? "")
);

const finalizeQuickPayBooking = async (updated, paymentBooking) => {
  try {
    const saved = await saveBooking(updated, {
      expectedUpdatedAt:paymentBooking.updatedAt,
      quickPayFinalize:true
    });
    return { saved, needsReview:false };
  } catch (firstError) {
    const isStale = /BOOKING_STALE|vừa được|phiên bản booking/i.test(firstError.message || "");
    if (!quickPayUsesLiveData()) throw firstError;

    // A network error can arrive after the database committed the RPC. Verify
    // the live row before reporting failure or trying another finalization.
    try {
      const committed = await refreshQuickPayContext(paymentBooking, { rejectIfChanged:false });
      const targetAlreadyApplied = quickPayFieldsMatch(committed, paymentBooking, [
        "roomId","roomUnitCode","checkinAt","checkoutAt"
      ]) && quickPayFieldsMatch(committed, updated, [
        "status","total","deposit","paid","paymentMethod",
        "depositBillUrl","depositBillPath","fullPaymentBillUrl","fullPaymentBillPath"
      ]);
      if (targetAlreadyApplied) {
        return {
          saved:{
            ...committed,
            quickPayClaimToken:paymentBooking.quickPayClaimToken
          },
          needsReview:false,
          recovered:true
        };
      }
    } catch {}

    if (!isStale) throw firstError;

    let latest = null;
    let lastError = firstError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      latest = await refreshQuickPayContext(paymentBooking, { rejectIfChanged:false });
      const sameScheduleAndRoom = quickPayFieldsMatch(latest, paymentBooking, [
        "roomId","roomUnitCode","checkinAt","checkoutAt"
      ]);
      const sameFinancialBase = quickPayFieldsMatch(latest, paymentBooking, [
        "status","total","deposit","paid","paymentMethod",
        "depositBillUrl","depositBillPath","fullPaymentBillUrl","fullPaymentBillPath"
      ]);
      const proofFields = {
        depositBillUrl:updated.depositBillUrl || latest.depositBillUrl || "",
        depositBillPath:updated.depositBillPath || latest.depositBillPath || "",
        fullPaymentBillUrl:updated.fullPaymentBillUrl || latest.fullPaymentBillUrl || "",
        fullPaymentBillPath:updated.fullPaymentBillPath || latest.fullPaymentBillPath || ""
      };
      const nonOverwritingProofFields = {
        depositBillUrl:latest.depositBillUrl || updated.depositBillUrl || "",
        depositBillPath:latest.depositBillPath || updated.depositBillPath || "",
        fullPaymentBillUrl:latest.fullPaymentBillUrl || updated.fullPaymentBillUrl || "",
        fullPaymentBillPath:latest.fullPaymentBillPath || updated.fullPaymentBillPath || ""
      };
      const recovery = sameScheduleAndRoom && sameFinancialBase
        ? {
            ...latest,
            quickPayClaimToken:paymentBooking.quickPayClaimToken,
            status:updated.status,
            total:updated.total,
            deposit:updated.deposit,
            paid:updated.paid,
            paymentMethod:updated.paymentMethod,
            ...proofFields
          }
        : {
            ...latest,
            quickPayClaimToken:paymentBooking.quickPayClaimToken,
            ...nonOverwritingProofFields
          };
      try {
        const saved = await saveBooking(recovery, {
          expectedUpdatedAt:latest.updatedAt,
          quickPayFinalize:true
        });
        return {
          saved,
          needsReview:!(sameScheduleAndRoom && sameFinancialBase),
          message:sameScheduleAndRoom && sameFinancialBase
            ? ""
            : "Bill đã được gắn vào đơn, nhưng dữ liệu lịch/tiền vừa thay đổi ở tài khoản khác nên hệ thống không tự ghi đè. CSKH cần rà soát lại số tiền và trạng thái."
        };
      } catch (recoveryError) {
        lastError = recoveryError;
        if (!/BOOKING_STALE|vừa được|phiên bản booking/i.test(recoveryError.message || "")) break;
      }
    }
    throw lastError;
  }
};

const autoAssignBookingFromList = async (bookingId, button) => {
  if (cskhSaveInFlight > 0) {
    showCskhToast("Hệ thống đang lưu một thao tác khác. Vui lòng chờ một chút.");
    return;
  }
  const snapshot = cskhState.bookings.find(row => row.id === bookingId);
  if (!snapshot) return;
  cskhSaveInFlight += 1;
  const originalText = button?.textContent || "Tự xếp phòng";
  if (button) {
    button.disabled = true;
    button.textContent = "Đang xếp...";
  }
  try {
    const fresh = await refreshQuickPayContext(snapshot, { rejectIfChanged:false });
    const assigned = await autoAssignQuickPayBooking(fresh);
    showCskhToast(`Đã xếp ${assigned.roomUnitName || assigned.roomUnitCode}. Lịch đã chuyển vào đúng hàng phòng.`);
  } catch (error) {
    alert(`Lỗi: ${error.message || error}`);
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  } finally {
    cskhSaveInFlight = Math.max(0, cskhSaveInFlight - 1);
  }
};

const openQuickPayModal = (bookingId) => {
  if (quickPayInFlightIds.size > 0) {
    showCskhToast("QuickPay đang lưu thanh toán. Không thể mở thêm đơn cho đến khi hoàn tất.");
    return;
  }
  const storedBooking = cskhState.bookings.find(row => row.id === bookingId);
  if (!storedBooking) return;
  const booking = { ...storedBooking };

  if (!booking.total) {
    const room = cskhState.rooms.find(r => r.id === booking.roomId);
    if (room && room.prices) {
      const normalizedPackage = window.UniteOps.normalizePackageLabel(booking.packageLabel);
      const pkg = room.prices.find(p => window.UniteOps.normalizePackageLabel(p.label) === normalizedPackage) || room.prices[0];
      if (pkg && pkg.value) {
        const match = String(pkg.value).match(/[\d,.]+/);
        if (match) {
           let val = Number(match[0].replace(/[^\d]/g, ''));
           if (String(pkg.value).toLowerCase().includes('k') || val < 10000) val *= 1000;
           let calcTotal = val;
           if (normalizedPackage === 'Ngày' || normalizedPackage === 'Qua đêm') {
              const dIn = window.UniteOps.asDate(booking.checkinAt);
              const dOut = window.UniteOps.asDate(booking.checkoutAt);
             let nights = Math.round((dOut - dIn) / 86400000);
             if (nights < 1) nights = 1;
             calcTotal *= nights;
           }
           booking.total = calcTotal;
        }
      }
    }
  }

  document.getElementById('quickPayModal')?.remove();
  document.getElementById('quickPayBackdrop')?.remove();

  const balanceLeft = window.UniteOps.bookingBalance(booking);
  const hasPersistedHistoricalLayout = Boolean(
    booking.supabaseId && booking.roomId && booking.roomUnitCode
  );
  const hasValidLayout = cskhState.rooms.some(room => room.id === booking.roomId)
    || hasPersistedHistoricalLayout;
  const hasAssignedUnit = Boolean(booking.roomUnitCode);
  const previewUnits = hasValidLayout && !hasAssignedUnit
    ? window.UniteOps.availableUnits(
        cskhState.bookings,
        {
          ...booking,
          status:["new", "consulting"].includes(booking.status) ? "holding" : booking.status
        },
        cskhUnits()
      )
    : [];
  const needsDepositRepair = booking.status === "deposited"
    && (Number(booking.deposit || 0) <= 0 || !hasDepositProof(booking));
  const needsFullRepair = statusRank(booking.status) >= statusRank("paid")
    && (Number(booking.total || 0) <= 0
      || Number(booking.paid || 0) < Number(booking.total || 0)
      || !hasFullProof(booking));
  const fullRepairAmount = Math.max(
    0,
    Number(booking.total || 0) - Number(booking.deposit || 0)
  );
  const canPromoteDepositProof = needsFullRepair
    && Number(booking.total || 0) > 0
    && Number(booking.deposit || 0) >= Number(booking.total || 0)
    && Number(booking.paid || 0) >= Number(booking.total || 0)
    && hasDepositProof(booking);
  const fullRepairMode = canPromoteDepositProof
    ? "full_promote"
    : fullRepairAmount > 0 ? "full_repair" : "full_review";
  const fullRepairLabel = canPromoteDepositProof
    ? "Xác nhận bill đã thu đủ"
    : fullRepairMode === "full_review"
      ? "Dữ liệu tiền cần quản trị rà soát"
      : "Bổ sung bill thanh toán trước";
  const allowedPaymentMethods = [...new Set([
    "Chuyển khoản",
    "Tiền mặt",
    "Thẻ",
    ...(booking.paymentMethod && booking.paymentMethod !== "Chưa thu"
      ? [booking.paymentMethod]
      : [])
  ])];
  const selectedPaymentMethod = allowedPaymentMethods.includes(booking.paymentMethod)
    ? booking.paymentMethod
    : "Chuyển khoản";
  const paymentMethodOptions = allowedPaymentMethods
    .map(method => `<option value="${method}" ${method === selectedPaymentMethod ? "selected" : ""}>${method}</option>`)
    .join("");
  const unassignedNotice = !hasValidLayout
    ? `<div style="margin-bottom:14px;padding:11px 12px;border:1px solid #f0c36d;border-radius:10px;background:#fff8e1;color:#7a5200;font-size:13px;line-height:1.45;">
        <b>Chưa chọn layout.</b> Cần chọn chi nhánh và layout hợp lệ trước khi nhận cọc để hệ thống giữ đúng sức chứa.
      </div>`
    : !hasAssignedUnit
    ? `<div style="margin-bottom:14px;padding:11px 12px;border:1px solid #f0c36d;border-radius:10px;background:#fff8e1;color:#7a5200;font-size:13px;line-height:1.45;">
        <b>Layout chưa phải phòng cụ thể.</b> ${previewUnits.length
          ? `Hiện thấy ${previewUnits.length} phòng phù hợp. Khi lưu cọc/thanh toán, QuickPay sẽ kiểm tra lại lịch live và tự xếp một phòng trống trước khi lưu bill.`
          : `Snapshot hiện tại chưa thấy phòng phù hợp. QuickPay sẽ kiểm tra lại lịch live và dừng trước khi lưu bill nếu vẫn hết phòng.`}
      </div>`
    : "";

  let actionHtml = '';
  if (!hasValidLayout) {
    actionHtml = `
      <button type="button" onclick="window.qpAssignRoom()" style="width:100%;padding:13px;border-radius:8px;border:none;background:#7a5200;color:#fff;cursor:pointer;font-weight:700;">Chọn layout trước khi thu</button>
    `;
  } else if (booking.status === 'new' || booking.status === 'consulting' || booking.status === 'holding') {
    actionHtml = `
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <button type="button" onclick="window.qpSetMode('deposit')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Thu cọc</button>
        <button type="button" onclick="window.qpSetMode('full')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Thu đủ</button>
      </div>
      <button type="button" onclick="window.qpSetMode('cancel')" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ffcdd2;background:#ffebee;color:#c62828;cursor:pointer;margin-bottom:12px;">Khách hủy yêu cầu</button>
      <div id="qpFormArea"></div>
    `;
  } else if (booking.status === 'deposited') {
    actionHtml = `
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        ${!hasAssignedUnit ? `
          <button type="button" onclick="window.qpAutoAssignNow(this)" style="width:100%;padding:12px;border-radius:8px;border:none;background:#2e7d32;color:#fff;cursor:pointer;font-weight:700;">Tự xếp phòng trống</button>
          <button type="button" onclick="window.qpAssignRoom()" style="width:100%;padding:10px;border-radius:8px;border:1px solid #d6b36a;background:#fff;color:#7a5200;cursor:pointer;">Chọn phòng thủ công</button>
        ` : ""}
        ${needsDepositRepair ? `<button type="button" onclick="window.qpSetMode('deposit_repair')" style="width:100%;padding:12px;border-radius:8px;border:none;background:#b42318;color:#fff;cursor:pointer;">Bổ sung bill cọc trước</button>` : ""}
        <button type="button" onclick="window.qpSetMode('full')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Thu phần còn lại</button>
        <button type="button" onclick="window.qpSetMode('date')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Khách đổi ngày</button>
        <button type="button" onclick="window.qpSetMode('cancel')" style="width:100%;padding:12px;border-radius:8px;border:1px solid #ffcdd2;background:#ffebee;color:#c62828;cursor:pointer;">Khách hủy (Mất cọc)</button>
        <button type="button" onclick="window.qpSetMode('no_show')" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ffe0b2;background:#fff8e1;color:#8a5300;cursor:pointer;">Khách không đến</button>
      </div>
      <div id="qpFormArea"></div>
    `;
  } else if (booking.status === 'paid') {
    actionHtml = `
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        ${!hasAssignedUnit ? `
          <button type="button" onclick="window.qpAutoAssignNow(this)" style="width:100%;padding:12px;border-radius:8px;border:none;background:#2e7d32;color:#fff;cursor:pointer;font-weight:700;">Tự xếp phòng trống</button>
          <button type="button" onclick="window.qpAssignRoom()" style="width:100%;padding:10px;border-radius:8px;border:1px solid #d6b36a;background:#fff;color:#7a5200;cursor:pointer;">Chọn phòng thủ công</button>
        ` : ""}
        ${needsFullRepair
          ? `<button type="button" onclick="window.qpSetMode('${fullRepairMode}')" style="width:100%;padding:12px;border-radius:8px;border:none;background:#b42318;color:#fff;cursor:pointer;">${fullRepairLabel}</button>`
          : hasAssignedUnit
            ? `<button type="button" onclick="window.qpAction('checked_in')" style="flex:1;padding:12px;border-radius:8px;border:none;background:#2e7d32;color:#fff;cursor:pointer;">Xác nhận Check-in</button>`
            : ""}
        <button type="button" onclick="window.qpSetMode('date')" style="width:100%;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Khách đổi ngày</button>
        <button type="button" onclick="window.qpSetMode('no_show')" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ffe0b2;background:#fff8e1;color:#8a5300;cursor:pointer;">Khách không đến</button>
      </div>
      <div id="qpFormArea"></div>
    `;
  } else if (booking.status === 'checked_in') {
    actionHtml = `
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        ${needsFullRepair
          ? `<button type="button" onclick="window.qpSetMode('${fullRepairMode}')" style="flex:1;padding:12px;border-radius:8px;border:none;background:#b42318;color:#fff;cursor:pointer;">${fullRepairLabel}</button>`
          : `<button type="button" onclick="window.qpAction('checked_out')" style="flex:1;padding:12px;border-radius:8px;border:none;background:#2e7d32;color:#fff;cursor:pointer;">Hoàn thành & Check-out</button>`}
      </div>
      <div id="qpFormArea"></div>
    `;
  } else if (booking.status === 'checked_out') {
    actionHtml = needsFullRepair
      ? `
        <div style="display:flex;gap:10px;margin-bottom:12px;">
          <button type="button" onclick="window.qpSetMode('${fullRepairMode}')" style="flex:1;padding:12px;border-radius:8px;border:none;background:#b42318;color:#fff;cursor:pointer;">${fullRepairLabel}</button>
        </div>
        <div id="qpFormArea"></div>
      `
      : `<div style="text-align:center;padding:20px;color:#666;">Đơn đã check-out và chứng từ thanh toán đã đầy đủ.</div>`;
  } else {
    actionHtml = `
      <div style="text-align:center;padding:20px;color:#666;">Đơn đang ở trạng thái <b>${window.UniteOps.statuses[booking.status]}</b>. Hãy dùng nút Sửa đơn để thay đổi chi tiết.</div>
    `;
  }

  const html = `
    <div id="quickPayBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;" onclick="window.qpClose()"></div>
    <div id="quickPayModal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#fff;border-radius:16px;padding:28px;width:min(96vw,480px);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div>
          <h3 style="margin:0 0 4px;font-size:18px;">${escape(booking.customerName)} · ${escape(booking.phone)}</h3>
          <p style="margin:0;font-size:13px;color:#666;">${escape(booking.roomName)} · ${escape(booking.roomUnitName || booking.roomUnitCode || 'Chưa xếp phòng cụ thể')}</p>
          <p style="margin:3px 0 0;font-size:12px;color:#777;">${window.UniteOps.dateTime(booking.checkinAt)} → ${window.UniteOps.dateTime(booking.checkoutAt)}</p>
        </div>
        <button type="button" onclick="window.qpClose()" style="background:none;border:none;cursor:pointer;font-size:20px;color:#999;padding:0;line-height:1;">×</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px;background:#f9f9f9;padding:12px;border-radius:10px;text-align:center;">
        <div><small style="color:#999;">Tổng tiền</small><br><strong style="font-size:15px;">${window.UniteOps.money(booking.total)}</strong></div>
        <div><small style="color:#999;">Đã thu</small><br><strong style="font-size:15px;color:#2e7d32;">${window.UniteOps.money(booking.paid || booking.deposit)}</strong></div>
        <div><small style="color:#999;">Còn lại</small><br><strong style="font-size:15px;color:${balanceLeft > 0 ? '#e53935' : '#2e7d32'};">${window.UniteOps.money(balanceLeft)}</strong></div>
      </div>

      ${unassignedNotice}
      ${actionHtml}
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  window.qpClose = () => {
    if (quickPayInFlightIds.has(booking.id)) {
      showCskhToast("QuickPay đang lưu thanh toán; vui lòng chờ hoàn tất trước khi đóng.");
      return;
    }
    document.getElementById('quickPayModal')?.remove();
    document.getElementById('quickPayBackdrop')?.remove();
  };

  window.qpAssignRoom = () => {
    document.getElementById('quickPayModal')?.remove();
    document.getElementById('quickPayBackdrop')?.remove();
    window.openCreateBookingModal(booking.id);
  };

  window.qpAutoAssignNow = async button => {
    if (cskhSaveInFlight > 0) {
      showCskhToast("Hệ thống đang lưu một thao tác khác. Vui lòng chờ một chút.");
      return;
    }
    cskhSaveInFlight += 1;
    const originalText = button?.textContent || "Tự xếp phòng trống";
    if (button) {
      button.disabled = true;
      button.textContent = "Đang kiểm tra lịch live...";
    }
    try {
      const fresh = await refreshQuickPayContext(booking, { rejectIfChanged:false });
      const assigned = await autoAssignQuickPayBooking(fresh);
      document.getElementById('quickPayModal')?.remove();
      document.getElementById('quickPayBackdrop')?.remove();
      openQuickPayModal(assigned.id);
      showCskhToast(`Đã xếp ${assigned.roomUnitName || assigned.roomUnitCode}. Booking đã chuyển khỏi Chờ xếp phòng.`);
    } catch (error) {
      alert(`Lỗi: ${error.message || error}`);
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    } finally {
      cskhSaveInFlight = Math.max(0, cskhSaveInFlight - 1);
    }
  };

  window.qpAction = async (status) => {
    try {
      const fresh = await refreshQuickPayContext(booking, { rejectIfChanged:true });
      if (window.UniteOps.unitRequiredStatuses?.includes(status) && !fresh.roomUnitCode) {
        throw new Error('Cần xếp phòng cụ thể trước khi check-in hoặc hoàn thành lưu trú.');
      }
      if (status === "no_show" && window.UniteOps.asDate(fresh.checkinAt).getTime() > Date.now()) {
        throw new Error('Chưa đến giờ nhận phòng nên chưa thể xác nhận khách không đến.');
      }
      await saveBooking({ ...fresh, status }, { expectedUpdatedAt:fresh.updatedAt });
      document.getElementById('quickPayModal')?.remove();
      document.getElementById('quickPayBackdrop')?.remove();
    } catch(err) { alert('Lỗi: ' + err.message); }
  };

  window.qpSetMode = (mode) => {
    const area = document.getElementById('qpFormArea');
    if (mode === 'deposit') {
      area.innerHTML = `
        <form id="qpForm" onsubmit="window.qpSubmit(event, 'deposited')">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Tổng tiền đơn (đã gồm phụ thu/giảm giá)</label>
          <input type="text" name="total" placeholder="VD: 500.000" value="${booking.total ? new Intl.NumberFormat('vi-VN').format(booking.total) : ''}" required oninput="formatMoneyWhileTyping(this)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">
          
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">📎 Bill cọc (ảnh/PDF)</label>
          <input type="file" name="file" accept="image/*,application/pdf" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;">
          
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Số tiền đã cọc</label>
          <input type="text" name="amount" placeholder="Số tiền cọc (VND)" value="${booking.deposit ? new Intl.NumberFormat('vi-VN').format(booking.deposit) : ''}" required oninput="formatMoneyWhileTyping(this)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Phương thức thu</label>
          <select name="method" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;background:#fff;">${paymentMethodOptions}</select>
           
          <button type="submit" id="qpSaveBtn" style="width:100%;background:#c0392b;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">${hasAssignedUnit ? 'Lưu cọc & giữ đúng phòng đã chọn' : 'Lưu cọc & tự xếp phòng trống'}</button>
        </form>
      `;
    } else if (mode === 'full') {
      area.innerHTML = `
        <form id="qpForm" onsubmit="window.qpSubmit(event, 'paid')">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Tổng tiền đơn (đã gồm phụ thu/giảm giá)</label>
          <input type="text" name="total" placeholder="VD: 500.000" value="${booking.total ? new Intl.NumberFormat('vi-VN').format(booking.total) : ''}" required oninput="formatMoneyWhileTyping(this)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">
          
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">📎 Bill thanh toán toàn bộ (ảnh/PDF)</label>
          <input type="file" name="file" accept="image/*,application/pdf" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;">
          
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Số tiền thu đợt này</label>
          <input type="text" name="amount" placeholder="Số tiền (VND)" value="${balanceLeft > 0 ? new Intl.NumberFormat('vi-VN').format(balanceLeft) : ''}" required oninput="formatMoneyWhileTyping(this)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Phương thức thu</label>
          <select name="method" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;background:#fff;">${paymentMethodOptions}</select>
           
          <button type="submit" id="qpSaveBtn" style="width:100%;background:#c0392b;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">${hasAssignedUnit ? 'Lưu thanh toán & giữ đúng phòng đã chọn' : 'Lưu thanh toán & tự xếp phòng trống'}</button>
        </form>
      `;
    } else if (mode === 'full_promote') {
      area.innerHTML = `
        <div style="background:#fff8e1;padding:12px;border-radius:8px;border:1px solid #ffe0b2;margin-bottom:10px;color:#7a5200;font-size:13px;line-height:1.45;">
          Dữ liệu cũ ghi tiền cọc bằng toàn bộ giá trị đơn. Thao tác này dùng chính bill cọc hiện có làm chứng từ thanh toán đủ, không tạo thêm giao dịch và không cộng tiền lần hai.
        </div>
        <button type="button" id="qpSaveBtn" onclick="window.qpPromoteDepositProof()" style="width:100%;background:#b42318;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Xác nhận dùng bill hiện có</button>
      `;
    } else if (mode === 'full_review') {
      area.innerHTML = `
        <div style="background:#ffebee;padding:12px;border-radius:8px;border:1px solid #ffcdd2;color:#9f1c14;font-size:13px;line-height:1.45;">
          Dữ liệu cũ đang ghi phần còn lại bằng 0 nhưng chưa có bill thanh toán hợp lệ để kế thừa. Không thể tự tạo một giao dịch 0 đồng. Quản trị cần đối soát số tiền/bill gốc trước khi tiếp tục.
        </div>
      `;
    } else if (mode === 'deposit_repair' || mode === 'full_repair') {
      const isDepositRepair = mode === 'deposit_repair';
      const repairAmount = isDepositRepair
        ? Number(booking.deposit || 0)
        : fullRepairAmount;
      area.innerHTML = `
        <form id="qpForm" onsubmit="window.qpRepairProof(event, '${isDepositRepair ? "deposit" : "full"}')">
          <div style="background:#fff8e1;padding:10px 12px;border-radius:8px;border:1px solid #ffe0b2;margin-bottom:10px;color:#7a5200;font-size:13px;">
            Dùng để bổ sung chứng từ còn thiếu cho dữ liệu cũ; trạng thái đơn được giữ nguyên.
          </div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Tổng tiền đơn</label>
          <input type="text" name="total" value="${booking.total ? new Intl.NumberFormat('vi-VN').format(booking.total) : ''}" required oninput="formatMoneyWhileTyping(this)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">${isDepositRepair ? 'Bill cọc' : 'Bill thanh toán'} (ảnh/PDF)</label>
          <input type="file" name="file" accept="image/*,application/pdf" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Số tiền trên chứng từ</label>
          <input type="text" name="amount" value="${repairAmount ? new Intl.NumberFormat('vi-VN').format(repairAmount) : ''}" required oninput="formatMoneyWhileTyping(this)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">

          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Phương thức thu</label>
          <select name="method" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;box-sizing:border-box;background:#fff;">${paymentMethodOptions}</select>

          <button type="submit" id="qpSaveBtn" style="width:100%;background:#b42318;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Lưu chứng từ bổ sung</button>
        </form>
      `;
    } else if (mode === 'date') {
      area.innerHTML = `
        <form id="qpForm" onsubmit="window.qpChangeDate(event)">
          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-in mới</label>
              <input type="datetime-local" id="qpCheckin" name="checkin" value="${window.UniteOps.toDatetimeLocal(booking.checkinAt)}" required onchange="window.qpHandleCheckinChange(this)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-out mới</label>
              <input type="datetime-local" id="qpCheckout" name="checkout" value="${window.UniteOps.toDatetimeLocal(booking.checkoutAt)}" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>
          <button type="submit" id="qpSaveBtn" style="width:100%;background:#000;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Kiểm tra & Đổi ngày</button>
        </form>
      `;
      // Calculate original duration
      const origIn = booking.checkinAt ? window.UniteOps.asDate(booking.checkinAt).getTime() : 0;
      const origOut = booking.checkoutAt ? window.UniteOps.asDate(booking.checkoutAt).getTime() : 0;
      window._qpOrigDuration = (origOut && origIn && origOut > origIn) ? (origOut - origIn) : 0;
      
      window.qpHandleCheckinChange = (input) => {
         if (!window._qpOrigDuration) return;
         const outInput = document.getElementById('qpCheckout');
         if (input.value && outInput) {
            const newIn = window.UniteOps.asDate(input.value).getTime();
            if (!isNaN(newIn)) {
                outInput.value = window.UniteOps.toDatetimeLocal(new Date(newIn + window._qpOrigDuration));
            }
         }
      };
    } else if (mode === 'cancel') {
      area.innerHTML = `
        <div style="background:#ffebee;padding:12px;border-radius:8px;border:1px solid #ffcdd2;margin-bottom:10px;">
          <p style="margin:0;color:#c62828;font-size:13px;">Xác nhận hủy đơn.${Number(booking.deposit || 0) > 0 ? ' Khoản cọc hiện có vẫn được giữ lại trong báo cáo.' : ' Đơn chưa có khoản thu.'}</p>
        </div>
        <button type="button" onclick="window.qpAction('cancelled')" style="width:100%;background:#c62828;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Xác nhận Hủy Đơn</button>
      `;
    } else if (mode === 'no_show') {
      area.innerHTML = `
        <div style="background:#fff8e1;padding:12px;border-radius:8px;border:1px solid #ffe0b2;margin-bottom:10px;">
          <p style="margin:0;color:#8a5300;font-size:13px;">Chỉ xác nhận khi đã đến giờ nhận nhưng khách không đến. Hệ thống sẽ trả lại suất phòng cho lịch mới.</p>
        </div>
        <button type="button" onclick="window.qpAction('no_show')" style="width:100%;background:#8a5300;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Xác nhận No-show</button>
      `;
    }
  };

  window.qpChangeDate = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('qpSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Đang kiểm tra...';
    try {
      const inAt = e.target.checkin.value;
      const outAt = e.target.checkout.value;
      const start = window.UniteOps.asDate(inAt);
      const end = window.UniteOps.asDate(outAt);
      if (!inAt || !outAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        throw new Error('Check-out phải sau check-in.');
      }
      const fresh = await refreshQuickPayContext(booking, { rejectIfChanged:true });
      const conflicts = window.UniteOps.findConflicts(cskhState.bookings, { ...fresh, checkinAt:inAt, checkoutAt:outAt }, fresh.id);
      if (conflicts.length > 0) {
        throw new Error('Trùng lịch với đơn: ' + conflicts.map(c => c.customerName).join(', '));
      }
      
      const updated = { ...fresh, checkinAt:inAt, checkoutAt:outAt, stayDate:inAt.slice(0,10), checkoutDate:outAt.slice(0,10) };
      await saveBooking(updated, { expectedUpdatedAt:fresh.updatedAt });
      document.getElementById('quickPayModal')?.remove();
      document.getElementById('quickPayBackdrop')?.remove();
      alert('Đổi ngày thành công!');
    } catch(err) {
      alert('Lỗi: ' + (err.message || err));
      btn.disabled = false;
      btn.textContent = 'Kiểm tra & Đổi ngày';
    }
  };

  window.qpPromoteDepositProof = async () => {
    if (!beginQuickPayOperation(booking.id)) return;
    const btn = document.getElementById("qpSaveBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Đang xác minh chứng từ...";
    }
    let paymentBooking = null;
    try {
      const fresh = await refreshQuickPayContext(booking, { rejectIfChanged:true });
      const total = Number(fresh.total || 0);
      if (total <= 0
          || Number(fresh.deposit || 0) < total
          || Number(fresh.paid || 0) < total
          || !hasDepositProof(fresh)) {
        throw new Error(
          "Dữ liệu đã thay đổi hoặc chưa đủ điều kiện dùng bill cọc làm chứng từ thanh toán đủ."
        );
      }
      if (hasFullProof(fresh)) {
        throw new Error("Booking đã có bill thanh toán; hãy đóng và mở lại QuickPay.");
      }

      paymentBooking = await autoAssignQuickPayBooking(fresh, { claimForPayment:true });
      const updated = {
        ...paymentBooking,
        paid:total,
        fullPaymentBillUrl:paymentBooking.depositBillUrl || "",
        fullPaymentBillPath:paymentBooking.depositBillPath || ""
      };
      const finalization = await finalizeQuickPayBooking(updated, paymentBooking);
      const finalizedBooking = completeFinalizedQuickPayClaim(finalization.saved);
      paymentBooking = null;
      document.getElementById("quickPayModal")?.remove();
      document.getElementById("quickPayBackdrop")?.remove();
      if (finalization.needsReview) {
        alert(finalization.message);
      } else {
        showCskhToast(
          `Đã dùng bill hiện có làm chứng từ thanh toán đủ cho ${finalizedBooking.roomUnitName || finalizedBooking.roomUnitCode}.`
        );
      }
    } catch (error) {
      if (paymentBooking) await releaseQuickPayClaim(paymentBooking);
      alert(`Lỗi: ${error.message || error}`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Thử lại";
      }
    } finally {
      endQuickPayOperation(booking.id);
    }
  };

  window.qpRepairProof = async (e, type) => {
    e.preventDefault();
    if (!beginQuickPayOperation(booking.id)) return;
    const btn = document.getElementById('qpSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Đang kiểm tra phòng live...';
    let paymentBooking = null;
    let proofSaved = false;
    try {
      const file = e.target.file.files[0];
      const amount = Number(e.target.amount.value.replace(/\D/g, '') || 0);
      const total = Number(e.target.total.value.replace(/\D/g, '') || 0);
      const paymentMethod = e.target.method?.value || selectedPaymentMethod;
      if (!file) throw new Error('Vui lòng chọn file bill.');
      if (total <= 0 || amount <= 0) throw new Error('Tổng tiền và số tiền trên chứng từ phải lớn hơn 0.');
      if (type === 'deposit' && amount >= total) {
        throw new Error('Tiền cọc phải nhỏ hơn tổng đơn; nếu đã thu đủ, hãy bổ sung bill thanh toán.');
      }
      const fresh = await refreshQuickPayContext(booking, { rejectIfChanged:true });
      if (type === "deposit"
          && Math.max(Number(fresh.paid || 0), amount) >= total) {
        throw new Error(
          "Dữ liệu hiện đã ghi thu đủ tổng đơn nên không thể bổ sung dưới dạng bill cọc. "
          + "Hãy đối soát và dùng chứng từ thanh toán đủ."
        );
      }
      const expectedFullAmount = Math.max(0, total - Number(fresh.deposit || 0));
      if (type === 'full' && (expectedFullAmount <= 0 || amount !== expectedFullAmount)) {
        throw new Error(`Bill thanh toán phải đúng phần còn lại: ${window.UniteOps.money(expectedFullAmount)}.`);
      }

      paymentBooking = await autoAssignQuickPayBooking(fresh, { claimForPayment:true });
      btn.textContent = 'Đang lưu bill...';
      const row = await window.UniteOps.savePaymentProofAsync(paymentBooking, {
        type,
        amount,
        file,
        paidAt: new Date().toISOString(),
        method: paymentMethod
      });
      proofSaved = true;
      if (row.bookingUpdatedAt) {
        paymentBooking = mergeQuickPayBooking({
          ...paymentBooking,
          updatedAt:row.bookingUpdatedAt
        });
      }
      const updated = {
        ...paymentBooking,
        total,
        paymentMethod,
        ...(type === 'deposit'
          ? {
              deposit: amount,
              paid: Math.max(Number(paymentBooking.paid || 0), amount),
              depositBillUrl: row.billUrl,
              depositBillPath: row.billPath
            }
          : {
              paid: total,
              fullPaymentBillUrl: row.billUrl,
              fullPaymentBillPath: row.billPath
            })
      };
      const finalization = await finalizeQuickPayBooking(updated, paymentBooking);
      const releasedBooking = completeFinalizedQuickPayClaim(finalization.saved);
      cleanupSupersededQuickPayProofs(row, paymentBooking, releasedBooking, type).catch(() => {});
      paymentBooking = null;
      document.getElementById('quickPayModal')?.remove();
      document.getElementById('quickPayBackdrop')?.remove();
      if (finalization.needsReview) {
        alert(finalization.message);
      } else {
        showCskhToast(`Đã bổ sung ${type === 'deposit' ? 'bill cọc' : 'bill thanh toán'} và xếp ${releasedBooking.roomUnitName || releasedBooking.roomUnitCode}.`);
      }
    } catch (err) {
      if (paymentBooking) paymentBooking = await releaseQuickPayClaim(paymentBooking);
      const recovery = proofSaved
        ? ' Bill đã được lưu trong bảng giao dịch nhưng chưa gắn xong vào booking. Không tải bill lần hai; hãy báo quản trị kiểm tra giao dịch vừa tạo.'
        : paymentBooking?.roomUnitCode
          ? ` ${paymentBooking.roomUnitName || paymentBooking.roomUnitCode} đã được giữ. QuickPay sẽ mở lại bằng dữ liệu mới để bạn chọn lại bill và thử tiếp.`
          : '';
      alert('Lỗi: ' + (err.message || err) + recovery);
      if (!proofSaved && paymentBooking?.roomUnitCode) {
        document.getElementById('quickPayModal')?.remove();
        document.getElementById('quickPayBackdrop')?.remove();
        setTimeout(() => openQuickPayModal(paymentBooking.id), 0);
      } else if (proofSaved) {
        document.getElementById('quickPayModal')?.remove();
        document.getElementById('quickPayBackdrop')?.remove();
      } else {
        btn.disabled = false;
        btn.textContent = 'Thử lại';
      }
    } finally {
      endQuickPayOperation(booking.id);
    }
  };

  window.qpSubmit = async (e, targetStatus) => {
    e.preventDefault();
    if (!beginQuickPayOperation(booking.id)) return;
    const btn = document.getElementById('qpSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Đang kiểm tra phòng live...';
    let paymentBooking = null;
    let proofSaved = false;
    try {
      const file = e.target.file.files[0];
      const amount = Number(e.target.amount.value.replace(/\D/g, '') || 0);
      const newTotal = e.target.total ? Number(e.target.total.value.replace(/\D/g, '') || 0) : booking.total;
      const paymentMethod = e.target.method?.value || selectedPaymentMethod;

      if (!file) throw new Error('Vui lòng chọn file bill.');
      if (newTotal <= 0) throw new Error('Tổng tiền đơn phải lớn hơn 0.');
      if (amount <= 0) throw new Error('Số tiền trên bill phải lớn hơn 0.');

      const fresh = await refreshQuickPayContext(booking, { rejectIfChanged:true });
      let updated = { ...fresh, status:targetStatus, total:newTotal, paymentMethod };
      const pType = targetStatus === 'deposited' ? 'deposit' : 'full';

      if (pType === 'deposit') {
        if (amount >= newTotal) throw new Error('Tiền cọc đã đủ tổng đơn. Hãy chọn “Thu đủ” để ghi nhận đúng trạng thái.');
        if (Math.max(Number(updated.paid || 0), amount) >= newTotal) {
          throw new Error(
            "Đơn hiện đã ghi nhận số tiền bằng tổng đơn; không thể lưu thêm dưới dạng cọc. "
            + "Hãy chọn Thu đủ hoặc rà soát dữ liệu cũ."
          );
        }
        updated.deposit = amount;
        updated.paid = Math.max(Number(updated.paid || 0), amount);
      } else {
        const alreadyPaid = Math.max(Number(updated.paid || 0), Number(updated.deposit || 0));
        const remaining = Math.max(0, newTotal - alreadyPaid);
        if (amount !== remaining) {
          throw new Error(`Số tiền thu đủ phải đúng phần còn lại: ${window.UniteOps.money(remaining)}.`);
        }
        updated.paid = alreadyPaid + amount;
      }

      paymentBooking = await autoAssignQuickPayBooking(fresh, { claimForPayment:true });
      updated = {
        ...paymentBooking,
        status:targetStatus,
        total:newTotal,
        paymentMethod,
        ...(pType === 'deposit'
          ? {
              deposit:amount,
              paid:Math.max(Number(paymentBooking.paid || 0), amount)
            }
          : {
              paid:Math.max(Number(paymentBooking.paid || 0), Number(paymentBooking.deposit || 0)) + amount
            })
      };

      btn.textContent = 'Đang lưu bill...';
      const row = await window.UniteOps.savePaymentProofAsync(paymentBooking, {
        type: pType, amount, file, paidAt: new Date().toISOString(), method: paymentMethod
      });
      proofSaved = true;
      if (row.bookingUpdatedAt) {
        paymentBooking = mergeQuickPayBooking({
          ...paymentBooking,
          updatedAt:row.bookingUpdatedAt
        });
        updated = { ...updated, updatedAt:row.bookingUpdatedAt };
      }
      if (pType === 'deposit') {
        updated = { ...updated, depositBillUrl: row.billUrl, depositBillPath: row.billPath };
      } else {
        updated = { ...updated, fullPaymentBillUrl: row.billUrl, fullPaymentBillPath: row.billPath };
      }
      const finalization = await finalizeQuickPayBooking(updated, paymentBooking);
      const releasedBooking = completeFinalizedQuickPayClaim(finalization.saved);
      cleanupSupersededQuickPayProofs(row, paymentBooking, releasedBooking, pType).catch(() => {});
      paymentBooking = null;
      document.getElementById('quickPayModal')?.remove();
      document.getElementById('quickPayBackdrop')?.remove();
      if (finalization.needsReview) {
        alert(finalization.message);
      } else {
        showCskhToast(
          `${pType === 'deposit' ? 'Đã ghi nhận cọc' : 'Đã ghi nhận thanh toán'} ${window.UniteOps.money(amount)} và xếp ${releasedBooking.roomUnitName || releasedBooking.roomUnitCode}.`
        );
      }
    } catch(err) {
      if (paymentBooking) paymentBooking = await releaseQuickPayClaim(paymentBooking);
      const recovery = proofSaved
        ? ' Bill đã được lưu trong bảng giao dịch nhưng chưa gắn xong vào booking. Không tải bill lần hai; hãy báo quản trị kiểm tra giao dịch vừa tạo.'
        : paymentBooking?.roomUnitCode
          ? ` ${paymentBooking.roomUnitName || paymentBooking.roomUnitCode} đã được giữ. QuickPay sẽ mở lại bằng dữ liệu mới để bạn chọn lại bill và thử tiếp.`
          : '';
      alert('Lỗi: ' + (err.message || err) + recovery);
      if (!proofSaved && paymentBooking?.roomUnitCode) {
        document.getElementById('quickPayModal')?.remove();
        document.getElementById('quickPayBackdrop')?.remove();
        setTimeout(() => openQuickPayModal(paymentBooking.id), 0);
      } else if (proofSaved) {
        document.getElementById('quickPayModal')?.remove();
        document.getElementById('quickPayBackdrop')?.remove();
      } else {
        btn.disabled = false;
        btn.textContent = 'Thử lại';
      }
    } finally {
      endQuickPayOperation(booking.id);
    }
  };
};

window.openQuickPayModal = openQuickPayModal;

window.openCreateBookingModal = (bookingId = null) => {
  document.getElementById('createBookingModal')?.remove();
  document.getElementById('createBookingBackdrop')?.remove();

  const booking = bookingId ? cskhState.bookings.find(b => b.id === bookingId) : null;
  const isEdit = !!booking;

  const sourceOpts = window.UniteOps.sources?.map(s => `<option value="${s}" ${booking?.source === s ? 'selected' : ''}>${s}</option>`).join('') || '';
  const packages = ['3 tiếng', '4 tiếng', 'Qua đêm', 'Ngày'];
  const packageText = String(booking?.packageLabel || '3 tiếng').toLowerCase();
  const selectedPackage = packageText.includes('ngày')
    ? 'Ngày'
    : packageText.includes('qua đêm') || packageText.startsWith('8')
      ? 'Qua đêm'
      : packageText.startsWith('4') ? '4 tiếng' : '3 tiếng';
  const packageOpts = packages.map(s => `<option value="${s}" ${selectedPackage === s ? 'selected' : ''}>${s}</option>`).join('');

  const branches = cskhBranches();
  const selectedBranch = booking?.branch || branches[0] || '';
  const branchRows = selectedBranch && !branches.includes(selectedBranch)
    ? [selectedBranch, ...branches]
    : branches;
  const branchOpts = branchRows.map(branch => {
    const historical = isEdit && branch === booking?.branch && !branches.includes(branch);
    return `<option value="${escape(branch)}" ${branch === selectedBranch ? 'selected' : ''}>${escape(branch)}${historical ? ' · lịch sử' : ''}</option>`;
  }).join('');

  let defaultIn = window.UniteOps.toDatetimeLocal(new Date());
  let defaultOut = window.UniteOps.addHoursLocal(defaultIn, 3);
  if (isEdit) {
    defaultIn = window.UniteOps.toDatetimeLocal(booking.checkinAt);
    defaultOut = window.UniteOps.toDatetimeLocal(booking.checkoutAt);
  }

  const html = `
    <div id="createBookingBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;" onclick="document.getElementById('createBookingModal')?.remove();this.remove();"></div>
    <div id="createBookingModal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#fff;border-radius:16px;padding:28px;width:min(96vw,600px);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div>
          <h3 style="margin:0 0 4px;font-size:18px;">${isEdit ? 'Sửa Đơn: ' + escape(booking.customerName) : 'Tạo Đơn Mới'}</h3>
          <p style="margin:0;font-size:13px;color:#666;">${isEdit ? 'Cập nhật thông tin khách và phòng' : 'Nhập thông tin khách để tạo đơn'}</p>
        </div>
        <button type="button" onclick="document.getElementById('createBookingModal')?.remove();document.getElementById('createBookingBackdrop')?.remove();" style="background:none;border:none;cursor:pointer;font-size:20px;color:#999;padding:0;line-height:1;">x</button>
      </div>

      <form id="createBookingForm" style="display:flex;flex-direction:column;gap:12px;">
        <fieldset style="border:1px solid #eee; border-radius:8px; padding:12px; margin:0;">
          <legend style="font-size:12px; font-weight:600; color:#666; padding:0 4px;">👤 Thông tin khách</legend>
          <div class="create-booking-row">
            <div style="flex:2;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Họ tên *</label>
              <input type="text" name="name" value="${escape(booking?.customerName || '')}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Nguồn khách</label>
              <select name="source" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">${sourceOpts}</select>
            </div>
          </div>
          <div class="create-booking-row">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Số Zalo / WhatsApp *</label>
              <input type="tel" name="phone" inputmode="tel" autocomplete="tel" minlength="8" maxlength="20" value="${escape(booking?.phone || '')}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Email (nếu có)</label>
              <input type="email" name="email" value="${escape(booking?.email || '')}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>
        </fieldset>

        <fieldset style="border:1px solid #eee; border-radius:8px; padding:12px; margin:0;">
          <legend style="font-size:12px; font-weight:600; color:#666; padding:0 4px;">🏨 Phòng & Thời gian</legend>
          <div class="create-booking-row">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Chi nhánh *</label>
              <select name="branch" id="cbBranch" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">
                ${branchOpts}
              </select>
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Loại phòng / Layout *</label>
              <select name="roomId" id="cbRoom" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></select>
            </div>
          </div>

          <div style="margin-bottom:10px;">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Phòng cụ thể (có thể xếp sau)</label>
            <select name="roomUnitCode" id="cbUnit" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></select>
            <small id="cbUnitHint" style="display:block;margin-top:5px;color:#777;line-height:1.4;">Có thể nhận cọc hoặc thanh toán trước; cần xếp phòng cụ thể trước khi khách check-in.</small>
          </div>

          <div class="create-booking-row">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Gói giờ</label>
              <select name="package" id="cbPackage" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">${packageOpts}</select>
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Số khách</label>
              <input type="number" name="guests" value="${booking?.guests || 2}" min="1" max="12" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>

          <div class="create-booking-row">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-in *</label>
              <input type="datetime-local" name="checkin" id="cbCheckin" value="${defaultIn}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-out *</label>
              <input type="datetime-local" name="checkout" id="cbCheckout" value="${defaultOut}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>
          <p id="cbTimeHint" style="margin:8px 0 0;font-size:12px;color:#666;line-height:1.45;"></p>
        </fieldset>
        
        <div style="margin-top:4px;">
           <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Giờ nhận phòng / Ghi chú</label>
           <textarea name="note" placeholder="Setup, giờ khách muốn nhận, yêu cầu đặc biệt..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;min-height:60px;">${escape(booking?.note || '')}</textarea>
        </div>

        <button type="submit" id="cbSaveBtn" style="width:100%;background:#000;color:#fff;border:none;border-radius:8px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;">${isEdit ? 'Lưu Cập Nhật' : 'Tạo Đơn (Trạng thái: Mới)'}</button>
      </form>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const form = document.getElementById('createBookingForm');
  const branchSel = document.getElementById('cbBranch');
  const roomSel = document.getElementById('cbRoom');
  const unitSel = document.getElementById('cbUnit');
  const checkinInput = document.getElementById('cbCheckin');
  const checkoutInput = document.getElementById('cbCheckout');
  const packageSel = document.getElementById('cbPackage');
  const timeHint = document.getElementById('cbTimeHint');
  const unitHint = document.getElementById('cbUnitHint');
  const saveBtn = document.getElementById('cbSaveBtn');

  const updateTimeHint = () => {
    const start = window.UniteOps.asDate(checkinInput.value);
    const end = window.UniteOps.asDate(checkoutInput.value);
    const valid = checkinInput.value && checkoutInput.value && end > start;
    checkoutInput.min = checkinInput.value || '';
    checkoutInput.setCustomValidity(valid ? '' : 'Check-out phải sau check-in.');
    timeHint.textContent = valid
      ? `${window.UniteOps.dateTime(checkinInput.value)} → ${window.UniteOps.dateTime(checkoutInput.value)} · ${Math.round((end - start) / 3_600_000 * 10) / 10} giờ.`
      : 'Check-out phải sau check-in.';
    timeHint.style.color = valid ? '#2e7d32' : '#b42318';
    return Boolean(valid);
  };

  const updateUnits = () => {
    const roomId = roomSel.value;
    const previous = unitSel.value || booking?.roomUnitCode || '';
    const units = cskhUnits().filter(unit => unit.roomId === roomId);
    const draft = { roomId, checkinAt: checkinInput.value, checkoutAt: checkoutInput.value };
    const unitOptions = units.map(unit => {
      const conflicts = window.UniteOps.findConflicts(cskhState.bookings, { ...draft, roomUnitCode: unit.code }, booking?.id || null);
      const unavailable = unit.status !== 'available';
      const isOriginal = isEdit && roomId === booking?.roomId && unit.code === booking?.roomUnitCode;
      const disabled = !isOriginal && (unavailable || conflicts.length > 0);
      const suffix = isOriginal && unavailable
        ? ' · đang giữ theo lịch sử (bảo trì)'
        : isOriginal && conflicts.length
          ? ' · đang gán, có xung đột cần rà soát'
          : unavailable ? ' · bảo trì' : conflicts.length ? ' · bận khung giờ này' : ' · trống';
      return `<option value="${escape(unit.code)}" ${disabled ? 'disabled' : ''}>${escape(unit.unitName || unit.code)}${suffix}</option>`;
    });
    const originalMissing = isEdit
      && roomId === booking?.roomId
      && booking?.roomUnitCode
      && !units.some(unit => unit.code === booking.roomUnitCode);
    if (originalMissing) {
      unitOptions.unshift(
        `<option value="${escape(booking.roomUnitCode)}">${escape(booking.roomUnitName || booking.roomUnitCode)} · lịch sử, không còn trong inventory</option>`
      );
    }
    unitSel.innerHTML = `<option value="">Chưa xếp phòng cụ thể</option>${unitOptions.join('')}`;
    if ([...unitSel.options].some(option => option.value === previous && !option.disabled)) {
      unitSel.value = previous;
    }
    const busyCount = [...unitSel.options].filter(option => option.disabled).length;
    const capacity = window.UniteOps.roomCapacityState(
      cskhState.bookings,
      { ...draft, status: booking?.status || 'holding' },
      cskhUnits(),
      booking?.id || null
    );
    unitHint.textContent = units.length
      ? `${Math.max(0, units.length - busyCount)} phòng cụ thể đang trống · ${capacity.reserved} booking đã giữ/cọc/thu · còn ${capacity.remainingBeforeDraft} suất. Có thể nhận cọc trước; cần xếp phòng trước check-in.`
      : 'Layout này chưa có phòng thực tế khả dụng trong inventory.';
    if (saveBtn) {
      const selected = unitSel.options[unitSel.selectedIndex]?.textContent?.replace(/\s+·\s+(trống|bận khung giờ này|bảo trì)$/i, '') || '';
      saveBtn.textContent = unitSel.value
        ? `Lưu & gán ${selected}`
        : Number(booking?.paid || booking?.deposit || 0) > 0
          ? 'Lưu thông tin · vẫn chờ xếp phòng'
          : isEdit ? 'Lưu & để chờ xếp phòng' : 'Tạo đơn & để chờ xếp phòng';
    }
  };

  const updateRooms = () => {
    const branch = branchSel.value;
    const previous = roomSel.value || booking?.roomId || '';
    const roomRows = cskhState.rooms.filter(room => room.location === branch);
    const roomOptions = roomRows.map(room => {
      const isOriginal = isEdit && room.id === booking?.roomId;
      const disabled = room.status === 'maintenance' && !isOriginal;
      const suffix = room.status === 'maintenance'
        ? isOriginal ? ' (đang giữ theo lịch sử · bảo trì)' : ' (bảo trì)'
        : '';
      return `<option value="${escape(room.id)}" ${disabled ? 'disabled' : ''}>${escape(room.name)} - ${room.inventory || 0} phòng${suffix}</option>`;
    });
    const originalMissing = isEdit
      && branch === booking?.branch
      && booking?.roomId
      && !roomRows.some(room => room.id === booking.roomId);
    if (originalMissing) {
      roomOptions.unshift(
        `<option value="${escape(booking.roomId)}">${escape(booking.roomName || booking.roomId)} · layout lịch sử, không còn trong inventory</option>`
      );
    }
    roomSel.innerHTML = roomOptions.join('');
    if ([...roomSel.options].some(option => option.value === previous && !option.disabled)) {
      roomSel.value = previous;
    }
    updateUnits();
  };

  branchSel.addEventListener('change', updateRooms);
  roomSel.addEventListener('change', updateUnits);
  unitSel.addEventListener('change', updateUnits);
  updateRooms();

  const originalDurationMs = isEdit
    ? Math.max(0, window.UniteOps.asDate(booking.checkoutAt) - window.UniteOps.asDate(booking.checkinAt))
    : 0;
  const updateCheckout = ({ preserveDuration = false } = {}) => {
    if (!checkinInput.value) return;
    const room = cskhState.rooms.find(item => item.id === roomSel.value);
    const selectedPrice = room?.prices?.find(price => price.label === packageSel.value);
    const keepsOriginalStay = preserveDuration && packageSel.value === selectedPackage && originalDurationMs > 0;
    const hours = keepsOriginalStay
      ? originalDurationMs / 3_600_000
      : Number(selectedPrice?.durationHours || 0) || window.UniteOps.packageHours(packageSel.value);
    checkoutInput.value = window.UniteOps.addHoursLocal(checkinInput.value, hours);
    updateTimeHint();
    updateUnits();
  };

  checkinInput.addEventListener('change', () => updateCheckout({ preserveDuration: true }));
  packageSel.addEventListener('change', () => updateCheckout());
  checkoutInput.addEventListener('change', () => { updateTimeHint(); updateUnits(); });
  updateTimeHint();
  updateUnits();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('cbSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';
    try {
      const inAt = form.checkin.value;
      const outAt = form.checkout.value;
      if (!updateTimeHint()) throw new Error('Check-out phải sau check-in.');
      const selRoom = cskhState.rooms.find(r => r.id === roomSel.value);
      const selUnit = cskhUnits().find(unit => unit.code === unitSel.value) || {};
      const payload = {
        ...(booking || {}),
        id: booking?.id || `US-${window.UniteOps.isoDate(new Date()).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 7).toUpperCase()}`,
        customerName: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        source: form.source.value,
        branch: branchSel.value,
        roomId: roomSel.value,
        roomName: selRoom?.name || roomSel.value,
        roomUnitCode: unitSel.value,
        roomUnitName: selUnit.unitName || selUnit.unit_name || '',
        packageLabel: form.package.value,
        guests: Number(form.guests.value) || 2,
        checkinAt: inAt,
        checkoutAt: outAt,
        stayDate: inAt.slice(0, 10),
        checkoutDate: outAt.slice(0, 10),
        note: form.note.value.trim(),
        status: booking?.status || 'new',
        total: Number(booking?.total || 0),
        deposit: Number(booking?.deposit || 0),
        paid: Number(booking?.paid || 0),
        createdAt: booking?.createdAt || new Date().toISOString(),
        assignedTo: booking?.assignedTo || window.UniteAuth?.profile?.()?.full_name || 'CSKH'
      };
      const conflicts = window.UniteOps.activeStatuses.includes(payload.status) && payload.roomUnitCode
        ? window.UniteOps.findConflicts(cskhState.bookings, payload, booking?.id || null)
        : [];
      if (conflicts.length) {
        throw new Error(`Phòng đã bận: ${conflicts.map(row => `${row.customerName} (${window.UniteOps.dateTime(row.checkinAt)})`).join(', ')}`);
      }
      const saved = await saveBooking(
        payload,
        isEdit ? { expectedUpdatedAt:booking.updatedAt } : {}
      );
      document.getElementById('createBookingModal')?.remove();
      document.getElementById('createBookingBackdrop')?.remove();
      if (!isEdit) setTimeout(() => window.openQuickPayModal(saved.id), 200);
    } catch(err) {
      alert('Lỗi: ' + (err.message || err));
      btn.disabled = false;
      updateUnits();
    }
  });
};

const saveBooking = async (booking, options = {}) => {
  cskhSaveInFlight += 1;
  try {
  const liveExpectedAtStart = Boolean(booking?.supabaseId)
    || (window.UniteOps.isSupabaseConfigured() && Boolean(window.UniteAuth?.session?.()?.access_token));
  const invariantError = bookingInvariantMessage(booking);
  const existingBooking = cskhState.bookings.find(row => row.id === booking.id || (booking.supabaseId && row.supabaseId === booking.supabaseId));
  if (invariantError && (!existingBooking || existingBooking.status !== booking.status)) {
    throw new Error(invariantError);
  }
  if (window.UniteOps.activeStatuses.includes(booking.status) && booking.roomUnitCode) {
    const conflicts = window.UniteOps.findConflicts(
      cskhState.bookings,
      booking,
      booking.id || booking.supabaseId || null
    );
    if (conflicts.length) {
      throw new Error(`Phòng đã bận: ${conflicts.map(row => `${row.customerName} (${window.UniteOps.dateTime(row.checkinAt)})`).join(", ")}.`);
    }
  }
  const preservesActiveCapacityFootprint = Boolean(
    existingBooking
    && window.UniteOps.activeStatuses.includes(existingBooking.status)
    && window.UniteOps.activeStatuses.includes(booking.status)
    && booking.roomId === existingBooking.roomId
    && window.UniteOps.asDate(booking.checkinAt).getTime()
      === window.UniteOps.asDate(existingBooking.checkinAt).getTime()
    && window.UniteOps.asDate(booking.checkoutAt).getTime()
      === window.UniteOps.asDate(existingBooking.checkoutAt).getTime()
  );
  if (window.UniteOps.activeStatuses.includes(booking.status) && !preservesActiveCapacityFootprint) {
    const roomUnits = cskhUnits().filter(unit => unit.roomId === booking.roomId);
    const inventoryUnits = roomUnits.length
      ? cskhUnits()
      : [
          ...cskhUnits(),
          ...Array.from(
            { length: Math.max(0, Number(cskhState.rooms.find(room => room.id === booking.roomId)?.inventory || 0)) },
            (_, index) => ({ roomId: booking.roomId, status: "available", code: `${booking.roomId}-CAP-${index + 1}` })
          )
        ];
    const capacity = window.UniteOps.roomCapacityState(
      cskhState.bookings,
      booking,
      inventoryUnits,
      booking.id || booking.supabaseId || null
    );
    if (!capacity.ok) {
      throw new Error(`Layout đã đủ ${capacity.capacity} suất trong khung giờ này. Hãy đổi giờ, đổi layout hoặc xử lý các booking đang Chờ xếp phòng.`);
    }
  }
  const result = booking.supabaseId
    ? options.expectedUpdatedAt
      ? await window.UniteOps.updateBookingCasAsync(booking, options.expectedUpdatedAt, {
          quickPayFinalize:Boolean(options.quickPayFinalize)
        })
      : await window.UniteOps.updateBookingAsync(booking)
    : await window.UniteOps.createBookingAsync(booking);
  if (liveExpectedAtStart && !result.ok) {
    syncState("#cskhSupabaseSyncState", `Không lưu được Supabase: ${result.message || result.reason || "lỗi không xác định"}`);
    throw new Error(`Booking chưa được lưu. ${result.message || result.reason || "Supabase từ chối yêu cầu."}`);
  }

  const saved = result.row || booking;
  const index = cskhState.bookings.findIndex(row =>
    row.id === saved.id || (saved.supabaseId && row.supabaseId === saved.supabaseId)
  );
  if (index >= 0) cskhState.bookings[index] = saved;
  else cskhState.bookings.unshift(saved);
  saveLocal();
  syncState("#cskhSupabaseSyncState", result.ok ? "Đã lưu Supabase." : "Đang chạy local vì chưa cấu hình Supabase.");
  syncState("#cskhSheetSyncState", result.sheet?.ok
    ? (result.sheet.verified ? "Đã backup và xác minh trên Sheet." : "Đã gửi yêu cầu backup Sheet; webhook no-cors chưa xác minh được dòng ghi.")
    : "Sheet chưa cấu hình hoặc chưa gửi được.");
  renderAll();
  return saved;
  } finally {
    cskhSaveInFlight = Math.max(0, cskhSaveInFlight - 1);
  }
};

const proofValidationMessage = draft => {
  if (["cancelled", "no_show"].includes(draft.status)) return "";
  const rank = statusRank(draft.status);
  if (draft.status === "deposited" && (draft.deposit <= 0 || !hasDepositProofInForm())) {
    return "Muốn chuyển sang Đã cọc, phải nhập tiền cọc và tải bill cọc.";
  }
  if (rank >= statusRank("paid") && !hasFullProofInForm()) {
    return "Chưa có bill thanh toán phần còn lại nên không thể chuyển sang Đã thanh toán hoặc các trạng thái sau đó.";
  }
  return "";
};

const saveBookingWithProofs = async draft => {
  const form = $("#bookingForm");
  const depositFile = form.depositBill.files?.[0] || null;
  const fullFile = form.fullPaymentBill.files?.[0] || null;
  if (!depositFile && !fullFile) return saveBooking(draft);

  const wantedStatus = draft.status;
  const existing = currentEditingBooking();
  const initialDraft = {
    ...draft,
    status:existing?.status || "new",
    total:Number(existing?.total || 0),
    deposit:Number(existing?.deposit || 0),
    paid:Number(existing?.paid || 0),
    paymentMethod:existing?.paymentMethod || "Chưa thu",
    depositBillUrl:existing?.depositBillUrl || "",
    depositBillPath:existing?.depositBillPath || "",
    fullPaymentBillUrl:existing?.fullPaymentBillUrl || "",
    fullPaymentBillPath:existing?.fullPaymentBillPath || ""
  };
  let saved = await saveBooking(initialDraft);
  let paymentBooking = null;
  try {
    const canClaimForProof = ["new","consulting","holding","deposited","paid","checked_in","checked_out"].includes(saved.status);
    if (canClaimForProof) {
      saved = await autoAssignQuickPayBooking(saved, { claimForPayment:true });
      if (saved.quickPayClaimToken) paymentBooking = { ...saved };
    }
    saved = {
      ...saved,
      total:Number(draft.total || 0),
      deposit:Number(draft.deposit || 0),
      paid:Number(draft.paid || 0),
      paymentMethod:draft.paymentMethod || saved.paymentMethod || "Chưa thu"
    };

    if (depositFile) {
      if (draft.deposit <= 0) throw new Error("Đã chọn bill cọc nhưng tiền cọc đang bằng 0. Hãy nhập số tiền cọc trước.");
      const row = await window.UniteOps.savePaymentProofAsync(saved, {
        type: "deposit",
        amount: draft.deposit,
        paidAt: form.depositPaidAt.value || new Date().toISOString(),
        file: depositFile,
        method: draft.paymentMethod,
        note: "Bill cọc tải từ form tạo booking"
      });
      if (row.bookingUpdatedAt) saved.updatedAt = row.bookingUpdatedAt;
      saved.deposit = Math.max(Number(saved.deposit || 0), row.amount);
      saved.paid = Math.max(Number(saved.paid || 0), row.amount);
      saved.depositBillUrl = row.billUrl;
      saved.depositBillPath = row.billPath;
      saved.depositUploadedAt = row.uploadedAt;
    }

    if (fullFile) {
      const outstanding = Math.max(0, Number(draft.total || 0) - Math.max(Number(draft.paid || 0), Number(draft.deposit || 0)));
      const replacementAmount = hasFullProof(currentEditingBooking())
        ? Math.max(0, Number(draft.total || 0) - Number(draft.deposit || 0))
        : 0;
      const fullAmount = outstanding || replacementAmount;
      if (fullAmount <= 0) throw new Error("Không còn số tiền cần thanh toán để ghi nhận bill thanh toán.");
      const row = await window.UniteOps.savePaymentProofAsync(saved, {
        type: "full",
        amount: fullAmount,
        paidAt: form.fullPaidAt.value || new Date().toISOString(),
        file: fullFile,
        method: draft.paymentMethod,
        note: "Bill thanh toán còn lại tải từ form tạo booking"
      });
      if (row.bookingUpdatedAt) saved.updatedAt = row.bookingUpdatedAt;
      saved.paid = Number(draft.total || 0);
      saved.fullPaymentBillUrl = row.billUrl;
      saved.fullPaymentBillPath = row.billPath;
      saved.fullPaymentUploadedAt = row.uploadedAt;
    }

    const nowHasDeposit = hasDepositProof(saved);
    const nowHasFull = hasFullProof(saved);
    if (nowHasFull && Number(saved.total || 0) > 0) {
      saved.paid = Number(saved.total || 0);
      if (!["checked_in", "checked_out", "cancelled", "no_show"].includes(wantedStatus)) saved.status = "paid";
      else saved.status = wantedStatus;
    } else if (nowHasDeposit && Number(saved.deposit || 0) > 0) {
      if (statusRank(wantedStatus) >= statusRank("deposited") && statusRank(wantedStatus) < statusRank("paid")) saved.status = wantedStatus;
      else if (!["cancelled", "no_show"].includes(wantedStatus)) saved.status = "deposited";
    } else {
      saved.status = wantedStatus;
    }

    const finalError = (() => {
      if (saved.status === "deposited" && (!nowHasDeposit || Number(saved.deposit || 0) <= 0)) return "Đã cọc cần có tiền cọc và bill cọc.";
      if (statusRank(saved.status) >= statusRank("paid") && !nowHasFull) return "Trạng thái này cần bill thanh toán.";
      return "";
    })();
    if (finalError) throw new Error(finalError);

    if (paymentBooking) {
      const finalization = await finalizeQuickPayBooking(saved, paymentBooking);
      saved = completeFinalizedQuickPayClaim(finalization.saved);
      if (finalization.needsReview) showCskhToast(finalization.message);
      paymentBooking = null;
      return saved;
    }
    return saveBooking(saved);
  } catch (error) {
    if (paymentBooking) await releaseQuickPayClaim(paymentBooking);
    throw error;
  }
};

const advanceStatus = async id => {
  const booking = cskhState.bookings.find(row => row.id === id);
  if (!booking) return;
  const currentIndex = statusOrder.indexOf(booking.status);
  if (currentIndex < 0 || currentIndex >= statusOrder.length - 1) {
    alert("Đơn đã kết thúc. Hãy mở Sửa đơn nếu cần xử lý lại có chủ đích.");
    return;
  }
  const nextStatus = statusOrder[currentIndex + 1];

  if (window.UniteOps.unitRequiredStatuses?.includes(nextStatus) && !booking.roomUnitCode) {
    alert("Cần xếp phòng cụ thể trước khi check-in.");
    return window.openCreateBookingModal(booking.id);
  }
  if (nextStatus === "deposited" && (!hasDepositProof(booking) || Number(booking.deposit || 0) <= 0)) {
    alert("Chưa thể chuyển sang Đã cọc. Hãy mở đơn, nhập tiền cọc và tải bill cọc trước.");
    return focusPaymentProof(id);
  }
  if (statusRank(nextStatus) >= statusRank("paid") && !hasFullProof(booking)) {
    alert("Booking mới chỉ có cọc. Phải tải bill thanh toán phần còn lại trước khi đẩy trạng thái.");
    return focusPaymentProof(id);
  }

  try {
    await saveBooking(
      { ...booking, status: nextStatus },
      booking.supabaseId ? { expectedUpdatedAt:booking.updatedAt } : {}
    );
  } catch (error) {
    renderAll();
    alert(error.message || "Không cập nhật được trạng thái.");
  }
};

const deleteBooking = async id => {
  if (!confirm("Super Admin/Admin: xóa giao dịch này?")) return;
  const booking = cskhState.bookings.find(row => row.id === id);
  if (!booking) return;
  if (booking.supabaseId) {
    const result = await window.UniteOps.deleteBookingAsync(booking);
    if (!result.ok) return alert(result.message || "Không xóa được booking trên Supabase.");
  }
  cskhState.bookings = cskhState.bookings.filter(row => row.id !== id);
  saveLocal();
  if (cskhState.selectedBookingId === id) clearForm();
  renderAll();
};

const normalizeKey = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/đ/g, "d")
  .replace(/[^a-z0-9]+/g, "")
  .trim();

const parseCsv = text => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some(value => String(value).trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map(header => String(header || "").trim());
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
};

const parseImportedDate = value => {
  if (!value && value !== 0) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return window.UniteOps.toDatetimeLocal(value);
  if (typeof value === "number" && window.XLSX?.SSF?.parse_date_code) {
    const parsed = window.XLSX.SSF.parse_date_code(value);
    if (parsed) return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}T${String(parsed.H || 0).padStart(2, "0")}:${String(parsed.M || 0).padStart(2, "0")}`;
  }
  const text = String(value).trim();
  if (!text) return "";
  const timeFirst = text.match(/^(\d{1,2}):(\d{2})\s+(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (timeFirst) return `${timeFirst[5]}-${timeFirst[4].padStart(2, "0")}-${timeFirst[3].padStart(2, "0")}T${timeFirst[1].padStart(2, "0")}:${timeFirst[2].padStart(2, "0")}`;
  const vietnamese = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (vietnamese) return `${vietnamese[3]}-${vietnamese[2].padStart(2, "0")}-${vietnamese[1].padStart(2, "0")}T${String(vietnamese[4] || 0).padStart(2, "0")}:${String(vietnamese[5] || 0).padStart(2, "0")}`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : window.UniteOps.toDatetimeLocal(date);
};

const readBackupRows = async file => {
  const extension = String(file.name || "").split(".").pop().toLowerCase();
  if (extension === "csv") return parseCsv(await file.text());
  if (!["xlsx", "xls"].includes(extension)) throw new Error("Chỉ hỗ trợ file CSV, XLSX hoặc XLS.");
  if (!window.XLSX) throw new Error("Thư viện đọc Excel chưa tải được. Hãy kiểm tra Internet hoặc dùng file CSV.");
  const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd hh:mm" });
};

const statusFromImport = value => {
  const normalized = normalizeKey(value);
  const legacyAliases = {
    moichuacoc: "new",
    danggiucho: "holding",
    dathudu: "paid",
    hoanthanh: "checked_out",
    khachkhongden: "no_show"
  };
  if (legacyAliases[normalized]) return legacyAliases[normalized];
  const direct = Object.keys(window.UniteOps.statuses).find(key => normalizeKey(key) === normalized);
  if (direct) return direct;
  return Object.entries(window.UniteOps.statuses).find(([, label]) => normalizeKey(label) === normalized)?.[0] || "new";
};

const sourceFromImport = value => {
  const text = String(value || "").trim();
  if (!text) return "Website";
  const matchingLabel = cskhSources().find(source => normalizeKey(source) === normalizeKey(text));
  return matchingLabel || window.UniteOps.sourceLabelByCode?.[text] || text;
};

const normalizeImportedBooking = (row, index) => {
  const normalizedRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
  const get = (...keys) => {
    for (const key of keys) {
      const value = normalizedRow[normalizeKey(key)];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  };

  const roomIdRaw = String(get("roomId", "room_code", "ma layout", "layout code") || "").trim();
  const roomNameRaw = String(get("roomName", "layout", "ten layout", "hang phong", "loai phong") || "").trim();
  const branchRaw = String(get("branch", "chi nhanh") || "").trim();
  const room = cskhState.rooms.find(item => item.id === roomIdRaw)
    || cskhState.rooms.find(item => normalizeKey(item.name) === normalizeKey(roomNameRaw) && (!branchRaw || normalizeKey(item.location) === normalizeKey(branchRaw)));
  const roomId = room?.id || roomIdRaw;
  const unitCodeRaw = String(get("roomUnitCode", "room_unit_code", "ma phong", "phong that") || "").trim();
  const unitNameRaw = String(get("roomUnitName", "room_unit_name", "ten phong", "phong thuc te") || "").trim();
  const unit = cskhUnits().find(item => item.code === unitCodeRaw)
    || cskhUnits().find(item => item.roomId === roomId && normalizeKey(item.unitName) === normalizeKey(unitNameRaw));

  const checkinAt = parseImportedDate(get("checkinAt", "checkin", "check in", "ngay nhan", "gio nhan"));
  const checkoutAt = parseImportedDate(get("checkoutAt", "checkout", "check out", "ngay tra", "gio tra"));
  const customerName = String(get("customerName", "ten khach", "khach hang", "ten khach hang") || "").trim();
  const phoneRaw = String(get("phone", "sdt", "so dien thoai", "dien thoai", "zalo", "whatsapp", "zalo whatsapp") || "").trim();
  const phone = /^'\+\d[\d\s().-]*$/.test(phoneRaw) ? phoneRaw.slice(1) : phoneRaw;
  const id = String(get("id", "public_code", "ma booking", "ma don") || `IMPORT-${Date.now()}-${index + 1}`).trim();
  const existing = cskhState.bookings.find(booking => booking.id === id);
  const total = parseMoney(get("total", "total_amount", "tong tien"));
  const deposit = parseMoney(get("deposit", "deposit_amount", "tien coc", "da coc"));
  const paid = Math.max(parseMoney(get("paid", "paid_amount", "da thanh toan", "da thu", "da thu tong")), deposit);
  const importedStatus = statusFromImport(get("status", "trang thai"));
  const depositBillUrl = existing?.depositBillUrl || String(get("depositBillUrl", "deposit_bill_url") || "");
  const fullPaymentBillUrl = existing?.fullPaymentBillUrl || String(get("fullPaymentBillUrl", "full_payment_bill_url") || "");
  const depositBillPath = existing?.depositBillPath || String(get("depositBillPath", "deposit_bill_path") || "");
  const fullPaymentBillPath = existing?.fullPaymentBillPath || String(get("fullPaymentBillPath", "full_payment_bill_path") || "");

  if (!customerName) throw new Error("thiếu tên khách");
  if (!phone) throw new Error("thiếu số Zalo/WhatsApp");
  if (!room) throw new Error("không tìm thấy layout");
  if ((unitCodeRaw || unitNameRaw) && !unit?.code) throw new Error(`phòng cụ thể không tồn tại: ${unitCodeRaw || unitNameRaw}`);
  if (unit && unit.roomId !== roomId) throw new Error(`phòng ${unit.code} không thuộc layout ${roomId}`);
  if (window.UniteOps.unitRequiredStatuses?.includes(importedStatus) && !unit?.code) {
    throw new Error("booking đã check-in/check-out phải có phòng cụ thể");
  }
  if (importedStatus === "deposited" && (deposit <= 0 || !(depositBillPath || depositBillUrl))) {
    throw new Error("booking Đã cọc phải có số tiền và chứng từ cọc");
  }
  if (statusRank(importedStatus) >= statusRank("paid")
      && (total <= 0 || paid < total || !(fullPaymentBillPath || fullPaymentBillUrl))) {
    throw new Error("booking đã thanh toán/check-in/check-out phải có đủ tiền và chứng từ thanh toán");
  }
  if (!checkinAt || !checkoutAt) throw new Error("sai định dạng check-in/check-out");
  if (new Date(checkoutAt).getTime() <= new Date(checkinAt).getTime()) throw new Error("check-out không sau check-in");

  return {
    id,
    supabaseId: existing?.supabaseId,
    createdAt: parseImportedDate(get("createdAt", "created_at", "ngay tao")) || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    checkinAt,
    checkoutAt,
    stayDate: window.UniteOps.isoDate(checkinAt),
    checkoutDate: window.UniteOps.isoDate(checkoutAt),
    branch: room?.location || branchRaw,
    roomId,
    roomName: room?.name || roomNameRaw || roomId,
    roomUnitCode: unit?.code || unitCodeRaw,
    roomUnitName: unit?.unitName || unitNameRaw || unitCodeRaw,
    customerName,
    phone,
    email: String(get("email") || "").trim(),
    source: sourceFromImport(get("source", "nguon khach", "nguon dat")),
    status: importedStatus,
    packageLabel: String(get("packageLabel", "package_label", "goi", "goi gio") || "3 tiếng").trim(),
    guests: Math.max(1, Number(get("guests", "so khach", "khach") || 2)),
    total,
    deposit,
    paid,
    paymentMethod: String(get("paymentMethod", "payment_method", "phuong thuc", "phuong thuc thu") || "Chưa thu").trim(),
    assignedTo: String(get("assignedTo", "assigned_to", "cskh phu trach", "nguoi phu trach") || currentProfileName()).trim(),
    note: String(get("note", "internal_note", "ghi chu") || "").trim(),
    externalRef: String(get("externalRef", "external_ref", "ma ngoai", "ma ota") || "").trim(),
    depositBillUrl,
    fullPaymentBillUrl,
    depositBillPath,
    fullPaymentBillPath
  };
};

const importBackupFile = async file => {
  const input = $("#cskhImportFile");
  const state = $("#backupImportState");
  try {
    state.textContent = `Đang đọc ${file.name}...`;
    const rawRows = await readBackupRows(file);
    if (!rawRows.length) throw new Error("File không có dòng dữ liệu nào.");
    if (!confirm(`Đã đọc ${rawRows.length} dòng. Tiếp tục nhập và cập nhật các booking trùng mã?`)) return;

    const validRows = [];
    const invalidRows = [];
    rawRows.forEach((row, index) => {
      try { validRows.push(normalizeImportedBooking(row, index)); }
      catch (error) { invalidRows.push(`Dòng ${index + 2}: ${error.message}`); }
    });
    if (!validRows.length) throw new Error(`Không có dòng hợp lệ. ${invalidRows.slice(0, 3).join("; ")}`);

    let imported = 0;
    const saveErrors = [];

    for (let index = 0; index < validRows.length; index += 1) {
      const booking = validRows[index];
      state.textContent = `Đang nhập ${index + 1}/${validRows.length}...`;
      try {
        await saveBooking(booking);
        imported += 1;
      } catch (error) {
        saveErrors.push(`${booking.id}: ${error.message}`);
      }
    }

    saveLocal();
    renderAll();
    state.textContent = `Đã nhập ${imported}/${validRows.length} booking.`;
    const details = [
      `Đã nhập thành công: ${imported}`,
      invalidRows.length ? `Bỏ qua sai dữ liệu: ${invalidRows.length}` : "",
      saveErrors.length ? `Lỗi lưu: ${saveErrors.length}` : ""
    ].filter(Boolean).join("\n");
    alert(`${details}${invalidRows.length ? `\n\nVí dụ lỗi:\n${invalidRows.slice(0, 5).join("\n")}` : ""}${saveErrors.length ? `\n\nVí dụ lỗi lưu:\n${saveErrors.slice(0, 5).join("\n")}` : ""}`);
  } catch (error) {
    state.textContent = "Nhập backup thất bại.";
    alert(error.message || "Không đọc được file backup.");
  } finally {
    input.value = "";
  }
};

const renderAll = () => {
  renderSelects();
  renderBookings();
  renderCalendar();
};

const quickPasteDateTime = (raw = "", fallbackTime = "14:00") => {
  const value = String(raw)
    .replace(/[\u00a0,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const pad = number => String(number).padStart(2, "0");
  let match = value.match(/\b(\d{1,2}):(\d{2})\s+(?:ngày\s+)?(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/i);
  if (match) return `${match[5]}-${pad(match[4])}-${pad(match[3])}T${pad(match[1])}:${match[2]}`;

  match = value.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(?:lúc\s+)?(\d{1,2}):(\d{2}))?\b/i);
  if (match) {
    const time = match[4] && match[5] ? `${pad(match[4])}:${match[5]}` : fallbackTime;
    return `${match[3]}-${pad(match[2])}-${pad(match[1])}T${time}`;
  }

  match = value.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?\b/i);
  if (match) {
    const time = match[4] && match[5] ? `${pad(match[4])}:${match[5]}` : fallbackTime;
    return `${match[1]}-${pad(match[2])}-${pad(match[3])}T${time}`;
  }
  return "";
};

const quickPasteSchedule = (raw = "") => {
  const parts = String(raw).split(/\s*(?:→|->|–|—|đến)\s*/i);
  return {
    checkinAt: quickPasteDateTime(parts[0]),
    checkoutAt: parts.length > 1 ? quickPasteDateTime(parts[1]) : ""
  };
};

const bind = async () => {
  const week = window.UniteOps.startOfWeek(new Date());
  cskhState.weekStart = week;
  $("#weekStart").value = window.UniteOps.isoDate(week);
  $("#cskhAuthState").textContent = `Đã đăng nhập: ${currentProfileName()} · quyền ${window.UniteAuth?.profile?.()?.role || ""}`;

  const inventory = await loadLiveInventory();
  syncState("#cskhSupabaseSyncState", inventory.ok
    ? `Đã tải ${inventory.rooms.length} layout · ${inventory.units.length} phòng thật.`
    : `Inventory đang dùng local: ${inventory.reason || inventory.message || "chưa live"}`);


  $("#cskhSearch").addEventListener("input", event => { cskhState.search = event.target.value; renderBookings(); });
  $("#cskhStatusFilter").addEventListener("change", event => { cskhState.status = event.target.value; renderBookings(); });
  $("#cskhSourceFilter").addEventListener("change", event => { cskhState.source = event.target.value; renderBookings(); });
  $("#calendarBranch").addEventListener("change", event => { cskhState.calendarBranch = event.target.value; renderCalendar(); });
  $("#bookingCalendar").addEventListener("click", event => {
    const trigger = event.target.closest("[data-calendar-edit]");
    if (trigger) window.openCreateBookingModal(trigger.dataset.calendarEdit);
  });
  $("#weekStart").addEventListener("change", event => { cskhState.weekStart = new Date(`${event.target.value}T00:00:00`); renderCalendar(); });
  $("#calendarPrev").addEventListener("click", () => { cskhState.weekStart.setDate(cskhState.weekStart.getDate() - 7); $("#weekStart").value = window.UniteOps.isoDate(cskhState.weekStart); renderCalendar(); });
  $("#calendarNext").addEventListener("click", () => { cskhState.weekStart.setDate(cskhState.weekStart.getDate() + 7); $("#weekStart").value = window.UniteOps.isoDate(cskhState.weekStart); renderCalendar(); });
  $("#cskhExport").addEventListener("click", () => window.UniteOps.downloadCsv(filteredBookings(), "Unite-Backup-Booking.csv"));
  $("#cskhReload").addEventListener("click", loadLiveBookings);
  $("#cskhImportFile").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) importBackupFile(file);
  });

  $("#quickPasteBtn")?.addEventListener("click", () => {
    const text = $("#quickPasteInput")?.value || "";
    if (!text.trim()) {
      alert("Vui lòng dán nội dung tin nhắn trước.");
      return;
    }

    const roomMatch = text.match(/- Phòng:\s*(.+)/i)
      || text.match(/mình muốn hỏi\s+(.+?)\s+tại\s+Chi nhánh/i);
    const branchMatch = text.match(/- Chi nhánh:\s*(.+)/i)
      || text.match(/tại\s+(Chi nhánh.+?)(?=[.,]\s*(?:Lịch|gói)|\s+Lịch|$)/i);
    const scheduleMatch = text.match(/-\s*Lịch(?:\s+mong muốn)?\s*:\s*(.+)/i)
      || text.match(/\bLịch mong muốn:\s*(.+)/i);
    const dateMatch = text.match(/- Ngày nhận:\s*(.+)/i);
    const packageMatch = text.match(/- Gói:\s*(.+)/i)
      || text.match(/\bgói\s+([^,.\r\n]+)/i);
    const guestsMatch = text.match(/- Khách:\s*([^\r\n]+)/i)
      || text.match(/(\d+\s*người lớn(?:\s*,\s*\d+\s*trẻ em)?)/i)
      || text.match(/\b(\d+)\s*khách\b/i);
    const guestTotal = guestsMatch
      ? [...guestsMatch[1].matchAll(/\d+/g)].reduce((sum, match) => sum + Number(match[0]), 0)
      : 0;

    window.openCreateBookingModal();
    const form = $("#createBookingForm");
    if (!form) {
      alert("Không mở được form tạo đơn.");
      return;
    }
    let changed = false;

    if (branchMatch && branchMatch[1]) {
      const b = branchMatch[1].trim();
      const option = Array.from(form.branch.options).find(o =>
        normalizeKey(o.value).includes(normalizeKey(b)) || normalizeKey(b).includes(normalizeKey(o.value))
      );
      if (option) {
        form.branch.value = option.value;
        form.branch.dispatchEvent(new Event("change", { bubbles: true }));
        changed = true;
      }
    }

    if (roomMatch && roomMatch[1]) {
      const r = roomMatch[1].trim();
      const idMatch = r.match(/\(([^)]+)\)/);
      const roomId = idMatch ? idMatch[1] : r;
      const option = Array.from(form.roomId.options).find(o => o.value === roomId || o.text.includes(roomId));
      if (option) {
        form.roomId.value = option.value;
        form.roomId.dispatchEvent(new Event("change", { bubbles: true }));
        changed = true;
      }
    }

    if (packageMatch && packageMatch[1]) {
      const p = packageMatch[1].trim();
      const option = Array.from(form.package.options).find(o =>
        normalizeKey(o.value).includes(normalizeKey(p)) || normalizeKey(p).includes(normalizeKey(o.value))
      );
      if (option) { form.package.value = option.value; changed = true; }
    }

    if (scheduleMatch && scheduleMatch[1] && form.checkin) {
      const parsed = quickPasteSchedule(scheduleMatch[1]);
      if (parsed.checkinAt) {
        form.checkin.value = parsed.checkinAt;
        form.checkout.value = parsed.checkoutAt
          || window.UniteOps.addHoursLocal(parsed.checkinAt, window.UniteOps.packageHours(form.package.value));
        changed = true;
      }
    } else if (dateMatch && dateMatch[1]) {
      const parsed = quickPasteDateTime(dateMatch[1]);
      if (parsed && form.checkin) {
        form.checkin.value = parsed;
        form.checkout.value = window.UniteOps.addHoursLocal(parsed, window.UniteOps.packageHours(form.package.value));
        changed = true;
      }
    }

    if (guestTotal > 0 && form.guests) {
      form.guests.value = String(guestTotal);
      changed = true;
    }
    form.checkout?.dispatchEvent(new Event("change", { bubbles: true }));
    form.name?.focus();

    if (changed) {
      alert("Đã điền tự động các thông tin tìm thấy. Vui lòng kiểm tra lại và điền thêm Tên khách, số Zalo/WhatsApp.");
    } else {
      alert("Không tìm thấy thông tin phù hợp theo mẫu tin nhắn hệ thống.");
    }
  });

  let lastKnownBookingId = null;
  let pollInFlight = false;
  const setupLiveNotifications = () => {
    setInterval(async () => {
      if (pollInFlight
          || cskhSaveInFlight > 0
          || document.getElementById("quickPayModal")
          || document.getElementById("createBookingModal")) return;
      pollInFlight = true;
      try {
        const { ok, rows } = await window.UniteOps.loadBookingsAsync();
        const interactionStarted = cskhSaveInFlight > 0
          || document.getElementById("quickPayModal")
          || document.getElementById("createBookingModal");
        if (!interactionStarted && ok && Array.isArray(rows)) {
          cskhState.bookings = rows;
          saveLocal();
          renderAll();
        }
      } catch(e) {
        console.error("Live notification poll error", e);
      } finally {
        pollInFlight = false;
      }
    }, 30000);
  };

  renderAll();
  loadLiveBookings().then(() => {
    if (cskhState.bookings.length > 0) {
      lastKnownBookingId = cskhState.bookings[0].id;
    }
    setupLiveNotifications();
  });
};

window.addEventListener("unite:auth-ready", () => {
  if (window.UniteAuth && !window.UniteAuth.hasRole(["super_admin", "admin"])) {
    document.querySelector('.top-nav a[href="dashboard.html"]')?.remove();
    document.querySelector('.top-nav a[href="admin.html"]')?.remove();
  }
  bind().catch(error => alert(error.message || "Không khởi tạo được CSKH."));
});
document.addEventListener("DOMContentLoaded", () => window.UniteAuth?.require(["super_admin", "admin", "cskh"]));
