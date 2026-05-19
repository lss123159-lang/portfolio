const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const CONFIG_PATH = path.join(__dirname, "config.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(16).toString("hex");

// ========== 日志系统 ==========
const logger = {
  _fmt(level, msg, err) {
    const ts = new Date().toISOString();
    const base = `[${ts}] [${level}] ${msg}`;
    return err ? base + "\n  " + (err.stack || err.message || String(err)) : base;
  },
  info(msg) {
    process.stderr.write(this._fmt("INFO", msg) + "\n");
  },
  warn(msg) {
    process.stderr.write(this._fmt("WARN", msg) + "\n");
  },
  error(msg, err) {
    process.stderr.write(this._fmt("ERROR", msg, err) + "\n");
  },
};

// ========== 权限校验 ==========
function checkAuth(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== ADMIN_TOKEN) {
    return false;
  }
  return true;
}

// ========== 文件读写 ==========
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    logger.error("读取 config.json 失败", err);
    return null;
  }
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}

// ========== Multipart 解析 ==========
function parseMultipart(buf, contentType) {
  if (!contentType) {
    throw new Error("缺少 Content-Type 头");
  }

  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) {
    throw new Error("无法解析 boundary");
  }

  const boundary = boundaryMatch[1].trim();
  const bStart = Buffer.from("--" + boundary + "\r\n");
  const bEnd = Buffer.from("\r\n--" + boundary + "--");

  // 找起始边界
  const headStart = buf.indexOf(bStart);
  if (headStart === -1) {
    throw new Error("找不到起始边界");
  }

  const bodyStart = headStart + bStart.length;
  const headerEnd = buf.indexOf(Buffer.from("\r\n\r\n"), bodyStart);
  if (headerEnd === -1) {
    throw new Error("找不到文件头结束");
  }

  const fileStart = headerEnd + 4;

  // 找结束边界
  const fileEnd = buf.indexOf(bEnd, fileStart);
  if (fileEnd === -1) {
    throw new Error("找不到结束边界");
  }

  // 解析头部获取文件名
  const header = buf.slice(bodyStart, headerEnd).toString();
  const nameMatch = header.match(/filename="(.+?)"/);
  const fileName = nameMatch ? nameMatch[1] : "video.mp4";

  // 提取文件内容
  const fileBuf = buf.slice(fileStart, fileEnd);

  if (fileBuf.length === 0) {
    throw new Error("上传的文件为空");
  }

  if (fileBuf.length > 100 * 1024 * 1024) {
    throw new Error("文件超过 100MB 限制");
  }

  return { fileName, buffer: fileBuf };
}

// ========== API 路由 ==========
function handleAPI(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET /api/defaults — 公开
  if (req.method === "GET" && url.pathname === "/api/defaults") {
    try {
      const raw = fs.readFileSync(path.join(__dirname, "defaults.json"), "utf-8");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(raw);
    } catch (err) {
      logger.error("读取 defaults.json 失败", err);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "无法读取默认值" }));
    }
    return true;
  }

  // GET /api/config — 公开（网站需要读取配置）
  if (req.method === "GET" && url.pathname === "/api/config") {
    const cfg = readConfig();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(cfg || {}));
    return true;
  }

  // POST /api/config — 需鉴权
  if (req.method === "POST" && url.pathname === "/api/config") {
    if (!checkAuth(req)) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "未授权：需要有效的 ADMIN_TOKEN" }));
      logger.warn("POST /api/config 未授权访问");
      return true;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        writeConfig(data);
        logger.info("config.json 已保存");
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        logger.error("保存 config.json 失败", err);
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return true;
  }

  // POST /api/upload — 需鉴权
  if (req.method === "POST" && url.pathname === "/api/upload") {
    if (!checkAuth(req)) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "未授权：需要有效的 ADMIN_TOKEN" }));
      logger.warn("POST /api/upload 未授权访问");
      return true;
    }

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const buf = Buffer.concat(chunks);
        const contentType = req.headers["content-type"] || "";
        const { fileName, buffer: fileBuf } = parseMultipart(buf, contentType);

        const ext = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "mp4";
        const safeName = "hero-bg." + ext;
        const outPath = path.join(__dirname, "images", safeName);

        fs.writeFileSync(outPath, fileBuf);
        logger.info("视频文件已上传: " + safeName + " (" + (fileBuf.length / 1024 / 1024).toFixed(1) + "MB)");

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, path: "images/" + safeName }));
      } catch (err) {
        logger.error("上传处理失败", err);
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return true;
  }

  // POST /api/deploy — 需鉴权
  if (req.method === "POST" && url.pathname === "/api/deploy") {
    if (!checkAuth(req)) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "未授权：需要有效的 ADMIN_TOKEN" }));
      logger.warn("POST /api/deploy 未授权访问");
      return true;
    }

    try {
      const { execSync } = require("child_process");
      const cwd = __dirname;
      let output = "";

      output += "构建... ";
      execSync("node build.js", { cwd, encoding: "utf-8" });
      output += "完成\n";

      output += "提交... ";
      execSync("git add -A", { cwd, encoding: "utf-8" });
      execSync('git commit -m "deploy: 从管理面板部署"', { cwd, encoding: "utf-8" });
      output += "完成\n";

      output += "推送... ";
      execSync("git push", { cwd, encoding: "utf-8" });
      output += "完成\n";

      logger.info("部署完成");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, message: output }));
    } catch (err) {
      const msg = err.message.includes("nothing to commit")
        ? "没有新变更需要部署"
        : err.message;
      logger.error("部署失败", err);
      res.writeHead(err.message.includes("nothing to commit") ? 200 : 500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify({ ok: true, message: msg }));
    }
    return true;
  }

  return false;
}

// ========== 主服务器 ==========
const server = http.createServer((req, res) => {
  // API 请求
  if (handleAPI(req, res)) return;

  // 静态文件
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let reqPath = url.pathname;

  // /admin 或 /admin/ 指向 admin/index.html
  if (reqPath === "/admin" || reqPath === "/admin/") {
    reqPath = "/admin/index.html";
  }

  let filePath = path.join(__dirname, reqPath === "/" ? "index.html" : reqPath);

  // 防止目录遍历
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Portfolio 管理后台已启动`);
  console.log(`  地址:     http://localhost:${PORT}`);
  console.log(`  管理面板: http://localhost:${PORT}/admin/`);
  console.log(`  ADMIN_TOKEN: ${ADMIN_TOKEN}\n`);
  console.log(`  ⚠️  请复制上面的 ADMIN_TOKEN，打开管理面板后粘贴验证。`);
  console.log(`  如需自定义 token，设置环境变量：ADMIN_TOKEN=你的密钥\n`);
});

logger.info(`服务器启动于 ${HOST}:${PORT}`);
