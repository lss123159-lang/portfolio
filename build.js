/**
 * build.js — 将 config.json 打包为完全静态的网站
 *
 * 用法: node build.js
 * 输出: docs/ 目录，可直接打开或部署到任何静态托管
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "docs");

// 读取配置
const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, "defaults.json"), "utf-8"));
const userConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf-8"));
const css = fs.readFileSync(path.join(ROOT, "css", "style.css"), "utf-8");

// 深合并
function deepMerge(def, cfg) {
  if (!cfg || typeof cfg !== "object") return def;
  if (!def || typeof def !== "object") return cfg;
  if (Array.isArray(def) && Array.isArray(cfg)) {
    return cfg.map((item, i) => deepMerge(def[i] || {}, item));
  }
  const result = {};
  for (const key of Object.keys(def)) {
    if (cfg[key] !== undefined && cfg[key] !== "" && cfg[key] !== null) {
      result[key] = deepMerge(def[key], cfg[key]);
    } else {
      result[key] = def[key];
    }
  }
  for (const key of Object.keys(cfg)) {
    if (!(key in def)) result[key] = cfg[key];
  }
  return result;
}

const config = deepMerge(defaults, userConfig);
const { theme, site, nav, hero, works, about, contact } = config;

// ========== 工具函数 ==========

function esc(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ========== SVG 图标 ==========

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

// ========== 渲染各部分 HTML ==========

function renderNav() {
  const logo = esc(nav.logo || "K");
  const links = (nav.links || [])
    .map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)
    .join("");
  return `
  <nav class="nav" id="nav">
    <div class="nav-inner">
      <a href="#hero" class="nav-logo">${logo}</a>
      <ul class="nav-links" id="nav-links">${links}</ul>
      <button class="nav-toggle" id="nav-toggle" aria-label="菜单">
        <span></span><span></span>
      </button>
    </div>
  </nav>`;
}

function renderHero() {
  const greeting = hero.greeting || "你好，我是";
  const name = hero.name || "你的名字";
  const tagline = hero.tagline || "创造简洁、好用、有温度的数字体验。";
  const desc = hero.description || '专注于<span class="text-accent">产品设计</span>与<span class="text-accent">前端开发</span>';
  const videoHTML = hero.videoEnabled && hero.video
    ? `<div class="hero-video-wrap">
        <video class="hero-video" autoplay muted loop playsinline preload="metadata" src="${esc(hero.video)}" poster="${esc(hero.video.replace(/\/[^/]+$/, '/poster.jpg'))}"></video>
        <div class="hero-overlay"></div>
      </div>`
    : "";
  return `
  <section class="hero" id="hero">
    ${videoHTML}
    <div class="hero-content">
      <h1 class="hero-title">${esc(greeting)} <span class="hero-name">${esc(name)}</span></h1>
      <p class="hero-sub">${esc(tagline)}</p>
      <p class="hero-desc">${desc}</p>
    </div>
    <div class="scroll-hint"><span class="scroll-line"></span></div>
  </section>`;
}

function renderWorks() {
  const icons = ["monitor", "layout", "panel", "target"];
  const items = (works.items || [])
    .map((item, i) => {
      const imageHTML = item.image
        ? `<img src="${esc(item.image)}" alt="${esc(item.title)}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div class="work-placeholder">${placeholderSVG(icons[i % icons.length])}</div>`;
      const tags = (item.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

      return `
    <article class="work-card">
      <div class="work-image">${imageHTML}</div>
      <div class="work-info">
        <div class="work-tags">${tags}</div>
        <h3 class="work-title">${esc(item.title)}</h3>
        <p class="work-desc">${esc(item.description)}</p>
      </div>
    </article>`;
    })
    .join("");

  return `
  <section class="section" id="works">
    <div class="section-header">
      <span class="section-tag">${esc(works.tag || "")}</span>
      <h2 class="section-title">${esc(works.title || "")}</h2>
    </div>
    <div class="works-grid">${items}</div>
  </section>`;
}

function renderAbout() {
  const skills = (about.skills || []).map((s) => `<span class="skill-tag">${esc(s)}</span>`).join("");

  const timeline = (about.experience || [])
    .map(
      (exp) => `
    <li class="timeline-item">
      <span class="timeline-dot"></span>
      <div class="timeline-content">
        <span class="timeline-date">${esc(exp.date)}</span>
        <h4 class="timeline-title">${esc(exp.title)}</h4>
        <p class="timeline-desc">${esc(exp.description)}</p>
      </div>
    </li>`
    )
    .join("");

  return `
  <section class="section" id="about">
    <div class="section-header">
      <span class="section-tag">${esc(about.tag || "")}</span>
      <h2 class="section-title">${esc(about.title || "")}</h2>
    </div>
    <div class="about-grid">
      <div class="about-block">
        <h3 class="about-label">技能</h3>
        <div class="skill-tags">${skills}</div>
      </div>
      <div class="about-block">
        <h3 class="about-label">经历</h3>
        <ul class="timeline">${timeline}</ul>
      </div>
    </div>
  </section>`;
}

function renderContact() {
  const links = (contact.links || [])
    .map((link) => {
      const icon = iconSVG(link.icon);
      const isExternal = link.href && (link.href.startsWith("http") || link.href.startsWith("//"));
      return `
      <a href="${esc(link.href)}" class="contact-link"${isExternal ? ' target="_blank" rel="noopener"' : ""}>
        <span class="contact-icon">${icon}</span>
        ${esc(link.label)}
      </a>`;
    })
    .join("");

  return `
  <section class="section" id="contact">
    <div class="section-header">
      <span class="section-tag">${esc(contact.tag || "")}</span>
      <h2 class="section-title">${esc(contact.title || "")}</h2>
    </div>
    <div class="contact-content">
      <p class="contact-text">${contact.text || ""}</p>
      <div class="contact-links">${links}</div>
    </div>
  </section>`;
}

// ========== 构建 HTML ==========

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${esc(site.description || "")}">
  <title>${esc(site.title || "Portfolio")}</title>
  <style>
/* 从 config.json 注入的配色 */
:root {
  --color-bg: ${theme.bg || "#fafaf8"};
  --color-surface: ${theme.surface || "#ffffff"};
  --color-text: ${theme.text || "#1a1a18"};
  --color-text-secondary: ${theme.textSecondary || "#787870"};
  --color-text-muted: ${theme.textMuted || "#b0b0a8"};
  --color-border: ${theme.border || "#e8e6e0"};
  --color-border-light: ${theme.borderLight || "#f0eeea"};
  --color-accent: ${theme.accent || "#8b8578"};
  --color-accent-soft: ${theme.accentSoft || "#f3f1ec"};
}
${css}
  </style>
</head>
<body>
${renderNav()}
  <main>
${renderHero()}
${renderWorks()}
${renderAbout()}
${renderContact()}
  </main>
  <footer class="footer">
    <p>&copy; ${new Date().getFullYear()}. ${esc(site.footer || "")}</p>
  </footer>
  <script>
// ===== 静态版：双语 + 拉环 + 交互 =====
(function () {
  var config = ${JSON.stringify(config)};
  var currentLang = (localStorage.getItem("lang") === "en") ? "en" : "zh";

  function t(obj, key, fb) {
    if (!obj) return fb || "";
    if (currentLang === "en" && obj[key + "_en"]) return obj[key + "_en"];
    return obj[key] || fb || "";
  }

  function escH(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escA(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function iconSVG(type) {
    var icons = {
      email: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg>',
      github: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>'
    };
    return icons[type] || icons.email;
  }

  function renderAll() {
    var c = config, s = c.site, n = c.nav, h = c.hero, w = c.works, a = c.about, ct = c.contact;
    // site
    document.title = t(s, "title", "Portfolio");
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = t(s, "description", "");
    var ft = document.getElementById("footer-text");
    if (ft) ft.textContent = "\\u00a9 " + new Date().getFullYear() + ". " + t(s, "footer", "");
    // nav
    var logo = document.getElementById("nav-logo");
    if (logo) logo.textContent = t(n, "logo", "K");
    var nl = document.getElementById("nav-links");
    if (nl) nl.innerHTML = n.links.map(function(l) { return '<li><a href="' + escA(l.href) + '">' + escH(t(l, "label")) + '</a></li>'; }).join("");
    // hero
    var ht = document.getElementById("hero-title");
    if (ht) ht.innerHTML = escH(t(h, "greeting", "\\u4f60\\u597d\\uff0c\\u6211\\u662f")) + ' <span class="hero-name">' + escH(t(h, "name", "\\u4f60\\u7684\\u540d\\u5b57")) + '</span>';
    var hs = document.getElementById("hero-sub");
    if (hs) hs.textContent = t(h, "tagline", "");
    var hd = document.getElementById("hero-desc");
    if (hd) hd.innerHTML = t(h, "description", "");
    // works
    document.getElementById("works-tag").textContent = t(w, "tag", "");
    document.getElementById("works-title").textContent = t(w, "title", "");
    // about
    document.getElementById("about-tag").textContent = t(a, "tag", "");
    document.getElementById("about-title").textContent = t(a, "title", "");
    var st = document.getElementById("skill-tags");
    if (st) st.innerHTML = a.skills.map(function(s) { return '<span class="skill-tag">' + escH(typeof s === "string" ? s : s.name) + '</span>'; }).join("");
    var tl = document.getElementById("timeline");
    if (tl) tl.innerHTML = a.experience.map(function(exp) {
      return '<li class="timeline-item"><span class="timeline-dot"></span><div class="timeline-content"><span class="timeline-date">' + escH(t(exp, "date")) + '</span><h4 class="timeline-title">' + escH(t(exp, "title")) + '</h4><p class="timeline-desc">' + escH(t(exp, "description")) + '</p></div></li>';
    }).join("");
    // contact
    document.getElementById("contact-tag").textContent = t(ct, "tag", "");
    document.getElementById("contact-title").textContent = t(ct, "title", "");
    document.getElementById("contact-text").innerHTML = t(ct, "text", "");
    var cl = document.getElementById("contact-links");
    if (cl) cl.innerHTML = ct.links.map(function(link) {
      var ext = link.href && (link.href.indexOf("http") === 0);
      return '<a href="' + escA(link.href) + '" class="contact-link"' + (ext ? ' target="_blank" rel="noopener"' : "") + '><span class="contact-icon">' + iconSVG(link.icon) + '</span>' + escH(t(link, "label")) + '</a>';
    }).join("");
  }

  function switchLang() {
    currentLang = currentLang === "zh" ? "en" : "zh";
    localStorage.setItem("lang", currentLang);
    var tab = document.getElementById("lang-tab");
    if (tab) { tab.textContent = currentLang === "zh" ? "EN" : "\\u4e2d"; }
    renderAll();
  }

  // 拉环
  var tab = document.createElement("div");
  tab.className = "lang-tab";
  tab.id = "lang-tab";
  tab.textContent = currentLang === "zh" ? "EN" : "\\u4e2d";
  tab.addEventListener("click", switchLang);
  document.body.appendChild(tab);

  // 交互
  var els = document.querySelectorAll(".work-card, .about-block, .contact-content, .section-header, .timeline-item, .skill-tag");
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  els.forEach(function (el) { el.classList.add("animate"); observer.observe(el); });

  var nav = document.getElementById("nav"), ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(function () { nav.classList.toggle("scrolled", window.scrollY > 60); ticking = false; }); ticking = true; }
  });

  var toggle = document.getElementById("nav-toggle"), links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () { links.classList.toggle("active"); });
    links.addEventListener("click", function (e) { if (e.target.tagName === "A") links.classList.remove("active"); });
    document.addEventListener("click", function (e) { if (!toggle.contains(e.target) && !links.contains(e.target)) links.classList.remove("active"); });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return; var href = a.getAttribute("href");
    if (!href || href === "#") return; var target = document.querySelector(href);
    if (!target) return; e.preventDefault();
    var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) || 64;
    window.scrollTo({ top: target.offsetTop - navH - 16, behavior: "smooth" });
  });
})();
  </script>
</body>
</html>`;

// ========== 输出 ==========

// 清空并创建 docs 目录
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// 写入 index.html
fs.writeFileSync(path.join(DIST, "index.html"), html, "utf-8");

// 复制 images 目录
const imagesDir = path.join(ROOT, "images");
if (fs.existsSync(imagesDir)) {
  fs.mkdirSync(path.join(DIST, "images"), { recursive: true });
  fs.readdirSync(imagesDir).forEach((file) => {
    if (file === ".gitkeep") return;
    fs.copyFileSync(path.join(imagesDir, file), path.join(DIST, "images", file));
  });
}

console.log("\n  静态版本已生成: docs/\n");
console.log("  打开 docs/index.html 即可预览");
console.log("  将 docs/ 目录部署到任意静态托管即可分享\n");
console.log("  推荐部署方式:");
console.log("  - GitHub Pages:  推送 docs/ 到 gh-pages 分支");
console.log("  - Vercel:         vercel dist");
console.log("  - Netlify:        拖拽 docs/ 文件夹上传\n");
