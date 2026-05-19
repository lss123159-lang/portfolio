/**
 * admin/main.js — 管理面板 Schema 驱动系统
 */

// ========== 全局状态 ==========
let config = {};
let defaults = {};
let adminLang = "zh";
let adminToken = "";
let activePanel = "theme";

// ========== 双语辅助 ==========
function lk(baseKey) {
  return adminLang === "en" ? baseKey + "_en" : baseKey;
}

function lov(obj, baseKey) {
  var key = adminLang === "en" ? baseKey + "_en" : baseKey;
  return (obj && obj[key]) ? obj[key] : "";
}

function lv(section, baseKey, fallback) {
  var key = adminLang === "en" ? baseKey + "_en" : baseKey;
  if (typeof section === "string") {
    if (config[section] && config[section][key] !== undefined && config[section][key] !== "") return config[section][key];
    if (defaults[section] && defaults[section][key] !== undefined) return defaults[section][key];
    return fallback || "";
  }
  if (section && section[key] !== undefined && section[key] !== "") return section[key];
  return fallback || "";
}

function valSource(section, baseKey) {
  var key = adminLang === "en" ? baseKey + "_en" : baseKey;
  if (config[section] && config[section][key] !== undefined && config[section][key] !== "") return "config";
  return "defaults";
}

function esc(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ========== Toast ==========
function showToast(msg, type) {
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show " + (type || "");
  clearTimeout(el._timer);
  el._timer = setTimeout(function () { el.classList.remove("show"); }, 2000);
}

// ========== Token / Auth ==========
function getToken() {
  return sessionStorage.getItem("admin_token") || "";
}

function setToken(t) {
  sessionStorage.setItem("admin_token", t);
  adminToken = t;
}

function isAuthed() {
  return !!getToken();
}

function updateAuthStatus() {
  var el = document.getElementById("auth-status");
  if (!el) return;
  if (isAuthed()) {
    el.textContent = "已授权";
    el.className = "status auth-ok";
  } else {
    el.textContent = "未授权";
    el.className = "status auth-no";
  }
}

function showLoginOverlay() {
  document.getElementById("login-overlay").classList.remove("hidden");
  document.getElementById("login-error").textContent = "";
  document.getElementById("login-token").value = "";
  document.getElementById("login-token").focus();
}

function hideLoginOverlay() {
  document.getElementById("login-overlay").classList.add("hidden");
}

function checkTokenThen(fn) {
  if (isAuthed()) { fn(); return; }
  showLoginOverlay();
  // 登录成功后执行
  document.getElementById("login-btn").onclick = function () {
    var t = document.getElementById("login-token").value.trim();
    if (!t) {
      document.getElementById("login-error").textContent = "请输入 token";
      return;
    }
    setToken(t);
    updateAuthStatus();
    hideLoginOverlay();
    fn();
  };
  document.getElementById("login-token").onkeydown = function (e) {
    if (e.key === "Enter") document.getElementById("login-btn").click();
  };
}

// ========== API 请求 ==========
function apiHeaders() {
  var h = { "Content-Type": "application/json" };
  if (adminToken) h["Authorization"] = "Bearer " + adminToken;
  return h;
}

async function loadConfig() {
  try {
    var _a = await Promise.all([
      fetch("/api/defaults"),
      fetch("/api/config"),
    ]);
    defaults = await _a[0].json();
    config = await _a[1].json();
    renderAll();
  } catch (err) {
    showToast("无法加载配置，请确认服务器已启动", "error");
  }
}

async function saveConfig() {
  collectPanelData();
  try {
    var res = await fetch("/api/config", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(config),
    });
    if (res.status === 401) {
      setToken("");
      updateAuthStatus();
      showToast("未授权，请重新登录", "error");
      showLoginOverlay();
      return;
    }
    var data = await res.json();
    if (data.ok) { showToast("已保存", "saved"); }
    else { showToast("保存失败: " + data.error, "error"); }
  } catch (err) {
    showToast("保存失败: " + err.message, "error");
  }
}

async function revertConfig() {
  if (!confirm("确定要撤回所有未保存的修改？将恢复到上次保存的状态。")) return;
  try {
    var res = await fetch("/api/config");
    config = await res.json();
    renderPanel();
    showToast("已恢复到上次保存的状态", "saved");
  } catch (err) {
    showToast("撤回失败: " + err.message, "error");
  }
}

async function previewSite() {
  collectPanelData();
  await saveConfig();
  var w = window.open("/", "_blank");
  if (!w) {
    showToast("弹窗被拦截，请允许本站弹窗或手动打开 http://localhost:3000", "error");
  }
}

async function deploySite() {
  checkTokenThen(async function () {
    collectPanelData();
    await saveConfig();
    showToast("正在构建并部署...");
    try {
      var res = await fetch("/api/deploy", {
        method: "POST",
        headers: apiHeaders(),
      });
      if (res.status === 401) {
        setToken("");
        updateAuthStatus();
        showToast("未授权，请重新登录", "error");
        showLoginOverlay();
        return;
      }
      var result = await res.json();
      if (result.ok) { showToast("已部署上线", "saved"); }
      else { showToast("部署失败: " + result.message, "error"); }
    } catch (err) {
      showToast("部署失败: " + err.message, "error");
    }
  });
}

// ========== 切换语言 ==========
function toggleAdminLang() {
  collectPanelData();
  adminLang = adminLang === "zh" ? "en" : "zh";
  document.getElementById("lang-toggle-btn").textContent = adminLang === "zh" ? "中" : "EN";
  renderPanel();
}

// ========== Panel Schema 定义 ==========
var PANELS = [
  {
    id: "theme",
    title: "配色主题",
    desc: "修改配色后点击右上角「保存更改」，刷新网站即可看到效果。",
    type: "colors",
    section: "theme",
    fields: [
      { key: "bg", label: "页面背景" },
      { key: "surface", label: "卡片背景" },
      { key: "text", label: "主文字色" },
      { key: "textSecondary", label: "次要文字" },
      { key: "textMuted", label: "辅助文字" },
      { key: "border", label: "边框色" },
      { key: "borderLight", label: "浅边框" },
      { key: "accent", label: "强调色" },
      { key: "accentSoft", label: "浅强调色" },
    ]
  },
  {
    id: "nav",
    title: "导航设置",
    desc: "修改顶部导航栏的 Logo 和链接。",
    section: "nav",
    fields: [
      { key: "logo", label: "Logo 文字", type: "text", maxlength: 8, bilingual: true },
    ],
    lists: [
      {
        key: "links",
        label: "导航链接",
        itemDefaults: { label: "新链接", href: "#" },
        layout: "row",
        itemFields: [
          { key: "label", label: "显示文字", type: "text", bilingual: true },
          { key: "href", label: "链接目标", type: "text" },
        ]
      }
    ]
  },
  {
    id: "hero",
    title: "Hero 区域",
    desc: "首页第一屏的标题和介绍语。留空则使用默认值。",
    section: "hero",
    fields: [
      { key: "greeting", label: "问候语", type: "text", bilingual: true },
      { key: "name", label: "名字", type: "text", bilingual: true },
      { key: "tagline", label: "副标题", type: "text", bilingual: true },
      { key: "description", label: "详细介绍", type: "textarea", bilingual: true, html: true, hint: "支持 HTML，可使用 <span class=\"text-accent\">文字</span> 添加强调色" },
    ],
    extra: "hero",
  },
  {
    id: "works",
    title: "作品展示",
    desc: "管理作品集区域的内容。",
    section: "works",
    fields: [
      { key: "tag", label: "区块标签", type: "text", bilingual: true },
      { key: "title", label: "区块标题", type: "text", bilingual: true },
    ],
    fieldLayout: "row",
    lists: [
      {
        key: "items",
        label: "作品列表",
        itemDefaults: { tags: ["标签"], title: "新项目", description: "项目描述", image: "" },
        itemFields: [
          { key: "tags", label: "标签（逗号分隔）", type: "tags" },
          { key: "title", label: "项目名称", type: "text", bilingual: true },
          { key: "description", label: "项目描述", type: "textarea", bilingual: true },
          { key: "image", label: "图片路径（可选，留空显示占位图）", type: "text", placeholder: "如：images/my-project.jpg" },
        ]
      }
    ]
  },
  {
    id: "about",
    title: "关于页面",
    desc: "管理技能标签和经历时间线。",
    section: "about",
    fields: [
      { key: "tag", label: "区块标签", type: "text", bilingual: true },
      { key: "title", label: "区块标题", type: "text", bilingual: true },
      { key: "skills", label: "技能标签（逗号分隔）", type: "skills", bilingual: false },
    ],
    fieldLayout: "row",
    lists: [
      {
        key: "experience",
        label: "经历",
        itemDefaults: { date: "202X", title: "新经历", description: "描述" },
        itemFields: [
          { key: "date", label: "时间", type: "text", bilingual: true },
          { key: "title", label: "标题", type: "text", bilingual: true },
          { key: "description", label: "描述", type: "text", bilingual: true },
        ]
      }
    ]
  },
  {
    id: "contact",
    title: "联系方式",
    desc: "管理联系区域的内容和链接。",
    section: "contact",
    fields: [
      { key: "tag", label: "区块标签", type: "text", bilingual: true },
      { key: "title", label: "区块标题", type: "text", bilingual: true },
      { key: "text", label: "介绍文字", type: "textarea", bilingual: true },
    ],
    fieldLayout: "row",
    lists: [
      {
        key: "links",
        label: "联系链接",
        itemDefaults: { label: "新链接", href: "#", icon: "email" },
        itemFields: [
          { key: "label", label: "显示文字", type: "text", bilingual: true },
          { key: "icon", label: "图标 (email/github)", type: "text" },
          { key: "href", label: "链接", type: "text" },
        ]
      }
    ]
  },
  {
    id: "site",
    title: "站点设置",
    desc: "站点标题、描述和 Footer 文字。",
    section: "site",
    fields: [
      { key: "title", label: "站点标题（浏览器标签）", type: "text", bilingual: true },
      { key: "description", label: "SEO 描述", type: "text", bilingual: true },
      { key: "footer", label: "Footer 文字", type: "text", bilingual: true },
    ],
  },
];

// ========== 工具：获取列表数据 ==========
function getListData(section, listKey) {
  if (config[section] && config[section][listKey] && config[section][listKey].length) {
    return config[section][listKey];
  }
  if (defaults[section] && defaults[section][listKey]) {
    return JSON.parse(JSON.stringify(defaults[section][listKey]));
  }
  return [];
}

// ========== 渲染 ==========
function renderAll() {
  // 侧边栏
  var nav = document.getElementById("sidebar-nav");
  nav.innerHTML = PANELS.map(function (p, i) {
    return '<button class="' + (i === 0 ? "active" : "") + '" data-panel="' + p.id + '">' + p.title + '</button>';
  }).join("");

  nav.querySelectorAll("button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      collectPanelData();
      nav.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      activePanel = btn.dataset.panel;
      renderPanel();
    });
  });

  renderPanel();
  updateAuthStatus();
}

function renderPanel() {
  var schema = PANELS.find(function (p) { return p.id === activePanel; });
  if (!schema) return;
  var content = document.getElementById("content");

  var langHint = (schema.fields.some(function (f) { return f.bilingual; }) ||
    (schema.lists && schema.lists.some(function (l) { return l.itemFields.some(function (f) { return f.bilingual; }); })))
    ? ' <span class="panel-lang-hint">— 正在编辑：' + (adminLang === "zh" ? "中文" : "English") + '</span>'
    : "";

  var html = '<div class="panel active">';
  html += '<h2 class="panel-title">' + schema.title + langHint + '</h2>';
  html += '<p class="panel-desc">' + schema.desc + '</p>';

  if (schema.type === "colors") {
    html += renderColorFields(schema);
  } else {
    // 普通字段
    html += renderFields(schema.fields, schema);
    // 列表
    if (schema.lists) {
      schema.lists.forEach(function (list) {
        html += renderList(schema.section, list);
      });
    }
    // 额外内容（Hero 专属）
    if (schema.extra === "hero") {
      html += renderHeroExtra();
    }
  }

  html += '</div>';
  content.innerHTML = html;
  bindPanelEvents(schema);
}

// ========== 配色面板 ==========
function renderColorFields(schema) {
  var theme = config.theme || {};
  var html = '<div class="color-grid">';
  schema.fields.forEach(function (f) {
    var hex = theme[f.key] || "#000";
    html += '<div class="color-item">';
    html += '<input type="color" class="color-swatch" value="' + hex + '" data-key="' + f.key + '" title="' + f.label + '">';
    html += '<div class="color-info">';
    html += '<div class="color-name">' + f.label + '</div>';
    html += '<input class="color-input" type="text" value="' + hex + '" data-key="' + f.key + '" maxlength="7">';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// ========== 普通字段渲染 ==========
function renderFields(fields, schema) {
  var html = '';
  // fieldLayout: row 表示两列
  var rowOpen = false;
  var rowCount = 0;
  var useRow = schema.fieldLayout === "row";

  fields.forEach(function (f, i) {
    if (useRow && rowCount === 0) {
      html += '<div class="field-row">';
      rowOpen = true;
    }

    html += '<div class="field">';

    // Label with dot (for top-level section fields)
    if (f.bilingual) {
      html += fieldLabelEl(f.label, schema.section, f.key);
    } else {
      html += '<label class="field-label">' + f.label + '</label>';
    }

    if (f.type === "textarea") {
      var val = f.bilingual ? lv(schema.section, f.key) : ((config[schema.section] && config[schema.section][f.key]) || "");
      var ph = f.bilingual ? esc((defaults[schema.section] ? defaults[schema.section][f.key] || "" : "").replace(/<[^>]*>/g, "")) : "";
      html += '<textarea class="field-textarea" id="f-' + f.key + '" rows="3" placeholder="' + ph + '">' + esc(val) + '</textarea>';
    } else if (f.type === "skills") {
      var skills = (config[schema.section] && config[schema.section].skills && config[schema.section].skills.length)
        ? config[schema.section].skills
        : ((defaults[schema.section] && defaults[schema.section].skills) ? defaults[schema.section].skills : []);
      html += '<input class="field-input" id="f-' + f.key + '" type="text" value="' + esc(skills.join(", ")) + '">';
    } else {
      var val2 = f.bilingual ? lv(schema.section, f.key) : ((config[schema.section] && config[schema.section][f.key]) || "");
      var ph2 = f.bilingual && defaults[schema.section] ? esc(defaults[schema.section][f.key] || "") : (f.placeholder ? f.placeholder : "");
      var maxlen = f.maxlength ? ' maxlength="' + f.maxlength + '"' : "";
      html += '<input class="field-input" id="f-' + f.key + '" type="text" value="' + esc(val2) + '" placeholder="' + ph2 + '"' + maxlen + '>';
    }

    if (f.hint) {
      html += '<span class="field-hint">' + f.hint + '</span>';
    }

    html += '</div>';

    if (useRow) {
      rowCount++;
      if (rowCount === 2 || i === fields.length - 1) {
        html += '</div>'; // close field-row
        rowCount = 0;
        rowOpen = false;
      }
    }
  });

  if (rowOpen) html += '</div>';
  return html;
}

// ========== 列表渲染 ==========
function renderList(section, list) {
  var items = getListData(section, list.key);
  var html = '<div class="field"><label class="field-label">' + list.label + '</label>';

  items.forEach(function (item, i) {
    html += '<div class="list-item">';
    html += '<div class="list-item-header">';
    html += '<span class="list-item-index">' + list.label + ' ' + (i + 1) + '</span>';
    html += '<div class="list-item-actions">';
    html += '<button class="btn btn-sm" onclick="moveListItem(\'' + section + '\',\'' + list.key + '\',' + i + ',-1)">↑</button>';
    html += '<button class="btn btn-sm" onclick="moveListItem(\'' + section + '\',\'' + list.key + '\',' + i + ',1)">↓</button>';
    html += '<button class="btn btn-sm btn-danger" onclick="removeListItem(\'' + section + '\',\'' + list.key + '\',' + i + ')">删除</button>';
    html += '</div></div>';
    html += '<div class="list-item-fields">';

    // Group fields into rows if layout is row
    if (list.layout === "row") {
      html += '<div class="field-row">';
    }

    list.itemFields.forEach(function (f) {
      if (list.layout !== "row") {
        html += '<div class="field">';
      } else {
        html += '<div class="field">';
      }

      var fieldClass = section + "-" + list.key + "-" + f.key;
      html += '<label class="field-label">' + f.label + '</label>';

      if (f.type === "tags") {
        var tagsStr = (item[f.key] || []).join(", ");
        html += '<input class="field-input ' + fieldClass + '" type="text" value="' + esc(tagsStr) + '" data-index="' + i + '">';
      } else if (f.type === "textarea") {
        var val = f.bilingual ? lov(item, f.key) : (item[f.key] || "");
        html += '<textarea class="field-textarea ' + fieldClass + '" data-index="' + i + '" rows="2">' + esc(val) + '</textarea>';
      } else {
        var val2 = f.bilingual ? lov(item, f.key) : (item[f.key] || "");
        var phItem = f.placeholder || "";
        html += '<input class="field-input ' + fieldClass + '" type="text" value="' + esc(val2) + '" data-index="' + i + '" placeholder="' + esc(phItem) + '">';
      }

      html += '</div>';
    });

    if (list.layout === "row") {
      html += '</div>'; // close field-row
    }

    html += '</div></div>';
  });

  html += '</div>';
  html += '<button class="add-btn" onclick="addListItem(\'' + section + '\',\'' + list.key + '\')">+ 添加' + list.label + '</button>';
  return html;
}

// ========== Hero 额外内容：视频 + 预览 ==========
function renderHeroExtra() {
  var videoEnabled = lv("hero", "videoEnabled") ? "checked" : "";
  var html = '';

  // 实时预览
  html += '<hr>';
  html += '<div class="field"><label class="field-label">实时预览</label>';
  html += '<div class="hero-preview" id="hero-preview">';
  html += '<div class="hero-preview-inner">';
  var g = esc(lv("hero", "greeting") || (defaults.hero ? defaults.hero.greeting : ""));
  var n = esc(lv("hero", "name") || (defaults.hero ? defaults.hero.name : ""));
  var t = esc(lv("hero", "tagline") || (defaults.hero ? defaults.hero.tagline : ""));
  var d = lv("hero", "description") || (defaults.hero ? defaults.hero.description : "");
  html += '<h1 class="hero-preview-title"><span id="pv-greeting">' + g + '</span> <span class="hero-preview-name" id="pv-name">' + n + '</span></h1>';
  html += '<p class="hero-preview-sub" id="pv-tagline">' + t + '</p>';
  html += '<p class="hero-preview-desc" id="pv-desc">' + d + '</p>';
  html += '</div></div></div>';

  // 视频设置
  html += '<hr>';
  html += '<div class="field-row">';
  html += '<div class="field"><label class="field-label"><input type="checkbox" id="f-videoEnabled" ' + videoEnabled + ' style="margin-right:6px;">开启视频背景</label></div>';
  html += '<div class="field"><label class="field-label">视频文件路径</label>';
  html += '<input class="field-input" id="f-video" type="text" value="' + esc(lv("hero", "video")) + '" placeholder="如：images/hero-bg.mp4">';
  html += '<span class="field-hint">留空则关闭视频背景。视频会自动静音循环播放。</span></div>';
  html += '</div>';

  // 上传
  html += '<div class="field"><label class="field-label">上传新视频</label>';
  html += '<div class="upload-zone" id="upload-zone">';
  html += '<div class="upload-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>';
  html += '<p class="upload-text">拖拽视频文件到此处，或点击选择</p>';
  html += '<p class="upload-hint">支持 MP4、WebM，建议不超过 100MB</p>';
  html += '<input type="file" id="upload-input" accept="video/mp4,video/webm" style="display:none;">';
  html += '<div class="upload-progress" id="upload-progress" style="display:none;"><div class="upload-progress-bar" id="upload-progress-bar"></div></div>';
  html += '</div></div>';

  return html;
}

function fieldLabelEl(text, section, baseKey) {
  var src = valSource(section, baseKey);
  var dot = src === "config"
    ? '<span class="field-dot customized" title="已自定义"></span>'
    : '<span class="field-dot" title="使用默认值"></span>';
  var resetBtn = src === "config"
    ? ' <button class="field-reset" onclick="resetField(\'' + section + '\',\'' + baseKey + '\')" title="重置为默认值">↺</button>'
    : "";
  return '<label class="field-label">' + dot + ' ' + text + resetBtn + '</label>';
}

// ========== 数据收集 ==========
function collectPanelData() {
  var schema = PANELS.find(function (p) { return p.id === activePanel; });
  if (!schema) return;

  if (schema.type === "colors") {
    collectColorData(schema);
    return;
  }

  // 普通字段
  collectFieldData(schema);

  // 列表
  if (schema.lists) {
    schema.lists.forEach(function (list) {
      collectListData(schema.section, list);
    });
  }

  // Hero 额外
  if (schema.extra === "hero") {
    collectHeroExtra();
  }
}

function collectColorData(schema) {
  if (!config.theme) config.theme = {};
  document.querySelectorAll(".color-swatch").forEach(function (el) {
    // 优先取文本输入的值（用户可能手工输入）
    var textInput = document.querySelector('.color-input[data-key="' + el.dataset.key + '"]');
    var val = textInput ? textInput.value : el.value;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      config.theme[el.dataset.key] = val;
    } else if (el.value && /^#[0-9a-fA-F]{6}$/.test(el.value)) {
      config.theme[el.dataset.key] = el.value;
    }
  });
}

function collectFieldData(schema) {
  schema.fields.forEach(function (f) {
    var el = document.getElementById("f-" + f.key);
    if (!el) return;
    var val = el.value;

    if (f.key === "skills") {
      config[schema.section].skills = val.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      // 如果和默认值一样，清除
      var defSkills = (defaults[schema.section] && defaults[schema.section].skills) ? defaults[schema.section].skills : [];
      if (JSON.stringify(config[schema.section].skills) === JSON.stringify(defSkills)) {
        delete config[schema.section].skills;
      }
    } else if (f.bilingual) {
      var key = lk(f.key);
      config[schema.section][key] = val;
      // 清除空字符串和与默认值相同的
      if (val === "" || (defaults[schema.section] && defaults[schema.section][key] === val)) {
        delete config[schema.section][key];
      }
    } else if (f.key === "videoEnabled") {
      config[schema.section].videoEnabled = el.checked;
      if (!el.checked) delete config[schema.section].videoEnabled;
    } else {
      config[schema.section][f.key] = val;
      if (val === "") delete config[schema.section][f.key];
    }
  });
}

function collectListData(section, list) {
  var items = getListData(section, list.key);
  // 确保 config 中有这个列表
  if (!config[section]) config[section] = {};
  config[section][list.key] = JSON.parse(JSON.stringify(items));

  list.itemFields.forEach(function (f) {
    var fieldClass = section + "-" + list.key + "-" + f.key;
    document.querySelectorAll("." + fieldClass).forEach(function (el) {
      var i = parseInt(el.dataset.index);
      var val = el.value;
      if (f.type === "tags") {
        config[section][list.key][i].tags = val.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      } else if (f.bilingual) {
        config[section][list.key][i][lk(f.key)] = val;
      } else {
        config[section][list.key][i][f.key] = val;
      }
    });
  });
}

function collectHeroExtra() {
  config.hero.videoEnabled = document.getElementById("f-videoEnabled") ? document.getElementById("f-videoEnabled").checked : false;
  config.hero.video = document.getElementById("f-video") ? document.getElementById("f-video").value : "";
  // 清理
  if (!config.hero.videoEnabled) delete config.hero.videoEnabled;
  if (!config.hero.video) delete config.hero.video;
}

// ========== 重置字段 ==========
function resetField(section, baseKey) {
  var keys = [baseKey, baseKey + "_en"];
  keys.forEach(function (k) {
    if (config[section]) config[section][k] = "";
  });
  renderPanel();
  showToast("已重置为默认值", "saved");
}

// ========== 列表操作 ==========
function addListItem(section, listKey) {
  var schema = PANELS.find(function (p) { return p.id === activePanel; });
  var list = schema.lists.find(function (l) { return l.key === listKey; });
  if (!list) return;

  if (!config[section]) config[section] = {};

  // 如果 config 中没有这个列表，先从 defaults 复制
  if (!config[section][listKey] || !config[section][listKey].length) {
    var defItems = (defaults[section] && defaults[section][listKey]) ? defaults[section][listKey] : [];
    config[section][listKey] = JSON.parse(JSON.stringify(defItems));
  }

  var newItem = JSON.parse(JSON.stringify(list.itemDefaults));
  config[section][listKey].push(newItem);
  renderPanel();
}

function removeListItem(section, listKey, index) {
  // 确保 config 中有副本
  if (!config[section] || !config[section][listKey] || !config[section][listKey].length) {
    var defItems = (defaults[section] && defaults[section][listKey]) ? defaults[section][listKey] : [];
    config[section] = config[section] || {};
    config[section][listKey] = JSON.parse(JSON.stringify(defItems));
  }
  config[section][listKey].splice(index, 1);
  renderPanel();
}

function moveListItem(section, listKey, index, dir) {
  if (!config[section] || !config[section][listKey] || !config[section][listKey].length) {
    var defItems = (defaults[section] && defaults[section][listKey]) ? defaults[section][listKey] : [];
    config[section] = config[section] || {};
    config[section][listKey] = JSON.parse(JSON.stringify(defItems));
  }
  var arr = config[section][listKey];
  var newIdx = index + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  var tmp = arr[index];
  arr[index] = arr[newIdx];
  arr[newIdx] = tmp;
  renderPanel();
}

// ========== 事件绑定 ==========
function bindPanelEvents(schema) {
  if (schema.type === "colors") {
    // 颜色选择器 ↔ 文本输入同步
    document.querySelectorAll(".color-swatch").forEach(function (swatch) {
      swatch.addEventListener("input", function (e) {
        var key = e.target.dataset.key;
        var val = e.target.value;
        if (!config.theme) config.theme = {};
        config.theme[key] = val;
        var textInput = document.querySelector('.color-input[data-key="' + key + '"]');
        if (textInput) textInput.value = val;
      });
    });
    document.querySelectorAll(".color-input").forEach(function (input) {
      input.addEventListener("input", function (e) {
        var key = e.target.dataset.key;
        var val = e.target.value;
        if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
          if (!config.theme) config.theme = {};
          config.theme[key] = val;
          var swatch = document.querySelector('.color-swatch[data-key="' + key + '"]');
          if (swatch && val.length === 7) swatch.value = val;
        }
      });
    });
  }

  // Hero 预览实时更新
  if (schema.extra === "hero") {
    var heroInputs = ["f-greeting", "f-name", "f-tagline", "f-desc"];
    heroInputs.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", updateHeroPreview);
      }
    });
  }

  // 上传
  setupUpload();
}

// ========== Hero 预览更新 ==========
function updateHeroPreview() {
  var greeting = document.getElementById("f-greeting");
  var name = document.getElementById("f-name");
  var tagline = document.getElementById("f-tagline");
  var desc = document.getElementById("f-desc");

  var pvGreeting = document.getElementById("pv-greeting");
  var pvName = document.getElementById("pv-name");
  var pvTagline = document.getElementById("pv-tagline");
  var pvDesc = document.getElementById("pv-desc");

  if (pvGreeting && greeting) pvGreeting.textContent = greeting.value || "你好，我是";
  if (pvName && name) pvName.textContent = name.value || "你的名字";
  if (pvTagline && tagline) pvTagline.textContent = tagline.value || "创造简洁、好用、有温度的数字体验。";
  if (pvDesc && desc) pvDesc.innerHTML = desc.value || '专注于<span class="text-accent">产品设计</span>与<span class="text-accent">前端开发</span>';
}

// ========== 视频上传 ==========
function setupUpload() {
  var zone = document.getElementById("upload-zone");
  var input = document.getElementById("upload-input");
  var progress = document.getElementById("upload-progress");
  var bar = document.getElementById("upload-progress-bar");
  var videoPathInput = document.getElementById("f-video");

  if (!zone || !input) return;

  zone.addEventListener("click", function () { input.click(); });

  zone.addEventListener("dragover", function (e) {
    e.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", function () {
    zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", function (e) {
    e.preventDefault();
    zone.classList.remove("drag-over");
    var file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  input.addEventListener("change", function () {
    var file = input.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    if (!file.type.startsWith("video/")) {
      showToast("请选择视频文件", "error");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast("文件不能超过 100MB", "error");
      return;
    }

    progress.style.display = "block";
    bar.style.width = "0%";

    var formData = new FormData();
    formData.append("file", file);

    var xhr = new XMLHttpRequest();
    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        bar.style.width = Math.round((e.loaded / e.total) * 90) + "%";
      }
    };
    xhr.onload = function () {
      try {
        var result = JSON.parse(xhr.responseText);
        if (result.ok) {
          bar.style.width = "100%";
          if (videoPathInput) videoPathInput.value = result.path;
          if (!config.hero) config.hero = {};
          config.hero.video = result.path;
          config.hero.videoEnabled = true;
          var checkbox = document.getElementById("f-videoEnabled");
          if (checkbox) checkbox.checked = true;
          setTimeout(function () {
            progress.style.display = "none";
            bar.style.width = "0%";
          }, 800);
          showToast("视频已上传", "saved");
        } else {
          showToast("上传失败: " + result.error, "error");
          progress.style.display = "none";
        }
      } catch (err) {
        showToast("上传失败: " + err.message, "error");
        progress.style.display = "none";
      }
    };
    xhr.onerror = function () {
      showToast("上传失败: 网络错误", "error");
      progress.style.display = "none";
    };
    if (adminToken) {
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Authorization", "Bearer " + adminToken);
    } else {
      xhr.open("POST", "/api/upload");
    }
    xhr.send(formData);
  }
}

// ========== 初始化 ==========
function init() {
  // 检查 sessionStorage 中的 token
  adminToken = getToken();
  updateAuthStatus();

  // 如果没 token，显示登录框
  if (!isAuthed()) {
    showLoginOverlay();
  }

  // 登录框事件
  document.getElementById("login-btn").addEventListener("click", function () {
    var t = document.getElementById("login-token").value.trim();
    if (!t) {
      document.getElementById("login-error").textContent = "请输入 token";
      return;
    }
    setToken(t);
    updateAuthStatus();
    hideLoginOverlay();
    loadConfig();
  });
  document.getElementById("login-token").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("login-btn").click();
  });

  if (isAuthed()) {
    loadConfig();
  }

  // 快捷键
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveConfig();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
