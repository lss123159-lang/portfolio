/**
 * 把操作指南 Markdown 转成 Word 可打开的 HTML 文件
 */
const fs = require("fs");
const path = require("path");

const md = fs.readFileSync(path.join(__dirname, "项目操作指南.md"), "utf-8");

// 极简 Markdown → HTML 转换
function md2html(md) {
  let html = md;

  // 代码块（``` ... ```）
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre style="background:#f5f4f1;padding:16px;border-radius:6px;font-family:Consolas,monospace;font-size:13px;line-height:1.6;overflow-x:auto;white-space:pre-wrap;">${escapeHtml(code.trim())}</pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0eeea;padding:2px 6px;border-radius:3px;font-family:Consolas,monospace;font-size:13px;">$1</code>');

  // 标题
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size:15px;margin:20px 0 8px;color:#1a1a18;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:18px;margin:28px 0 10px;color:#1a1a18;border-bottom:1px solid #e8e6e0;padding-bottom:6px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:22px;margin:36px 0 14px;color:#1a1a18;border-bottom:1px solid #d0cec8;padding-bottom:8px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:28px;margin:0 0 24px;color:#1a1a18;text-align:center;">$1</h1>');

  // 水平线
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e8e6e0;margin:32px 0;">');

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 表格
  html = html.replace(/(\|[^\n]+\|\n\|[-:\s|]+\|\n((?:\|[^\n]+\|\n?)*))/g, (match) => {
    const lines = match.trim().split("\n");
    const headers = lines[0].split("|").filter(Boolean).map(h => h.trim());
    const rows = lines.slice(2).map(line =>
      line.split("|").filter(Boolean).map(c => c.trim())
    );

    let table = '<table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">';
    table += '<thead><tr style="background:#f5f4f1;">';
    headers.forEach(h => {
      table += `<th style="border:1px solid #e0ddd8;padding:10px 14px;text-align:left;font-weight:600;">${h}</th>`;
    });
    table += '</tr></thead><tbody>';
    rows.forEach(row => {
      table += '<tr>';
      row.forEach(cell => {
        table += `<td style="border:1px solid #e0ddd8;padding:10px 14px;vertical-align:top;">${cell}</td>`;
      });
      table += '</tr>';
    });
    table += '</tbody></table>';
    return table;
  });

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="padding-left:24px;margin:8px 0;">$1</ul>');

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;">$1</li>');

  // 段落（连续非空非标签行）
  html = html.replace(/^(?!<[a-z]|<\/(?:ul|ol|li|pre|table|thead|tbody|tr|hr|h[1-4]))(.+)$/gm, '<p style="margin:8px 0;line-height:1.8;">$1</p>');

  // 清理多余空段
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const body = md2html(md);

const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>个人作品集网站 — 完整操作指南</title>
<style>
  @page {
    size: A4;
    margin: 2cm;
  }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", -apple-system, sans-serif;
    font-size: 15px;
    line-height: 1.8;
    color: #1a1a18;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  a { color: #5b726c; }
  strong { color: #1a1a18; }
</style>
</head>
<body>
${body}
</body>
</html>`;

const outPath = path.join(__dirname, "项目操作指南.doc");
fs.writeFileSync(outPath, doc, "utf-8");
console.log("Word 文档已生成: 项目操作指南.doc");
