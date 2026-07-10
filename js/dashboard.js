// UNITESTAYCATION/js/dashboard.js

const dashboardState = {
  bookings: window.UniteOps.loadBookings(),
  period: "week",
  branch: "all",
  source: "all"
};

const dashboardNumber = (value) => new Intl.NumberFormat("vi-VN").format(Number(value || 0));

const dashboardStartOfWeek = (date) => {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const dashboardInPeriod = (booking) => {
  if (dashboardState.period === "all") return true;
  const stay = new Date(booking.stayDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (Number.isNaN(stay.getTime())) return true;

  if (dashboardState.period === "week") {
    const start = dashboardStartOfWeek(today);
    return stay >= start && stay <= today;
  }

  return stay.getFullYear() === today.getFullYear() && stay.getMonth() === today.getMonth();
};

const dashboardFiltered = () => dashboardState.bookings.filter(booking => {
  if (!dashboardInPeriod(booking)) return false;
  if (dashboardState.branch !== "all" && booking.branch !== dashboardState.branch) return false;
  if (dashboardState.source !== "all" && booking.source !== dashboardState.source) return false;
  return true;
});

const dashboardGroupBy = (rows, keyFn, valueFn = () => 1) => rows.reduce((map, row) => {
  const key = keyFn(row);
  map.set(key, (map.get(key) || 0) + valueFn(row));
  return map;
}, new Map());

const dashboardMonthLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const dashboardWeekdayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(date);
};

const renderSelectOptions = () => {
  const branchFilter = document.querySelector("#branchFilter");
  const sourceFilter = document.querySelector("#sourceFilter");
  const branches = [...new Set((window.rooms || []).map(room => room.location))];
  const sources = [...new Set([...window.UniteOps.sources, ...dashboardState.bookings.map(item => item.source)])];

  if (branchFilter) {
    branchFilter.innerHTML = `<option value="all">Tất cả chi nhánh</option>${branches.map(branch => `<option value="${branch}">${branch}</option>`).join("")}`;
    branchFilter.value = dashboardState.branch;
  }

  if (sourceFilter) {
    sourceFilter.innerHTML = `<option value="all">Tất cả nguồn</option>${sources.map(source => `<option value="${source}">${source}</option>`).join("")}`;
    sourceFilter.value = dashboardState.source;
  }
};

const renderKpis = (rows) => {
  const revenue = rows.reduce((sum, booking) => sum + window.UniteOps.revenue(booking), 0);
  const deposit = rows.reduce((sum, booking) => sum + Number(booking.deposit || 0), 0);
  const paidBookings = rows.filter(booking => ["paid", "checked_in", "checked_out"].includes(booking.status)).length;
  const conversion = rows.length ? Math.round((paidBookings / rows.length) * 100) : 0;
  const pending = rows.filter(booking => ["new", "consulting", "holding"].includes(booking.status)).length;

  const kpis = [
    ["Doanh thu ghi nhận", window.UniteOps.money(revenue), "Tính paid/check-in/check-out, booking đang cọc tính theo số đã thu."],
    ["Booking", dashboardNumber(rows.length), `${pending} booking cần CSKH xử lý tiếp.`],
    ["Tiền cọc", window.UniteOps.money(deposit), "Tổng cọc đang giữ hoặc đã thu trong kỳ."],
    ["Tỷ lệ chốt", `${conversion}%`, "Paid/check-in/check-out trên tổng booking trong bộ lọc."]
  ];

  document.querySelector("#dashboardKpis").innerHTML = kpis.map(([label, value, desc]) => `
    <article class="kpi-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${desc}</small>
    </article>
  `).join("");
};

const renderBars = (selector, entries, formatter = dashboardNumber) => {
  const target = document.querySelector(selector);
  if (!target) return;
  const max = Math.max(1, ...entries.map(([, value]) => value));
  target.innerHTML = entries.length
    ? entries.map(([label, value]) => `
      <div class="chart-row">
        <label>${label}</label>
        <div class="bar-track"><span style="--w:${Math.max(6, Math.round((value / max) * 100))}%"></span></div>
        <output>${formatter(value)}</output>
      </div>
    `).join("")
    : `<p class="sync-note">Chưa có dữ liệu trong bộ lọc này.</p>`;
};

const renderDashboard = () => {
  const rows = dashboardFiltered();
  renderKpis(rows);

  const daily = [...dashboardGroupBy(rows, item => window.UniteOps.date(item.stayDate), item => window.UniteOps.revenue(item))]
    .sort(([a], [b]) => a.localeCompare(b, "vi"));
  renderBars("#dailyRevenueChart", daily, window.UniteOps.money);

  const byBranch = [...dashboardGroupBy(rows, item => item.branch, item => window.UniteOps.revenue(item))]
    .sort((a, b) => b[1] - a[1]);
  renderBars("#branchChart", byBranch, window.UniteOps.money);

  const bySource = [...dashboardGroupBy(rows, item => item.source, item => item.total ? 1 : 0)]
    .sort((a, b) => b[1] - a[1]);
  renderBars("#sourceChart", bySource);

  const byWeekday = [...dashboardGroupBy(rows, item => dashboardWeekdayLabel(item.stayDate), () => 1)]
    .sort((a, b) => b[1] - a[1]);
  renderBars("#weekdayChart", byWeekday);

  const byMonth = [...dashboardGroupBy(dashboardState.bookings, item => dashboardMonthLabel(item.stayDate), item => window.UniteOps.revenue(item))]
    .sort(([a], [b]) => a.localeCompare(b, "vi"));
  renderBars("#monthlyChart", byMonth, window.UniteOps.money);

  const byRoom = [...dashboardGroupBy(rows, item => item.roomName || item.roomId, item => window.UniteOps.revenue(item))]
    .sort((a, b) => b[1] - a[1]);
  renderBars("#roomChart", byRoom, window.UniteOps.money);

  const pipeline = ["new", "consulting", "holding", "deposited", "paid", "checked_in", "checked_out", "cancelled"];
  document.querySelector("#pipelineGrid").innerHTML = pipeline.map(status => {
    const count = rows.filter(item => item.status === status).length;
    return `
      <article class="pipeline-column">
        <strong>${window.UniteOps.statuses[status] || status}</strong>
        <span>${count}</span>
      </article>
    `;
  }).join("");

  renderInsights(rows);

  document.querySelector("#dashboardBookingRows").innerHTML = rows
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(booking => `
      <tr>
        <td>${booking.id}</td>
        <td><strong>${booking.customerName}</strong><br><small>${booking.phone}</small></td>
        <td>${window.UniteOps.date(booking.stayDate)}<br><small>${booking.packageLabel}${booking.nights ? ` · ${booking.nights} đêm` : ""}</small></td>
        <td>${booking.roomName}<br><small>${booking.branch}</small></td>
        <td>${booking.source}</td>
        <td><span class="status-pill ${booking.status}">${window.UniteOps.statuses[booking.status] || booking.status}</span></td>
        <td>${window.UniteOps.money(window.UniteOps.revenue(booking))}</td>
        <td>${window.UniteOps.money(booking.deposit)} / ${window.UniteOps.money(booking.paid)}</td>
      </tr>
    `).join("");
};

const renderInsights = (rows) => {
  const target = document.querySelector("#dashboardInsights");
  if (!target) return;

  const paidRows = rows.filter(item => ["paid", "checked_in", "checked_out"].includes(item.status));
  const cancelled = rows.filter(item => ["cancelled", "no_show"].includes(item.status)).length;
  const pendingMoney = rows.filter(item => Number(item.total || 0) > Number(item.paid || item.deposit || 0));
  const roomRevenue = [...dashboardGroupBy(rows, item => item.roomName || item.roomId, item => window.UniteOps.revenue(item))]
    .sort((a, b) => b[1] - a[1]);
  const branchRevenue = [...dashboardGroupBy(rows, item => item.branch, item => window.UniteOps.revenue(item))]
    .sort((a, b) => b[1] - a[1]);
  const weekday = [...dashboardGroupBy(rows, item => dashboardWeekdayLabel(item.stayDate), () => 1)]
    .sort((a, b) => b[1] - a[1]);

  const insights = [
    {
      title: "Phòng đang kéo doanh thu tốt",
      body: roomRevenue[0] ? `${roomRevenue[0][0]} đang dẫn đầu với ${window.UniteOps.money(roomRevenue[0][1])}.` : "Chưa đủ dữ liệu để xếp hạng phòng."
    },
    {
      title: "Chi nhánh cần theo dõi",
      body: branchRevenue.length > 1 ? `${branchRevenue[branchRevenue.length - 1][0]} đang thấp nhất trong bộ lọc, nên xem lại giá, ảnh hoặc nguồn khách.` : "Cần thêm dữ liệu chi nhánh để so sánh."
    },
    {
      title: "Ngày đông khách",
      body: weekday[0] ? `${weekday[0][0]} đang có nhiều booking nhất. Có thể tăng nhắc lịch/chuẩn bị phòng vào ngày này.` : "Chưa có booking trong bộ lọc."
    },
    {
      title: "Công nợ cần thu",
      body: `${pendingMoney.length} booking còn thiếu tiền. Kế toán nên lọc và đối soát trước check-in/check-out.`
    },
    {
      title: "Hủy / no-show",
      body: `${cancelled} booking hủy hoặc no-show. Nếu tăng cao, cần xem lại chính sách cọc và nhắc lịch.`
    },
    {
      title: "Tỉ lệ chốt",
      body: rows.length ? `${Math.round((paidRows.length / rows.length) * 100)}% booking trong bộ lọc đã paid/check-in/check-out.` : "Chưa có dữ liệu để tính tỉ lệ chốt."
    }
  ];

  target.innerHTML = insights.map(item => `
    <article class="insight-item">
      <strong>${item.title}</strong>
      <span>${item.body}</span>
    </article>
  `).join("");
};

const renderSyncState = (liveResult = null) => {
  const status = window.UniteOps.configStatus();

  const supabaseNode = document.querySelector("#supabaseSyncState");
  const sheetNode = document.querySelector("#sheetSyncState");
  if (supabaseNode) {
    if (!status.supabaseConfigured) {
      supabaseNode.textContent = "Chưa nối live. Đang dùng dữ liệu mẫu/localStorage.";
    } else if (!status.hasSession) {
      supabaseNode.textContent = "Đã có Supabase public key. Đăng nhập email/password để đọc dữ liệu live.";
    } else if (liveResult?.ok) {
      supabaseNode.textContent = `Đang đọc ${liveResult.rows.length} booking từ Supabase.`;
    } else {
      supabaseNode.textContent = liveResult?.message
        ? `Chưa đọc được Supabase: ${liveResult.message}. Đang dùng localStorage.`
        : "Đã đăng nhập. Nếu chưa có dữ liệu live, hãy chạy schema trong SQL Editor.";
    }
  }
  if (sheetNode) {
    sheetNode.textContent = status.sheetConfigured
      ? "Đã có Apps Script endpoint. Có thể sync backup sang Sheet."
      : status.sheetUrl
        ? "Đã lưu link Sheet. Cần deploy Apps Script Web App để sync tự động."
        : "Sẵn sàng đồng bộ khi có Apps Script endpoint.";
  }
};

const dashboardSetSheetStatus = (message) => {
  const sheetNode = document.querySelector("#sheetSyncState");
  if (sheetNode) sheetNode.textContent = message;
};

const hydrateDashboardFromLive = async () => {
  const result = await window.UniteOps.loadBookingsAsync();
  dashboardState.bookings = result.rows;
  renderSelectOptions();
  renderSyncState(result);
  renderDashboard();
};

const dashboardImportFile = async (file) => {
  if (!file) return;
  dashboardSetSheetStatus(`Đang nhập dữ liệu từ ${file.name}...`);
  const rows = await window.UniteOps.rowsFromFileAsync(file);
  const imported = rows.map((row, index) => window.UniteOps.normalizeImportedBooking(row, index));
  const merged = window.UniteOps.mergeBookings(dashboardState.bookings, imported);
  dashboardState.bookings = merged.rows;
  window.UniteOps.saveBookings(merged.rows);
  const remote = await window.UniteOps.importBookingsToSupabaseAsync(imported);
  renderSelectOptions();
  renderDashboard();
  dashboardSetSheetStatus(remote.ok
    ? `Đã nhập ${imported.length} dòng; thêm ${merged.added}, cập nhật ${merged.updated}; Supabase thêm ${remote.inserted}, cập nhật ${remote.updated}.`
    : `Đã nhập ${imported.length} dòng; thêm ${merged.added}, cập nhật ${merged.updated}. Supabase chưa nhận: ${remote.message || remote.reason || "cần đăng nhập/quyền phù hợp"}.`);
};

const dashboardPullFromSheet = async (button) => {
  if (button) button.disabled = true;
  dashboardSetSheetStatus("Đang lấy booking từ Google Sheet về dashboard...");
  const result = await window.UniteOps.pullBookingsFromSheetAsync(dashboardState.bookings);
  if (result.ok) {
    dashboardState.bookings = result.rows;
    renderSelectOptions();
    renderDashboard();
    const remote = result.supabase || {};
    dashboardSetSheetStatus(remote.ok
      ? `Đã lấy ${result.imported} dòng từ Sheet; thêm ${result.added}, cập nhật ${result.updated}; Supabase thêm ${remote.inserted}, cập nhật ${remote.updated}.`
      : `Đã lấy ${result.imported} dòng từ Sheet; thêm ${result.added}, cập nhật ${result.updated}. Supabase chưa nhận: ${remote.message || remote.reason || "cần đăng nhập/quyền phù hợp"}.`);
  } else {
    dashboardSetSheetStatus(`Không lấy được Sheet: ${result.message || result.reason || "kiểm tra Apps Script"}.`);
  }
  if (button) button.disabled = false;
};

document.addEventListener("DOMContentLoaded", async () => {
  renderSelectOptions();
  renderSyncState();
  renderDashboard();
  window.UniteOps.initAuthPanel({
    onAuthChange: hydrateDashboardFromLive,
    requiredPermissions: ["readOperations"],
    permissionLabel: "tài khoản vận hành đang mở"
  });
  await hydrateDashboardFromLive();

  document.querySelector("#periodFilter")?.addEventListener("change", event => {
    dashboardState.period = event.target.value;
    renderDashboard();
  });

  document.querySelector("#branchFilter")?.addEventListener("change", event => {
    dashboardState.branch = event.target.value;
    renderDashboard();
  });

  document.querySelector("#sourceFilter")?.addEventListener("change", event => {
    dashboardState.source = event.target.value;
    renderDashboard();
  });

  document.querySelector("#dashboardExport")?.addEventListener("click", () => {
    window.UniteOps.downloadCsv(dashboardFiltered(), `unite-dashboard-${dashboardState.period}.csv`);
  });

  document.querySelector("#dashboardImportFile")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    try {
      await dashboardImportFile(file);
    } catch (error) {
      dashboardSetSheetStatus(`Import lỗi: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  });

  document.querySelector("#dashboardSyncSheet")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    const rows = dashboardFiltered();
    button.disabled = true;
    dashboardSetSheetStatus(`Đang gửi ${rows.length} booking sang Google Sheet...`);
    const result = await window.UniteOps.syncBookingsToSheetAsync(rows);
    dashboardSetSheetStatus(result.ok
      ? `Đã gửi ${result.synced} booking sang Sheet.`
      : `Đã gửi ${result.synced || 0}, lỗi ${result.failed || 0}. Kiểm tra Apps Script nếu Sheet chưa cập nhật.`);
    button.disabled = false;
  });

  document.querySelector("#dashboardPullSheet")?.addEventListener("click", event => {
    dashboardPullFromSheet(event.currentTarget);
  });
});
