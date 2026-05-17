/**
 * 全局状态
 */
let config = null;
let currentLang = "zh";

/**
 * 双语文本辅助：obj[key] 是中文，obj[key_en] 是英文
 */
function t(obj, key, fallback) {
  if (!obj) return fallback || "";
  if (currentLang === "en" && obj[key + "_en"]) return obj[key + "_en"];
  return obj[key] || fallback || "";
}

/**
 * 加载配置并渲染页面
 */
async function init() {
  try {
    const res = await fetch("/api/config");
    config = await res.json();

    // 从 localStorage 恢复语言偏好
    const saved = localStorage.getItem("lang");
    if (saved === "en") currentLang = "en";

    applyTheme(config.theme);
    renderAll();
    setupPullTab();
    setupScrollAnimations();
    setupNavScroll();
    setupMobileMenu();
    setupSmoothScroll();
  } catch (err) {
    console.error("无法加载配置:", err);
    const hero = document.getElementById("hero");
    if (hero) {
      hero.innerHTML = `
        <div class="hero-content" style="text-align:center;">
          <h1 class="hero-title">请通过服务器访问</h1>
          <p class="hero-sub" style="margin-bottom:20px;">在终端运行以下命令启动服务器：</p>
          <p style="font-size:16px;background:var(--color-accent-soft);display:inline-block;padding:12px 24px;border-radius:8px;font-family:monospace;margin-bottom:24px;">npm start</p>
          <p class="hero-desc">然后访问 <a href="http://localhost:3000" style="color:var(--color-accent);text-decoration:underline;">http://localhost:3000</a></p>
        </div>`;
    }
  }
}

/* ==========================================
   全量渲染
   ========================================== */

function renderAll() {
  renderSite(config.site);
  renderNav(config.nav);
  renderHero(config.hero);
  renderWorks(config.works);
  renderAbout(config.about);
  renderContact(config.contact);
}

/* ==========================================
   语言切换
   ========================================== */

function switchLanguage() {
  currentLang = currentLang === "zh" ? "en" : "zh";
  localStorage.setItem("lang", currentLang);
  updatePullTabLabel();

  // 重新渲染所有文字
  renderAll();

  // 重新初始化滚动动画
  document.querySelectorAll(".animate.visible").forEach((el) => el.classList.remove("animate", "visible"));
  setupScrollAnimations();
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
   各区块渲染（全部使用 t() 取双语文本）
   ========================================== */

function renderSite(site) {
  if (!site) return;
  document.title = t(site, "title", "Portfolio");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = t(site, "description", "");
  const footer = document.getElementById("footer-text");
  if (footer) footer.textContent = `© ${new Date().getFullYear()}. ${t(site, "footer", "")}`;
}

function renderNav(nav) {
  if (!nav) return;
  const logo = document.getElementById("nav-logo");
  if (logo) logo.textContent = t(nav, "logo", "K");
  const linksEl = document.getElementById("nav-links");
  if (!linksEl || !nav.links) return;
  linksEl.innerHTML = nav.links
    .map((l) => `<li><a href="${escAttr(l.href)}">${escHtml(t(l, "label"))}</a></li>`)
    .join("");
}

function renderHero(hero) {
  if (!hero) return;
  const titleEl = document.getElementById("hero-title");
  const subEl = document.getElementById("hero-sub");
  const descEl = document.getElementById("hero-desc");

  const greeting = t(hero, "greeting", "你好，我是");
  const name = t(hero, "name", "你的名字");
  const tagline = t(hero, "tagline", "创造简洁、好用、有温度的数字体验。");
  const desc = t(hero, "description", '专注于<span class="text-accent">产品设计</span>与<span class="text-accent">前端开发</span>');

  if (titleEl) {
    titleEl.innerHTML = `${escHtml(greeting)} <span class="hero-name">${escHtml(name)}</span>`;
  }
  if (subEl) subEl.textContent = tagline;
  if (descEl) descEl.innerHTML = desc;

  // 视频背景
  const video = document.getElementById("hero-video");
  const videoWrap = document.getElementById("hero-video-wrap");
  if (video && videoWrap) {
    if (hero.videoEnabled && hero.video) {
      video.src = hero.video;
      const posterPath = hero.video.replace(/\/[^/]+$/, "/poster.jpg");
      video.setAttribute("poster", posterPath);
      videoWrap.style.display = "block";
    } else {
      videoWrap.style.display = "none";
    }
  }
}

function renderWorks(works) {
  if (!works) return;
  document.getElementById("works-tag").textContent = t(works, "tag", "作品");
  document.getElementById("works-title").textContent = t(works, "title", "近期项目");

  const grid = document.getElementById("works-grid");
  if (!grid || !works.items) return;

  const icons = ["monitor", "layout", "panel", "target"];

  grid.innerHTML = works.items
    .map(
      (item, i) => `
    <article class="work-card">
      <div class="work-image">
        ${item.image
          ? `<img src="${escAttr(item.image)}" alt="${escAttr(t(item, "title"))}" style="width:100%;height:100%;object-fit:cover;">`
          : `<div class="work-placeholder">${placeholderSVG(icons[i % icons.length])}</div>`
        }
      </div>
      <div class="work-info">
        <div class="work-tags">
          ${(item.tags || []).map((tg) => `<span class="tag">${escHtml(tg)}</span>`).join("")}
        </div>
        <h3 class="work-title">${escHtml(t(item, "title"))}</h3>
        <p class="work-desc">${escHtml(t(item, "description"))}</p>
      </div>
    </article>`
    )
    .join("");
}

function renderAbout(about) {
  if (!about) return;
  document.getElementById("about-tag").textContent = t(about, "tag", "关于");
  document.getElementById("about-title").textContent = t(about, "title", "技能与经历");

  const skillsEl = document.getElementById("skill-tags");
  if (skillsEl && about.skills) {
    skillsEl.innerHTML = about.skills
      .map((s) => `<span class="skill-tag">${escHtml(typeof s === "string" ? s : t(s, "name", s))}</span>`)
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
          <span class="timeline-date">${escHtml(t(exp, "date"))}</span>
          <h4 class="timeline-title">${escHtml(t(exp, "title"))}</h4>
          <p class="timeline-desc">${escHtml(t(exp, "description"))}</p>
        </div>
      </li>`
      )
      .join("");
  }
}

function renderContact(contact) {
  if (!contact) return;
  document.getElementById("contact-tag").textContent = t(contact, "tag", "联系");
  document.getElementById("contact-title").textContent = t(contact, "title", "保持联系");
  document.getElementById("contact-text").innerHTML = t(contact, "text", "");

  const linksEl = document.getElementById("contact-links");
  if (!linksEl || !contact.links) return;

  linksEl.innerHTML = contact.links
    .map((link) => {
      const icon = iconSVG(link.icon);
      const isExternal = link.href && (link.href.startsWith("http") || link.href.startsWith("//"));
      return `
      <a href="${escAttr(link.href)}" class="contact-link"
         ${isExternal ? 'target="_blank" rel="noopener"' : ""}>
        <span class="contact-icon">${icon}</span>
        ${escHtml(t(link, "label"))}
      </a>`;
    })
    .join("");
}

/* ==========================================
   拉环装置
   ========================================== */

function setupPullTab() {
  const tab = document.createElement("div");
  tab.className = "lang-tab";
  tab.id = "lang-tab";
  tab.title = currentLang === "zh" ? "Switch to English" : "切换为中文";
  updatePullTabLabel();
  tab.addEventListener("click", switchLanguage);
  tab.addEventListener("mouseenter", () => tab.classList.add("lang-tab-hover"));
  tab.addEventListener("mouseleave", () => tab.classList.remove("lang-tab-hover"));
  document.body.appendChild(tab);
}

function updatePullTabLabel() {
  const tab = document.getElementById("lang-tab");
  if (!tab) return;
  tab.textContent = currentLang === "zh" ? "EN" : "中";
  tab.title = currentLang === "zh" ? "Switch to English" : "切换为中文";
}

/* ==========================================
   SVG 图标
   ========================================== */

function placeholderSVG(type) {
  const icons = {
    monitor: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    layout: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="12" r="2"/><path d="M12 6v2M12 16v2M6 12h2M16 12h2"/></svg>',
    panel: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    target: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><circle cx="12" cy="12" r="6"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/></svg>',
  };
  return icons[type] || icons.monitor;
}

function iconSVG(type) {
  const icons = {
    email: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg>',
    github: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>',
  };
  return icons[type] || icons.email;
}

/* ==========================================
   HTML 转义
   ========================================== */

function escHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escAttr(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--nav-height")
    ) || 64;
    window.scrollTo({ top: target.offsetTop - navHeight - 16, behavior: "smooth" });
  });
}

/* ==========================================
   启动
   ========================================== */

document.addEventListener("DOMContentLoaded", init);
