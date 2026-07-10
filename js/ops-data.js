// UNITESTAYCATION/js/ops-data.js
// Shared operations data for dashboard and CSKH. Supabase live sync will replace the localStorage adapter later.

const OPS_BOOKINGS_STORAGE_KEY = "unite-staycation-ops-bookings-v1";
const OPS_AUTH_STORAGE_KEY = "unite-staycation-supabase-session-v1";

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

const opsBookingSources = ["Website", "Zalo", "Fanpage chính", "Fanpage Lê Văn Sỹ", "Fanpage Tây Hồ", "Instagram", "Agoda", "Airbnb", "Booking", "Walk-in"];

const opsSeedBookings = [
  {
    id: "US-20260709-001",
    createdAt: "2026-07-09T09:12:00+07:00",
    stayDate: "2026-07-09",
    checkoutDate: "2026-07-09",
    branch: "Chi nhánh Nhiêu Tứ",
    roomId: "C1-ELAN",
    roomName: "ÉLAN Layout",
    customerName: "Minh Anh",
    phone: "0902001001",
    source: "Website",
    status: "deposited",
    packageLabel: "3 tiếng",
    nights: 0,
    guests: 2,
    total: 299000,
    deposit: 150000,
    paid: 150000,
    paymentMethod: "Chuyển khoản",
    assignedTo: "CSKH 01",
    note: "Khách cần setup nhẹ, xác nhận trước 30 phút."
  },
  {
    id: "US-20260709-002",
    createdAt: "2026-07-09T10:40:00+07:00",
    stayDate: "2026-07-10",
    checkoutDate: "2026-07-11",
    branch: "Chi nhánh Phan Tây Hồ",
    roomId: "C8-THE-ART",
    roomName: "THE ART Layout",
    customerName: "Gia Hân",
    phone: "0902001002",
    source: "Fanpage Tây Hồ",
    status: "paid",
    packageLabel: "Theo ngày",
    nights: 1,
    guests: 2,
    total: 759000,
    deposit: 300000,
    paid: 759000,
    paymentMethod: "Chuyển khoản",
    assignedTo: "CSKH 02",
    note: "Đã gửi hướng dẫn check-in."
  },
  {
    id: "US-20260708-003",
    createdAt: "2026-07-08T18:22:00+07:00",
    stayDate: "2026-07-11",
    checkoutDate: "2026-07-11",
    branch: "Chi nhánh Lê Văn Sĩ",
    roomId: "C12-AMOR",
    roomName: "Amor Layout",
    customerName: "Tuấn Khoa",
    phone: "0902001003",
    source: "Zalo",
    status: "holding",
    packageLabel: "4 tiếng",
    nights: 0,
    guests: 2,
    total: 409000,
    deposit: 0,
    paid: 0,
    paymentMethod: "Chưa thu",
    assignedTo: "CSKH 01",
    note: "Đợi khách chuyển cọc trước 15:00."
  },
  {
    id: "US-20260707-004",
    createdAt: "2026-07-07T14:05:00+07:00",
    stayDate: "2026-07-12",
    checkoutDate: "2026-07-13",
    branch: "Chi nhánh Lê Văn Sĩ",
    roomId: "C12-ROMA",
    roomName: "Roma Layout",
    customerName: "Phương Linh",
    phone: "0902001004",
    source: "Agoda",
    status: "deposited",
    packageLabel: "Theo ngày",
    nights: 1,
    guests: 2,
    total: 759000,
    deposit: 250000,
    paid: 250000,
    paymentMethod: "OTA",
    assignedTo: "CSKH 03",
    note: "Booking OTA, cần cập nhật thủ công khi khách đổi giờ."
  },
  {
    id: "US-20260706-005",
    createdAt: "2026-07-06T21:18:00+07:00",
    stayDate: "2026-07-09",
    checkoutDate: "2026-07-09",
    branch: "Chi nhánh Phan Tây Hồ",
    roomId: "C10-MIDNIGHT",
    roomName: "MIDNIGHT Layout",
    customerName: "Hoàng Nam",
    phone: "0902001005",
    source: "Instagram",
    status: "checked_out",
    packageLabel: "8 tiếng",
    nights: 0,
    guests: 1,
    total: 500000,
    deposit: 200000,
    paid: 500000,
    paymentMethod: "Tiền mặt",
    assignedTo: "CSKH 02",
    note: "Khách hài lòng, có thể remarketing."
  },
  {
    id: "US-20260705-006",
    createdAt: "2026-07-05T12:44:00+07:00",
    stayDate: "2026-07-14",
    checkoutDate: "2026-07-14",
    branch: "Chi nhánh Nhiêu Tứ",
    roomId: "C1-NOIR",
    roomName: "NOIR Layout",
    customerName: "Thanh Vy",
    phone: "0902001006",
    source: "Fanpage chính",
    status: "consulting",
    packageLabel: "3 tiếng",
    nights: 0,
    guests: 2,
    total: 299000,
    deposit: 0,
    paid: 0,
    paymentMethod: "Chưa thu",
    assignedTo: "CSKH 01",
    note: "Khách hỏi thêm decor sinh nhật."
  },
  {
    id: "US-20260703-007",
    createdAt: "2026-07-03T08:30:00+07:00",
    stayDate: "2026-07-05",
    checkoutDate: "2026-07-05",
    branch: "Chi nhánh Phan Tây Hồ",
    roomId: "C9-VELVET",
    roomName: "VELVET Layout",
    customerName: "Khánh Ngọc",
    phone: "0902001007",
    source: "Airbnb",
    status: "checked_out",
    packageLabel: "4 tiếng",
    nights: 0,
    guests: 2,
    total: 379000,
    deposit: 0,
    paid: 379000,
    paymentMethod: "OTA",
    assignedTo: "CSKH 03",
    note: "Đã đối soát OTA."
  },
  {
    id: "US-20260702-008",
    createdAt: "2026-07-02T19:10:00+07:00",
    stayDate: "2026-07-04",
    checkoutDate: "2026-07-05",
    branch: "Chi nhánh Nhiêu Tứ",
    roomId: "C1-ELAN",
    roomName: "ÉLAN Layout",
    customerName: "Bảo Trân",
    phone: "0902001008",
    source: "Website",
    status: "cancelled",
    packageLabel: "Theo ngày",
    nights: 1,
    guests: 2,
    total: 799000,
    deposit: 0,
    paid: 0,
    paymentMethod: "Hoàn cọc",
    assignedTo: "CSKH 02",
    note: "Khách hủy vì đổi lịch."
  }
];

const opsMoney = (value = 0) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
}).format(Number(value || 0));

const opsDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

const opsLoadBookings = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(OPS_BOOKINGS_STORAGE_KEY) || "null");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {
    // Keep the local demo usable even when storage is blocked.
  }
  return opsSeedBookings.map(item => ({ ...item }));
};

const opsSaveBookings = (bookings) => {
  try {
    localStorage.setItem(OPS_BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    // Demo data still renders; live Supabase sync will be the durable layer.
  }
};

const opsResetBookings = () => {
  try {
    localStorage.removeItem(OPS_BOOKINGS_STORAGE_KEY);
  } catch {
    // Nothing to reset.
  }
  return opsLoadBookings();
};

const opsBookingRevenue = (booking) => ["paid", "checked_in", "checked_out"].includes(booking.status)
  ? Number(booking.total || 0)
  : Number(booking.paid || booking.deposit || 0);

const opsToCsv = (rows) => {
  const headers = [
    "id", "createdAt", "updatedAt", "stayDate", "checkoutDate", "startTime", "endTime", "branch", "roomId", "roomName", "customerName",
    "phone", "email", "source", "status", "packageLabel", "nights", "guests", "total", "deposit", "paid", "balance",
    "paymentMethod", "assignedTo", "note", "externalRef", "billName", "billUploadedAt", "billUrl", "payments"
  ];
  const escapeCell = (value) => `"${String(Array.isArray(value) || (value && typeof value === "object") ? JSON.stringify(value) : (value ?? "")).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map(row => headers.map(key => escapeCell(row[key])).join(","))].join("\n");
};

const opsDownloadCsv = (rows, filename = "unite-bookings.csv") => {
  const blob = new Blob([`\uFEFF${opsToCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const opsParseMoney = (value) => Number(String(value ?? "").replace(/[^\d]/g, "")) || 0;

const opsDateKey = (value, fallback = new Date()) => {
  if (!value) {
    const date = new Date(fallback);
    return Number.isNaN(date.getTime()) ? "" : [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return opsDateKey(null, fallback);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
};

const opsTimeValue = (value, fallback = "") => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) return fallback;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const opsParseJsonCell = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const opsParseCsv = (text) => {
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
  const headers = rows.shift().map(item => item.trim().replace(/^\uFEFF/, ""));
  return rows.map(values => headers.reduce((item, header, index) => {
    item[header] = values[index] ?? "";
    return item;
  }, {}));
};

const opsRowsFromFileAsync = async (file) => {
  if (!file) return [];
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".json")) {
    const payload = JSON.parse(text);
    return Array.isArray(payload) ? payload : (payload.rows || []);
  }
  return opsParseCsv(text);
};

const opsStatusAliases = {
  "mới": "new",
  "dang tu van": "consulting",
  "đang tư vấn": "consulting",
  "giữ phòng": "holding",
  "giu phong": "holding",
  "đã cọc": "deposited",
  "da coc": "deposited",
  "đã thanh toán": "paid",
  "da thanh toan": "paid",
  "check-in": "checked_in",
  "đã check-in": "checked_in",
  "check-out": "checked_out",
  "đã check-out": "checked_out",
  "hủy": "cancelled",
  "huy": "cancelled",
  "đã hủy": "cancelled",
  "no-show": "no_show"
};

const opsNormalizeStatus = (value) => {
  const raw = String(value || "new").trim();
  if (Object.prototype.hasOwnProperty.call(opsBookingStatuses, raw)) return raw;
  const key = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return opsStatusAliases[raw.toLowerCase()] || opsStatusAliases[key] || "new";
};

const opsNormalizeImportedBooking = (row = {}, index = 0) => {
  const total = opsParseMoney(row.total ?? row.total_amount ?? row.totalAmount ?? row["Tổng tiền"]);
  const deposit = opsParseMoney(row.deposit ?? row.deposit_amount ?? row.depositAmount ?? row["Tiền cọc"]);
  const paid = opsParseMoney(row.paid ?? row.paid_amount ?? row.paidAmount ?? row["Đã thu"] ?? deposit);
  const id = String(row.id || row.public_code || row.publicCode || row.externalRef || row.external_ref || "").trim()
    || `SHEET-${Date.now()}-${String(index + 1).padStart(3, "0")}`;
  const stayDate = opsDateKey(row.stayDate || row.stay_date || row["Ngày nhận"]);
  const checkoutDate = opsDateKey(row.checkoutDate || row.checkout_date || row["Ngày trả"] || stayDate, stayDate);

  return {
    id,
    createdAt: row.createdAt || row.created_at || row.created || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || new Date().toISOString(),
    stayDate,
    checkoutDate,
    startTime: opsTimeValue(row.startTime || row.start_time || row["Giờ nhận"], "14:00"),
    endTime: opsTimeValue(row.endTime || row.end_time || row["Giờ trả"], ""),
    branch: row.branch || row.branchName || row.branch_name || "Chưa chọn chi nhánh",
    roomId: row.roomId || row.room_id || row.roomCode || row.room_code || "CUSTOM",
    roomName: row.roomName || row.room_name || "Phòng nhập từ Sheet",
    customerName: row.customerName || row.customer_name || row.name || row["Tên khách"] || "Khách",
    phone: String(row.phone || row.customer_phone || row["Số điện thoại"] || ""),
    email: row.email || row.customer_email || "",
    source: row.source || row.sourceLabel || row.source_label || "Website",
    status: opsNormalizeStatus(row.status),
    packageLabel: row.packageLabel || row.package_label || "3 tiếng",
    nights: Number(row.nights || 0),
    guests: Number(row.guests || 2),
    total,
    deposit,
    paid,
    balance: opsParseMoney(row.balance ?? row.balance_amount) || Math.max(0, total - paid),
    paymentMethod: row.paymentMethod || row.payment_method || "Chưa thu",
    assignedTo: row.assignedTo || row.assigned_to || "CSKH",
    note: row.note || row.internal_note || row.customer_note || "",
    externalRef: row.externalRef || row.external_ref || "",
    billName: row.billName || "",
    billUploadedAt: row.billUploadedAt || "",
    billUrl: row.billUrl || "",
    payments: opsParseJsonCell(row.payments)
  };
};

const opsMergeBookings = (currentRows = [], incomingRows = []) => {
  const byId = new Map(currentRows.map(booking => [booking.id, booking]));
  let added = 0;
  let updated = 0;
  incomingRows.forEach(booking => {
    if (!booking?.id) return;
    const existed = byId.get(booking.id);
    byId.set(booking.id, {
      ...(existed || {}),
      ...booking,
      payments: booking.payments?.length ? booking.payments : (existed?.payments || [])
    });
    if (existed) updated += 1;
    else added += 1;
  });
  const rows = [...byId.values()].sort((a, b) => new Date(b.createdAt || b.stayDate) - new Date(a.createdAt || a.stayDate));
  return { rows, added, updated };
};

const opsConfig = () => window.UNITE_SUPABASE_CONFIG || {};

const opsSupabaseBaseUrl = () => String(opsConfig().url || "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");

const opsSupabaseKey = () => opsConfig().publishableKey || opsConfig().anonKey || "";

const opsUserRoleLabels = {
  super_admin: "Super admin",
  admin: "Admin",
  manager: "Quản lý",
  cskh: "CSKH",
  guest: "Chưa phân quyền"
};

const opsPermissionRoles = {
  readOperations: ["super_admin", "admin", "manager", "cskh"],
  manageInventory: ["super_admin", "admin"],
  manageBookings: ["super_admin", "admin", "manager", "cskh"],
  managePayments: ["super_admin", "admin", "manager", "cskh"],
  manageAccounts: ["super_admin"],
  deleteBookings: ["super_admin"],
  deletePayments: ["super_admin"]
};

const opsIsSupabaseConfigured = () => {
  const config = opsConfig();
  const key = opsSupabaseKey();
  return config.mode === "supabase"
    && Boolean(opsSupabaseBaseUrl())
    && Boolean(key)
    && !opsSupabaseBaseUrl().includes("PASTE_")
    && !key.includes("PASTE_");
};

const opsGetSession = () => {
  try {
    return JSON.parse(localStorage.getItem(OPS_AUTH_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const opsSessionRole = () => {
  const session = opsGetSession();
  const role = session?.profile?.is_active === false ? "guest" : session?.profile?.role;
  return opsPermissionRoles.readOperations.includes(role) ? role : "guest";
};

const opsRoleLabel = (role = opsSessionRole()) => opsUserRoleLabels[role] || role || opsUserRoleLabels.guest;

const opsCan = (permission) => {
  const allowed = opsPermissionRoles[permission] || [];
  return allowed.includes(opsSessionRole());
};

const opsHasRequiredPermissions = (permissions = []) => {
  const required = Array.isArray(permissions) ? permissions.filter(Boolean) : [];
  return !required.length || required.some(permission => opsCan(permission));
};

const opsSaveSession = (session) => {
  try {
    if (session) localStorage.setItem(OPS_AUTH_STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(OPS_AUTH_STORAGE_KEY);
  } catch {
    // Auth panel remains usable even when storage is blocked for this browser.
  }
};

const opsAuthHeaders = ({ preferUser = true, json = false } = {}) => {
  const key = opsSupabaseKey();
  const session = opsGetSession();
  const token = preferUser && session?.access_token ? session.access_token : key;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${token}`
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
};

const opsRestFetch = async (path, options = {}) => {
  if (!opsIsSupabaseConfigured()) throw new Error("Supabase chưa được cấu hình.");
  const response = await fetch(`${opsSupabaseBaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...opsAuthHeaders({ json: Boolean(options.body), preferUser: true }),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const message = payload?.message || payload?.error || response.statusText || "Supabase request failed";
    throw new Error(message);
  }
  return payload;
};

const opsLoadCurrentProfileAsync = async () => {
  const session = opsGetSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  const query = new URLSearchParams({
    select: "id,full_name,role,is_active",
    id: `eq.${userId}`,
    limit: "1"
  });
  const rows = await opsRestFetch(`user_profiles?${query.toString()}`);
  const profile = Array.isArray(rows) ? rows[0] : null;
  return profile || null;
};

const opsRefreshProfileAsync = async () => {
  const session = opsGetSession();
  if (!session?.access_token) return null;
  try {
    const profile = await opsLoadCurrentProfileAsync();
    opsSaveSession({ ...session, profile });
    return profile;
  } catch {
    opsSaveSession({ ...session, profile: null });
    return null;
  }
};

const opsListProfilesAsync = async () => {
  if (!opsCan("manageAccounts")) return { ok: false, reason: "forbidden", rows: [] };
  const fallbackSelect = "id,full_name,role,is_active,created_at,updated_at";
  const withEmailSelect = "id,email,full_name,role,is_active,created_at,updated_at";
  const load = (select) => opsRestFetch(`user_profiles?select=${encodeURIComponent(select)}&order=created_at.desc`);
  try {
    const rows = await load(withEmailSelect);
    return { ok: true, rows };
  } catch (error) {
    try {
      const rows = await load(fallbackSelect);
      return { ok: true, rows };
    } catch (fallbackError) {
      return { ok: false, reason: "supabase-error", message: fallbackError.message || error.message, rows: [] };
    }
  }
};

const opsUpsertProfileAsync = async (profile) => {
  if (!opsCan("manageAccounts")) return { ok: false, reason: "forbidden" };
  const basePayload = {
    id: profile.id,
    full_name: profile.fullName || profile.full_name || null,
    role: profile.role || "cskh",
    is_active: profile.isActive !== false
  };
  const payloadWithEmail = {
    ...basePayload,
    email: profile.email || null
  };
  const write = (payload) => opsRestFetch("user_profiles?on_conflict=id&select=id,full_name,role,is_active", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  try {
    const rows = await write(payloadWithEmail);
    return { ok: true, row: Array.isArray(rows) ? rows[0] : rows };
  } catch (error) {
    try {
      const rows = await write(basePayload);
      return { ok: true, row: Array.isArray(rows) ? rows[0] : rows };
    } catch (fallbackError) {
      return { ok: false, reason: "supabase-error", message: fallbackError.message || error.message };
    }
  }
};

const opsDeleteProfileAsync = async (userId) => {
  if (!opsCan("manageAccounts")) return { ok: false, reason: "forbidden" };
  if (!userId || userId === opsGetSession()?.user?.id) return { ok: false, reason: "self-delete-blocked" };
  try {
    await opsRestFetch(`user_profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "supabase-error", message: error.message };
  }
};

const opsCreateOpsUserAsync = async (account) => {
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured" };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth" };
  if (!opsCan("manageAccounts")) return { ok: false, reason: "forbidden" };

  try {
    const response = await fetch(`${opsSupabaseBaseUrl()}/functions/v1/create-ops-user`, {
      method: "POST",
      headers: {
        ...opsAuthHeaders({ preferUser: true, json: true }),
      },
      body: JSON.stringify({
        email: account.email,
        password: account.password,
        fullName: account.fullName || account.full_name || "",
        phone: account.phone || "",
        role: account.role || "cskh",
        isActive: account.isActive !== false
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return {
        ok: false,
        reason: response.status === 404 ? "function-not-deployed" : "edge-function-error",
        status: response.status,
        message: payload?.message || response.statusText || "Không tạo được tài khoản vận hành."
      };
    }
    return payload;
  } catch (error) {
    return { ok: false, reason: "edge-function-error", message: error.message };
  }
};

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

const opsSourceLabelByCode = Object.entries(opsSourceCodeByLabel)
  .reduce((map, [label, code]) => ({ ...map, [code]: label }), {});

const opsBillNameFromPath = (path = "") => {
  const last = String(path || "").split("/").pop() || "";
  return last.replace(/^\d+-/, "") || last;
};

const opsMapSupabasePayments = (payments = []) => (Array.isArray(payments) ? payments : [])
  .map(payment => ({
    type: payment.payment_type || "payment",
    amount: Number(payment.amount || 0),
    method: payment.payment_method || "",
    status: payment.payment_status || "received",
    paidAt: payment.paid_at || payment.created_at,
    billStoragePath: payment.bill_storage_path || "",
    billUploadedAt: payment.bill_uploaded_at || "",
    billName: payment.note || opsBillNameFromPath(payment.bill_storage_path),
    billUrl: payment.bill_storage_path ? opsStoragePublicUrl("booking-bills", payment.bill_storage_path) : ""
  }))
  .sort((a, b) => new Date(a.paidAt || 0) - new Date(b.paidAt || 0));

const opsLatestBillPayment = (payments = []) => payments
  .slice()
  .reverse()
  .find(payment => payment.billUrl || payment.billName) || null;

const opsMapSupabaseBooking = (row) => {
  const payments = opsMapSupabasePayments(row.payments);
  const bill = opsLatestBillPayment(payments);
  return {
    id: row.public_code || row.id,
    supabaseId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stayDate: row.stay_date,
    checkoutDate: row.checkout_date,
    startTime: row.start_time || "",
    endTime: row.end_time || "",
    branch: row.branches?.name || row.branch_name || "Chưa chọn chi nhánh",
    roomId: row.room_types?.code || row.room_code || "CUSTOM",
    roomName: row.room_types?.name || row.room_name || "Phòng nhập tay",
    customerName: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email || "",
    source: row.booking_sources?.label || opsSourceLabelByCode[row.source_code] || row.source_code || "Website",
    status: row.status || "new",
    packageLabel: row.package_label || "3 tiếng",
    nights: Number(row.nights || 0),
    guests: Number(row.guests || 2),
    total: Number(row.total_amount || 0),
    deposit: Number(row.deposit_amount || 0),
    paid: Number(row.paid_amount || 0),
    balance: Number(row.balance_amount || Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || row.deposit_amount || 0))),
    paymentMethod: row.payment_method || "Chưa thu",
    assignedTo: row.assigned_to || "CSKH",
    note: row.internal_note || row.customer_note || "",
    externalRef: row.external_ref || "",
    billName: bill?.billName || "",
    billUploadedAt: bill?.billUploadedAt || bill?.paidAt || "",
    billUrl: bill?.billUrl || "",
    payments
  };
};

const opsFetchRoomType = async (roomId) => {
  if (!roomId || roomId === "CUSTOM") return null;
  const query = new URLSearchParams({
    select: "id,branch_id,code,name",
    code: `eq.${roomId}`,
    limit: "1"
  });
  const rows = await opsRestFetch(`room_types?${query.toString()}`);
  return Array.isArray(rows) ? rows[0] : null;
};

const opsBookingPayload = (booking, roomType = null) => ({
  public_code: booking.id,
  source_code: opsSourceCodeByLabel[booking.source] || "website",
  room_type_id: roomType?.id || null,
  branch_id: roomType?.branch_id || null,
  customer_name: booking.customerName,
  customer_phone: booking.phone,
  customer_email: booking.email || null,
  stay_date: booking.stayDate,
  checkout_date: booking.checkoutDate || booking.stayDate,
  start_time: booking.startTime || null,
  end_time: booking.endTime || null,
  package_label: booking.packageLabel,
  nights: Number(booking.nights || 0),
  guests: Number(booking.guests || 2),
  status: booking.status || "new",
  total_amount: Number(booking.total || 0),
  deposit_amount: Number(booking.deposit || 0),
  paid_amount: Number(booking.paid || 0),
  balance_amount: Math.max(0, Number(booking.total || 0) - Number(booking.paid || booking.deposit || 0)),
  payment_method: booking.paymentMethod || "Chưa thu",
  assigned_to: booking.assignedTo || "CSKH",
  internal_note: booking.note || "",
  external_ref: booking.externalRef || ""
});

const opsCreatePaymentRowsAsync = async (bookingId, booking) => {
  const payments = (Array.isArray(booking?.payments) ? booking.payments : [])
    .filter(payment => Number(payment.amount || 0) > 0);
  if (!bookingId || !payments.length || !opsCan("managePayments")) return { ok: true, inserted: 0 };
  const allowedTypes = new Set(["deposit", "remaining", "full", "refund", "adjustment"]);

  const rows = payments.map(payment => ({
    booking_id: bookingId,
    payment_type: allowedTypes.has(payment.type) ? payment.type : "deposit",
    amount: Number(payment.amount || 0),
    payment_method: payment.method || booking.paymentMethod || "Chuyển khoản",
    payment_status: payment.status || "received",
    paid_at: payment.paidAt || new Date().toISOString(),
    bill_storage_path: payment.billStoragePath || null,
    bill_uploaded_at: payment.billUploadedAt || null,
    note: payment.billName || ""
  }));

  try {
    await opsRestFetch("payments", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(rows)
    });
    return { ok: true, inserted: rows.length };
  } catch (error) {
    return { ok: false, reason: "supabase-error", message: error.message, inserted: 0 };
  }
};

const opsLoadBookingsAsync = async () => {
  const fallbackRows = opsLoadBookings();
  if (!opsIsSupabaseConfigured()) {
    return { ok: false, source: "local", reason: "not-configured", rows: fallbackRows };
  }
  if (!opsGetSession()?.access_token) {
    return { ok: false, source: "local", reason: "needs-auth", rows: fallbackRows };
  }

  try {
    const select = [
      "id",
      "public_code",
      "created_at",
      "updated_at",
      "stay_date",
      "checkout_date",
      "start_time",
      "end_time",
      "customer_name",
      "customer_phone",
      "customer_email",
      "status",
      "package_label",
      "nights",
      "guests",
      "total_amount",
      "deposit_amount",
      "paid_amount",
      "balance_amount",
      "payment_method",
      "assigned_to",
      "internal_note",
      "customer_note",
      "external_ref",
      "room_types(code,name)",
      "branches(name)",
      "booking_sources(code,label)",
      "payments(payment_type,amount,payment_method,payment_status,paid_at,bill_storage_path,bill_uploaded_at,note,created_at)"
    ].join(",");
    const query = new URLSearchParams({ select, order: "created_at.desc" });
    const rows = await opsRestFetch(`bookings?${query.toString()}`);
    return { ok: true, source: "supabase", rows: rows.map(opsMapSupabaseBooking) };
  } catch (error) {
    return { ok: false, source: "local", reason: "supabase-error", message: error.message, rows: fallbackRows };
  }
};

const opsLoadRoomsAsync = async () => {
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured", rows: [] };
  try {
    const select = [
      "code",
      "name",
      "category",
      "status",
      "inventory_count",
      "branches(name)"
    ].join(",");
    const query = new URLSearchParams({ select, order: "sort_order.asc" });
    const rows = await opsRestFetch(`room_types?${query.toString()}`);
    return {
      ok: true,
      rows: rows.map(row => ({
        code: row.code,
        name: row.name,
        category: row.category,
        status: row.status,
        inventory: Number(row.inventory_count || 0),
        branch: row.branches?.name || ""
      }))
    };
  } catch (error) {
    return { ok: false, reason: "supabase-error", message: error.message, rows: [] };
  }
};

const opsCreateBookingAsync = async (booking) => {
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured" };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth" };
  if (!opsCan("manageBookings")) return { ok: false, reason: "forbidden" };

  try {
    const roomType = await opsFetchRoomType(booking.roomId);
    const rows = await opsRestFetch("bookings?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(opsBookingPayload(booking, roomType))
    });
    const inserted = Array.isArray(rows) ? rows[0] : rows;
    const paymentSync = await opsCreatePaymentRowsAsync(inserted?.id, booking);
    return {
      ok: true,
      paymentSync,
      row: {
        ...booking,
        id: inserted?.public_code || booking.id,
        supabaseId: inserted?.id || booking.supabaseId
      }
    };
  } catch (error) {
    return { ok: false, reason: "supabase-error", message: error.message };
  }
};

const opsFindBookingIdByCodeAsync = async (publicCode) => {
  if (!publicCode) return null;
  const query = new URLSearchParams({
    select: "id,public_code",
    public_code: `eq.${publicCode}`,
    limit: "1"
  });
  const rows = await opsRestFetch(`bookings?${query.toString()}`);
  return Array.isArray(rows) && rows[0] ? rows[0].id : null;
};

const opsUpsertBookingAsync = async (booking) => {
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured" };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth" };
  if (!opsCan("manageBookings")) return { ok: false, reason: "forbidden" };

  try {
    const roomType = await opsFetchRoomType(booking.roomId);
    const payload = opsBookingPayload(booking, roomType);
    const existingId = booking.supabaseId || await opsFindBookingIdByCodeAsync(booking.id);

    if (existingId) {
      await opsRestFetch(`bookings?id=eq.${encodeURIComponent(existingId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload)
      });
      return { ok: true, mode: "updated", supabaseId: existingId };
    }

    const rows = await opsRestFetch("bookings?select=id,public_code", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    const inserted = Array.isArray(rows) ? rows[0] : rows;
    await opsCreatePaymentRowsAsync(inserted?.id, booking);
    return { ok: true, mode: "inserted", supabaseId: inserted?.id || null };
  } catch (error) {
    return { ok: false, reason: "supabase-error", message: error.message };
  }
};

const opsImportBookingsToSupabaseAsync = async (bookings = []) => {
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured", inserted: 0, updated: 0, failed: bookings.length };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth", inserted: 0, updated: 0, failed: bookings.length };
  if (!opsCan("manageBookings")) return { ok: false, reason: "forbidden", inserted: 0, updated: 0, failed: bookings.length };

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];
  for (const booking of bookings) {
    const result = await opsUpsertBookingAsync(booking);
    if (result.ok && result.mode === "inserted") inserted += 1;
    else if (result.ok) updated += 1;
    else {
      failed += 1;
      if (errors.length < 3) errors.push(`${booking.id}: ${result.message || result.reason}`);
    }
  }
  return { ok: failed === 0, inserted, updated, failed, errors };
};

const opsUpdateBookingAsync = async (booking) => {
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured" };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth" };
  if (!opsCan("manageBookings")) return { ok: false, reason: "forbidden" };
  if (!booking.supabaseId) return { ok: false, reason: "local-row" };

  try {
    const patch = {
      status: booking.status || "new",
      deposit_amount: Number(booking.deposit || 0),
      paid_amount: Number(booking.paid || 0),
      total_amount: Number(booking.total || 0),
      balance_amount: Math.max(0, Number(booking.total || 0) - Number(booking.paid || booking.deposit || 0)),
      payment_method: booking.paymentMethod || "Chưa thu",
      assigned_to: booking.assignedTo || "CSKH",
      internal_note: booking.note || ""
    };
    await opsRestFetch(`bookings?id=eq.${encodeURIComponent(booking.supabaseId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch)
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "supabase-error", message: error.message };
  }
};

const opsDeleteBookingAsync = async (booking) => {
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured" };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth" };
  if (!opsCan("deleteBookings")) return { ok: false, reason: "forbidden" };

  const filter = booking?.supabaseId
    ? `id=eq.${encodeURIComponent(booking.supabaseId)}`
    : `public_code=eq.${encodeURIComponent(booking?.id || "")}`;

  try {
    await opsRestFetch(`bookings?${filter}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "supabase-error", message: error.message };
  }
};

const opsSignIn = async (email, password) => {
  if (!opsIsSupabaseConfigured()) throw new Error("Supabase chưa được cấu hình.");
  const response = await fetch(`${opsSupabaseBaseUrl()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: opsSupabaseKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.msg || payload.error || "Đăng nhập thất bại.");
  opsSaveSession(payload);
  await opsRefreshProfileAsync();
  return opsGetSession() || payload;
};

const opsSignOut = () => opsSaveSession(null);

const opsConfigStatus = () => ({
  supabaseConfigured: opsIsSupabaseConfigured(),
  hasSession: Boolean(opsGetSession()?.access_token),
  hasOpsAccess: Boolean(opsGetSession()?.access_token) && opsSessionRole() !== "guest",
  profile: opsGetSession()?.profile || null,
  role: opsSessionRole(),
  roleLabel: opsRoleLabel(),
  isSuperAdmin: opsSessionRole() === "super_admin",
  sheetConfigured: Boolean(opsConfig().sheetWebhookUrl && !opsConfig().sheetWebhookUrl.includes("PASTE_")),
  sheetUrl: opsConfig().sheetUrl || "",
  sheetId: opsConfig().sheetId || "",
  user: opsGetSession()?.user || null
});

const opsSheetUrl = () => String(opsConfig().sheetWebhookUrl || "").trim();

const opsIsSheetConfigured = () => Boolean(opsSheetUrl() && !opsSheetUrl().includes("PASTE_"));

const opsSheetJsonp = (params = {}) => new Promise((resolve, reject) => {
  if (!opsIsSheetConfigured()) {
    reject(new Error("Chưa có Apps Script Web App URL."));
    return;
  }

  const callbackName = `__uniteSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const script = document.createElement("script");
  const url = new URL(opsSheetUrl());
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("callback", callbackName);

  const cleanup = () => {
    delete window[callbackName];
    script.remove();
  };

  const timer = window.setTimeout(() => {
    cleanup();
    reject(new Error("Sheet endpoint phản hồi quá lâu."));
  }, 12000);

  window[callbackName] = (payload) => {
    window.clearTimeout(timer);
    cleanup();
    resolve(payload);
  };

  script.onerror = () => {
    window.clearTimeout(timer);
    cleanup();
    reject(new Error("Không tải được Sheet endpoint."));
  };

  script.src = url.toString();
  document.head.appendChild(script);
});

const opsListSheetBookingsAsync = async () => {
  try {
    const payload = await opsSheetJsonp({ action: "list" });
    return payload?.ok ? { ok: true, rows: payload.rows || [] } : { ok: false, message: payload?.error || "Sheet list failed." };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

const opsPullBookingsFromSheetAsync = async (currentRows = opsLoadBookings()) => {
  const sheet = await opsListSheetBookingsAsync();
  if (!sheet.ok) {
    return { ok: false, reason: "sheet-error", message: sheet.message || "Không đọc được Google Sheet.", rows: currentRows };
  }

  const imported = (sheet.rows || []).map((row, index) => opsNormalizeImportedBooking(row, index));
  const merged = opsMergeBookings(currentRows, imported);
  opsSaveBookings(merged.rows);

  const supabase = opsGetSession()?.access_token && opsCan("manageBookings")
    ? await opsImportBookingsToSupabaseAsync(imported)
    : { ok: false, reason: opsGetSession()?.access_token ? "forbidden" : "needs-auth", inserted: 0, updated: 0, failed: 0 };

  return {
    ok: true,
    source: "sheet",
    rows: merged.rows,
    imported: imported.length,
    added: merged.added,
    updated: merged.updated,
    supabase
  };
};

const opsSyncBookingToSheetAsync = async (booking) => {
  if (!opsIsSheetConfigured()) return { ok: false, reason: "not-configured" };
  try {
    await fetch(opsSheetUrl(), {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "upsert", booking })
    });
    return { ok: true, mode: "sent" };
  } catch (error) {
    return { ok: false, reason: "sheet-error", message: error.message };
  }
};

const opsSyncBookingsToSheetAsync = async (bookings = []) => {
  if (!opsIsSheetConfigured()) return { ok: false, reason: "not-configured", synced: 0, failed: bookings.length };
  let synced = 0;
  let failed = 0;
  for (const booking of bookings) {
    const result = await opsSyncBookingToSheetAsync(booking);
    if (result.ok) synced += 1;
    else failed += 1;
  }
  return { ok: failed === 0, synced, failed };
};

const opsSafeFileName = (value = "bill") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 120) || "bill";

const opsStoragePublicUrl = (bucket, path = "") => {
  if (!bucket || !path) return "";
  const encodedPath = String(path).split("/").map(encodeURIComponent).join("/");
  return `${opsSupabaseBaseUrl()}/storage/v1/object/public/${bucket}/${encodedPath}`;
};

const opsUploadBillAsync = async (file, booking) => {
  if (!file) return { ok: false, reason: "no-file" };
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured" };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth" };
  if (!opsCan("managePayments")) return { ok: false, reason: "forbidden" };

  const safeBookingId = opsSafeFileName(booking?.id || "booking");
  const safeName = opsSafeFileName(file.name || "bill");
  const path = `${safeBookingId}/${Date.now()}-${safeName}`;

  try {
    const response = await fetch(`${opsSupabaseBaseUrl()}/storage/v1/object/booking-bills/${path}`, {
      method: "POST",
      headers: {
        ...opsAuthHeaders({ preferUser: true }),
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true"
      },
      body: file
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || response.statusText || "Không upload được bill.");
    return {
      ok: true,
      bucket: "booking-bills",
      path,
      publicUrl: opsStoragePublicUrl("booking-bills", path)
    };
  } catch (error) {
    return { ok: false, reason: "storage-error", message: error.message };
  }
};

const opsUploadRoomImageAsync = async (file, roomCode = "room") => {
  if (!file) return { ok: false, reason: "no-file" };
  if (!opsIsSupabaseConfigured()) return { ok: false, reason: "not-configured" };
  if (!opsGetSession()?.access_token) return { ok: false, reason: "needs-auth" };
  if (!opsCan("manageInventory")) return { ok: false, reason: "forbidden" };

  const safeRoom = opsSafeFileName(roomCode);
  const safeName = opsSafeFileName(file.name || "room-image.jpg");
  const path = `${safeRoom}/${Date.now()}-${safeName}`;

  try {
    const response = await fetch(`${opsSupabaseBaseUrl()}/storage/v1/object/room-images/${path}`, {
      method: "POST",
      headers: {
        ...opsAuthHeaders({ preferUser: true }),
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true"
      },
      body: file
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || response.statusText || "Không upload được ảnh phòng.");
    return {
      ok: true,
      bucket: "room-images",
      path,
      publicUrl: opsStoragePublicUrl("room-images", path)
    };
  } catch (error) {
    return { ok: false, reason: "storage-error", message: error.message };
  }
};

const opsSetAuthLocked = (locked) => {
  document.body?.classList.toggle("ops-auth-locked", Boolean(locked));
};

const opsEnsureAuthGate = () => {
  let gate = document.querySelector("#opsAuthGate");
  if (gate) return gate;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="ops-auth-gate" id="opsAuthGate" role="dialog" aria-modal="true" aria-labelledby="opsAuthGateTitle">
      <section class="ops-auth-card">
        <span class="panel-kicker">Secure operations</span>
        <h2 id="opsAuthGateTitle">Đăng nhập để vào vận hành</h2>
        <p class="sync-note" id="opsAuthGateState">Admin, CSKH và Dashboard bắt buộc đăng nhập Supabase trước khi thao tác.</p>
        <form class="auth-form ops-auth-gate-form" data-ops-login-form>
          <label>Email
            <input name="email" type="email" autocomplete="username" placeholder="Email admin" required>
          </label>
          <label>Mật khẩu
            <input name="password" type="password" autocomplete="current-password" placeholder="Mật khẩu Supabase" required>
          </label>
          <button class="btn primary small" type="submit">Đăng nhập</button>
        </form>
        <button class="btn soft small" type="button" data-ops-gate-logout hidden>Đăng xuất tài khoản hiện tại</button>
        <p class="ops-auth-help">Đăng nhập đúng mới mở được dữ liệu booking, doanh thu, ảnh, giá và lịch phòng.</p>
      </section>
    </div>
  `);
  gate = document.querySelector("#opsAuthGate");
  return gate;
};

const opsRenderAuthPanel = ({ required = true, requiredPermissions = [], permissionLabel = "" } = {}) => {
  const panel = document.querySelector("#opsAuthPanel");
  const status = opsConfigStatus();
  const permissionAllowed = opsHasRequiredPermissions(requiredPermissions);
  const canOpenPage = status.hasOpsAccess && permissionAllowed;
  const gate = required ? opsEnsureAuthGate() : document.querySelector("#opsAuthGate");
  const gateState = gate?.querySelector("#opsAuthGateState");
  const gateForm = gate?.querySelector("form");
  const gateLogout = gate?.querySelector("[data-ops-gate-logout]");

  if (panel) {
    panel.hidden = !status.supabaseConfigured;
  }

  if (!status.supabaseConfigured) {
    if (gate) {
      gate.hidden = false;
      gate.setAttribute("aria-hidden", "false");
    }
    if (gateState) gateState.textContent = "Chưa cấu hình Supabase. Cần Project URL và publishable key trước khi mở trang vận hành.";
    if (gateForm) gateForm.hidden = true;
    if (gateLogout) gateLogout.hidden = true;
    opsSetAuthLocked(true);
    return;
  }

  const state = panel?.querySelector("#opsAuthState");
  const form = panel?.querySelector("#opsLoginForm");
  const logout = panel?.querySelector("#opsLogoutBtn");
  const email = status.user?.email || "admin";

  if (state) {
    state.textContent = canOpenPage
      ? `Đã đăng nhập Supabase bằng ${email}. Dữ liệu booking có thể đọc/ghi live sau khi schema đã chạy.`
      : status.hasOpsAccess
        ? `Tài khoản ${email} (${status.roleLabel}) chưa có quyền mở trang này.`
      : "Chưa đăng nhập. Vui lòng đăng nhập để mở trang vận hành.";
  }
  if (form) form.hidden = status.hasOpsAccess;
  if (logout) logout.hidden = !status.hasSession;

  if (gate) {
    gate.hidden = canOpenPage;
    gate.setAttribute("aria-hidden", canOpenPage ? "true" : "false");
  }
  if (gateForm) gateForm.hidden = canOpenPage || (status.hasSession && status.hasOpsAccess);
  if (gateLogout) gateLogout.hidden = canOpenPage || !status.hasSession;
  if (gateState) {
    if (canOpenPage) {
      gateState.textContent = `Đã đăng nhập bằng ${email}.`;
    } else if (!status.hasSession) {
      gateState.textContent = "Admin, CSKH và Dashboard bắt buộc đăng nhập Supabase trước khi thao tác.";
    } else if (!status.hasOpsAccess) {
      gateState.textContent = `Tài khoản ${email} chưa được phân quyền vận hành hoặc đã bị khóa. Vui lòng đăng xuất và dùng tài khoản đã được cấp quyền.`;
    } else {
      const label = permissionLabel || requiredPermissions.join(", ") || "đúng vai trò";
      gateState.textContent = `Tài khoản ${email} đang là ${status.roleLabel}, chưa có quyền mở trang này. Cần quyền: ${label}.`;
    }
  }
  opsSetAuthLocked(!canOpenPage);

  if (!canOpenPage && !status.hasSession) {
    window.setTimeout(() => gate?.querySelector("input[name='email']")?.focus(), 80);
  }
};

const opsBindLoginForm = (form, stateNode, onAuthChange, renderOptions) => {
  if (!form || form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    if (stateNode) stateNode.textContent = "Đang đăng nhập Supabase...";
    try {
      await opsSignIn(String(data.get("email") || ""), String(data.get("password") || ""));
      form.reset();
      opsRenderAuthPanel(renderOptions);
      if (typeof onAuthChange === "function") await onAuthChange();
    } catch (error) {
      if (stateNode) stateNode.textContent = error.message || "Đăng nhập thất bại.";
    } finally {
      if (button) button.disabled = false;
    }
  });
};

const opsInitAuthPanel = ({ onAuthChange, required = true, requiredPermissions = [], permissionLabel = "" } = {}) => {
  const panel = document.querySelector("#opsAuthPanel");
  const gate = required ? opsEnsureAuthGate() : null;
  const renderOptions = { required, requiredPermissions, permissionLabel };

  if (panel && panel.dataset.bound !== "true") {
    panel.dataset.bound = "true";
    const form = panel.querySelector("#opsLoginForm");
    const logout = panel.querySelector("#opsLogoutBtn");
    const state = panel.querySelector("#opsAuthState");

    opsBindLoginForm(form, state, onAuthChange, renderOptions);

    logout?.addEventListener("click", async () => {
      opsSignOut();
      opsRenderAuthPanel(renderOptions);
      if (typeof onAuthChange === "function") await onAuthChange();
    });
  }

  opsBindLoginForm(gate?.querySelector("form"), gate?.querySelector("#opsAuthGateState"), onAuthChange, renderOptions);
  const gateLogout = gate?.querySelector("[data-ops-gate-logout]");
  if (gateLogout && gateLogout.dataset.bound !== "true") {
    gateLogout.dataset.bound = "true";
    gateLogout.addEventListener("click", async () => {
      opsSignOut();
      opsRenderAuthPanel(renderOptions);
      if (typeof onAuthChange === "function") await onAuthChange();
    });
  }
  opsRenderAuthPanel(renderOptions);

  if (opsGetSession()?.access_token) {
    opsRefreshProfileAsync().then(async () => {
      opsRenderAuthPanel(renderOptions);
      if (typeof onAuthChange === "function") await onAuthChange();
    });
  }
};

const opsApplyPermissionsToDom = (root = document) => {
  root.querySelectorAll("[data-ops-permission]").forEach(node => {
    const allowed = String(node.dataset.opsPermission || "")
      .split(/\s+/)
      .filter(Boolean)
      .some(permission => opsCan(permission));
    node.hidden = !allowed;
  });
  root.querySelectorAll("[data-ops-disable-unless]").forEach(node => {
    const allowed = String(node.dataset.opsDisableUnless || "")
      .split(/\s+/)
      .filter(Boolean)
      .some(permission => opsCan(permission));
    node.disabled = !allowed;
    node.classList.toggle("is-disabled", !allowed);
  });
};

window.UniteOps = {
  roleLabels: opsUserRoleLabels,
  can: opsCan,
  role: opsSessionRole,
  roleLabel: opsRoleLabel,
  statuses: opsBookingStatuses,
  sources: opsBookingSources,
  seedBookings: opsSeedBookings,
  loadBookings: opsLoadBookings,
  loadBookingsAsync: opsLoadBookingsAsync,
  loadRoomsAsync: opsLoadRoomsAsync,
  saveBookings: opsSaveBookings,
  resetBookings: opsResetBookings,
  parseCsv: opsParseCsv,
  rowsFromFileAsync: opsRowsFromFileAsync,
  normalizeImportedBooking: opsNormalizeImportedBooking,
  mergeBookings: opsMergeBookings,
  upsertBookingAsync: opsUpsertBookingAsync,
  importBookingsToSupabaseAsync: opsImportBookingsToSupabaseAsync,
  createBookingAsync: opsCreateBookingAsync,
  updateBookingAsync: opsUpdateBookingAsync,
  deleteBookingAsync: opsDeleteBookingAsync,
  refreshProfileAsync: opsRefreshProfileAsync,
  listProfilesAsync: opsListProfilesAsync,
  createOpsUserAsync: opsCreateOpsUserAsync,
  upsertProfileAsync: opsUpsertProfileAsync,
  deleteProfileAsync: opsDeleteProfileAsync,
  signIn: opsSignIn,
  signOut: opsSignOut,
  getSession: opsGetSession,
  configStatus: opsConfigStatus,
  initAuthPanel: opsInitAuthPanel,
  listSheetBookingsAsync: opsListSheetBookingsAsync,
  pullBookingsFromSheetAsync: opsPullBookingsFromSheetAsync,
  syncBookingToSheetAsync: opsSyncBookingToSheetAsync,
  syncBookingsToSheetAsync: opsSyncBookingsToSheetAsync,
  storagePublicUrl: opsStoragePublicUrl,
  uploadBillAsync: opsUploadBillAsync,
  uploadRoomImageAsync: opsUploadRoomImageAsync,
  applyPermissionsToDom: opsApplyPermissionsToDom,
  restFetch: opsRestFetch,
  money: opsMoney,
  date: opsDate,
  revenue: opsBookingRevenue,
  toCsv: opsToCsv,
  downloadCsv: opsDownloadCsv
};
