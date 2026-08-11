const highlightCurrentNav = () => {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll('.top-nav a').forEach(a => {
    const target = (a.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop();
    const isCurrent = target === `${page}.html`;
    a.classList.toggle('active', isCurrent);
    if (isCurrent) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
};

const applyRoleNavigation = () => {
  const role = window.UniteAuth?.profile?.()?.role;
  const rolePages = {
    accountant: new Set(['dashboard.html']),
    cskh: new Set(['cskh.html'])
  };
  const allowedPages = rolePages[role];
  if (allowedPages) {
    document.querySelectorAll('.top-nav a').forEach(a => {
      const target = (a.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop();
      if (['admin.html', 'dashboard.html', 'cskh.html'].includes(target) && !allowedPages.has(target)) a.remove();
    });
  }
  highlightCurrentNav();
};

const mountResponsiveOpsNav = () => {
  const nav = document.querySelector('.site-header .top-nav') || document.querySelector('body > .top-nav');
  if (!nav || nav.dataset.responsiveMount === 'ready') return;
  nav.dataset.responsiveMount = 'ready';
  const home = document.createComment('ops-nav-home');
  nav.parentNode?.insertBefore(home, nav);
  const media = window.matchMedia('(max-width: 900px)');
  const sync = () => {
    if (media.matches) {
      if (nav.parentNode !== document.body) document.body.appendChild(nav);
    } else if (home.parentNode && nav.previousSibling !== home) {
      home.parentNode.insertBefore(nav, home.nextSibling);
    }
  };
  sync();
  if (typeof media.addEventListener === 'function') media.addEventListener('change', sync);
  else if (typeof media.addListener === 'function') media.addListener(sync);
};

window.addEventListener('unite:auth-ready', applyRoleNavigation);

document.addEventListener("DOMContentLoaded", () => {
  mountResponsiveOpsNav();
  highlightCurrentNav();
  if (window.UniteAuth?.profile?.()) applyRoleNavigation();

  const bellBtn = document.getElementById("bellNotificationBtn");
  const bellBadge = document.getElementById("bellBadge");
  if (!bellBtn || !bellBadge) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const playNotificationSound = () => {
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.3);
  };

  let lastCount = -1;

  const checkNotifications = async () => {
    if (!window.UniteOps || !window.UniteOps.loadBookingsAsync) return;
    try {
      const { ok, rows } = await window.UniteOps.loadBookingsAsync();
      if (ok && rows) {
        const newBookings = rows.filter(r => r.status === 'new');
        const count = newBookings.length;
        if (count > 0) {
          bellBadge.textContent = count;
          bellBadge.style.display = 'block';
          bellBtn.classList.add('ringing');
        } else {
          bellBadge.style.display = 'none';
          bellBtn.classList.remove('ringing');
        }

        if (count > lastCount && lastCount !== -1) {
          playNotificationSound();
          if (Notification.permission === 'granted') {
             new Notification("Có yêu cầu đặt phòng mới! 🎉", {
               body: `Khách: ${newBookings[0]?.customerName || 'Mới'}`
             });
          }
        }
        lastCount = count;
      }
    } catch(e) {}
  };

  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    bellBtn.addEventListener('click', () => Notification.requestPermission());
  }
  
  bellBtn.addEventListener('click', () => {
    if(document.body.dataset.page !== 'cskh') {
      window.location.href = 'cskh.html?status=new';
    } else {
      const statusFilter = document.getElementById('cskhStatusFilter');
      if (statusFilter) {
        statusFilter.value = 'new';
        statusFilter.dispatchEvent(new Event('change', { bubbles:true }));
        document.getElementById('bookingList')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  setInterval(checkNotifications, 15000);
  setTimeout(checkNotifications, 2000);
});

window.checkSupabaseHealth = async (btn) => {
  btn.textContent = "Đang kiểm tra...";
  btn.disabled = true;
  const textEl = document.getElementById("healthStatusText");
  textEl.innerHTML = "Đang đo độ trễ và tính toán dung lượng Storage...";
  
  try {
    const start = Date.now();
    await fetch(window.UNITE_SUPABASE_CONFIG.url + "/rest/v1/", { method: "GET", headers: { "apikey": window.UNITE_SUPABASE_CONFIG.anonKey } });
    const ping = Date.now() - start;
    let pingStatus = ping < 150 ? "🟢 Rất tốt" : ping < 350 ? "🟡 Bình thường" : "🔴 Đang tải nặng";
    
    const bucket = window.UNITE_SUPABASE_CONFIG.paymentBillBucket || "payment-bills";
    let totalBytes = 0;
    let fileCount = 0;
    
    const res = await fetch(window.UNITE_SUPABASE_CONFIG.url + "/storage/v1/object/list/" + bucket, {
      method: "POST",
      headers: { 
        "apikey": window.UNITE_SUPABASE_CONFIG.anonKey, 
        "Authorization": "Bearer " + (window.UniteAuth?.session?.()?.access_token || window.UNITE_SUPABASE_CONFIG.anonKey),
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 })
    });
    
    if (res.ok) {
      const files = await res.json();
      files.forEach(f => {
        if (f.metadata && f.metadata.size) {
           totalBytes += f.metadata.size;
           fileCount++;
        }
      });
    } else {
      throw new Error("Không thể đọc Storage (Có thể bucket chưa tạo hoặc lỗi quyền).");
    }
    
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    const freeMb = (1024 - mb).toFixed(2);
    
    textEl.innerHTML = `
      <div style="margin-top:10px;background:#f9f9f9;padding:12px;border-radius:8px;border:1px solid #eee;">
        <div style="margin-bottom:6px;"><b>Độ trễ API:</b> ${ping}ms (${pingStatus})</div>
        <div style="margin-bottom:6px;"><b>Dung lượng Bill:</b> ${mb} MB / 1024 MB</div>
        <div style="margin-bottom:6px;"><b>Số lượng File:</b> ${fileCount} files</div>
        <div style="font-size:12px;color:#2e7d32;margin-top:8px;"><i>*Gói Free còn trống ${freeMb} MB (Đủ chứa ~${Math.floor(freeMb/0.2)} ảnh nữa).</i></div>
      </div>
    `;
  } catch (error) {
    textEl.innerHTML = `<span style="color:#e53935;"><b>Lỗi:</b> ${error.message}</span>`;
  } finally {
    btn.textContent = "Kiểm tra lại";
    btn.disabled = false;
  }
};
