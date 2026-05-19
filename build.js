/**
 * build.js — 将配置 + CSS + JS 打包为完全静态的网站
 *
 * 用法: node build.js
 * 输出: docs/ 目录（单文件 index.html，零依赖即可浏览）
 *
 * 渲染逻辑由 js/main.js 统一处理，
 * 此处只负责「烧录」数据和样式。
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "docs");

// 读取源文件
const defaults = JSON.parse(fs.readFileSync(path.join(ROOT, "defaults.json"), "utf-8"));
const userConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf-8"));
const css = fs.readFileSync(path.join(ROOT, "css", "style.css"), "utf-8");
const js = fs.readFileSync(path.join(ROOT, "js", "main.js"), "utf-8");
const indexHTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");

// ========== 深合并（数组按 id 匹配） ==========

function deepMerge(def, cfg) {
  if (!cfg || typeof cfg !== "object") return def;
  if (!def || typeof def !== "object") return cfg;

  if (Array.isArray(def) && Array.isArray(cfg)) {
    // 数组项有 id → 按 id 匹配合并
    if (cfg.length > 0 && cfg[0] && typeof cfg[0] === "object" && cfg[0].id) {
      return mergeArraysById(def, cfg);
    }
    return cfg.length ? cfg : def;
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

function mergeArraysById(def, cfg) {
  const result = [];
  const defMap = {};
  def.forEach((item) => {
    if (item && item.id) defMap[item.id] = item;
  });

  def.forEach((item) => {
    if (!item || !item.id) { result.push(item); return; }
    const cfgItem = cfg.find((c) => c && c.id === item.id);
    if (cfgItem) {
      if (cfgItem._delete) return;
      result.push(deepMerge(item, cfgItem));
    } else {
      result.push(item);
    }
  });

  cfg.forEach((item) => {
    if (!item || !item.id || item._delete) return;
    if (!defMap[item.id]) result.push(item);
  });

  return result;
}

// 合并配置
const config = deepMerge(defaults, userConfig);
const { theme, site } = config;

// ========== 生成 CSS 变量块 ==========

const themeVars = `
/* === 配色（从 config 注入）=== */
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
}`;

// ========== 生成 HTML ==========

// 把 <link> 替换为内联 style（themeVars 放在 CSS 之后，覆盖默认值）
// 把 <script> 替换为内联 script（带 __CONFIG__）
const html = indexHTML
  .replace(
    '<link rel="stylesheet" href="css/style.css">',
    "<style>\n" + css + "\n" + themeVars + "\n  </style>"
  )
  .replace(
    '<script src="js/main.js"></script>',
    "<script>window.__CONFIG__ = " + JSON.stringify(config) + ";\n" + js + "\n</script>"
  );

// 设置页面标题和描述（静态后备）
const titleMeta = site.title || "Portfolio";
const descMeta = site.description || "";

let finalHTML = html
  .replace("<title>Portfolio</title>", "<title>" + escAttr(titleMeta) + "</title>")
  .replace(
    '<meta name="description" content="个人作品集">',
    '<meta name="description" content="' + escAttr(descMeta) + '">'
  );

// ========== 输出 ==========

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

fs.writeFileSync(path.join(DIST, "index.html"), finalHTML, "utf-8");

// 复制 images 目录
const imagesDir = path.join(ROOT, "images");
if (fs.existsSync(imagesDir)) {
  fs.mkdirSync(path.join(DIST, "images"), { recursive: true });
  fs.readdirSync(imagesDir).forEach((file) => {
    if (file === ".gitkeep") return;
    fs.copyFileSync(path.join(imagesDir, file), path.join(DIST, "images", file));
  });
}

console.log("\n  静态版本已生成: docs/");
console.log("  打开 docs/index.html 即可预览");
console.log("  将 docs/ 目录部署到任意静态托管即可分享\n");

function escAttr(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
