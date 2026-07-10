// UNITESTAYCATION/js/luxury-effects.js
// COMPLETE V8 FINAL
// Logo nền đứng im. Chỉ tô màu/đổi màu nhẹ theo tiến độ cuộn trang.
// Dùng logo local: logo/logo.png.

(() => {
  const LOGO_URL = "logo/logo.png";
  const root = document.documentElement;
  let ticking = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const absoluteLogoUrl = () => new URL(LOGO_URL, window.location.href).href;

  const PALETTES = {
    dark: {
      base: "rgba(255, 246, 225, .060)",
      fill1: "rgba(255, 246, 225, .42)",
      fill2: "rgba(204, 166, 96, .44)",
      fill3: "rgba(122, 0, 0, .16)",
      glow: "rgba(204, 166, 96, .045)",
      shadow: "rgba(0, 0, 0, .12)",
      veil2: "rgba(122, 0, 0, .030)",
      opacity: .30
    },
    light: {
      base: "rgba(122, 0, 0, .052)",
      fill1: "rgba(122, 0, 0, .46)",
      fill2: "rgba(188, 145, 73, .40)",
      fill3: "rgba(255, 239, 205, .16)",
      glow: "rgba(122, 0, 0, .045)",
      shadow: "rgba(78, 0, 8, .10)",
      veil2: "rgba(90, 0, 8, .018)",
      opacity: .30
    },
    rules: {
      base: "rgba(122, 0, 0, .056)",
      fill1: "rgba(122, 0, 0, .50)",
      fill2: "rgba(166, 112, 58, .38)",
      fill3: "rgba(255, 239, 205, .14)",
      glow: "rgba(122, 0, 0, .052)",
      shadow: "rgba(78, 0, 8, .11)",
      veil2: "rgba(122, 0, 0, .020)",
      opacity: .32
    },
    contact: {
      base: "rgba(255, 246, 225, .052)",
      fill1: "rgba(255, 246, 225, .40)",
      fill2: "rgba(204, 166, 96, .40)",
      fill3: "rgba(122, 0, 0, .13)",
      glow: "rgba(204, 166, 96, .040)",
      shadow: "rgba(0, 0, 0, .11)",
      veil2: "rgba(122, 0, 0, .025)",
      opacity: .28
    }
  };

  const detectPalette = () => {
    const pointX = Math.round(window.innerWidth * 0.72);
    const pointY = Math.round(window.innerHeight * 0.50);
    const element = document.elementFromPoint(pointX, pointY);
    const section = element?.closest?.("section, main, header");

    if (!section) return PALETTES.light;

    if (section.classList.contains("hero-cinematic") || section.classList.contains("reel-section")) {
      return PALETTES.dark;
    }

    if (section.id === "rules" || section.classList.contains("rules-section")) {
      return PALETTES.rules;
    }

    if (section.id === "contact" || section.classList.contains("contact-section")) {
      return PALETTES.contact;
    }

    return PALETTES.light;
  };

  const replaceInlineLogos = () => {
    const logoAbs = absoluteLogoUrl();

    document
      .querySelectorAll('img[src*="logo-staycation"], .brand-logo img, .hero-logo.image-logo img, .rules-brand.image-logo img')
      .forEach((img) => {
        img.src = logoAbs;
        img.removeAttribute("srcset");
      });
  };

  const ensureBackgroundStack = () => {
    let stack = document.querySelector(".us-bg-stack");
    if (stack) return stack;

    stack = document.createElement("div");
    stack.className = "us-bg-stack";
    stack.setAttribute("aria-hidden", "true");
    stack.innerHTML = `
      <div class="us-scroll-logo-bg">
        <div class="us-logo-aura"></div>
        <div class="us-logo-shell">
          <div class="us-logo-base"></div>
          <div class="us-logo-fill"></div>
          <div class="us-logo-shine"></div>
        </div>
      </div>
      <div class="us-blur-veil"></div>
    `;

    document.body.prepend(stack);
    root.style.setProperty("--us-logo-url", `url("${absoluteLogoUrl()}")`);
    return stack;
  };

  const updateLogoByScroll = () => {
    ensureBackgroundStack();
    replaceInlineLogos();

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = clamp(window.scrollY / maxScroll, 0, 1);
    const palette = detectPalette();

    const fill = progress * 100;

    root.style.setProperty("--us-logo-fill", `${fill.toFixed(2)}%`);
    root.style.setProperty("--us-logo-opacity", palette.opacity);
    root.style.setProperty("--us-logo-base", palette.base);
    root.style.setProperty("--us-logo-fill-1", palette.fill1);
    root.style.setProperty("--us-logo-fill-2", palette.fill2);
    root.style.setProperty("--us-logo-fill-3", palette.fill3);
    root.style.setProperty("--us-logo-shadow", palette.shadow);
    root.style.setProperty("--us-logo-glow", palette.glow);
    root.style.setProperty("--us-veil-2", palette.veil2);

    ticking = false;
  };

  const requestTick = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateLogoByScroll);
      ticking = true;
    }
  };

  const start = () => {
    replaceInlineLogos();
    ensureBackgroundStack();
    updateLogoByScroll();

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", requestTick);

    setTimeout(replaceInlineLogos, 300);
    setTimeout(replaceInlineLogos, 1000);
    setTimeout(updateLogoByScroll, 1200);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
