/**
 * 加载配置并渲染页面
 */
async function init() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    applyTheme(cfg.theme);
    renderSite(cfg.site);
    renderNav(cfg.nav);
    renderHero(cfg.hero);
    renderWorks(cfg.works);
    renderAbout(cfg.about);
    renderContact(cfg.contact);
    setupScrollAnimations();
    setupNavScroll();
    setupMobileMenu();
    setupSmoothScroll();
  } catch (err) {
    console.error("无法加载配置:", err);
    // 显示友好提示
    const hero = document.getElementById("hero");
    if (hero) {
      hero.innerHTML = `
        <div class="hero-content" style="text-align:center;">
          <h1 class="hero-title">请通过服务器访问</h1>
          <p class="hero-sub" style="margin-bottom:20px;">
            在终端运行以下命令启动服务器：
          </p>
          <p style="font-size:16px;background:var(--color-accent-soft);display:inline-block;padding:12px 24px;border-radius:8px;font-family:monospace;margin-bottom:24px;">
            npm start
          </p>
          <p class="hero-desc">
            然后访问 <a href="http://localhost:3000" style="color:var(--color-accent);text-decoration:underline;">http://localhost:3000</a><br>
            管理面板：<a href="http://localhost:3000/admin.html" style="color:var(--color-accent);text-decoration:underline;">http://localhost:3000/admin.html</a>
          </p>
        </div>`;
    }
  }
}

/* ==========================================
   配色注入
   ========================================== */

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  const map = {
    bg: "--color-bg",
    surface: "--color-surface",
    text: "--color-text",
    textSecondary: "--color-text-secondary",
    textMuted: "--color-text-muted",
    border: "--color-border",
    borderLight: "--color-border-light",
    accent: "--color-accent",
    accentSoft: "--color-accent-soft",
  };
  for (const [key, cssVar] of Object.entries(map)) {
    if (theme[key]) root.style.setProperty(cssVar, theme[key]);
  }
}

/* ==========================================
   各区块渲染
   ========================================== */

function renderSite(site) {
  if (!site) return;
  document.title = site.title || "Portfolio";
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = site.description || "";
  const footer = document.getElementById("footer-text");
  if (footer) footer.textContent = `© ${new Date().getFullYear()}. ${site.footer || ""}`;
}

function renderNav(nav) {
  if (!nav) return;
  const logo = document.getElementById("nav-logo");
  if (logo) logo.textContent = nav.logo || "K";

  const linksEl = document.getElementById("nav-links");
  if (!linksEl || !nav.links) return;
  linksEl.innerHTML = nav.links
    .map((l) => `<li><a href="${escAttr(l.href)}">${escHtml(l.label)}</a></li>`)
    .join("");
}

function renderHero(hero) {
  if (!hero) return;
  const titleEl = document.getElementById("hero-title");
  const subEl = document.getElementById("hero-sub");
  const descEl = document.getElementById("hero-desc");

  if (titleEl) {
    titleEl.innerHTML = `${escHtml(hero.greeting || "")} <span class="hero-name">${escHtml(hero.name || "")}</span>`;
  }
  if (subEl) subEl.textContent = hero.tagline || "";
  if (descEl) descEl.innerHTML = hero.description || "";

  // 视频背景
  const video = document.getElementById("hero-video");
  const videoWrap = document.getElementById("hero-video-wrap");
  if (video && videoWrap) {
    if (hero.videoEnabled && hero.video) {
      video.src = hero.video;
      videoWrap.style.display = "block";
    } else {
      videoWrap.style.display = "none";
    }
  }
}

function renderWorks(works) {
  if (!works) return;
  document.getElementById("works-tag").textContent = works.tag || "";
  document.getElementById("works-title").textContent = works.title || "";

  const grid = document.getElementById("works-grid");
  if (!grid || !works.items) return;

  const icons = ["monitor", "layout", "panel", "target"];

  grid.innerHTML = works.items
    .map(
      (item, i) => `
    <article class="work-card">
      <div class="work-image">
        ${item.image
          ? `<img src="${escAttr(item.image)}" alt="${escAttr(item.title)}" style="width:100%;height:100%;object-fit:cover;">`
          : `<div class="work-placeholder">${placeholderSVG(icons[i % icons.length])}</div>`
        }
      </div>
      <div class="work-info">
        <div class="work-tags">
          ${(item.tags || []).map((t) => `<span class="tag">${escHtml(t)}</span>`).join("")}
        </div>
        <h3 class="work-title">${escHtml(item.title)}</h3>
        <p class="work-desc">${escHtml(item.description)}</p>
      </div>
    </article>`
    )
    .join("");
}

function renderAbout(about) {
  if (!about) return;
  document.getElementById("about-tag").textContent = about.tag || "";
  document.getElementById("about-title").textContent = about.title || "";

  const skillsEl = document.getElementById("skill-tags");
  if (skillsEl && about.skills) {
    skillsEl.innerHTML = about.skills
      .map((s) => `<span class="skill-tag">${escHtml(s)}</span>`)
      .join("");
  }

  const timelineEl = document.getElementById("timeline");
  if (timelineEl && about.experience) {
    timelineEl.innerHTML = about.experience
      .map(
        (exp) => `
      <li class="timeline-item">
        <span class="timeline-dot"></span>
        <div class="timeline-content">
          <span class="timeline-date">${escHtml(exp.date)}</span>
          <h4 class="timeline-title">${escHtml(exp.title)}</h4>
          <p class="timeline-desc">${escHtml(exp.description)}</p>
        </div>
      </li>`
      )
      .join("");
  }
}

function renderContact(contact) {
  if (!contact) return;
  document.getElementById("contact-tag").textContent = contact.tag || "";
  document.getElementById("contact-title").textContent = contact.title || "";
  document.getElementById("contact-text").innerHTML = contact.text || "";

  const linksEl = document.getElementById("contact-links");
  if (!linksEl || !contact.links) return;

  linksEl.innerHTML = contact.links
    .map((link) => {
      const icon = iconSVG(link.icon);
      const isExternal =
        link.href && (link.href.startsWith("http") || link.href.startsWith("//"));
      return `
      <a href="${escAttr(link.href)}" class="contact-link"
         ${isExternal ? 'target="_blank" rel="noopener"' : ""}>
        <span class="contact-icon">${icon}</span>
        ${escHtml(link.label)}
      </a>`;
    })
    .join("");
}

/* ==========================================
   SVG 图标
   ========================================== */

function placeholderSVG(type) {
  const icons = {
    monitor:
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    layout:
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="12" r="2"/><path d="M12 6v2M12 16v2M6 12h2M16 12h2"/></svg>',
    panel:
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    target:
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><circle cx="12" cy="12" r="6"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/></svg>',
  };
  return icons[type] || icons.monitor;
}

function iconSVG(type) {
  const icons = {
    email:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg>',
    github:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>',
  };
  return icons[type] || icons.email;
}

/* ==========================================
   HTML 转义
   ========================================== */

function escHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ==========================================
   滚动动画
   ========================================== */

function setupScrollAnimations() {
  const elements = document.querySelectorAll(
    ".work-card, .about-block, .contact-content, .section-header, .timeline-item, .skill-tag"
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  elements.forEach((el) => {
    el.classList.add("animate");
    observer.observe(el);
  });
}

/* ==========================================
   导航栏滚动效果
   ========================================== */

function setupNavScroll() {
  const nav = document.getElementById("nav");
  let ticking = false;

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle("scrolled", window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ==========================================
   移动端菜单
   ========================================== */

function setupMobileMenu() {
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => links.classList.toggle("active"));

  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") links.classList.remove("active");
  });

  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove("active");
    }
  });
}

/* ==========================================
   平滑滚动
   ========================================== */

function setupSmoothScroll() {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    // 只在当前页面的锚点链接上处理
    if (!href || href === "#") return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();

    const navHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--nav-height")
    ) || 64;
    const top = target.offsetTop - navHeight - 16;

    window.scrollTo({ top, behavior: "smooth" });
  });
}

/* ==========================================
   启动
   ========================================== */

document.addEventListener("DOMContentLoaded", init);
