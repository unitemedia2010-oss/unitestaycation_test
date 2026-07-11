// UNITESTAYCATION/js/dashboard.js
// V15 Dashboard: live inventory-aware week/month/year reports and operational insights.

const dashboardFallbackRooms = Array.isArray(window.rooms) ? window.rooms : [];
const dashboardState = { rooms:dashboardFallbackRooms, units:window.UniteOps.roomUnitsFromRooms(dashboardFallbackRooms), bookings: window.UniteOps.loadBookings(), period:"week", branch:"all", source:"all", fromDate:"", toDate:"" };
const $ = (s, r=document) => r.querySelector(s);
const escape = (v="") => String(v).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

const setText = (sel, text) => { const el=$(sel); if(el) el.textContent=text; };
const profileName = () => window.UniteAuth?.profile?.()?.full_name || window.UniteAuth?.profile?.()?.email || "User";

const loadLive = async () => {
  setText("#supabaseSyncState", "Đang tải inventory và booking Supabase...");
  const [inventory, result] = await Promise.all([window.UniteOps.loadInventoryAsync(), window.UniteOps.loadBookingsAsync()]);
  dashboardState.rooms = inventory.rooms || dashboardFallbackRooms;
  dashboardState.units = inventory.units || window.UniteOps.roomUnitsFromRooms(dashboardState.rooms);
  dashboardState.bookings = result.rows;
  window.UniteOps.saveBookings(result.rows);
  const inventoryText = inventory.ok ? `${inventory.rooms.length} layout · ${inventory.units.length} phòng` : "inventory local";
  setText("#supabaseSyncState", result.ok ? `Đã tải ${result.rows.length} booking live · ${inventoryText}.` : `Đang dùng local: ${result.reason || result.message || "chưa live"}`);
  renderAll();
};

const startOfPeriod = () => {
  const now = new Date();
  if (dashboardState.fromDate) return new Date(`${dashboardState.fromDate}T00:00:00`);
  if (dashboardState.period === "week") return window.UniteOps.startOfWeek(now);
  if (dashboardState.period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (dashboardState.period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date("2000-01-01T00:00:00");
};
const endOfPeriod = () => {
  if (dashboardState.toDate) return new Date(`${dashboardState.toDate}T23:59:59`);
  const now = new Date(); now.setHours(23,59,59,999); return now;
};
const filtered = () => {
  const start = startOfPeriod().getTime(); const end = endOfPeriod().getTime();
  return dashboardState.bookings.filter(b => {
    const t = new Date(b.checkinAt || b.stayDate).getTime();
    if (!Number.isNaN(t) && (t < start || t > end)) return false;
    if (dashboardState.branch !== "all" && b.branch !== dashboardState.branch) return false;
    if (dashboardState.source !== "all" && b.source !== dashboardState.source) return false;
    return true;
  });
};
const groupBy = (rows, keyFn, valFn = () => 1) => rows.reduce((m, r) => { const k=keyFn(r); m.set(k, (m.get(k)||0)+valFn(r)); return m; }, new Map());
const groupCount = (rows, keyFn) => groupBy(rows, keyFn, () => 1);
const rowsToSorted = (map) => [...map.entries()].sort((a,b)=>b[1]-a[1]);
const activeRows = (rows) => rows.filter(b => !["cancelled","no_show"].includes(b.status));

const renderOptions = () => {
  const branches = [...new Set(dashboardState.rooms.map(r => r.location).concat(dashboardState.bookings.map(b => b.branch)).filter(Boolean))];
  const sources = [...new Set([...window.UniteOps.sources, ...dashboardState.bookings.map(b => b.source)].filter(Boolean))];
  $("#branchFilter").innerHTML = `<option value="all">Tất cả chi nhánh</option>${branches.map(b=>`<option value="${escape(b)}">${escape(b)}</option>`).join("")}`;
  $("#sourceFilter").innerHTML = `<option value="all">Tất cả nguồn</option>${sources.map(s=>`<option value="${escape(s)}">${escape(s)}</option>`).join("")}`;
  $("#periodFilter").value = dashboardState.period; $("#branchFilter").value = dashboardState.branch; $("#sourceFilter").value = dashboardState.source;
};

const renderKpis = (rows) => {
  const useful = activeRows(rows);
  const revenue = useful.reduce((s,b)=>s+window.UniteOps.bookingRevenue(b),0);
  const total = useful.reduce((s,b)=>s+Number(b.total||0),0);
  const paid = useful.reduce((s,b)=>s+Number(b.paid||b.deposit||0),0);
  const cancellations = rows.filter(b => ["cancelled","no_show"].includes(b.status)).length;
  const periodStart = startOfPeriod().getTime();
  const periodEnd = endOfPeriod().getTime();
  const periodHours = Math.max(1, (periodEnd - periodStart) / 3600000);
  const availableUnitCount = dashboardState.units.filter(unit => unit.status === "available").length;
  const occupiedStatuses = ["holding","deposited","paid","checked_in","checked_out"];
  const occupiedHours = rows.filter(b => occupiedStatuses.includes(b.status) && b.roomUnitCode).reduce((sum, b) => {
    const start = Math.max(periodStart, new Date(b.checkinAt).getTime());
    const end = Math.min(periodEnd, new Date(b.checkoutAt).getTime());
    return sum + (Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 3600000 : 0);
  }, 0);
  const occupancyBase = availableUnitCount * periodHours;
  const occupancy = occupancyBase ? Math.min(100, Math.round((occupiedHours / occupancyBase) * 100)) : 0;
  const cards = [
    ["Doanh thu ghi nhận", window.UniteOps.money(revenue), "Theo trạng thái đã thanh toán/check-in/check-out hoặc đã thu"],
    ["Booking", window.UniteOps.number(rows.length), `${useful.length} booking đang/đã phục vụ`],
    ["Đã thu/cọc", window.UniteOps.money(paid), `Còn lại ${window.UniteOps.money(Math.max(0,total-paid))}`],
    ["Tỷ lệ lấp theo giờ", `${occupancy}%`, `${availableUnitCount} phòng khả dụng · ${cancellations} hủy/no-show`]
  ];
  $("#dashboardKpis").innerHTML = cards.map(([a,b,c]) => `<article class="kpi-card"><span>${a}</span><strong>${b}</strong><small>${c}</small></article>`).join("");
};

const renderBarChart = (id, entries, money = false) => {
  const max = Math.max(1, ...entries.map(x=>x[1]));
  $(id).innerHTML = entries.slice(0,10).map(([label,value]) => `<div class="chart-bar-row"><span>${escape(label)}</span><div class="chart-track"><i style="width:${Math.max(4, value/max*100)}%"></i></div><strong>${money ? window.UniteOps.money(value) : window.UniteOps.number(value)}</strong></div>`).join("") || `<p class="sync-note">Chưa có dữ liệu.</p>`;
};
const renderLineChart = (id, entries) => {
  const max = Math.max(1, ...entries.map(x=>x[1]));
  $(id).innerHTML = entries.map(([label,value]) => `<div class="point"><div class="stem" style="--h:${Math.max(4, value/max*100)}%"></div><small>${escape(label)}<br>${window.UniteOps.money(value)}</small></div>`).join("") || `<p class="sync-note">Chưa có dữ liệu.</p>`;
};

const renderCharts = (rows) => {
  const useful = activeRows(rows);
  renderBarChart("#dailyRevenueChart", rowsToSorted(groupBy(useful, b => window.UniteOps.isoDate(b.checkinAt), b => window.UniteOps.bookingRevenue(b))).sort((a,b)=>a[0].localeCompare(b[0])), true);
  const weekdays = ["CN","T2","T3","T4","T5","T6","T7"];
  renderBarChart("#weekdayChart", rowsToSorted(groupCount(useful, b => weekdays[new Date(b.checkinAt).getDay()])), false);
  const months = Array.from({length:12}, (_,i)=>`${String(i+1).padStart(2,"0")}`);
  const monthMap = groupBy(useful, b => String(new Date(b.checkinAt).getMonth()+1).padStart(2,"0"), b=>window.UniteOps.bookingRevenue(b));
  renderLineChart("#monthlyLineChart", months.map(m => [m, monthMap.get(m)||0]));
  const weekMap = groupBy(useful, b => `Tuần ${Math.ceil(new Date(b.checkinAt).getDate()/7)}`, b=>window.UniteOps.bookingRevenue(b));
  renderBarChart("#weekOfMonthChart", rowsToSorted(weekMap), true);
  renderBarChart("#branchChart", rowsToSorted(groupBy(useful, b=>b.branch || "Khác", b=>window.UniteOps.bookingRevenue(b))), true);
  renderBarChart("#roomChart", rowsToSorted(groupBy(useful, b=>`${b.roomId} · ${b.roomName}`, b=>window.UniteOps.bookingRevenue(b))), true);
  renderBarChart("#sourceChart", rowsToSorted(groupBy(useful, b=>b.source || "Khác", b=>window.UniteOps.bookingRevenue(b))), true);
};

const renderInsights = (rows) => {
  const useful = activeRows(rows);
  const roomRevenue = rowsToSorted(groupBy(useful, b=>`${b.roomId} · ${b.roomName}`, b=>window.UniteOps.bookingRevenue(b)));
  const branchRevenue = rowsToSorted(groupBy(useful, b=>b.branch || "Khác", b=>window.UniteOps.bookingRevenue(b)));
  const cancelByRoom = rowsToSorted(groupCount(rows.filter(b=>["cancelled","no_show"].includes(b.status)), b=>`${b.roomId} · ${b.roomName}`));
  const weekdayBookings = rowsToSorted(groupCount(useful, b=>["CN","T2","T3","T4","T5","T6","T7"][new Date(b.checkinAt).getDay()]));
  const sourceRev = rowsToSorted(groupBy(useful, b=>b.source || "Khác", b=>window.UniteOps.bookingRevenue(b)));
  const insights = [];
  if (branchRevenue[0]) insights.push(["Chi nhánh đang tốt nhất", `${branchRevenue[0][0]} đang dẫn doanh thu kỳ này: ${window.UniteOps.money(branchRevenue[0][1])}. Nên ưu tiên ảnh đẹp, ads và lịch CSKH cho chi nhánh này.`]);
  if (roomRevenue[0]) insights.push(["Layout/phòng mạnh nhất", `${roomRevenue[0][0]} tạo doanh thu cao nhất: ${window.UniteOps.money(roomRevenue[0][1])}. Có thể dùng làm phòng hero trong truyền thông.`]);
  if (roomRevenue.at(-1)) insights.push(["Layout cần kiểm tra", `${roomRevenue.at(-1)[0]} đang thấp nhất trong kỳ. Kiểm tra ảnh, giá, tình trạng phòng, mùi, vệ sinh, feedback khách hoặc ưu đãi.`]);
  if (cancelByRoom[0]) insights.push(["Rủi ro hủy/no-show", `${cancelByRoom[0][0]} có số hủy/no-show cao nhất (${cancelByRoom[0][1]}). Nên rà lại quy trình xác nhận cọc và hướng dẫn check-in.`]);
  if (weekdayBookings[0]) insights.push(["Ngày đông khách", `${weekdayBookings[0][0]} là ngày có nhiều booking nhất. Nên tăng nhân sự trực CSKH và kiểm phòng trước ngày này.`]);
  if (sourceRev[0]) insights.push(["Nguồn khách hiệu quả", `${sourceRev[0][0]} đang đem lại doanh thu cao nhất. Nên so sánh chi phí quảng cáo/hoa hồng OTA để tối ưu.`]);
  $("#insightList").innerHTML = insights.map(([t,p]) => `<div class="insight-item"><strong>${escape(t)}</strong><p>${escape(p)}</p></div>`).join("") || `<p class="sync-note">Chưa đủ dữ liệu để đưa insight.</p>`;
};

const renderRows = (rows) => {
  $("#dashboardBookingRows").innerHTML = rows.sort((a,b)=>new Date(b.checkinAt)-new Date(a.checkinAt)).map(b => `<tr><td>${escape(b.id)}</td><td>${escape(b.customerName)}<br><small>${escape(b.phone)}</small></td><td>${window.UniteOps.dateTime(b.checkinAt)}</td><td>${escape(b.roomName)}<br><small>${escape(b.roomUnitName || b.roomUnitCode || "")}</small></td><td>${escape(b.source)}</td><td>${escape(window.UniteOps.statuses[b.status] || b.status)}</td><td>${window.UniteOps.money(window.UniteOps.bookingRevenue(b))}</td><td>${window.UniteOps.money(b.paid || b.deposit)}</td><td>${window.UniteOps.money(window.UniteOps.bookingBalance(b))}</td></tr>`).join("") || `<tr><td colspan="9">Chưa có dữ liệu.</td></tr>`;
};

const renderAll = () => { const rows = filtered(); renderOptions(); renderKpis(rows); renderCharts(rows); renderInsights(rows); renderRows(rows); };

const bind = () => {
  setText("#dashboardAuthState", `Đã đăng nhập: ${profileName()} · quyền ${window.UniteAuth?.profile?.()?.role || ""}`);
  renderOptions(); renderAll(); loadLive();
  $("#periodFilter").addEventListener("change", e => { dashboardState.period=e.target.value; dashboardState.fromDate=""; dashboardState.toDate=""; $("#fromDate").value=""; $("#toDate").value=""; renderAll(); });
  $("#branchFilter").addEventListener("change", e => { dashboardState.branch=e.target.value; renderAll(); });
  $("#sourceFilter").addEventListener("change", e => { dashboardState.source=e.target.value; renderAll(); });
  $("#fromDate").addEventListener("change", e => { dashboardState.fromDate=e.target.value; renderAll(); });
  $("#toDate").addEventListener("change", e => { dashboardState.toDate=e.target.value; renderAll(); });
  $("#dashboardExport").addEventListener("click", () => window.UniteOps.downloadCsv(filtered(), "unite-dashboard-report.csv"));
  $("#dashboardReload").addEventListener("click", loadLive);
  $("#dashboardSyncSheet").addEventListener("click", async () => { setText("#sheetSyncState", "Đang đồng bộ Sheet..."); const r=await window.UniteOps.syncBookingsToSheetAsync(filtered()); setText("#sheetSyncState", `Đã gửi ${r.synced}/${r.total} dòng sang Sheet.`); });
};

window.addEventListener("unite:auth-ready", bind);
document.addEventListener("DOMContentLoaded", () => window.UniteAuth?.require(["super_admin", "admin", "accountant"]));
