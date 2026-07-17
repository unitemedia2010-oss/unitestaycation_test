// UNITESTAYCATION/js/ops-data.js
// V15.4 audited live ops: timezone-safe inventory/bookings, payments, Supabase REST and authenticated Sheet backup.

const OPS_BOOKINGS_STORAGE_KEY = "unite-staycation-ops-bookings-v15";
const OPS_MAX_PAYMENT_PROOF_BYTES = 15 * 1024 * 1024;

const opsBookingStatuses = {
  new: "Mới",
  consulting: "Đang tư vấn",
  holding: "Giữ phòng",
  deposited: "Đã cọc",
  paid: "Đã thanh toán",
  checked_in: "Đã check-in",
  checked_out: "Đã check-out",
  cancelled: "Đã hủy",
  no_show: "No-show"
};

const opsActiveBookingStatuses = ["holding", "deposited", "paid", "checked_in"];
const opsUnitRequiredStatuses = ["checked_in", "checked_out"];
const opsCalendarVisibleStatuses = ["new", "consulting", ...opsActiveBookingStatuses, "checked_out"];
const OPS_TIME_ZONE = "Asia/Ho_Chi_Minh";
const opsBookingSources = ["Website", "Zalo", "Fanpage chính", "Fanpage Lê Văn Sỹ", "Fanpage Tây Hồ", "Instagram", "Agoda", "Airbnb", "Booking", "Walk-in"];

const opsSourceCodeByLabel = {
  Website: "website",
  Zalo: "zalo",
  "Fanpage chính": "fanpage_main",
  "Fanpage Lê Văn Sỹ": "fanpage_levansi",
  "Fanpage Tây Hồ": "fanpage_tayho",
  Instagram: "instagram",
  Agoda: "agoda",
  Airbnb: "airbnb",
  Booking: "booking",
  "Walk-in": "walkin"
};
const opsSourceLabelByCode = Object.entries(opsSourceCodeByLabel).reduce((m, [label, code]) => ({ ...m, [code]: label }), {});

const opsConfig = () => window.UNITE_SUPABASE_CONFIG || {};
const opsBaseUrl = () => String(opsConfig().url || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const opsKey = () => opsConfig().anonKey || opsConfig().publishableKey || "";
const opsIsSupabaseConfigured = () => Boolean(opsBaseUrl() && opsKey() && !opsBaseUrl().includes("PASTE_") && !opsKey().includes("PASTE_"));
const opsHeaders = (json = false) => window.UniteAuth?.headers ? window.UniteAuth.headers(json) : ({ apikey: opsKey(), Authorization: `Bearer ${opsKey()}`, ...(json ? { "Content-Type": "application/json" } : {}) });

const opsRestFetch = async (path, options = {}) => {
  if (window.UniteAuth?.restFetch) return window.UniteAuth.restFetch(path, options);
  if (!opsIsSupabaseConfigured()) throw new Error("Supabase chưa cấu hình.");
  const res = await fetch(`${opsBaseUrl()}/rest/v1/${path}`, { ...options, headers: { ...opsHeaders(Boolean(options.body)), ...(options.headers || {}) } });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) throw new Error(payload?.message || payload?.error || res.statusText);
  return payload;
};

const opsMoney = (value = 0) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const opsNumber = (value = 0) => new Intl.NumberFormat("vi-VN").format(Number(value || 0));
const opsAsDate = (value = new Date()) => {
  if (value instanceof Date) return new Date(value);
  const text = String(value || "").trim();
  const localMatch = text.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2}))?$/);
  return new Date(localMatch ? `${localMatch[1]}:${localMatch[2] || "00"}+07:00` : value);
};
const opsToIso = (value) => {
  const date = opsAsDate(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};
const opsDate = (value) => {
  if (!value) return "";
  const date = opsAsDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { timeZone: OPS_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};
const opsDateTime = (value) => {
  if (!value) return "";
  const date = opsAsDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { timeZone: OPS_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};
const opsToDatetimeLocal = (date = new Date()) => {
  const d = opsAsDate(date);
  if (Number.isNaN(d.getTime())) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: OPS_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(d).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const opsAddHoursLocal = (value, hours) => {
  const d = opsAsDate(value);
  d.setTime(d.getTime() + Number(hours || 0) * 60 * 60 * 1000);
  return opsToDatetimeLocal(d);
};
const opsNormalizePackageLabel = (label = "3 tiếng") => {
  const value = String(label || "").trim().toLowerCase();
  if (value.includes("ngày")) return "Ngày";
  if (value.includes("qua đêm") || value.startsWith("8")) return "Qua đêm";
  if (value.startsWith("4")) return "4 tiếng";
  return "3 tiếng";
};
const opsPackageHours = (label = "3 tiếng", nights = 1) => {
  const value = opsNormalizePackageLabel(label).toLowerCase();
  if (value.startsWith("4")) return 4;
  if (value.includes("qua đêm") || value.startsWith("8")) return 8;
  if (value.includes("ngày")) return 16 + (Math.max(1, Number(nights || 1)) - 1) * 24;
  return 3;
};
const opsStartOfDay = (value = new Date()) => {
  const d = new Date(value);
  d.setHours(0,0,0,0);
  return d;
};
const opsStartOfWeek = (value = new Date()) => {
  const d = opsStartOfDay(value);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};
const opsIsoDate = (value) => {
  const local = opsToDatetimeLocal(value);
  return local ? local.slice(0, 10) : "";
};

const opsRoomUnitsFromRooms = (roomList = null) => {
  const list = Array.isArray(roomList) ? roomList : (Array.isArray(window.rooms) ? window.rooms : (typeof rooms !== "undefined" ? rooms : []));
  return list.flatMap(room => Array.from({ length: Number(room.inventory || room.inventory_count || 3) }, (_, i) => ({
    id: `${room.id}-P${i + 1}`,
    code: `${room.id}-P${i + 1}`,
    roomId: room.id,
    roomName: room.name,
    branch: room.location,
    unitName: `Phòng ${i + 1}`,
    label: `${room.name} · Phòng ${i + 1}`,
    status: "available"
  })));
};

const opsSeedBookings = [
  { id:"US-20260709-001", createdAt:"2026-07-09T09:12:00+07:00", checkinAt:"2026-07-09T14:00:00+07:00", checkoutAt:"2026-07-09T17:00:00+07:00", branch:"Chi nhánh Nhiêu Tứ", roomId:"C1-ELAN", roomName:"ÉLAN Layout", roomUnitCode:"C1-ELAN-P1", roomUnitName:"Phòng 1", customerName:"Minh Anh", phone:"0902001001", source:"Website", status:"deposited", packageLabel:"3 tiếng", guests:2, total:299000, deposit:150000, paid:150000, paymentMethod:"Chuyển khoản", assignedTo:"CSKH 01", note:"Khách cần setup nhẹ." },
  { id:"US-20260709-002", createdAt:"2026-07-09T10:40:00+07:00", checkinAt:"2026-07-10T20:00:00+07:00", checkoutAt:"2026-07-11T12:00:00+07:00", branch:"Chi nhánh Phan Tây Hồ", roomId:"C8-THE-ART", roomName:"THE ART Layout", roomUnitCode:"C8-THE-ART-P1", roomUnitName:"Phòng 1", customerName:"Gia Hân", phone:"0902001002", source:"Fanpage Tây Hồ", status:"paid", packageLabel:"Theo ngày", guests:2, total:759000, deposit:300000, paid:759000, paymentMethod:"Chuyển khoản", assignedTo:"CSKH 02", note:"Đã gửi hướng dẫn check-in." },
  { id:"US-20260708-003", createdAt:"2026-07-08T18:22:00+07:00", checkinAt:"2026-07-11T15:00:00+07:00", checkoutAt:"2026-07-11T19:00:00+07:00", branch:"Chi nhánh Lê Văn Sĩ", roomId:"C12-AMOR", roomName:"Amor Layout", roomUnitCode:"C12-AMOR-P2", roomUnitName:"Phòng 2", customerName:"Tuấn Khoa", phone:"0902001003", source:"Zalo", status:"holding", packageLabel:"4 tiếng", guests:2, total:409000, deposit:0, paid:0, paymentMethod:"Chưa thu", assignedTo:"CSKH 01", note:"Đợi khách chuyển cọc." },
  { id:"US-20260707-004", createdAt:"2026-07-07T14:05:00+07:00", checkinAt:"2026-07-12T20:00:00+07:00", checkoutAt:"2026-07-13T12:00:00+07:00", branch:"Chi nhánh Lê Văn Sĩ", roomId:"C12-ROMA", roomName:"Roma Layout", roomUnitCode:"C12-ROMA-P3", roomUnitName:"Phòng 3", customerName:"Phương Linh", phone:"0902001004", source:"Agoda", status:"deposited", packageLabel:"Theo ngày", guests:2, total:759000, deposit:250000, paid:250000, paymentMethod:"OTA", assignedTo:"CSKH 03", note:"Booking OTA." },
  { id:"US-20260706-005", createdAt:"2026-07-06T21:18:00+07:00", checkinAt:"2026-07-09T08:00:00+07:00", checkoutAt:"2026-07-09T16:00:00+07:00", branch:"Chi nhánh Phan Tây Hồ", roomId:"C10-MIDNIGHT", roomName:"MIDNIGHT Layout", roomUnitCode:"C10-MIDNIGHT-P1", roomUnitName:"Phòng 1", customerName:"Hoàng Nam", phone:"0902001005", source:"Instagram", status:"checked_out", packageLabel:"8 tiếng", guests:1, total:500000, deposit:200000, paid:500000, paymentMethod:"Tiền mặt", assignedTo:"CSKH 02", note:"Khách hài lòng." }
];

const normalizeBooking = (booking) => {
  const checkinAt = booking.checkinAt || (booking.stayDate ? `${booking.stayDate}T14:00:00` : new Date().toISOString());
  const checkoutAt = booking.checkoutAt || (booking.checkoutDate ? `${booking.checkoutDate}T12:00:00` : opsAddHoursLocal(checkinAt, 3));
  return {
    ...booking,
    checkinAt,
    checkoutAt,
    stayDate: booking.stayDate || opsIsoDate(checkinAt),
    checkoutDate: booking.checkoutDate || opsIsoDate(checkoutAt),
    depositPayments: booking.depositPayments || [],
    fullPayments: booking.fullPayments || []
  };
};

const opsLoadBookings = () => {
  try {
    const rows = JSON.parse(localStorage.getItem(OPS_BOOKINGS_STORAGE_KEY) || "null");
    if (Array.isArray(rows)) return rows.map(row => {
      const normalized = normalizeBooking(row);
      delete normalized.quickPayClaimToken;
      return normalized;
    });
  } catch {}
  return opsConfig().mode === "local" ? opsSeedBookings.map(normalizeBooking) : [];
};
const opsSaveBookings = (bookings) => {
  try {
    const safeRows = bookings.map(row => {
      const safe = { ...row };
      delete safe.quickPayClaimToken;
      return safe;
    });
    localStorage.setItem(OPS_BOOKINGS_STORAGE_KEY, JSON.stringify(safeRows));
  } catch {}
};
const opsResetBookings = () => { try { localStorage.removeItem(OPS_BOOKINGS_STORAGE_KEY); } catch {}; return opsLoadBookings(); };

const opsBookingRevenue = (booking) => ["paid", "checked_in", "checked_out"].includes(booking.status) ? Number(booking.total || 0) : Number(booking.paid || booking.deposit || 0);
const opsBookingBalance = (booking) => Math.max(0, Number(booking.total || 0) - Number(booking.paid || booking.deposit || 0));
const opsRangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const as = opsAsDate(aStart).getTime();
  const ae = opsAsDate(aEnd).getTime();
  const bs = opsAsDate(bStart).getTime();
  const be = opsAsDate(bEnd).getTime();
  if ([as,ae,bs,be].some(Number.isNaN)) return false;
  return as < be && ae > bs;
};
const opsFindConflicts = (bookings, draft, ignoreId = null) => {
  const normalized = normalizeBooking(draft);
  return bookings.map(normalizeBooking).filter(row => {
    if (ignoreId && (row.id === ignoreId || row.supabaseId === ignoreId)) return false;
    if (!opsActiveBookingStatuses.includes(row.status)) return false;
    if (!normalized.roomUnitCode || !row.roomUnitCode) return false;
    if (row.roomUnitCode !== normalized.roomUnitCode) return false;
    return opsRangesOverlap(normalized.checkinAt, normalized.checkoutAt, row.checkinAt, row.checkoutAt);
  });
};
const opsRoomCapacityState = (bookings, draft, inventoryUnits = null, ignoreId = null) => {
  const normalized = normalizeBooking(draft);
  const units = (Array.isArray(inventoryUnits) ? inventoryUnits : opsRoomUnitsFromRooms())
    .filter(unit => unit.roomId === normalized.roomId && unit.status === "available");
  const reservations = bookings.map(normalizeBooking).filter(row => {
    if (ignoreId && (row.id === ignoreId || row.supabaseId === ignoreId)) return false;
    if (!opsActiveBookingStatuses.includes(row.status)) return false;
    if (row.roomId !== normalized.roomId) return false;
    return opsRangesOverlap(normalized.checkinAt, normalized.checkoutAt, row.checkinAt, row.checkoutAt);
  });
  const capacity = units.length;
  const remainingBeforeDraft = Math.max(0, capacity - reservations.length);
  return {
    ok: !opsActiveBookingStatuses.includes(normalized.status) || remainingBeforeDraft > 0,
    capacity,
    reserved: reservations.length,
    remainingBeforeDraft,
    reservations
  };
};
const opsAvailableUnits = (bookings, draft, inventoryUnits = null) => {
  const units = (Array.isArray(inventoryUnits) ? inventoryUnits : opsRoomUnitsFromRooms()).filter(unit => unit.roomId === draft.roomId && unit.status === "available");
  return units.filter(unit => opsFindConflicts(bookings, { ...draft, roomUnitCode: unit.code }, draft.id).length === 0);
};

const opsToCsv = (rows) => {
  const headers = ["id","createdAt","checkinAt","checkoutAt","branch","roomId","roomName","roomUnitCode","roomUnitName","customerName","phone","email","source","status","packageLabel","guests","total","deposit","paid","balance","paymentMethod","assignedTo","note","externalRef","depositBillUrl","fullPaymentBillUrl","depositBillPath","fullPaymentBillPath"];
  const safeSpreadsheetText = (value) => {
    const text = String(value ?? "");
    return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  };
  const escapeCell = (value) => `"${safeSpreadsheetText(value).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(k => escapeCell(k === "balance" ? opsBookingBalance(r) : r[k])).join(","))].join("\n");
};
const opsDownloadCsv = (rows, filename = "unite-bookings.csv") => {
  const blob = new Blob([`\uFEFF${opsToCsv(rows)}`], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

const opsDownloadExcel = (rows, filename = "unite-bookings.xlsx") => {
  if (!window.XLSX) {
    alert("Đang tải thư viện Excel, vui lòng thử lại sau vài giây hoặc kiểm tra mạng.");
    return;
  }
  
  const data = rows.map(r => ({
    "Mã Đơn": r.id || "",
    "Ngày Tạo": r.createdAt ? opsToDatetimeLocal(r.createdAt) : "",
    "Check-in": r.checkinAt ? opsToDatetimeLocal(r.checkinAt) : "",
    "Check-out": r.checkoutAt ? opsToDatetimeLocal(r.checkoutAt) : "",
    "Chi Nhánh": r.branch || "",
    "Mã Layout": r.roomId || "",
    "Loại Phòng": r.roomName || "",
    "Mã Phòng": r.roomUnitCode || "",
    "Phòng Thực Tế": r.roomUnitName || "",
    "Tên Khách Hàng": r.customerName || "",
    "Số Zalo / WhatsApp": r.phone || "",
    "Nguồn Đặt": r.source || "Website",
    "Trạng Thái": opsBookingStatuses[r.status] || r.status,
    "Gói Giờ": r.packageLabel || "",
    "Khách": Number(r.guests || 0),
    "Tổng Tiền": Number(r.total || 0),
    "Đã Cọc": Number(r.deposit || 0),
    "Đã Thu (Tổng)": Number(r.paid || 0),
    "Còn Lại (Công nợ)": opsBookingBalance(r),
    "Phương Thức Thu": r.paymentMethod || "",
    "Người Phụ Trách": r.assignedTo || "",
    "Ghi Chú": r.note || ""
  }));

  const ws = window.XLSX.utils.json_to_sheet(data);
  const cols = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length + 5, 15) }));
  ws['!cols'] = cols;
  
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Dashboard Đơn Hàng");
  window.XLSX.writeFile(wb, filename);
};

const opsSheetRow = (booking) => ({
  id: booking.id || "", createdAt: booking.createdAt || "", updatedAt: booking.updatedAt || new Date().toISOString(),
  checkinAt: booking.checkinAt || "", checkoutAt: booking.checkoutAt || "", branch: booking.branch || "", roomId: booking.roomId || "", roomName: booking.roomName || "",
  roomUnitCode: booking.roomUnitCode || "", roomUnitName: booking.roomUnitName || "", customerName: booking.customerName || "", phone: booking.phone || "", email: booking.email || "",
  source: booking.source || "Website", status: booking.status || "new", packageLabel: booking.packageLabel || "", guests: Number(booking.guests || 0), total: Number(booking.total || 0),
  deposit: Number(booking.deposit || 0), paid: Number(booking.paid || 0), balance: opsBookingBalance(booking), paymentMethod: booking.paymentMethod || "", assignedTo: booking.assignedTo || "",
  note: booking.note || "", externalRef: booking.externalRef || "", depositBillUrl: booking.depositBillUrl || "", fullPaymentBillUrl: booking.fullPaymentBillUrl || "", depositBillPath: booking.depositBillPath || "", fullPaymentBillPath: booking.fullPaymentBillPath || "", sheetSyncedAt: new Date().toISOString()
});
const opsSyncBookingToSheetAsync = async (booking, action = "upsert") => {
  const url = String(opsConfig().sheetWebhookUrl || "").trim();
  if (!url || url.includes("PASTE_")) return { ok:false, reason:"sheet-not-configured" };
  try {
    await fetch(url, { method:"POST", mode:"no-cors", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify({ action, booking: opsSheetRow(booking), accessToken: window.UniteAuth?.session?.()?.access_token || "" }) });
    return { ok:true, verified:false, source:"sheet", reason:"sent-unverified" };
  } catch (error) { return { ok:false, reason:"sheet-error", message:error.message || String(error) }; }
};
const opsSyncBookingsToSheetAsync = async (bookings = []) => {
  let synced = 0; let verified = 0; const results = [];
  for (const b of bookings) { const r = await opsSyncBookingToSheetAsync(b, "upsert"); results.push(r); if (r.ok) synced++; if (r.verified) verified++; }
  return { ok: synced === bookings.length, total: bookings.length, synced, verified, results };
};

const opsLegacyBookingContext = (row = {}) => {
  const internal = String(row.internal_note || "");
  const roomSegment = internal.match(/Phòng:\s*([^|]+)/i)?.[1]?.trim() || "";
  const roomCode = roomSegment.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() || "";
  const branch = internal.match(/Chi nhánh:\s*([^|]+)/i)?.[1]?.trim() || "";
  const localRoom = (Array.isArray(window.rooms) ? window.rooms : []).find(room => room.id === roomCode);
  const legacyRequestedAt = row.source_code === "website"
    && !internal.includes("V15.4")
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(row.customer_note || ""))
      ? String(row.customer_note)
      : "";
  return {
    branch: branch || localRoom?.location || "",
    roomCode: roomCode || localRoom?.id || "",
    roomName: localRoom?.name || roomSegment.replace(/\s*\([^)]+\)\s*$/, "") || "",
    requestedAt: legacyRequestedAt
  };
};

const opsMapSupabaseBooking = (row) => {
  const legacy = opsLegacyBookingContext(row);
  const packageLabel = opsNormalizePackageLabel(row.package_label || "3 tiếng");
  const checkinAt = legacy.requestedAt || row.checkin_at;
  const checkoutAt = legacy.requestedAt
    ? opsAddHoursLocal(legacy.requestedAt, opsPackageHours(packageLabel))
    : row.checkout_at;
  const customerNoteIsLegacyTime = Boolean(legacy.requestedAt);
  return {
    id: row.public_code || row.id,
    supabaseId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkinAt,
    checkoutAt,
    stayDate: checkinAt ? opsIsoDate(checkinAt) : row.stay_date,
    checkoutDate: checkoutAt ? opsIsoDate(checkoutAt) : row.checkout_date,
    branch: row.branches?.name || row.branch_name || legacy.branch || "Chưa chọn chi nhánh",
    roomId: row.room_types?.code || row.room_code || legacy.roomCode || "CUSTOM",
    roomName: row.room_types?.name || row.room_name || legacy.roomName || "Phòng nhập tay",
    roomUnitCode: row.room_units?.code || row.room_unit_code || "",
    roomUnitName: row.room_units?.unit_name || row.room_unit_name || "",
    customerName: row.customer_name || "",
    phone: row.customer_phone || "",
    email: row.customer_email || "",
    source: row.booking_sources?.label || opsSourceLabelByCode[row.source_code] || row.source_code || "Website",
    status: row.status || "new",
    packageLabel,
    guests: Number(row.guests || 2),
    total: Number(row.total_amount || 0),
    deposit: Number(row.deposit_amount || 0),
    paid: Number(row.paid_amount || 0),
    paymentMethod: row.payment_method || "Chưa thu",
    assignedTo: row.assigned_to || "CSKH",
    note: customerNoteIsLegacyTime ? "" : (row.customer_note || row.internal_note || ""),
    requestContext: row.internal_note || "",
    customerNote: row.customer_note || "",
    externalRef: row.external_ref || "",
    depositBillUrl: row.deposit_bill_url || "",
    fullPaymentBillUrl: row.full_payment_bill_url || "",
    depositBillPath: row.deposit_bill_path || "",
    fullPaymentBillPath: row.full_payment_bill_path || ""
  };
};

const opsFetchRoomType = async (roomId) => {
  if (!roomId || roomId === "CUSTOM") return null;
  const q = new URLSearchParams({ select:"id,branch_id,code,name", code:`eq.${roomId}`, limit:"1" });
  const rows = await opsRestFetch(`room_types?${q.toString()}`);
  return Array.isArray(rows) ? rows[0] : null;
};
const opsFetchRoomUnit = async (roomUnitCode) => {
  if (!roomUnitCode) return null;
  const q = new URLSearchParams({ select:"id,room_type_id,code,unit_name", code:`eq.${roomUnitCode}`, limit:"1" });
  const rows = await opsRestFetch(`room_units?${q.toString()}`);
  return Array.isArray(rows) ? rows[0] : null;
};
const opsBookingPayload = async (booking) => {
  const roomType = await opsFetchRoomType(booking.roomId);
  const roomUnit = await opsFetchRoomUnit(booking.roomUnitCode);
  const checkinAt = opsToIso(booking.checkinAt);
  const checkoutAt = opsToIso(booking.checkoutAt);
  if (!checkinAt || !checkoutAt || new Date(checkoutAt) <= new Date(checkinAt)) {
    throw new Error("Check-out phải sau check-in và ngày giờ phải hợp lệ.");
  }
  if (opsActiveBookingStatuses.includes(booking.status) && !roomType?.id) {
    throw new Error("Phải chọn đúng loại phòng / layout trước khi giữ chỗ hoặc ghi nhận thanh toán.");
  }
  if (opsUnitRequiredStatuses.includes(booking.status) && !roomUnit?.id) {
    throw new Error("Phải xếp phòng cụ thể trước khi check-in hoặc hoàn thành lưu trú.");
  }
  return {
    public_code: booking.id,
    source_code: opsSourceCodeByLabel[booking.source] || "website",
    room_type_id: roomType?.id || null,
    room_unit_id: roomUnit?.id || null,
    branch_id: roomType?.branch_id || null,
    customer_name: booking.customerName,
    customer_phone: booking.phone,
    customer_email: booking.email || null,
    checkin_at: checkinAt,
    checkout_at: checkoutAt,
    package_label: booking.packageLabel || "3 tiếng",
    guests: Number(booking.guests || 2),
    status: booking.status || "new",
    total_amount: Number(booking.total || 0),
    deposit_amount: Number(booking.deposit || 0),
    paid_amount: Number(booking.paid || 0),
    payment_method: booking.paymentMethod || "Chưa thu",
    assigned_to: booking.assignedTo || "CSKH",
    internal_note: booking.note || "",
    external_ref: booking.externalRef || null,
    deposit_bill_url: booking.depositBillUrl || null,
    full_payment_bill_url: booking.fullPaymentBillUrl || null,
    deposit_bill_path: booking.depositBillPath || null,
    full_payment_bill_path: booking.fullPaymentBillPath || null
  };
};

const opsLoadBookingsAsync = async () => {
  const fallback = opsLoadBookings();
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token) return { ok:false, source:"local", reason:"needs-auth-or-config", rows:fallback };
  try {
    const select = ["id","public_code","created_at","updated_at","checkin_at","checkout_at","customer_name","customer_phone","customer_email","status","package_label","guests","total_amount","deposit_amount","paid_amount","payment_method","assigned_to","internal_note","customer_note","external_ref","deposit_bill_url","full_payment_bill_url","deposit_bill_path","full_payment_bill_path","room_types(code,name)","room_units(code,unit_name)","branches(name)","booking_sources(code,label)"].join(",");
    const q = new URLSearchParams({ select, order:"checkin_at.desc" });
    const rows = await opsRestFetch(`bookings?${q.toString()}`);
    return { ok:true, source:"supabase", rows: rows.map(opsMapSupabaseBooking) };
  } catch (error) { return { ok:false, source:"local", reason:"supabase-error", message:error.message, rows:fallback }; }
};

const opsLoadInventoryAsync = async () => {
  const fallbackRooms = Array.isArray(window.rooms) ? window.rooms : (typeof rooms !== "undefined" ? rooms : []);
  const fallbackUnits = opsRoomUnitsFromRooms(fallbackRooms);
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token) {
    return { ok:false, source:"local", reason:"needs-auth-or-config", rooms:fallbackRooms, units:fallbackUnits };
  }
  try {
    const select = [
      "id","branch_id","code","name","inventory_count","status","is_published","sort_order",
      "branches(name)",
      "room_units(id,code,unit_name,status,sort_order)",
      "room_prices(package_code,package_label,duration_hours,base_price,sale_price,is_active,sort_order)"
    ].join(",");
    const q = new URLSearchParams({ select, order:"sort_order.asc" });
    const rows = await opsRestFetch(`room_types?${q.toString()}`);
    const activeRows = (Array.isArray(rows) ? rows : []).filter(row => row.status !== "hidden");
    const mappedRooms = activeRows.map(row => ({
      id: row.code,
      supabaseId: row.id,
      name: row.name,
      location: row.branches?.name || "Chưa có chi nhánh",
      inventory: Number(row.inventory_count || 0),
      status: row.status || "available",
      isPublished: row.is_published !== false,
      prices: (row.room_prices || []).filter(price => price.is_active !== false).sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).map(price => ({
        label: ({ "3h":"3 tiếng", "4h":"4 tiếng", "8h":"Qua đêm", night:"Qua đêm", day:"Ngày" })[price.package_code] || price.package_label,
        packageCode: price.package_code || "",
        durationHours: Number(price.duration_hours || 0),
        value: `${Math.round(Number(price.sale_price || price.base_price || 0) / 1000)}k`
      }))
    }));
    const mappedUnits = activeRows.flatMap(row => (row.room_units || [])
      .filter(unit => unit.status !== "hidden")
      .sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map(unit => ({
        id: unit.id,
        code: unit.code,
        roomId: row.code,
        roomName: row.name,
        branch: row.branches?.name || "Chưa có chi nhánh",
        unitName: unit.unit_name || unit.code,
        label: `${row.name} · ${unit.unit_name || unit.code}`,
        status: unit.status || "available"
      })));
    return { ok:true, source:"supabase", rooms:mappedRooms, units:mappedUnits };
  } catch (error) {
    return { ok:false, source:"local", reason:"supabase-error", message:error.message, rooms:fallbackRooms, units:fallbackUnits };
  }
};

const opsCreateBookingAsync = async (booking) => {
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token) return { ok:false, reason:"needs-auth-or-config", sheet: await opsSyncBookingToSheetAsync(booking) };
  try {
    const payload = await opsBookingPayload(booking);
    const rows = await opsRestFetch("bookings?select=*&on_conflict=public_code", { method:"POST", headers:{ Prefer:"resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    const inserted = Array.isArray(rows) ? rows[0] : rows;
    const row = {
      ...booking,
      id: inserted?.public_code || booking.id,
      supabaseId: inserted?.id || booking.supabaseId,
      checkinAt: inserted?.checkin_at || booking.checkinAt,
      checkoutAt: inserted?.checkout_at || booking.checkoutAt,
      createdAt: inserted?.created_at || booking.createdAt,
      updatedAt: inserted?.updated_at || booking.updatedAt
    };
    const sheet = await opsSyncBookingToSheetAsync(row);
    return { ok:true, row, sheet };
  } catch (error) {
    return { ok:false, reason:"supabase-error", message:error.message }; 
  }
};
const opsUpdateBookingAsync = async (booking) => {
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token || !booking.supabaseId) {
    return { ok:false, reason:"needs-auth-or-local-row", sheet: await opsSyncBookingToSheetAsync(booking) };
  }
  try {
    const payload = await opsBookingPayload(booking);
    delete payload.public_code;
    const rows = await opsRestFetch(`bookings?id=eq.${booking.supabaseId}&select=*`, { method:"PATCH", headers:{ Prefer:"return=representation" }, body: JSON.stringify(payload) });
    const updated = Array.isArray(rows) ? rows[0] : rows;
    const row = {
      ...booking,
      id: updated?.public_code || booking.id,
      supabaseId: updated?.id || booking.supabaseId,
      checkinAt: updated?.checkin_at || booking.checkinAt,
      checkoutAt: updated?.checkout_at || booking.checkoutAt,
      updatedAt: updated?.updated_at || booking.updatedAt
    };
    const sheet = await opsSyncBookingToSheetAsync(row);
    return { ok:true, row, sheet };
  } catch (error) {
    return { ok:false, reason:"supabase-error", message:error.message }; 
  }
};
const opsUpdateBookingCasAsync = async (booking, expectedUpdatedAt, { quickPayFinalize = false } = {}) => {
  if (!booking?.supabaseId) {
    return {
      ok:false,
      reason:"needs-live-booking",
      code:"BOOKING_NOT_LIVE",
      message:"Booking chưa có trên Supabase nên không thể lưu theo phiên bản an toàn."
    };
  }
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token) {
    return {
      ok:false,
      reason:"needs-auth-or-config",
      code:"AUTH_REQUIRED",
      message:"Phiên đăng nhập đã hết hoặc Supabase chưa sẵn sàng. Hãy đăng nhập lại rồi mở lại đơn."
    };
  }
  if (!expectedUpdatedAt) {
    return { ok:false, reason:"booking-stale", code:"BOOKING_STALE", message:"Thiếu phiên bản booking để lưu an toàn. Hãy tải lại đơn." };
  }
  try {
    if (quickPayFinalize) {
      if (!booking.quickPayClaimToken) {
        return { ok:false, reason:"claim-required", code:"QUICKPAY_CLAIM_REQUIRED", message:"Thiếu khóa QuickPay để hoàn tất thanh toán an toàn." };
      }
      const rows = await opsRestFetch("rpc/finalize_quickpay_booking", {
        method:"POST",
        body:JSON.stringify({
          p_booking_id:booking.supabaseId,
          p_expected_updated_at:expectedUpdatedAt,
          p_claim_token:booking.quickPayClaimToken,
          p_status:booking.status,
          p_total_amount:Number(booking.total || 0),
          p_deposit_amount:Number(booking.deposit || 0),
          p_paid_amount:Number(booking.paid || 0),
          p_payment_method:booking.paymentMethod || "Chưa thu",
          p_deposit_bill_url:booking.depositBillUrl || null,
          p_full_payment_bill_url:booking.fullPaymentBillUrl || null,
          p_deposit_bill_path:booking.depositBillPath || null,
          p_full_payment_bill_path:booking.fullPaymentBillPath || null
        })
      });
      const finalized = Array.isArray(rows) ? rows[0] : rows;
      if (!finalized?.booking_id) {
        return { ok:false, reason:"booking-stale", code:"BOOKING_STALE", message:"Không nhận được xác nhận cập nhật QuickPay từ Supabase." };
      }
      const row = {
        ...booking,
        updatedAt:finalized.updated_at || booking.updatedAt
      };
      const sheet = await opsSyncBookingToSheetAsync(row);
      return { ok:true, row, sheet };
    }

    const payload = await opsBookingPayload(booking);
    delete payload.public_code;
    const query = new URLSearchParams({
      id: `eq.${booking.supabaseId}`,
      updated_at: `eq.${expectedUpdatedAt}`,
      select: "*"
    });
    const rows = await opsRestFetch(`bookings?${query.toString()}`, {
      method:"PATCH",
      headers:{ Prefer:"return=representation" },
      body: JSON.stringify(payload)
    });
    const updated = Array.isArray(rows) ? rows[0] : rows;
    if (!updated?.id) {
      return {
        ok:false,
        reason:"booking-stale",
        code:"BOOKING_STALE",
        message:"Đơn vừa được một tài khoản khác cập nhật. Hãy mở lại đơn trước khi thao tác tiếp."
      };
    }
    const row = {
      ...booking,
      id: updated.public_code || booking.id,
      supabaseId: updated.id || booking.supabaseId,
      checkinAt: updated.checkin_at || booking.checkinAt,
      checkoutAt: updated.checkout_at || booking.checkoutAt,
      updatedAt: updated.updated_at || booking.updatedAt
    };
    const sheet = await opsSyncBookingToSheetAsync(row);
    return { ok:true, row, sheet };
  } catch (error) {
    return { ok:false, reason:"supabase-error", message:error.message };
  }
};

const opsAutoAssignRoomUnitAsync = async (booking, { claimToken = null } = {}) => {
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token || !booking?.supabaseId) {
    return {
      ok:false,
      reason:"needs-live-booking",
      message:"Cần booking đã lưu trên Supabase và tài khoản CSKH đang đăng nhập để tự xếp phòng."
    };
  }
  try {
    const rows = await opsRestFetch("rpc/auto_assign_booking_room_unit", {
      method:"POST",
      body: JSON.stringify({
        p_booking_id: booking.supabaseId,
        p_expected_updated_at: booking.updatedAt || null,
        p_claim_token: claimToken
      })
    });
    const assigned = Array.isArray(rows) ? rows[0] : rows;
    if (!assigned?.room_unit_code) throw new Error("Supabase không trả về phòng vừa được xếp.");
    return {
      ok:true,
      unit:assigned,
      claimToken,
      row:{
        ...booking,
        status:["new", "consulting"].includes(booking.status) ? "holding" : booking.status,
        roomUnitCode:assigned.room_unit_code,
        roomUnitName:assigned.room_unit_name || assigned.room_unit_code,
        quickPayClaimToken:claimToken || booking.quickPayClaimToken || "",
        updatedAt:assigned.updated_at || booking.updatedAt
      }
    };
  } catch (error) {
    return { ok:false, reason:"auto-assign-failed", message:error.message || String(error) };
  }
};
const opsReleaseQuickPayClaimAsync = async (booking, claimToken) => {
  if (!claimToken) return { ok:true, row:booking, skipped:true };
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token || !booking?.supabaseId) {
    return { ok:false, reason:"needs-live-booking", message:"Không thể nhả khóa QuickPay vì booking chưa có trên Supabase." };
  }
  try {
    const rows = await opsRestFetch("rpc/release_quickpay_claim", {
      method:"POST",
      body: JSON.stringify({
        p_booking_id:booking.supabaseId,
        p_claim_token:claimToken
      })
    });
    const released = Array.isArray(rows) ? rows[0] : rows;
    if (released?.released !== true) {
      return {
        ok:false,
        reason:"claim-not-owned",
        message:"Khóa QuickPay không còn thuộc thao tác hiện tại."
      };
    }
    return {
      ok:true,
      bookingId:released.booking_id || booking.supabaseId,
      updatedAt:released.updated_at || ""
    };
  } catch (error) {
    return { ok:false, reason:"release-claim-failed", message:error.message || String(error), row:booking };
  }
};
const opsDeleteBookingAsync = async (booking) => {
  if (!booking?.supabaseId) return { ok:false, reason:"local-row" };
  try { await opsRestFetch(`bookings?id=eq.${booking.supabaseId}`, { method:"DELETE" }); return { ok:true }; } catch (error) { return { ok:false, message:error.message }; }
};


const opsResizeImageFile = async (file, { maxWidth = 1800, quality = 0.78 } = {}) => {
  if (!file || !String(file.type || '').startsWith('image/')) return file;
  if (file.size <= 850 * 1024 && file.type === 'image/webp') return file;

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, maxWidth / Math.max(img.width || maxWidth, 1));
  const width = Math.max(1, Math.round((img.width || maxWidth) * scale));
  const height = Math.max(1, Math.round((img.height || maxWidth) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) return file;
  const base = String(file.name || 'image').replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.webp`, { type: 'image/webp', lastModified: Date.now() });
};

const opsCreateSignedUrlAsync = async (bucket, path, expiresIn = 900) => {
  if (!bucket || !path) return "";
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token) throw new Error("Cần đăng nhập Supabase để xem file riêng tư.");
  const res = await fetch(`${opsBaseUrl()}/storage/v1/object/sign/${bucket}/${path}`, {
    method:"POST",
    headers:{ ...opsHeaders(true) },
    body:JSON.stringify({ expiresIn:Number(expiresIn || 900) })
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  if (!res.ok) throw new Error(payload?.message || payload?.error || text || res.statusText);
  const signed = payload?.signedURL || payload?.signedUrl || "";
  if (!signed) throw new Error("Supabase không trả về signed URL.");
  return /^https?:/i.test(signed) ? signed : `${opsBaseUrl()}/storage/v1${signed.startsWith("/") ? signed : `/${signed}`}`;
};

const opsOpenStoredFileAsync = async (bucket, path, fallbackUrl = "") => {
  const target = path ? await opsCreateSignedUrlAsync(bucket, path, 900) : fallbackUrl;
  if (!target) throw new Error("Booking chưa có file bill.");
  
  const id = 'uniteFileViewer';
  document.getElementById(id)?.remove();
  const html = `
    <div id="${id}" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(5px);">
      <div style="position:absolute;top:20px;right:20px;display:flex;gap:15px;z-index:100000;">
         <a href="${target}" target="_blank" style="color:#fff;text-decoration:none;font-weight:bold;font-size:14px;background:rgba(255,255,255,0.2);padding:8px 16px;border-radius:8px;">Mở tab mới</a>
         <button onclick="document.getElementById('${id}').remove()" style="background:#e53935;border:none;color:#fff;font-size:14px;font-weight:bold;padding:8px 16px;border-radius:8px;cursor:pointer;">Đóng X</button>
      </div>
      <div style="width:90%;height:85%;display:flex;align-items:center;justify-content:center;overflow:auto;">
         <img src="${target}" style="max-width:100%;max-height:100%;object-fit:contain;transition:transform 0.2s;cursor:zoom-in;" onclick="this.style.transform = this.style.transform === 'scale(2)' ? 'scale(1)' : 'scale(2)'; this.style.cursor = this.style.transform === 'scale(2)' ? 'zoom-out' : 'zoom-in';" onerror="this.outerHTML='<iframe src=\\'${target}\\' style=\\'width:100%;height:100%;border:none;background:#fff;border-radius:8px;\\'></iframe>'" />
      </div>
      <p style="color:#ccc;font-size:13px;margin-top:10px;">Bấm vào ảnh để Phóng to/Thu nhỏ</p>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  return target;
};

const opsDeleteFileAsync = async (bucket, path, accessToken = "") => {
  if (!bucket || !path) return { ok:false, reason:"missing-path" };
  const headers = accessToken
    ? { apikey:opsKey(), Authorization:`Bearer ${accessToken}` }
    : { ...opsHeaders(false) };
  const res = await fetch(`${opsBaseUrl()}/storage/v1/object/${bucket}/${path}`, { method:"DELETE", headers });
  if (!res.ok && res.status !== 404) throw new Error((await res.text()) || res.statusText);
  return { ok:true };
};

const opsUploadFileAsync = async (bucket, file, folder = "uploads") => {
  if (!file) return null;
  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token) throw new Error("Cần đăng nhập Supabase để upload file.");
  const roomBucket = opsConfig().roomImageBucket || "room-images";
  const uploadFile = bucket === roomBucket
    ? await opsResizeImageFile(file, { maxWidth: 1800, quality: 0.78 })
    : file;
  const ext = (uploadFile.name.split(".").pop() || "bin").toLowerCase();
  const safeName = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const res = await fetch(`${opsBaseUrl()}/storage/v1/object/${bucket}/${safeName}`, {
    method:"POST",
    headers:{ ...opsHeaders(false), "x-upsert":"true", "Content-Type": uploadFile.type || "application/octet-stream" },
    body:uploadFile
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  const isPublic = bucket === roomBucket;
  return { path:safeName, url:isPublic ? `${opsBaseUrl()}/storage/v1/object/public/${bucket}/${safeName}` : "", uploadedAt:new Date().toISOString(), isPublic };
};

// Backward-compatible alias: all payment writes use the reconciled proof path
// below so an aborted response can never delete a file referenced by a late
// database commit.
const opsCreatePaymentAsync = async (booking, payment) =>
  opsSavePaymentProofAsync(booking, payment);

// V15.3: create or replace the latest proof for the same booking/payment type.
// This avoids duplicating accounting rows when a CSKH corrects a wrong bill file.
const opsSavePaymentProofAsync = async (booking, payment) => {
  const bucket = opsConfig().paymentBillBucket || "payment-bills";
  const type = payment.type || "deposit";
  const amount = Number(payment.amount || 0);
  if (amount <= 0) throw new Error("Số tiền thanh toán phải lớn hơn 0.");
  if (!payment.file && !payment.billPath) throw new Error("Vui lòng chọn file bill.");
  if (payment.file && Number(payment.file.size || 0) > OPS_MAX_PAYMENT_PROOF_BYTES) {
    throw new Error("Bill vượt quá 15 MB. Vui lòng nén ảnh/PDF rồi tải lại.");
  }

  const paymentAccessToken = window.UniteAuth?.session?.()?.access_token || "";
  let uploaded = null;
  if (payment.file) uploaded = await opsUploadFileAsync(bucket, payment.file, `booking-bills/${booking.id}`);
  const paymentRow = {
    amount,
    type,
    method: payment.method || booking.paymentMethod || "Chuyển khoản",
    paidAt: payment.paidAt || new Date().toISOString(),
    billUrl: uploaded?.url || payment.billUrl || "",
    billPath: uploaded?.path || payment.billPath || "",
    uploadedAt: uploaded?.uploadedAt || new Date().toISOString()
  };

  if (!opsIsSupabaseConfigured() || !window.UniteAuth?.session?.()?.access_token) {
    if (booking?.supabaseId) {
      if (uploaded?.path) await opsDeleteFileAsync(bucket, uploaded.path, paymentAccessToken).catch(() => {});
      throw new Error("Phiên đăng nhập đã hết sau khi tải bill. Giao dịch chưa được ghi nhận; hãy đăng nhập lại và thử lại.");
    }
    return paymentRow;
  }
  if (!booking.supabaseId) {
    if (uploaded?.path) await opsDeleteFileAsync(bucket, uploaded.path, paymentAccessToken).catch(() => {});
    throw new Error("Booking chưa được lưu thành công trên Supabase nên chưa thể ghi nhận bill.");
  }

  let existing = null;
  let writeAttempted = false;
  try {
    const query = new URLSearchParams({
      select: "id,bill_storage_path",
      booking_id: `eq.${booking.supabaseId}`,
      payment_type: `eq.${type}`,
      payment_status: "eq.received",
      order: "created_at.desc",
      limit: "1"
    });
    const rows = await opsRestFetch(`payments?${query.toString()}`);
    existing = Array.isArray(rows) ? rows[0] : null;
    paymentRow.previousBillPath = existing?.bill_storage_path || "";
    const payload = {
      booking_id: booking.supabaseId,
      amount: paymentRow.amount,
      payment_type: paymentRow.type,
      payment_method: paymentRow.method,
      payment_status: "received",
      paid_at: opsToIso(paymentRow.paidAt),
      bill_storage_path: paymentRow.billPath,
      bill_url: paymentRow.billUrl,
      note: payment.note || null,
      ...(booking.quickPayClaimToken ? { quickpay_write_token:booking.quickPayClaimToken } : {})
    };

    if (existing?.id) {
      writeAttempted = true;
      await opsRestFetch(`payments?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload)
      });
    } else {
      writeAttempted = true;
      await opsRestFetch("payments", { method: "POST", body: JSON.stringify(payload) });
    }

    try {
      const versionQuery = new URLSearchParams({
        select:"updated_at",
        id:`eq.${booking.supabaseId}`,
        limit:"1"
      });
      const versionRows = await opsRestFetch(`bookings?${versionQuery.toString()}`);
      paymentRow.bookingUpdatedAt = (Array.isArray(versionRows) ? versionRows[0] : versionRows)?.updated_at || "";
    } catch {}

  } catch (error) {
    if (uploaded?.path && writeAttempted) {
      try {
        const verifyQuery = new URLSearchParams({
          select:"id,bill_storage_path",
          booking_id:`eq.${booking.supabaseId}`,
          payment_type:`eq.${type}`,
          payment_status:"eq.received",
          bill_storage_path:`eq.${uploaded.path}`,
          limit:"1"
        });
        const verifyRows = await opsRestFetch(`payments?${verifyQuery.toString()}`);
        const committed = Array.isArray(verifyRows) ? verifyRows[0] : verifyRows;
        if (committed?.id && committed.bill_storage_path === uploaded.path) {
          paymentRow.writeRecovered = true;
          return paymentRow;
        }
      } catch {}

      // A failed/aborted fetch can still commit after the first verification
      // query returns empty. Keep the upload for reconciliation so a late
      // payment commit can never point at a file we just deleted.
      throw new Error(
        `Không lưu được bill trên Supabase: ${error.message || error}. `
        + "Chưa xác định request đã commit hay chưa; file mới được giữ nguyên để tránh xóa nhầm bill Supabase đang tham chiếu."
      );
    }
    if (uploaded?.path) {
      await opsDeleteFileAsync(bucket, uploaded.path, paymentAccessToken).catch(() => {});
    }
    throw new Error(`Không lưu được bill trên Supabase: ${error.message || error}`);
  }
  return paymentRow;
};

window.UniteOps = {
  statuses: opsBookingStatuses,
  activeStatuses: opsActiveBookingStatuses,
  unitRequiredStatuses: opsUnitRequiredStatuses,
  calendarVisibleStatuses: opsCalendarVisibleStatuses,
  sources: opsBookingSources,
  sourceCodeByLabel: opsSourceCodeByLabel,
  sourceLabelByCode: opsSourceLabelByCode,
  money: opsMoney,
  number: opsNumber,
  date: opsDate,
  dateTime: opsDateTime,
  asDate: opsAsDate,
  toIso: opsToIso,
  toDatetimeLocal: opsToDatetimeLocal,
  addHoursLocal: opsAddHoursLocal,
  normalizePackageLabel: opsNormalizePackageLabel,
  packageHours: opsPackageHours,
  isoDate: opsIsoDate,
  startOfWeek: opsStartOfWeek,
  roomUnitsFromRooms: opsRoomUnitsFromRooms,
  loadBookings: opsLoadBookings,
  saveBookings: opsSaveBookings,
  resetBookings: opsResetBookings,
  bookingRevenue: opsBookingRevenue,
  bookingBalance: opsBookingBalance,
  rangesOverlap: opsRangesOverlap,
  findConflicts: opsFindConflicts,
  roomCapacityState: opsRoomCapacityState,
  availableUnits: opsAvailableUnits,
  downloadCsv: opsDownloadCsv,
  downloadExcel: opsDownloadExcel,
  syncBookingToSheetAsync: opsSyncBookingToSheetAsync,
  syncBookingsToSheetAsync: opsSyncBookingsToSheetAsync,
  isSupabaseConfigured: opsIsSupabaseConfigured,
  restFetch: opsRestFetch,
  loadBookingsAsync: opsLoadBookingsAsync,
  loadInventoryAsync: opsLoadInventoryAsync,
  createBookingAsync: opsCreateBookingAsync,
  updateBookingAsync: opsUpdateBookingAsync,
  updateBookingCasAsync: opsUpdateBookingCasAsync,
  autoAssignRoomUnitAsync: opsAutoAssignRoomUnitAsync,
  releaseQuickPayClaimAsync: opsReleaseQuickPayClaimAsync,
  deleteBookingAsync: opsDeleteBookingAsync,
  uploadFileAsync: opsUploadFileAsync,
  deleteFileAsync: opsDeleteFileAsync,
  createSignedUrlAsync: opsCreateSignedUrlAsync,
  openStoredFileAsync: opsOpenStoredFileAsync,
  createPaymentAsync: opsCreatePaymentAsync,
  savePaymentProofAsync: opsSavePaymentProofAsync
};
