const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const CONFIG_PATH = path.join(__dirname, "config.json");

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
};

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
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

function handleAPI(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET /api/config
  if (req.method === "GET" && url.pathname === "/api/config") {
    const config = readConfig();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(config));
    return true;
  }

  // POST /api/config
  if (req.method === "POST" && url.pathname === "/api/config") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        writeConfig(data);
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  // API 请求
  if (handleAPI(req, res)) return;

  // 静态文件
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);

  // 防止目录遍历
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n  Portfolio 管理后台已启动\n`);
  console.log(`  网站:     http://localhost:${PORT}`);
  console.log(`  管理面板: http://localhost:${PORT}/admin.html\n`);
});
