// UNITESTAYCATION/js/cskh.js
// V15.3 CSKH: booking-first workflow, proof-gated statuses, inline bill upload and clear payment flow.

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
const currentProfileName = () => window.UniteAuth?.profile?.()?.full_name || window.UniteAuth?.profile?.()?.email || "CSKH";

const statusOrder = ["new", "consulting", "holding", "deposited", "paid", "checked_in", "checked_out"];
const statusRank = status => statusOrder.indexOf(status);
const currentEditingBooking = () => cskhState.bookings.find(row => row.id === $("#bookingForm")?.editingId?.value) || null;
const hasDepositProof = booking => Boolean(booking?.depositBillPath || booking?.depositBillUrl);
const hasFullProof = booking => Boolean(booking?.fullPaymentBillPath || booking?.fullPaymentBillUrl);
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

const packageHours = () => ({
  "3 tiếng": 3,
  "4 tiếng": 4,
  "8 tiếng": 8,
  "Theo ngày": 16,
  "Qua đêm": 12
}[$("#bookingPackage")?.value] || 3);

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
    const nextStatus = statusOrder[Math.min(Math.max(currentIndex, 0) + 1, statusOrder.length - 1)] || "consulting";
    const canAdvance = !(nextStatus === "deposited" && (!depositProof || Number(booking.deposit || 0) <= 0))
      && !(statusRank(nextStatus) >= statusRank("paid") && !fullProof);
    const isNew = booking.status === 'new';
    const ago = timeAgo(booking.createdAt);
    return `
    <article class="booking-row ${cskhState.selectedBookingId === booking.id ? "selected" : ""}" style="${isNew ? 'border-left: 3px solid #e53935;' : ''}">
      <div class="booking-main-copy">
        <strong>${escape(booking.customerName)} · ${escape(booking.phone)}</strong>
        ${ago ? `<span style="font-size:12px;color:#999;margin-left:6px;">· ${ago}</span>` : ''}
        <p>${escape(booking.roomName)} · ${escape(booking.roomUnitName || booking.roomUnitCode || 'Chưa gán phòng')} · ${window.UniteOps.dateTime(booking.checkinAt)} → ${window.UniteOps.dateTime(booking.checkoutAt)}</p>
        <p>${escape(booking.source)} · <b style="${isNew ? 'color:#e53935;' : ''}">${cskhStatusLabel(booking.status)}</b> · ${escape(booking.assignedTo || '')}</p>
        <div class="booking-proof-row">
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
        <button class="btn soft small ${canAdvance ? '' : 'is-locked'}" type="button" data-next="${booking.id}" title="${canAdvance ? 'Đẩy sang trạng thái kế tiếp' : 'Cần bill hợp lệ trước khi đẩy trạng thái'}">${canAdvance ? 'Đẩy trạng thái' : 'Thiếu bill'}</button>
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
  const head = `<div class="calendar-head"><div>Phòng</div>${days.map(day => `<div>${day.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}</div>`).join("")}</div>`;
  const rows = units.map(unit => `<div class="calendar-row"><div class="calendar-room">${escape(unit.roomName)}<small>${escape(unit.branch)} · ${escape(unit.unitName)}</small></div>${days.map(day => {
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const bookings = cskhState.bookings.filter(booking => booking.roomUnitCode === unit.code && window.UniteOps.rangesOverlap(booking.checkinAt, booking.checkoutAt, dayStart, dayEnd) && window.UniteOps.activeStatuses.includes(booking.status));
    return `<div class="calendar-cell ${bookings.length ? "busy" : "free"}">${bookings.map(booking => `<div class="calendar-booking">${escape(booking.customerName)} · ${escape(booking.phone)}<small>${new Date(booking.checkinAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} → ${new Date(booking.checkoutAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}<br>${cskhStatusLabel(booking.status)} · ${window.UniteOps.money(booking.total)}</small></div>`).join("") || `<small>Trống</small>`}</div>`;
  }).join("")}</div>`).join("");
  mount.innerHTML = head + rows;
};

const bindBookingButtons = () => {
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => window.openCreateBookingModal(button.dataset.edit)));
  $$('[data-select-payment]').forEach(button => button.addEventListener('click', () => focusPaymentProof(button.dataset.selectPayment)));
  $$('[data-quick-pay]').forEach(button => button.addEventListener('click', () => openQuickPayModal(button.dataset.quickPay)));
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
  form.checkinAt.value = String(booking.checkinAt || "").slice(0, 16);
  form.checkoutAt.value = String(booking.checkoutAt || "").slice(0, 16);
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
  fillForm(booking);
  setTimeout(() => $("#paymentProofSection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
};

const openQuickPayModal = (bookingId) => {
  const booking = cskhState.bookings.find(row => row.id === bookingId);
  if (!booking) return;

  if (!booking.total) {
    const room = cskhState.rooms.find(r => r.id === booking.roomId);
    if (room && room.prices) {
      const pkg = room.prices.find(p => p.label === booking.packageLabel) || room.prices[0];
      if (pkg && pkg.value) {
        const match = String(pkg.value).match(/[\d,.]+/);
        if (match) {
           let val = Number(match[0].replace(/[^\d]/g, ''));
           if (String(pkg.value).toLowerCase().includes('k') || val < 10000) val *= 1000;
           let calcTotal = val;
           if (booking.packageLabel === 'Ngày' || booking.packageLabel === 'Qua đêm') {
             const dIn = new Date(booking.checkinAt);
             const dOut = new Date(booking.checkoutAt);
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
  const statusRank = window.UniteOps.statusOrder?.indexOf(booking.status) ?? 0;

  let actionHtml = '';
  if (booking.status === 'new' || booking.status === 'consulting' || booking.status === 'holding') {
    actionHtml = `
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <button type="button" onclick="window.qpSetMode('deposit')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Thu cọc</button>
        <button type="button" onclick="window.qpSetMode('full')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Thu đủ</button>
      </div>
      <div id="qpFormArea"></div>
    `;
  } else if (booking.status === 'deposited') {
    actionHtml = `
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        <button type="button" onclick="window.qpSetMode('full')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Thu phần còn lại</button>
        <button type="button" onclick="window.qpSetMode('date')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Khách đổi ngày</button>
        <button type="button" onclick="window.qpSetMode('cancel')" style="width:100%;padding:12px;border-radius:8px;border:1px solid #ffcdd2;background:#ffebee;color:#c62828;cursor:pointer;">Khách hủy (Mất cọc)</button>
      </div>
      <div id="qpFormArea"></div>
    `;
  } else if (booking.status === 'paid') {
    actionHtml = `
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        <button type="button" onclick="window.qpAction('checked_in')" style="flex:1;padding:12px;border-radius:8px;border:none;background:#2e7d32;color:#fff;cursor:pointer;">Xác nhận Check-in</button>
        <button type="button" onclick="window.qpAction('checked_out')" style="flex:1;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Hoàn thành</button>
        <button type="button" onclick="window.qpSetMode('date')" style="width:100%;padding:12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Khách đổi ngày</button>
      </div>
      <div id="qpFormArea"></div>
    `;
  } else {
    actionHtml = `
      <div style="text-align:center;padding:20px;color:#666;">Đơn đang ở trạng thái <b>${window.UniteOps.statuses[booking.status]}</b>. Hãy dùng nút Sửa đơn để thay đổi chi tiết.</div>
    `;
  }

  const html = `
    <div id="quickPayBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;" onclick="document.getElementById('quickPayModal')?.remove();this.remove();"></div>
    <div id="quickPayModal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#fff;border-radius:16px;padding:28px;width:min(96vw,480px);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div>
          <h3 style="margin:0 0 4px;font-size:18px;">${escape(booking.customerName)} · ${escape(booking.phone)}</h3>
          <p style="margin:0;font-size:13px;color:#666;">${escape(booking.roomName)} · ${window.UniteOps.dateTime(booking.checkinAt)}</p>
        </div>
        <button type="button" onclick="document.getElementById('quickPayModal')?.remove();document.getElementById('quickPayBackdrop')?.remove();" style="background:none;border:none;cursor:pointer;font-size:20px;color:#999;padding:0;line-height:1;">×</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px;background:#f9f9f9;padding:12px;border-radius:10px;text-align:center;">
        <div><small style="color:#999;">Tổng tiền</small><br><strong style="font-size:15px;">${window.UniteOps.money(booking.total)}</strong></div>
        <div><small style="color:#999;">Đã thu</small><br><strong style="font-size:15px;color:#2e7d32;">${window.UniteOps.money(booking.paid || booking.deposit)}</strong></div>
        <div><small style="color:#999;">Còn lại</small><br><strong style="font-size:15px;color:${balanceLeft > 0 ? '#e53935' : '#2e7d32'};">${window.UniteOps.money(balanceLeft)}</strong></div>
      </div>

      ${actionHtml}
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  window.qpAction = async (status) => {
    try {
      const idx = cskhState.bookings.findIndex(r => r.id === booking.id);
      let updated = { ...booking, status };
      const result = await window.UniteOps.updateBookingAsync(updated);
      cskhState.bookings[idx] = result.row || updated;
      saveLocal();
      renderAll();
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
          
          <button type="submit" id="qpSaveBtn" style="width:100%;background:#c0392b;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Lưu & Chuyển Đã Cọc</button>
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
          
          <button type="submit" id="qpSaveBtn" style="width:100%;background:#c0392b;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Lưu & Chuyển Đã Thanh Toán</button>
        </form>
      `;
    } else if (mode === 'date') {
      area.innerHTML = `
        <form id="qpForm" onsubmit="window.qpChangeDate(event)">
          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-in mới</label>
              <input type="datetime-local" id="qpCheckin" name="checkin" value="${booking.checkinAt ? booking.checkinAt.slice(0,16) : ''}" required onchange="window.qpHandleCheckinChange(this)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-out mới</label>
              <input type="datetime-local" id="qpCheckout" name="checkout" value="${booking.checkoutAt ? booking.checkoutAt.slice(0,16) : ''}" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>
          <button type="submit" id="qpSaveBtn" style="width:100%;background:#000;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Kiểm tra & Đổi ngày</button>
        </form>
      `;
      // Calculate original duration
      const origIn = booking.checkinAt ? new Date(booking.checkinAt).getTime() : 0;
      const origOut = booking.checkoutAt ? new Date(booking.checkoutAt).getTime() : 0;
      window._qpOrigDuration = (origOut && origIn && origOut > origIn) ? (origOut - origIn) : 0;
      
      window.qpHandleCheckinChange = (input) => {
         if (!window._qpOrigDuration) return;
         const outInput = document.getElementById('qpCheckout');
         if (input.value && outInput) {
            const newIn = new Date(input.value).getTime();
            if (!isNaN(newIn)) {
                const newOut = new Date(newIn + window._qpOrigDuration - new Date().getTimezoneOffset()*60000);
                outInput.value = newOut.toISOString().slice(0,16);
            }
         }
      };
    } else if (mode === 'cancel') {
      area.innerHTML = `
        <div style="background:#ffebee;padding:12px;border-radius:8px;border:1px solid #ffcdd2;margin-bottom:10px;">
          <p style="margin:0;color:#c62828;font-size:13px;">Xác nhận hủy đơn. Doanh thu cọc (nếu có) vẫn được giữ lại trong báo cáo.</p>
        </div>
        <button type="button" onclick="window.qpAction('cancelled')" style="width:100%;background:#c62828;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:600;cursor:pointer;">Xác nhận Hủy Đơn</button>
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
      const conflicts = window.UniteOps.findConflicts({ ...booking, checkinAt: inAt, checkoutAt: outAt }, cskhState.bookings);
      if (conflicts.length > 0) {
        throw new Error('Trùng lịch với đơn: ' + conflicts.map(c => c.customerName).join(', '));
      }
      
      const idx = cskhState.bookings.findIndex(r => r.id === booking.id);
      let updated = { ...booking, checkinAt: inAt, checkoutAt: outAt, stayDate: inAt.slice(0,10), checkoutDate: outAt.slice(0,10) };
      const result = await window.UniteOps.updateBookingAsync(updated);
      cskhState.bookings[idx] = result.row || updated;
      saveLocal();
      renderAll();
      document.getElementById('quickPayModal')?.remove();
      document.getElementById('quickPayBackdrop')?.remove();
      alert('Đổi ngày thành công!');
    } catch(err) {
      alert('Lỗi: ' + (err.message || err));
      btn.disabled = false;
      btn.textContent = 'Kiểm tra & Đổi ngày';
    }
  };

  window.qpSubmit = async (e, targetStatus) => {
    e.preventDefault();
    const btn = document.getElementById('qpSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';
    try {
      const file = e.target.file.files[0];
      const amount = Number(e.target.amount.value.replace(/\D/g, '') || 0);
      const newTotal = e.target.total ? Number(e.target.total.value.replace(/\D/g, '') || 0) : booking.total;
      
      let updated = { ...booking, status: targetStatus, total: newTotal };
      const pType = targetStatus === 'deposited' ? 'deposit' : 'full';
      
      if (pType === 'deposit') {
        updated.deposit = Math.max(updated.deposit || 0, amount);
        updated.paid = Math.max(updated.paid || 0, amount);
      } else {
        updated.paid = Math.max(updated.paid || 0, (updated.deposit || 0) + amount);
      }
      
      const idx = cskhState.bookings.findIndex(r => r.id === booking.id);
      
      const result = updated.supabaseId
        ? await window.UniteOps.updateBookingAsync(updated)
        : await window.UniteOps.createBookingAsync(updated);
      let saved = result.row || updated;
      
      try {
        const row = await window.UniteOps.savePaymentProofAsync(saved, {
          type: pType, amount, file, paidAt: new Date().toISOString(), method: booking.paymentMethod || 'Chuyển khoản'
        });
        if (pType === 'deposit') {
          saved.depositBillUrl = row.billUrl;
          saved.depositBillPath = row.billPath;
        } else {
          saved.fullPaymentBillUrl = row.billUrl;
          saved.fullPaymentBillPath = row.billPath;
        }
        const finalResult = await window.UniteOps.updateBookingAsync(saved);
        saved = finalResult.row || saved;
      } catch (uploadError) {
        alert("Đã ghi nhận tiền thành công nhưng tải bill thất bại (có thể do lỗi mạng hoặc Supabase Storage chưa cấu hình). Lỗi: " + (uploadError.message || uploadError));
      }

      if (idx >= 0) cskhState.bookings[idx] = saved;
      else cskhState.bookings.unshift(saved);
      saveLocal();
      renderAll();
      document.getElementById('quickPayModal')?.remove();
      document.getElementById('quickPayBackdrop')?.remove();
    } catch(err) {
      alert('Lỗi: ' + (err.message || err));
      btn.disabled = false;
      btn.textContent = 'Thử lại';
    }
  };
};

window.openCreateBookingModal = (bookingId = null) => {
  document.getElementById('createBookingModal')?.remove();
  document.getElementById('createBookingBackdrop')?.remove();

  const booking = bookingId ? cskhState.bookings.find(b => b.id === bookingId) : null;
  const isEdit = !!booking;

  const sourceOpts = window.UniteOps.sources?.map(s => `<option value="${s}" ${booking?.source === s ? 'selected' : ''}>${s}</option>`).join('') || '';
  const packages = ['3 tiếng', '4 tiếng', '8 tiếng', 'Theo ngày', 'Qua đêm'];
  const packageOpts = packages.map(s => `<option value="${s}" ${booking?.packageLabel === s ? 'selected' : ''}>${s}</option>`).join('');

  const branches = cskhBranches();
  const selectedBranch = booking?.branch || branches[0] || '';
  const branchOpts = branches.map(b => `<option value="${b}" ${b === selectedBranch ? 'selected' : ''}>${b}</option>`).join('');

  let defaultIn = window.UniteOps.toDatetimeLocal(new Date());
  let defaultOut = window.UniteOps.addHoursLocal(defaultIn, 3);
  if (isEdit) {
    defaultIn = String(booking.checkinAt || "").slice(0, 16);
    defaultOut = String(booking.checkoutAt || "").slice(0, 16);
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
          <div style="display:flex;gap:10px; margin-bottom:10px;">
            <div style="flex:2;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Họ tên *</label>
              <input type="text" name="name" value="${escape(booking?.customerName || '')}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Nguồn khách</label>
              <select name="source" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">${sourceOpts}</select>
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">SĐT / Zalo *</label>
              <input type="text" name="phone" value="${escape(booking?.phone || '')}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Email (nếu có)</label>
              <input type="email" name="email" value="${escape(booking?.email || '')}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>
        </fieldset>

        <fieldset style="border:1px solid #eee; border-radius:8px; padding:12px; margin:0;">
          <legend style="font-size:12px; font-weight:600; color:#666; padding:0 4px;">🏨 Phòng & Thời gian</legend>
          <div style="display:flex;gap:10px; margin-bottom:10px;">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Chi nhánh *</label>
              <select name="branch" id="cbBranch" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">
                ${branchOpts}
              </select>
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Phòng *</label>
              <select name="roomId" id="cbRoom" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></select>
            </div>
          </div>

          <div style="display:flex;gap:10px; margin-bottom:10px;">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Gói giờ</label>
              <select name="package" id="cbPackage" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">${packageOpts}</select>
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Số khách</label>
              <input type="number" name="guests" value="${booking?.guests || 2}" min="1" max="12" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-in *</label>
              <input type="datetime-local" name="checkin" id="cbCheckin" value="${defaultIn}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Check-out *</label>
              <input type="datetime-local" name="checkout" id="cbCheckout" value="${defaultOut}" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>
        </fieldset>
        
        <div style="margin-top:4px;">
           <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Ghi chú</label>
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
  const checkinInput = document.getElementById('cbCheckin');
  const checkoutInput = document.getElementById('cbCheckout');
  const packageSel = document.getElementById('cbPackage');

  const updateRooms = () => {
    const branch = branchSel.value;
    const rooms = cskhState.rooms.filter(r => r.location === branch);
    roomSel.innerHTML = rooms.map(r => `<option value="${r.id}" ${r.status === 'maintenance' ? 'disabled' : ''}>${escape(r.name)} - ${r.inventory || 0} phòng${r.status === 'maintenance' ? ' (bảo trì)' : ''}</option>`).join('');
    if (booking && booking.roomId) {
       roomSel.value = booking.roomId;
    }
  };
  
  branchSel.addEventListener('change', updateRooms);
  updateRooms();

  const updateCheckout = () => {
    if (!checkinInput.value) return;
    let hrs = 0;
    const pkg = packageSel.value;
    if (pkg === '3 tiếng') hrs = 3;
    else if (pkg === '4 tiếng') hrs = 4;
    else if (pkg === '8 tiếng') hrs = 8;
    else if (pkg === 'Theo ngày') hrs = 24;
    else if (pkg === 'Qua đêm') hrs = 14;
    if (hrs > 0) {
      checkoutInput.value = window.UniteOps.addHoursLocal(checkinInput.value, hrs);
    }
  };
  
  checkinInput.addEventListener('change', updateCheckout);
  packageSel.addEventListener('change', updateCheckout);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('cbSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';
    try {
      const inAt = form.checkin.value;
      const outAt = form.checkout.value;
      const selRoom = cskhState.rooms.find(r => r.id === roomSel.value);
      const selUnit = cskhUnits().find(u => u.roomId === roomSel.value) || {};
      
      let payload;
      if (isEdit) {
        payload = {
          ...booking,
          customerName: form.name.value,
          phone: form.phone.value,
          email: form.email.value,
          source: form.source.value,
          branch: branchSel.value,
          roomId: roomSel.value,
          roomName: selRoom ? selRoom.name : '',
          roomUnitCode: selUnit.code || booking.roomUnitCode || '',
          packageLabel: form.package.value,
          guests: Number(form.guests.value) || 2,
          checkinAt: inAt,
          checkoutAt: outAt,
          stayDate: inAt.slice(0, 10),
          checkoutDate: outAt.slice(0, 10),
          note: form.note.value,
        };
        const index = cskhState.bookings.findIndex(b => b.id === payload.id);
        if (index >= 0) cskhState.bookings[index] = payload;
        await window.UniteOps.updateBookingAsync(payload);
      } else {
        payload = {
          id: "US-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(16).slice(2, 7),
          customerName: form.name.value,
          phone: form.phone.value,
          email: form.email.value,
          source: form.source.value,
          branch: branchSel.value,
          roomId: roomSel.value,
          roomName: selRoom ? selRoom.name : '',
          roomUnitCode: selUnit.code || '',
          packageLabel: form.package.value,
          guests: Number(form.guests.value) || 2,
          checkinAt: inAt,
          checkoutAt: outAt,
          stayDate: inAt.slice(0, 10),
          checkoutDate: outAt.slice(0, 10),
          note: form.note.value,
          status: "new",
          total: 0,
          deposit: 0,
          paid: 0,
          createdAt: new Date().toISOString(),
          assignedTo: window.UniteAuth?.profile?.()?.full_name || "CSKH"
        };
        cskhState.bookings.unshift(payload);
        await window.UniteOps.createBookingAsync(payload);
      }
      
      saveLocal();
      renderAll();
      
      document.getElementById('createBookingModal')?.remove();
      document.getElementById('createBookingBackdrop')?.remove();
      
      if (!isEdit) {
        setTimeout(() => window.openQuickPayModal(payload.id), 200);
      }
    } catch(err) {
      alert('Lỗi: ' + (err.message || err));
      btn.disabled = false;
      btn.textContent = isEdit ? 'Lưu Cập Nhật' : 'Tạo Đơn (Trạng thái: Mới)';
    }
  });
};

const saveBooking = async booking => {
  const index = cskhState.bookings.findIndex(row => row.id === booking.id);
  const result = booking.supabaseId
    ? await window.UniteOps.updateBookingAsync(booking)
    : await window.UniteOps.createBookingAsync(booking);
  const liveExpected = window.UniteOps.isSupabaseConfigured() && Boolean(window.UniteAuth?.session?.()?.access_token);

  if (liveExpected && !result.ok) {
    syncState("#cskhSupabaseSyncState", `Không lưu được Supabase: ${result.message || result.reason || "lỗi không xác định"}`);
    throw new Error(`Booking chưa được lưu. ${result.message || result.reason || "Supabase từ chối yêu cầu."}`);
  }

  const saved = result.row || booking;
  if (index >= 0) cskhState.bookings[index] = saved;
  else cskhState.bookings.unshift(saved);
  saveLocal();
  syncState("#cskhSupabaseSyncState", result.ok ? "Đã lưu Supabase." : "Đang chạy local vì chưa cấu hình Supabase.");
  syncState("#cskhSheetSyncState", result.sheet?.ok ? "Đã gửi yêu cầu backup Sheet." : "Sheet chưa cấu hình hoặc chưa gửi được.");
  renderAll();
  return saved;
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

const safeStatusBeforeUpload = draft => {
  const existing = currentEditingBooking();
  if (pendingFullProof() && !hasFullProof(existing) && statusRank(draft.status) >= statusRank("paid")) {
    if (hasDepositProof(existing)) return "deposited";
    return existing?.status && statusRank(existing.status) < statusRank("paid") ? existing.status : "holding";
  }
  if (pendingDepositProof() && !hasDepositProof(existing) && draft.status === "deposited") {
    return existing?.status && statusRank(existing.status) < statusRank("deposited") ? existing.status : "holding";
  }
  return draft.status;
};

const saveBookingWithProofs = async draft => {
  const form = $("#bookingForm");
  const depositFile = form.depositBill.files?.[0] || null;
  const fullFile = form.fullPaymentBill.files?.[0] || null;
  const wantedStatus = draft.status;
  const initialDraft = { ...draft, status: safeStatusBeforeUpload(draft) };
  let saved = await saveBooking(initialDraft);

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

  return saveBooking(saved);
};

const advanceStatus = async id => {
  const booking = cskhState.bookings.find(row => row.id === id);
  if (!booking) return;
  const currentIndex = statusOrder.indexOf(booking.status);
  const nextStatus = statusOrder[Math.min(Math.max(currentIndex, 0) + 1, statusOrder.length - 1)] || "consulting";

  if (nextStatus === "deposited" && (!hasDepositProof(booking) || Number(booking.deposit || 0) <= 0)) {
    alert("Chưa thể chuyển sang Đã cọc. Hãy mở đơn, nhập tiền cọc và tải bill cọc trước.");
    return focusPaymentProof(id);
  }
  if (statusRank(nextStatus) >= statusRank("paid") && !hasFullProof(booking)) {
    alert("Booking mới chỉ có cọc. Phải tải bill thanh toán phần còn lại trước khi đẩy trạng thái.");
    return focusPaymentProof(id);
  }

  const previous = booking.status;
  booking.status = nextStatus;
  try {
    await saveBooking(booking);
  } catch (error) {
    booking.status = previous;
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
  const roomNameRaw = String(get("roomName", "layout", "ten layout", "hang phong") || "").trim();
  const branchRaw = String(get("branch", "chi nhanh") || "").trim();
  const room = cskhState.rooms.find(item => item.id === roomIdRaw)
    || cskhState.rooms.find(item => normalizeKey(item.name) === normalizeKey(roomNameRaw) && (!branchRaw || normalizeKey(item.location) === normalizeKey(branchRaw)));
  const roomId = room?.id || roomIdRaw;
  const unitCodeRaw = String(get("roomUnitCode", "room_unit_code", "ma phong", "phong that") || "").trim();
  const unitNameRaw = String(get("roomUnitName", "room_unit_name", "ten phong") || "").trim();
  const unit = cskhUnits().find(item => item.code === unitCodeRaw)
    || cskhUnits().find(item => item.roomId === roomId && normalizeKey(item.unitName) === normalizeKey(unitNameRaw));

  const checkinAt = parseImportedDate(get("checkinAt", "checkin", "check in", "ngay nhan", "gio nhan"));
  const checkoutAt = parseImportedDate(get("checkoutAt", "checkout", "check out", "ngay tra", "gio tra"));
  const customerName = String(get("customerName", "ten khach", "khach hang") || "").trim();
  const phone = String(get("phone", "sdt", "so dien thoai", "dien thoai") || "").trim();
  const id = String(get("id", "public_code", "ma booking") || `IMPORT-${Date.now()}-${index + 1}`).trim();
  const total = parseMoney(get("total", "total_amount", "tong tien"));
  const deposit = parseMoney(get("deposit", "deposit_amount", "tien coc"));
  const paid = Math.max(parseMoney(get("paid", "paid_amount", "da thanh toan", "da thu")), deposit);

  if (!customerName) throw new Error("thiếu tên khách");
  if (!phone) throw new Error("thiếu số điện thoại");
  if (!roomId || !unit?.code && !unitCodeRaw) throw new Error("không tìm thấy layout/phòng thật");
  if (!checkinAt || !checkoutAt) throw new Error("sai định dạng check-in/check-out");
  if (new Date(checkoutAt).getTime() <= new Date(checkinAt).getTime()) throw new Error("check-out không sau check-in");

  const existing = cskhState.bookings.find(booking => booking.id === id);
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
    source: sourceFromImport(get("source", "nguon khach")),
    status: statusFromImport(get("status", "trang thai")),
    packageLabel: String(get("packageLabel", "package_label", "goi") || "3 tiếng").trim(),
    guests: Math.max(1, Number(get("guests", "so khach") || 2)),
    total,
    deposit,
    paid,
    paymentMethod: String(get("paymentMethod", "payment_method", "phuong thuc") || "Chưa thu").trim(),
    assignedTo: String(get("assignedTo", "assigned_to", "cskh phu trach") || currentProfileName()).trim(),
    note: String(get("note", "internal_note", "ghi chu") || "").trim(),
    externalRef: String(get("externalRef", "external_ref", "ma ngoai", "ma ota") || "").trim(),
    depositBillUrl: existing?.depositBillUrl || String(get("depositBillUrl", "deposit_bill_url") || ""),
    fullPaymentBillUrl: existing?.fullPaymentBillUrl || String(get("fullPaymentBillUrl", "full_payment_bill_url") || ""),
    depositBillPath: existing?.depositBillPath || String(get("depositBillPath", "deposit_bill_path") || ""),
    fullPaymentBillPath: existing?.fullPaymentBillPath || String(get("fullPaymentBillPath", "full_payment_bill_path") || "")
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
    const liveExpected = window.UniteOps.isSupabaseConfigured() && Boolean(window.UniteAuth?.session?.()?.access_token);

    for (let index = 0; index < validRows.length; index += 1) {
      const booking = validRows[index];
      state.textContent = `Đang nhập ${index + 1}/${validRows.length}...`;
      try {
        const result = booking.supabaseId
          ? await window.UniteOps.updateBookingAsync(booking)
          : await window.UniteOps.createBookingAsync(booking);
        if (liveExpected && !result.ok) throw new Error(result.message || result.reason || "Supabase từ chối");
        const saved = result.row || booking;
        const existingIndex = cskhState.bookings.findIndex(row => row.id === saved.id);
        if (existingIndex >= 0) cskhState.bookings[existingIndex] = saved;
        else cskhState.bookings.unshift(saved);
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
  $("#weekStart").addEventListener("change", event => { cskhState.weekStart = new Date(`${event.target.value}T00:00:00`); renderCalendar(); });
  $("#calendarPrev").addEventListener("click", () => { cskhState.weekStart.setDate(cskhState.weekStart.getDate() - 7); $("#weekStart").value = window.UniteOps.isoDate(cskhState.weekStart); renderCalendar(); });
  $("#calendarNext").addEventListener("click", () => { cskhState.weekStart.setDate(cskhState.weekStart.getDate() + 7); $("#weekStart").value = window.UniteOps.isoDate(cskhState.weekStart); renderCalendar(); });
  $("#cskhExport").addEventListener("click", () => window.UniteOps.downloadExcel(filteredBookings(), "Unite-Dashboard-Don-Hang.xlsx"));
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

    const roomMatch = text.match(/- Phòng:\s*(.+)/i);
    const branchMatch = text.match(/- Chi nhánh:\s*(.+)/i);
    const dateMatch = text.match(/- Ngày nhận:\s*(.+)/i);
    const packageMatch = text.match(/- Gói:\s*(.+)/i);
    const guestsMatch = text.match(/- Khách:\s*(\d+)/i);

    const form = $("#bookingForm");
    let changed = false;

    if (branchMatch && branchMatch[1]) {
      const b = branchMatch[1].trim();
      const option = Array.from(form.branch.options).find(o => o.value.includes(b) || b.includes(o.value));
      if (option) { form.branch.value = option.value; renderRoomOptions(); changed = true; }
    }

    if (roomMatch && roomMatch[1]) {
      const r = roomMatch[1].trim();
      const idMatch = r.match(/\(([^)]+)\)/);
      const roomId = idMatch ? idMatch[1] : r;
      const option = Array.from(form.roomId.options).find(o => o.value === roomId || o.text.includes(roomId));
      if (option) { form.roomId.value = option.value; renderUnitOptions(); changed = true; }
    }

    if (packageMatch && packageMatch[1]) {
      const p = packageMatch[1].trim();
      const option = Array.from(form.packageLabel.options).find(o => o.value.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(o.value.toLowerCase()));
      if (option) { form.packageLabel.value = option.value; changed = true; }
    }

    if (dateMatch && dateMatch[1]) {
      const d = dateMatch[1].trim();
      if (d && form.checkinAt) {
        form.checkinAt.value = d + "T14:00";
        ensureDateOrder({ showMessage: false });
        changed = true;
      }
    }

    if (guestsMatch && guestsMatch[1] && form.guests) {
      form.guests.value = guestsMatch[1];
      changed = true;
    }

    if (changed) {
      alert("Đã điền tự động các thông tin tìm thấy. Vui lòng kiểm tra lại và điền thêm Tên khách, SĐT.");
    } else {
      alert("Không tìm thấy thông tin phù hợp theo mẫu tin nhắn hệ thống.");
    }
  });

  let lastKnownBookingId = null;
  const setupLiveNotifications = () => {
    setInterval(async () => {
      try {
        const { ok, rows } = await window.UniteOps.loadBookingsAsync();
        if (ok && rows && rows.length > 0) {
          const now = Date.now();
          for (const row of rows) {
            if (row.status === 'new') {
              const createdTime = new Date(row.createdAt).getTime();
              if (now - createdTime > 30 * 60 * 1000) {
                row.status = 'no_show';
                await window.UniteOps.updateBookingAsync(row);
              }
            }
          }
          cskhState.bookings = rows;
          renderBookings();
        }
      } catch(e) {
        console.error("Live notification poll error", e);
      }
    }, 15000);
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
