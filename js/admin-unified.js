document.addEventListener("DOMContentLoaded", () => {
  const highlightCurrentNav = () => {
    const page = document.body.dataset.page;
    if (page) {
      document.querySelectorAll('.top-nav a').forEach(a => {
        if (a.getAttribute('href').includes(page)) {
          a.classList.add('active');
        }
      });
    }
  };
  highlightCurrentNav();

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
             new Notification("CÃ³ yÃªu cáº§u Ä‘áº·t phÃ²ng má»›i! ðŸŽ‰", {
               body: `KhÃ¡ch: ${newBookings[0]?.customerName || 'Má»›i'}`
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
      window.location.href = 'cskh.html';
    } else {
      const statusFilter = document.getElementById('cskhStatusFilter');
      if (statusFilter) {
        statusFilter.value = 'new';
        if (window.cskhState) window.cskhState.status = 'new';
        if (window.renderBookings) window.renderBookings();
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

