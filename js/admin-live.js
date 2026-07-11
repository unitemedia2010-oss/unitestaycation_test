// UNITESTAYCATION/js/admin-live.js
// V15 Admin live CRUD: branches, layouts, real units, editable prices, promotions, images and accounts.

(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const state = { branches: [], roomTypes: [], roomUnits: [], prices: [], promos: [], images: [], profiles: [], tab: "branches", selectedRoomType: "" };

  const setStateText = (text) => { const el = $("#adminLiveState"); if (el) el.textContent = text; };
  const escape = (v="") => String(v).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));

  const loadAll = async () => {
    setStateText("Đang tải Supabase...");
    try {
      const profileRequest = window.UniteAuth?.hasRole?.(["super_admin"])
        ? window.UniteOps.restFetch("app_profiles?select=*&order=created_at.desc")
        : Promise.resolve([]);
      const [branches, roomTypes, roomUnits, prices, promos, images, profiles] = await Promise.all([
        window.UniteOps.restFetch("branches?select=*&order=sort_order.asc"),
        window.UniteOps.restFetch("room_types?select=*,branches(name)&order=sort_order.asc"),
        window.UniteOps.restFetch("room_units?select=*,room_types(code,name),branches(name)&order=code.asc"),
        window.UniteOps.restFetch("room_prices?select=*,room_types(code,name)&order=sort_order.asc"),
        window.UniteOps.restFetch("promotions?select=*,room_types(code,name)&order=created_at.desc"),
        window.UniteOps.restFetch("room_images?select=*,room_types(code,name)&order=sort_order.asc"),
        profileRequest
      ]);
      Object.assign(state, { branches, roomTypes, roomUnits, prices, promos, images, profiles });
      setStateText(`Live Supabase · ${branches.length} chi nhánh · ${roomTypes.length} layout · ${roomUnits.length} phòng thật`);
      render();
    } catch (error) {
      setStateText(`Lỗi tải dữ liệu: ${error.message}`);
    }
  };

  const upsert = async (table, payload, id = null) => {
    if (id) return window.UniteOps.restFetch(`${table}?id=eq.${id}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    return window.UniteOps.restFetch(`${table}?select=*`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  };
  const remove = async (table, id) => window.UniteOps.restFetch(`${table}?id=eq.${id}`, { method: "DELETE" });

  const branchOptions = (selected="") => state.branches.map(b => `<option value="${b.id}" ${b.id===selected?"selected":""}>${escape(b.name)}</option>`).join("");
  const roomTypeOptions = (selected="") => state.roomTypes.map(r => `<option value="${r.id}" ${r.id===selected?"selected":""}>${escape(r.code)} · ${escape(r.name)} · ${escape(r.branches?.name || "")}</option>`).join("");

  const ensureUnits = async (roomTypeOrId, count) => {
    let type = typeof roomTypeOrId === "object" ? roomTypeOrId : state.roomTypes.find(r => r.id === roomTypeOrId);
    if (!type?.id && roomTypeOrId) {
      const rows = await window.UniteOps.restFetch(`room_types?id=eq.${roomTypeOrId}&select=*&limit=1`);
      type = Array.isArray(rows) ? rows[0] : null;
    }
    if (!type?.id) throw new Error("Không tìm thấy layout vừa lưu.");
    const desired = Math.max(0, Number(count || 0));
    const current = state.roomUnits.filter(u => u.room_type_id === type.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    for (let i = 1; i <= desired; i++) {
      const existing = current[i - 1];
      const payload = { branch_id:type.branch_id, room_type_id:type.id, code:`${type.code}-P${i}`, unit_name:`Phòng ${i}`, status:"available", sort_order:i };
      await upsert("room_units", payload, existing?.id || null);
    }
    for (const extra of current.slice(desired)) {
      await upsert("room_units", { status:"hidden" }, extra.id);
    }
  };

  const renderBranches = () => `
    <section class="ops-layout">
      <form class="ops-panel ops-form-grid" id="branchForm">
        <div class="span-3"><span class="panel-kicker">Branches</span><h2>Thêm/sửa chi nhánh</h2></div>
        <input type="hidden" name="id">
        <label>Tên chi nhánh<input name="name" required placeholder="Chi nhánh Lê Văn Sĩ"></label>
        <label>Slug<input name="slug" required placeholder="le-van-si"></label>
        <label>Khu vực<input name="area" placeholder="Phú Nhuận"></label>
        <label class="span-2">Địa chỉ public<input name="public_address" placeholder="Địa chỉ khách thấy"></label>
        <label>Thứ tự<input name="sort_order" type="number" value="10"></label>
        <label>Trạng thái<select name="is_active"><option value="true">Đang mở</option><option value="false">Tạm ẩn</option></select></label>
        <button class="btn primary" type="submit">Lưu chi nhánh</button>
      </form>
      <div class="ops-panel"><span class="panel-kicker">Current</span><h2>Danh sách chi nhánh</h2><div class="admin-live-list">${state.branches.map(b => `
        <div class="admin-live-item"><div><strong>${escape(b.name)}</strong><small>${escape(b.area || "")} · ${escape(b.public_address || "")} · ${b.is_active ? "Đang mở" : "Đang ẩn"}</small></div><div class="ops-actions"><button class="btn soft small" data-edit-branch="${b.id}">Sửa</button><button class="btn soft small" data-delete-branch="${b.id}">Xóa</button></div></div>`).join("")}</div></div>
    </section>`;

  const renderLayouts = () => `
    <section class="ops-layout">
      <form class="ops-panel ops-form-grid" id="layoutForm">
        <div class="span-3"><span class="panel-kicker">Room layouts</span><h2>Thêm/sửa layout và số lượng phòng</h2></div>
        <input type="hidden" name="id">
        <label>Chi nhánh<select name="branch_id" required>${branchOptions()}</select></label>
        <label>Mã layout<input name="code" required placeholder="C12-AMOR"></label>
        <label>Tên layout<input name="name" required placeholder="Amor Layout"></label>
        <label>Nhóm phòng<input name="category" placeholder="Studio"></label>
        <label>Tier<select name="price_tier"><option value="premium">Premium</option><option value="signature">Signature</option><option value="budget">Giá tốt</option></select></label>
        <label>Số lượng phòng thật<input name="inventory_count" type="number" min="0" value="3"></label>
        <label class="span-2">Vibe<input name="vibe" placeholder="Warm luxury · private stay"></label>
        <label>Trạng thái<select name="status"><option value="available">Đang mở</option><option value="limited">Giới hạn</option><option value="maintenance">Bảo trì</option><option value="hidden">Ẩn</option></select></label>
        <label class="span-3">Mô tả<textarea name="description"></textarea></label>
        <button class="btn primary" type="submit">Lưu layout</button>
      </form>
      <div class="ops-panel"><span class="panel-kicker">Current</span><h2>Danh sách layout</h2><div class="admin-live-list">${state.roomTypes.map(r => `
        <div class="admin-live-item"><div><strong>${escape(r.code)} · ${escape(r.name)}</strong><small>${escape(r.branches?.name || "")} · ${r.inventory_count || 0} phòng · ${escape(r.status)}</small></div><div class="ops-actions"><button class="btn soft small" data-edit-layout="${r.id}">Sửa</button><button class="btn soft small" data-delete-layout="${r.id}">Xóa</button></div></div>`).join("")}</div></div>
    </section>`;

  const renderPrices = () => `
    <section class="ops-layout">
      <form class="ops-panel ops-form-grid" id="priceForm">
        <div class="span-3"><span class="panel-kicker">Pricing</span><h2>Giá chuẩn theo layout</h2><p class="sync-note">Chọn đúng layout + gói để cập nhật giá hiện có, không cần xóa rồi tạo lại.</p></div>
        <label class="span-2">Layout<select name="room_type_id" required>${roomTypeOptions()}</select></label>
        <label>Gói<select name="package_code"><option value="3h">3 tiếng</option><option value="4h">4 tiếng</option><option value="8h">8 tiếng</option><option value="day">Theo ngày</option><option value="night">Qua đêm</option></select></label>
        <label>Tên gói<input name="package_label" placeholder="3 tiếng"></label>
        <label>Giá gốc<input name="base_price" type="number" min="0" step="1000" placeholder="299000" required></label>
        <label>Giá sale riêng<input name="sale_price" type="number" min="0" step="1000" placeholder="Để trống nếu dùng khuyến mãi"></label>
        <label>Thứ tự<input name="sort_order" type="number" value="10"></label>
        <label>Trạng thái<select name="is_active"><option value="true">Đang bật</option><option value="false">Tạm tắt</option></select></label>
        <button class="btn primary" type="submit">Lưu/cập nhật giá</button>
      </form>
      <form class="ops-panel ops-form-grid" id="promoForm">
        <div class="span-3"><span class="panel-kicker">Promotion</span><h2>Bật/tắt giao diện giảm giá</h2><p class="sync-note">Mỗi layout dùng một khuyến mãi hiện hành; chọn “Tất cả layout” để tạo ưu đãi toàn hệ thống.</p></div>
        <label class="span-2">Layout<select name="room_type_id"><option value="">Tất cả layout</option>${roomTypeOptions()}</select></label>
        <label>Tiêu đề<input name="title" required placeholder="Ưu đãi trong tuần"></label>
        <label>Giảm %<input name="discount_percent" type="number" min="0" max="100" placeholder="10"></label>
        <label>Giảm tiền<input name="discount_amount" type="number" min="0" step="1000" placeholder="50000"></label>
        <label>Badge<input name="badge_label" placeholder="SALE"></label>
        <label>Bật hiển thị<select name="is_active"><option value="true">Bật</option><option value="false">Tắt</option></select></label>
        <button class="btn primary" type="submit">Lưu khuyến mãi</button>
      </form>
      <div class="ops-panel span-3"><span class="panel-kicker">Current prices</span><h2>Bảng giá hiện có</h2><div class="admin-live-list">${state.prices.map(p => `
        <div class="admin-live-item"><div><strong>${escape(p.room_types?.code || "")} · ${escape(p.package_label)}</strong><small>Gốc ${window.UniteOps.money(p.base_price)}${p.sale_price ? ` · Sale ${window.UniteOps.money(p.sale_price)}` : ""} · ${p.is_active ? "Đang bật" : "Tắt"}</small></div><div class="ops-actions"><button class="btn soft small" data-edit-price="${p.id}">Sửa</button><button class="btn soft small" data-delete-price="${p.id}">Xóa</button></div></div>`).join("") || `<p class="sync-note">Chưa có giá.</p>`}</div></div>
      <div class="ops-panel span-3"><span class="panel-kicker">Current promotions</span><h2>Khuyến mãi hiện có</h2><div class="admin-live-list">${state.promos.map(p => `
        <div class="admin-live-item"><div><strong>${escape(p.room_types?.code || "Tất cả layout")} · ${escape(p.title)}</strong><small>${p.discount_percent ? `Giảm ${p.discount_percent}%` : p.discount_amount ? `Giảm ${window.UniteOps.money(p.discount_amount)}` : "Chưa đặt mức giảm"} · ${p.is_active ? "Đang bật" : "Đang tắt"}</small></div><div class="ops-actions"><button class="btn soft small" data-edit-promo="${p.id}">Sửa</button><button class="btn soft small" data-delete-promo="${p.id}">Xóa</button></div></div>`).join("") || `<p class="sync-note">Chưa có khuyến mãi.</p>`}</div></div>
    </section>`;

  const renderImages = () => `
    <section class="ops-layout">
      <form class="ops-panel ops-form-grid" id="imageForm">
        <div class="span-3"><span class="panel-kicker">Images</span><h2>Upload ảnh phòng lên Supabase Storage</h2></div>
        <label class="span-2">Layout<select name="room_type_id" required>${roomTypeOptions(state.selectedRoomType)}</select></label>
        <label>Ảnh<input name="images" type="file" accept="image/*" multiple required></label>
        <div class="span-3 image-dropzone" id="imageDropzone">Kéo thả ảnh vào đây hoặc chọn file ở trên. Ảnh sẽ upload vào bucket room-images.</div>
        <button class="btn primary" type="submit">Upload ảnh</button>
      </form>
      <div class="ops-panel"><span class="panel-kicker">Sort</span><h2>Kéo/sắp thứ tự ảnh</h2><label>Chọn layout<select id="imageRoomFilter"><option value="">Tất cả</option>${roomTypeOptions(state.selectedRoomType)}</select></label><div class="image-sort-grid" id="imageGrid">${renderImageCards()}</div></div>
    </section>`;

  const renderImageCards = () => {
    const rows = state.images.filter(img => !state.selectedRoomType || img.room_type_id === state.selectedRoomType);
    return rows.map((img, index) => `<div class="image-sort-card" draggable="true" data-image-id="${img.id}"><img src="${escape(img.public_url || img.image_url || img.storage_path)}" alt=""><footer><button type="button" data-move-image="${img.id}" data-dir="-1">↑</button><small>#${img.sort_order ?? index}</small><button type="button" data-move-image="${img.id}" data-dir="1">↓</button><button type="button" data-delete-image="${img.id}">X</button></footer></div>`).join("") || `<p class="sync-note">Chưa có ảnh live cho layout này.</p>`;
  };

  const renderAccounts = () => `
    <section class="ops-layout">
      <form class="ops-panel ops-form-grid" id="accountForm">
        <div class="span-3"><span class="panel-kicker">Super Admin</span><h2>Quản lý tài khoản vận hành</h2><p class="sync-note">Tạo user Auth nên làm trong Supabase Authentication. Form này dùng để gán quyền cho User ID đã có.</p></div>
        <label>User ID<input name="user_id" required placeholder="UUID trong Authentication Users"></label>
        <label>Email<input name="email" type="email" required></label>
        <label>Họ tên<input name="full_name" placeholder="Tên nhân sự"></label>
        <label>Vai trò<select name="role"><option value="super_admin">Super Admin</option><option value="admin">Admin tổng</option><option value="cskh">CSKH</option><option value="accountant">Kế toán</option></select></label>
        <label>Trạng thái<select name="is_active"><option value="true">Hoạt động</option><option value="false">Khóa</option></select></label>
        <button class="btn primary" type="submit">Lưu quyền</button>
      </form>
      <div class="ops-panel" id="profileList"><span class="panel-kicker">Accounts</span><h2>Tài khoản</h2><div class="admin-live-list" id="profileRows">${state.profiles.map(p=>`<div class="admin-live-item"><div><strong>${escape(p.full_name||p.email)}</strong><small>${escape(p.email)} · <span class="role-badge">${escape(p.role)}</span> · ${p.is_active?"Hoạt động":"Khóa"}</small></div><button class="btn soft small" type="button" data-edit-profile="${p.id}">Sửa</button></div>`).join("") || `<p class="sync-note">Chưa có tài khoản được gán quyền.</p>`}</div></div>
    </section>`;

  const render = () => {
    const mount = $("#adminLiveMount"); if (!mount) return;
    const tabs = { branches:"Chi nhánh", layouts:"Layout/phòng", prices:"Giá & KM", images:"Ảnh phòng", ...(window.UniteAuth?.hasRole?.(["super_admin"]) ? { accounts:"Tài khoản" } : {}) };
    if (!tabs[state.tab]) state.tab = "branches";
    mount.innerHTML = `<div class="ops-actions" style="justify-content:space-between"><span class="live-state" id="adminLiveState">Live Supabase</span><button class="btn soft small" type="button" id="reloadAdminLive">Tải lại</button></div><div class="admin-live-tabs">${Object.entries(tabs).map(([key,label]) => `<button type="button" data-tab="${key}" class="${state.tab===key?"active":""}">${label}</button>`).join("")}</div><div>${state.tab==="branches"?renderBranches():state.tab==="layouts"?renderLayouts():state.tab==="prices"?renderPrices():state.tab==="images"?renderImages():renderAccounts()}</div>`;
    bind();
  };

  const fillForm = (form, data) => Object.entries(data).forEach(([k,v]) => { if (form.elements[k]) form.elements[k].value = v ?? ""; });

  const bind = () => {
    $("#reloadAdminLive")?.addEventListener("click", loadAll);
    $$("[data-tab]").forEach(btn => btn.addEventListener("click", () => { state.tab = btn.dataset.tab; render(); }));

    $("#branchForm")?.addEventListener("submit", async e => { e.preventDefault(); const f=e.currentTarget; const payload={ name:f.name.value.trim(), slug:f.slug.value.trim(), area:f.area.value.trim(), public_address:f.public_address.value.trim(), sort_order:Number(f.sort_order.value||0), is_active:f.is_active.value==="true" }; await upsert("branches", payload, f.id.value || null); await loadAll(); });
    $$("[data-edit-branch]").forEach(btn => btn.addEventListener("click", () => { const b=state.branches.find(x=>x.id===btn.dataset.editBranch); state.tab="branches"; render(); fillForm($("#branchForm"), b); }));
    $$("[data-delete-branch]").forEach(btn => btn.addEventListener("click", async () => { if(confirm("Xóa chi nhánh này?")){ await remove("branches", btn.dataset.deleteBranch); await loadAll(); } }));

    $("#layoutForm")?.addEventListener("submit", async e => { e.preventDefault(); const f=e.currentTarget; const payload={ branch_id:f.branch_id.value, code:f.code.value.trim(), name:f.name.value.trim(), category:f.category.value.trim(), price_tier:f.price_tier.value, inventory_count:Number(f.inventory_count.value||0), vibe:f.vibe.value.trim(), description:f.description.value.trim(), status:f.status.value, is_published:f.status.value!=="hidden" }; const rows=await upsert("room_types", payload, f.id.value||null); const saved=(Array.isArray(rows)?rows[0]:rows); await ensureUnits(saved || f.id.value, payload.inventory_count); await loadAll(); });
    $$("[data-edit-layout]").forEach(btn => btn.addEventListener("click", () => { const r=state.roomTypes.find(x=>x.id===btn.dataset.editLayout); state.tab="layouts"; render(); fillForm($("#layoutForm"), r); }));
    $$("[data-delete-layout]").forEach(btn => btn.addEventListener("click", async () => { if(confirm("Xóa layout này?")){ await remove("room_types", btn.dataset.deleteLayout); await loadAll(); } }));

    $("#priceForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      const f=e.currentTarget;
      const existing=state.prices.find(p => p.room_type_id===f.room_type_id.value && p.package_code===f.package_code.value && !p.starts_at && !p.ends_at);
      await upsert("room_prices", { room_type_id:f.room_type_id.value, package_code:f.package_code.value, package_label:f.package_label.value || f.package_code.options[f.package_code.selectedIndex].text, base_price:Number(f.base_price.value||0), sale_price:f.sale_price.value?Number(f.sale_price.value):null, sort_order:Number(f.sort_order.value||0), is_active:f.is_active.value==="true" }, existing?.id || null);
      await loadAll();
    });
    $$("[data-edit-price]").forEach(btn => btn.addEventListener("click", () => { const row=state.prices.find(x=>x.id===btn.dataset.editPrice); if(!row) return; fillForm($("#priceForm"), row); }));
    $$("[data-delete-price]").forEach(btn => btn.addEventListener("click", async () => { if(confirm("Xóa giá này?")){ await remove("room_prices", btn.dataset.deletePrice); await loadAll(); } }));
    $("#promoForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      const f=e.currentTarget;
      const roomTypeId=f.room_type_id.value || null;
      const matches=state.promos.filter(p => (p.room_type_id || null) === roomTypeId);
      const existing=matches[0];
      for (const oldPromo of matches.slice(1)) await upsert("promotions", { is_active:false }, oldPromo.id);
      await upsert("promotions", { room_type_id:roomTypeId, title:f.title.value.trim(), discount_percent:f.discount_percent.value?Number(f.discount_percent.value):null, discount_amount:f.discount_amount.value?Number(f.discount_amount.value):null, badge_label:f.badge_label.value.trim(), show_badge:true, is_active:f.is_active.value==="true" }, existing?.id || null);
      await loadAll();
    });
    $$("[data-edit-promo]").forEach(btn => btn.addEventListener("click", () => { const row=state.promos.find(x=>x.id===btn.dataset.editPromo); if(!row) return; fillForm($("#promoForm"), { ...row, room_type_id:row.room_type_id || "" }); }));
    $$("[data-delete-promo]").forEach(btn => btn.addEventListener("click", async () => { if(confirm("Xóa khuyến mãi này?")){ await remove("promotions", btn.dataset.deletePromo); await loadAll(); } }));

    $("#imageRoomFilter")?.addEventListener("change", e => { state.selectedRoomType=e.target.value; render(); });
    $("#imageForm")?.addEventListener("submit", async e => { e.preventDefault(); const f=e.currentTarget; const files=[...f.images.files]; const type=state.roomTypes.find(r=>r.id===f.room_type_id.value); for (const file of files) { const uploaded=await window.UniteOps.uploadFileAsync(window.UNITE_SUPABASE_CONFIG.roomImageBucket || "room-images", file, `rooms/${type?.code || f.room_type_id.value}`); await upsert("room_images", { room_type_id:f.room_type_id.value, storage_path:uploaded.path, public_url:uploaded.url, alt:type?.name || "Room image", sort_order:state.images.filter(i=>i.room_type_id===f.room_type_id.value).length + 1, is_cover:false, is_active:true }); } state.selectedRoomType=f.room_type_id.value; await loadAll(); });
    $$("[data-move-image]").forEach(btn => btn.addEventListener("click", async () => { const img=state.images.find(i=>i.id===btn.dataset.moveImage); const rows=state.images.filter(i=>i.room_type_id===img.room_type_id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)); const idx=rows.findIndex(i=>i.id===img.id); const next=rows[idx + Number(btn.dataset.dir)]; if(!next) return; await upsert("room_images", { sort_order:next.sort_order }, img.id); await upsert("room_images", { sort_order:img.sort_order }, next.id); await loadAll(); }));
    $$("[data-delete-image]").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("Xóa ảnh này khỏi danh sách và Storage?")) return;
      const image = state.images.find(row => row.id === btn.dataset.deleteImage);
      if (image?.storage_path) await window.UniteOps.deleteFileAsync(window.UNITE_SUPABASE_CONFIG.roomImageBucket || "room-images", image.storage_path);
      await remove("room_images", btn.dataset.deleteImage);
      await loadAll();
    }));

    $("#accountForm")?.addEventListener("submit", async e => { e.preventDefault(); const f=e.currentTarget; const userId=f.user_id.value.trim(); const existing=state.profiles.find(p=>p.user_id===userId); await upsert("app_profiles", { user_id:userId, email:f.email.value.trim(), full_name:f.full_name.value.trim(), role:f.role.value, is_active:f.is_active.value==="true" }, existing?.id || null); await loadAll(); alert("Đã lưu quyền. Nếu user chưa tồn tại trong Authentication thì tạo user trong Supabase trước."); });
    $$("[data-edit-profile]").forEach(btn => btn.addEventListener("click", () => { const row=state.profiles.find(x=>x.id===btn.dataset.editProfile); if(row) fillForm($("#accountForm"), row); }));
  };

  const mountBase = () => {
    const main = document.querySelector("main.admin-page") || document.querySelector("main");
    if (!main || document.querySelector("#adminLiveMount")) return;
    const section = document.createElement("section");
    section.className = "ops-panel";
    section.style.margin = "24px clamp(16px, 4vw, 48px) 48px";
    section.innerHTML = `<span class="panel-kicker">Live operations</span><h2>Quản trị Supabase trực tiếp</h2><p class="sync-note">Phần này không đổi bố cục public; chỉ thêm bảng vận hành để admin cập nhật chi nhánh, layout, giá, khuyến mãi, ảnh và quyền tài khoản.</p><div id="adminLiveMount"></div>`;
    main.prepend(section);
  };

  window.addEventListener("unite:auth-ready", () => { document.body.classList.add("live-admin-ready"); mountBase(); loadAll(); });
  document.addEventListener("DOMContentLoaded", () => window.UniteAuth?.require(["super_admin", "admin"]));
})();
