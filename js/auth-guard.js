// UNITESTAYCATION/js/auth-guard.js
// V15: mandatory login guard with role validation and token refresh.

(() => {
  const AUTH_KEY = "unite-staycation-auth-session-v15";
  const PROFILE_KEY = "unite-staycation-auth-profile-v15";

  const config = () => window.UNITE_SUPABASE_CONFIG || {};
  const baseUrl = () => String(config().url || "").replace(/\/$/, "");
  const anonKey = () => config().anonKey || config().publishableKey || "";
  const configured = () => {
    const url = baseUrl();
    const key = anonKey();
    return Boolean(url && key && !url.includes("PASTE_") && !key.includes("PASTE_"));
  };

  const readJson = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  };
  const writeJson = (key, value) => {
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value));
      else localStorage.removeItem(key);
    } catch {}
  };

  const session = () => readJson(AUTH_KEY);
  const profile = () => readJson(PROFILE_KEY);
  const setSession = (value) => writeJson(AUTH_KEY, value);
  const setProfile = (value) => writeJson(PROFILE_KEY, value);
  const clearLocalAuth = () => { setSession(null); setProfile(null); };

  const tokenExpiredSoon = (value = session()) => {
    const expiresAt = Number(value?.expires_at || 0);
    if (!expiresAt) return false;
    return expiresAt * 1000 <= Date.now() + 60_000;
  };

  const headers = (json = false) => {
    const token = session()?.access_token || anonKey();
    const h = { apikey: anonKey(), Authorization: `Bearer ${token}` };
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const parseResponse = async (res) => {
    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!res.ok) throw new Error(payload?.msg || payload?.message || payload?.error_description || payload?.error || res.statusText);
    return payload;
  };

  const authFetch = async (path, options = {}) => parseResponse(await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: { ...headers(Boolean(options.body)), ...(options.headers || {}) }
  }));

  const restFetch = async (path, options = {}) => parseResponse(await fetch(`${baseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(Boolean(options.body)), ...(options.headers || {}) }
  }));

  const getUserFromSession = () => session()?.user || null;

  const refreshSession = async () => {
    const current = session();
    if (!current?.refresh_token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    const payload = await fetch(`${baseUrl()}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refresh_token })
    }).then(parseResponse);
    setSession(payload);
    return payload;
  };

  const ensureSession = async () => {
    if (!session()?.access_token) return null;
    if (tokenExpiredSoon()) await refreshSession();
    return session();
  };

  const fetchProfile = async () => {
    const user = getUserFromSession();
    if (!user?.id) return null;
    const q = new URLSearchParams({ select: "id,user_id,email,full_name,role,is_active", user_id: `eq.${user.id}`, limit: "1" });
    const rows = await restFetch(`app_profiles?${q.toString()}`);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || row.is_active !== true) {
      setProfile(null);
      return null;
    }
    setProfile(row);
    return row;
  };

  const login = async (email, password) => {
    if (!configured()) throw new Error("Chưa cấu hình Supabase URL/anon key trong js/supabase-config.js.");
    const payload = await authFetch("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setSession(payload);
    try {
      const prof = await fetchProfile();
      if (!prof) throw new Error("Tài khoản đã đăng nhập nhưng chưa được gán quyền hoạt động trong app_profiles.");
      return { session: payload, profile: prof };
    } catch (error) {
      clearLocalAuth();
      throw error;
    }
  };

  const logout = async () => {
    const current = session();
    try {
      if (configured() && current?.access_token) {
        await fetch(`${baseUrl()}/auth/v1/logout`, { method: "POST", headers: { apikey: anonKey(), Authorization: `Bearer ${current.access_token}` } });
      }
    } catch {}
    clearLocalAuth();
    location.reload();
  };

  const hasRole = (roles = []) => {
    const prof = profile();
    if (!session()?.access_token || !prof || prof.is_active !== true) return false;
    if (!roles.length) return true;
    if (prof.role === "super_admin") return true;
    return roles.includes(prof.role);
  };

  const dispatchReady = () => window.dispatchEvent(new CustomEvent("unite:auth-ready", { detail: { session: session(), profile: profile() } }));

  const injectCss = () => {
    if (document.querySelector("#uniteAuthCss")) return;
    const style = document.createElement("style");
    style.id = "uniteAuthCss";
    style.textContent = `
      body.auth-locked > header, body.auth-locked > main, body.auth-locked > footer { filter: blur(10px); pointer-events:none; user-select:none; }
      .auth-modal-backdrop{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:rgba(21,16,15,.58);backdrop-filter:blur(16px)}
      .auth-modal{width:min(520px,100%);border:1px solid rgba(255,255,255,.45);border-radius:34px;background:linear-gradient(135deg,rgba(255,250,241,.96),rgba(247,241,232,.92));box-shadow:0 30px 90px rgba(0,0,0,.28);padding:28px;color:var(--ink,#15100f)}
      .auth-modal .panel-kicker{color:var(--gold,#c8a96a);text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900}
      .auth-modal h2{margin:8px 0 8px;font-family:var(--serif,Georgia,serif);font-size:clamp(34px,7vw,58px);line-height:.96;letter-spacing:-.04em}
      .auth-modal p{margin:0 0 18px;color:var(--gray-brown,#574944);line-height:1.65}
      .auth-modal label{display:grid;gap:7px;margin:12px 0;color:var(--gray-brown,#574944);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .auth-modal input{width:100%;min-height:50px;border:1px solid rgba(122,0,0,.16);border-radius:16px;background:rgba(255,255,255,.72);padding:0 14px;font:inherit;color:var(--ink,#15100f);text-transform:none;letter-spacing:0;font-weight:700}
      .auth-modal .auth-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:16px}
      .auth-error{min-height:20px;color:#9b0000;font-size:13px;font-weight:800;text-transform:none;letter-spacing:0}
      .auth-role-pill{display:inline-flex;min-height:32px;align-items:center;border-radius:999px;border:1px solid rgba(122,0,0,.13);padding:0 12px;background:rgba(122,0,0,.06);color:var(--dark-red,#7a0000);font-size:12px;font-weight:900}
      .auth-topbar{position:fixed;right:18px;bottom:18px;z-index:8000;display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:999px;background:rgba(255,250,241,.92);border:1px solid rgba(122,0,0,.13);box-shadow:0 12px 34px rgba(0,0,0,.12)}
      .auth-topbar span{font-size:12px;font-weight:900;color:var(--dark-red,#7a0000)}
      .auth-topbar button{min-height:34px;border:0;border-radius:999px;padding:0 12px;cursor:pointer;background:rgba(122,0,0,.08);color:var(--dark-red,#7a0000);font-weight:900}
    `;
    document.head.appendChild(style);
  };

  const showTopbar = () => {
    const prof = profile();
    if (!prof || document.querySelector("#uniteAuthTopbar")) return;
    const bar = document.createElement("div");
    bar.id = "uniteAuthTopbar";
    bar.className = "auth-topbar";
    const label = document.createElement("span");
    label.textContent = `${prof.full_name || prof.email || "User"} · ${prof.role || "user"}`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Đăng xuất";
    button.addEventListener("click", logout);
    bar.append(label, button);
    document.body.appendChild(bar);
  };

  const showModal = (roles = [], initialError = "") => {
    injectCss();
    document.body.classList.add("auth-locked");
    document.querySelector("#uniteAuthModal")?.remove();
    const el = document.createElement("div");
    el.id = "uniteAuthModal";
    el.className = "auth-modal-backdrop";
    el.innerHTML = `
      <form class="auth-modal" id="uniteAuthForm">
        <span class="panel-kicker">Unite Staycation Ops</span>
        <h2>Bắt buộc đăng nhập.</h2>
        <p>Admin, CSKH và Dashboard chỉ mở sau khi đăng nhập đúng tài khoản Supabase. Quyền hiện cần: <b>${roles.length ? roles.join(" / ") : "tài khoản hợp lệ"}</b>.</p>
        <label>Email<input name="email" type="email" autocomplete="username" placeholder="Email tài khoản" required></label>
        <label>Mật khẩu<input name="password" type="password" autocomplete="current-password" placeholder="Mật khẩu" required></label>
        <div class="auth-error" id="uniteAuthError"></div>
        <div class="auth-actions">
          <button class="btn primary" type="submit">Đăng nhập</button>
          <button type="button" style="background:transparent;border:1px solid rgba(122,0,0,0.2);border-radius:12px;padding:14px 20px;color:#7a0000;font-weight:700;cursor:pointer;font-size:14px;" onclick="window.UniteAuth.logout().finally(() => { window.location.href = 'index.html'; })">Đăng xuất & Về trang chủ</button>
        </div>
        <div style="margin-top:12px;"><span class="auth-role-pill">Super Admin • Admin • CSKH • Kế toán</span></div>
      </form>`;
    document.body.appendChild(el);
    const error = el.querySelector("#uniteAuthError");
    if (error) error.textContent = initialError;
    el.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const btn = form.querySelector("button[type=submit]");
      error.textContent = "";
      btn.disabled = true;
      btn.textContent = "Đang đăng nhập...";
      try {
        await login(form.email.value.trim(), form.password.value);
        if (!hasRole(roles)) {
          clearLocalAuth();
          throw new Error("Tài khoản này chưa có đúng quyền để vào trang.");
        }
        document.body.classList.remove("auth-locked");
        el.remove();
        showTopbar();
        dispatchReady();
      } catch (err) {
        error.textContent = err.message || String(err);
      } finally {
        btn.disabled = false;
        btn.textContent = "Đăng nhập";
      }
    });
  };

  const requireAuth = async (roles = []) => {
    injectCss();
    if (!configured()) return showModal(roles, "Chưa cấu hình Supabase URL/anon key. Mở js/supabase-config.js để dán thông tin project.");
    if (!session()?.access_token) return showModal(roles);
    try {
      await ensureSession();
      const prof = await fetchProfile();
      if (!prof) throw new Error("Tài khoản chưa được gán quyền hoặc đã bị khóa.");
      if (!hasRole(roles)) throw new Error("Tài khoản này không có quyền truy cập trang hiện tại.");
      document.body.classList.remove("auth-locked");
      showTopbar();
      dispatchReady();
    } catch (error) {
      clearLocalAuth();
      showModal(roles, error.message || "Phiên đăng nhập không hợp lệ.");
    }
  };

  window.UniteAuth = {
    login,
    logout,
    session,
    profile,
    headers,
    restFetch,
    refresh: refreshSession,
    require: requireAuth,
    hasRole,
    ready: (roles = []) => new Promise((resolve) => {
      const done = () => resolve({ session: session(), profile: profile() });
      if (session()?.access_token && hasRole(roles)) return done();
      window.addEventListener("unite:auth-ready", done, { once: true });
    })
  };
})();
