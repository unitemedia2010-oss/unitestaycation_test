// UNITESTAYCATION/js/admin-live.js

const LIVE_ADMIN_STORAGE_KEY = "unite-staycation-live-admin-v1";
const LIVE_ADMIN_STORAGE_VERSION = 2;
const liveBaseRooms = typeof rooms !== "undefined" ? rooms : [];

const liveParseMoney = (value) => Number(String(value || "").replace(/[^\d]/g, "")) || 0;
const liveMoneyText = (value) => liveParseMoney(value) ? new Intl.NumberFormat("vi-VN").format(liveParseMoney(value)) : "";
const liveSlug = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const liveCanonicalBranchSlug = (name) => ({
  "Chi nhánh Nhiêu Tứ": "nhieu-tu",
  "Chi nhánh Phan Tây Hồ": "phan-tay-ho",
  "Chi nhánh Lê Văn Sĩ": "le-van-si"
}[name] || liveSlug(name));

const liveDefaultState = () => ({
  schemaVersion: LIVE_ADMIN_STORAGE_VERSION,
  branches: [...new Set(liveBaseRooms.map(room => room.location))].map((name, index) => ({
    id: liveCanonicalBranchSlug(name),
    name,
    area: "Phú Nhuận",
    sortOrder: (index + 1) * 10
  })),
  rooms: liveBaseRooms.map((room, index) => ({
    code: room.id,
    name: room.name,
    branch: room.location,
    category: room.category,
    priceTier: room.priceTier,
    inventory: Number(room.inventory || 3),
    status: "available",
    description: room.description,
    prices: Object.fromEntries(room.prices.map(price => [price.label === "Ngày" ? "Theo ngày" : price.label, liveParseMoney(price.value)])),
    promo: { enabled: false, badge: "", percent: 0 },
    images: room.images.map((src, order) => ({ src, path: src, order, alt: room.name }))
  }))
});

const liveLoadState = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LIVE_ADMIN_STORAGE_KEY) || "null");
    if (stored?.rooms?.length) {
      const baseByCode = new Map(liveBaseRooms.map(room => [room.id, room]));
      return {
        ...stored,
        schemaVersion: LIVE_ADMIN_STORAGE_VERSION,
        branches: (stored.branches || []).map(branch => ({
          ...branch,
          id: liveCanonicalBranchSlug(branch.name)
        })),
        rooms: stored.rooms.map(room => {
          const base = baseByCode.get(room.code);
          return {
            ...room,
            inventory: stored.schemaVersion === LIVE_ADMIN_STORAGE_VERSION
              ? Math.max(0, Number(room.inventory ?? base?.inventory ?? 3))
              : Math.max(0, Number(base?.inventory ?? 3))
          };
        })
      };
    }
  } catch {
    // Keep admin usable with defaults.
  }
  return liveDefaultState();
};

const liveState = liveLoadState();

const liveSave = () => {
  localStorage.setItem(LIVE_ADMIN_STORAGE_KEY, JSON.stringify(liveState));
  document.querySelector("#liveLocalState").textContent = `Đã lưu ${liveState.rooms.length} layout và ${liveState.branches.length} chi nhánh trong trình duyệt.`;
};

const liveSetSync = (message) => {
  const node = document.querySelector("#liveSyncState");
  if (node) node.textContent = message;
};

const liveSetAccountState = (message) => {
  const node = document.querySelector("#liveAccountState");
  if (node) node.textContent = message;
};

const liveApplyOpsPermissions = () => {
  window.UniteOps.applyPermissionsToDom();
  const canInventory = window.UniteOps.can("manageInventory");
  ["#liveRoomForm", "#livePriceForm", "#livePromoForm"].forEach(selector => {
    document.querySelector(selector)?.querySelectorAll("input, select, textarea, button").forEach(node => {
      node.disabled = !canInventory;
    });
  });
  document.querySelector("#liveImageUpload")?.toggleAttribute("disabled", !canInventory);
  const syncButton = document.querySelector("#liveSyncSupabase");
  if (syncButton) syncButton.disabled = !canInventory;
};

const liveAccountCard = (profile) => `
  <article class="booking-row" data-user-id="${profile.id}">
    <div>
      <div class="booking-title-line">
        <h3>${profile.full_name || profile.email || "Tài khoản vận hành"}</h3>
        <span class="status-pill ${profile.is_active ? "paid" : "cancelled"}">${profile.is_active ? "Đang mở" : "Đã khóa"}</span>
      </div>
      <p><strong>${window.UniteOps.roleLabels?.[profile.role] || profile.role}</strong>${profile.email ? ` · ${profile.email}` : ""}</p>
      <p class="booking-meta">${profile.id}</p>
    </div>
    <div class="booking-actions">
      <button class="btn soft small" type="button" data-account-action="edit">Sửa</button>
      <button class="btn soft small danger" type="button" data-account-action="delete">Xóa quyền</button>
    </div>
  </article>
`;

const liveRenderAccounts = (rows = []) => {
  const target = document.querySelector("#liveAccountList");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows.map(liveAccountCard).join("")
    : `<article class="booking-row"><p>Chưa có tài khoản nào trong user_profiles.</p></article>`;
};

const liveRefreshAccounts = async () => {
  liveApplyOpsPermissions();
  if (!window.UniteOps.can("manageAccounts")) return;
  liveSetAccountState("Đang tải danh sách tài khoản vận hành...");
  const result = await window.UniteOps.listProfilesAsync();
  if (result.ok) {
    liveRenderAccounts(result.rows);
    liveSetAccountState(`Đang quản lý ${result.rows.length} tài khoản vận hành.`);
  } else {
    liveRenderAccounts([]);
    liveSetAccountState(`Chưa tải được tài khoản: ${result.message || result.reason || "kiểm tra quyền super admin"}.`);
  }
};

const liveFillAccountForm = (profile) => {
  const form = document.querySelector("#liveAccountForm");
  if (!form || !profile) return;
  form.elements.id.value = profile.id || "";
  form.elements.email.value = profile.email || "";
  form.elements.fullName.value = profile.full_name || "";
  form.elements.role.value = profile.role || "cskh";
  form.elements.isActive.value = profile.is_active === false ? "false" : "true";
};

const liveBranchOptions = () => liveState.branches.map(branch => `<option value="${branch.name}">${branch.name}</option>`).join("");
const liveRoomOptions = () => liveState.rooms.map(room => `<option value="${room.code}">${room.name} - ${room.branch}</option>`).join("");

const liveRenderSelects = () => {
  ["#liveBranchSelect"].forEach(selector => {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = liveBranchOptions();
  });
  ["#livePriceRoom", "#livePromoRoom", "#liveImageRoom"].forEach(selector => {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = liveRoomOptions();
  });
};

const liveRoomCard = (room) => `
  <article class="booking-row" data-room-code="${room.code}">
    <div>
      <div class="booking-title-line">
        <h3>${room.name}</h3>
        <span class="status-pill ${room.status === "available" ? "paid" : "cancelled"}">${room.status}</span>
      </div>
      <p><strong>${room.code}</strong> · ${room.branch} · ${room.category || "Chưa phân loại"}</p>
      <p>${room.inventory} phòng · ${room.priceTier} · ${room.promo?.enabled ? `Promo ${room.promo.badge || `${room.promo.percent}%`}` : "Không promo"}</p>
      <p class="booking-meta">${Object.entries(room.prices || {}).map(([label, price]) => `${label}: ${new Intl.NumberFormat("vi-VN").format(price)}`).join(" · ")}</p>
    </div>
    <div class="booking-actions">
      <button class="btn soft small" type="button" data-action="edit">Sửa</button>
      <button class="btn soft small" type="button" data-action="images">Ảnh</button>
    </div>
  </article>
`;

const liveRenderRooms = () => {
  const list = document.querySelector("#liveRoomList");
  if (list) list.innerHTML = liveState.rooms.map(liveRoomCard).join("");
  liveRenderSelects();
  liveRenderImages();
  liveSave();
  if (window.UniteOps?.applyPermissionsToDom) liveApplyOpsPermissions();
};

const liveCurrentImageRoom = () => {
  const code = document.querySelector("#liveImageRoom")?.value || liveState.rooms[0]?.code;
  return liveState.rooms.find(room => room.code === code) || liveState.rooms[0];
};

const liveRenderImages = () => {
  const target = document.querySelector("#liveImageList");
  const room = liveCurrentImageRoom();
  if (!target || !room) return;
  const images = [...(room.images || [])].sort((a, b) => a.order - b.order);
  target.innerHTML = images.length ? images.map((image, index) => `
    <article class="image-sort-card" data-index="${index}">
      <img src="${image.src || image.publicUrl || image.path}" alt="${image.alt || room.name}">
      <div>
        <small>${image.path || image.src}</small>
        <div class="ops-actions">
          <button class="btn soft small" type="button" data-image-action="up">Lên</button>
          <button class="btn soft small" type="button" data-image-action="down">Xuống</button>
          <button class="btn soft small danger" type="button" data-image-action="remove">Xóa</button>
        </div>
      </div>
    </article>
  `).join("") : `<p class="sync-note">Chưa có ảnh cho layout này.</p>`;
};

const liveFillRoomForm = (room) => {
  const form = document.querySelector("#liveRoomForm");
  if (!form || !room) return;
  form.elements.branch.value = room.branch;
  form.elements.code.value = room.code;
  form.elements.name.value = room.name;
  form.elements.category.value = room.category || "";
  form.elements.priceTier.value = room.priceTier || "premium";
  form.elements.inventory.value = room.inventory || 1;
  form.elements.status.value = room.status || "available";
  form.elements.description.value = room.description || "";
};

const liveSyncSupabase = async () => {
  const status = window.UniteOps.configStatus();
  if (!window.UniteOps.can("manageInventory")) {
    liveSetSync("Tài khoản này chưa có quyền admin/super admin để sync chi nhánh, layout và ảnh.");
    return;
  }
  if (!status.hasSession) {
    liveSetSync("Cần đăng nhập Supabase trước khi sync.");
    return;
  }

  liveSetSync("Đang sync chi nhánh và số lượng layout lên Supabase...");
  let branchSynced = 0;
  let roomSynced = 0;
  let failed = 0;
  const branchIds = new Map();

  for (const branch of liveState.branches) {
    const payload = {
      slug: branch.id || liveCanonicalBranchSlug(branch.name),
      name: branch.name,
      area: branch.area || "Phú Nhuận",
      public_address: `${branch.name}, ${branch.area || "Phú Nhuận"}`,
      sort_order: branch.sortOrder || 0,
      is_active: true
    };
    const result = await window.UniteOps.restFetch("branches?on_conflict=slug&select=id,slug,name", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    }).then(rows => ({ ok: true, row: Array.isArray(rows) ? rows[0] : rows })).catch(error => ({ ok: false, error }));
    if (result.ok) {
      branchSynced += 1;
      branchIds.set(branch.name, result.row?.id);
    }
    else failed += 1;
  }

  for (const room of liveState.rooms) {
    const branchId = branchIds.get(room.branch);
    if (!branchId) {
      failed += 1;
      continue;
    }
    const payload = {
      branch_id: branchId,
      code: room.code,
      name: room.name,
      category: room.category || "Studio",
      price_tier: room.priceTier || "premium",
      description: room.description || "",
      inventory_count: Math.max(0, Number(room.inventory || 0)),
      status: room.status || "available",
      is_published: room.status !== "hidden"
    };
    const result = await window.UniteOps.restFetch("room_types?on_conflict=code", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(payload)
    }).then(() => ({ ok: true })).catch(error => ({ ok: false, error }));
    if (result.ok) roomSynced += 1;
    else failed += 1;
  }

  liveSetSync(`Đã sync ${branchSynced} chi nhánh và ${roomSynced} layout lên Supabase, lỗi ${failed}. Số lượng phòng đã dùng cho kiểm tra lịch CSKH.`);
};

document.addEventListener("DOMContentLoaded", () => {
  window.UniteOps.initAuthPanel({
    onAuthChange: liveRefreshAccounts,
    requiredPermissions: ["manageInventory", "manageAccounts"],
    permissionLabel: "Admin hoặc Super admin"
  });
  liveRenderRooms();
  liveApplyOpsPermissions();
  liveRefreshAccounts();

  document.querySelector("#liveRoomForm")?.addEventListener("submit", event => {
    event.preventDefault();
    if (!window.UniteOps.can("manageInventory")) {
      liveSetSync("Tài khoản này chưa có quyền sửa layout/phòng.");
      return;
    }
    const form = event.currentTarget;
    const newBranch = String(form.elements.newBranch.value || "").trim();
    const branchName = newBranch || form.elements.branch.value;
    if (newBranch && !liveState.branches.some(branch => branch.name === newBranch)) {
      liveState.branches.push({ id: liveSlug(newBranch), name: newBranch, area: "Phú Nhuận", sortOrder: liveState.branches.length * 10 + 10 });
    }
    const code = String(form.elements.code.value || "").trim();
    const existing = liveState.rooms.find(room => room.code === code);
    const next = {
      ...(existing || { prices: {}, promo: { enabled: false, badge: "", percent: 0 }, images: [] }),
      code,
      branch: branchName,
      name: String(form.elements.name.value || "").trim(),
      category: form.elements.category.value,
      priceTier: form.elements.priceTier.value,
      inventory: Number(form.elements.inventory.value || 1),
      status: form.elements.status.value,
      description: form.elements.description.value
    };
    if (existing) Object.assign(existing, next);
    else liveState.rooms.push(next);
    form.reset();
    liveRenderRooms();
  });

  document.querySelector("#liveRoomList")?.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest("[data-room-code]");
    if (!button || !row) return;
    const room = liveState.rooms.find(item => item.code === row.dataset.roomCode);
    if (button.dataset.action === "edit") liveFillRoomForm(room);
    if (button.dataset.action === "images") {
      document.querySelector("#liveImageRoom").value = room.code;
      liveRenderImages();
    }
  });

  document.querySelector("#livePriceForm")?.addEventListener("submit", event => {
    event.preventDefault();
    if (!window.UniteOps.can("manageInventory")) return;
    const form = event.currentTarget;
    const room = liveState.rooms.find(item => item.code === form.elements.roomCode.value);
    if (room) room.prices[form.elements.packageLabel.value] = liveParseMoney(form.elements.price.value);
    form.reset();
    liveRenderRooms();
  });

  document.querySelector("#livePriceForm input[name='price']")?.addEventListener("input", event => {
    event.target.value = liveMoneyText(event.target.value);
  });

  document.querySelector("#livePromoForm")?.addEventListener("submit", event => {
    event.preventDefault();
    if (!window.UniteOps.can("manageInventory")) return;
    const form = event.currentTarget;
    const room = liveState.rooms.find(item => item.code === form.elements.roomCode.value);
    if (room) {
      room.promo = {
        enabled: form.elements.enabled.value === "true",
        badge: form.elements.badge.value,
        percent: Number(form.elements.percent.value || 0)
      };
    }
    liveRenderRooms();
  });

  document.querySelector("#liveImageRoom")?.addEventListener("change", liveRenderImages);

  document.querySelector("#liveImageUpload")?.addEventListener("change", async event => {
    if (!window.UniteOps.can("manageInventory")) {
      event.target.value = "";
      liveSetSync("Tài khoản này chưa có quyền upload ảnh phòng.");
      return;
    }
    const room = liveCurrentImageRoom();
    if (!room) return;
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      const upload = await window.UniteOps.uploadRoomImageAsync(file, room.code);
      const localUrl = URL.createObjectURL(file);
      room.images.push({
        src: upload.ok ? upload.publicUrl : localUrl,
        publicUrl: upload.publicUrl || "",
        path: upload.path || file.name,
        order: room.images.length,
        alt: room.name
      });
    }
    event.target.value = "";
    liveRenderRooms();
  });

  document.querySelector("#liveImageList")?.addEventListener("click", event => {
    if (!window.UniteOps.can("manageInventory")) return;
    const button = event.target.closest("button[data-image-action]");
    const card = event.target.closest("[data-index]");
    const room = liveCurrentImageRoom();
    if (!button || !card || !room) return;
    const index = Number(card.dataset.index);
    const images = room.images.sort((a, b) => a.order - b.order);
    if (button.dataset.imageAction === "up" && index > 0) [images[index - 1], images[index]] = [images[index], images[index - 1]];
    if (button.dataset.imageAction === "down" && index < images.length - 1) [images[index + 1], images[index]] = [images[index], images[index + 1]];
    if (button.dataset.imageAction === "remove") images.splice(index, 1);
    images.forEach((image, order) => image.order = order);
    room.images = images;
    liveRenderRooms();
  });

  document.querySelector("#liveSyncSupabase")?.addEventListener("click", liveSyncSupabase);

  document.querySelector("#liveCreateAccountForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!window.UniteOps.can("manageAccounts")) return;
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    liveSetAccountState("Đang tạo Auth user và gán quyền vận hành...");
    const result = await window.UniteOps.createOpsUserAsync({
      email: String(form.elements.email.value || "").trim(),
      password: String(form.elements.password.value || ""),
      fullName: String(form.elements.fullName.value || "").trim(),
      phone: String(form.elements.phone.value || "").trim(),
      role: form.elements.role.value,
      isActive: form.elements.isActive.value === "true"
    });
    if (result.ok) {
      form.reset();
      liveSetAccountState(result.mode === "profile_updated_existing_auth"
        ? "Email này đã có trong Auth; đã cập nhật quyền vận hành."
        : "Đã tạo tài khoản mới và gán quyền vận hành.");
      await liveRefreshAccounts();
    } else {
      const deployHint = result.reason === "function-not-deployed"
        ? " Edge Function create-ops-user chưa được deploy hoặc chưa có secret."
        : "";
      liveSetAccountState(`Tạo tài khoản lỗi: ${result.message || result.reason || "kiểm tra Edge Function"}.${deployHint}`);
    }
    if (button) button.disabled = false;
  });

  document.querySelector("#liveAccountForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!window.UniteOps.can("manageAccounts")) return;
    const form = event.currentTarget;
    liveSetAccountState("Đang lưu quyền tài khoản...");
    const result = await window.UniteOps.upsertProfileAsync({
      id: String(form.elements.id.value || "").trim(),
      email: String(form.elements.email.value || "").trim(),
      fullName: String(form.elements.fullName.value || "").trim(),
      role: form.elements.role.value,
      isActive: form.elements.isActive.value === "true"
    });
    if (result.ok) {
      form.reset();
      liveSetAccountState("Đã lưu quyền tài khoản.");
      await liveRefreshAccounts();
    } else {
      liveSetAccountState(`Lưu quyền lỗi: ${result.message || result.reason || "kiểm tra RLS/user_profiles"}.`);
    }
  });

  document.querySelector("#liveAccountList")?.addEventListener("click", async event => {
    if (!window.UniteOps.can("manageAccounts")) return;
    const button = event.target.closest("button[data-account-action]");
    const row = event.target.closest("[data-user-id]");
    if (!button || !row) return;
    const userId = row.dataset.userId;
    if (button.dataset.accountAction === "edit") {
      const result = await window.UniteOps.listProfilesAsync();
      const profile = result.rows?.find(item => item.id === userId);
      liveFillAccountForm(profile);
      return;
    }
    if (button.dataset.accountAction === "delete") {
      if (!window.confirm("Xóa quyền tài khoản này khỏi user_profiles? Auth user trong Supabase vẫn còn, chỉ bị mất quyền vận hành.")) return;
      const result = await window.UniteOps.deleteProfileAsync(userId);
      liveSetAccountState(result.ok ? "Đã xóa quyền tài khoản." : `Xóa quyền lỗi: ${result.message || result.reason}.`);
      await liveRefreshAccounts();
    }
  });

  document.querySelector("#liveExport")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(liveState, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "unite-live-admin-draft.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  document.querySelector("#liveReset")?.addEventListener("click", () => {
    localStorage.removeItem(LIVE_ADMIN_STORAGE_KEY);
    Object.assign(liveState, liveDefaultState());
    liveRenderRooms();
  });
});
