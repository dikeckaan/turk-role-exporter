#!/usr/bin/env node
/**
 * README.md → docs/hakkinda.html
 *
 * Site icinden erisilebilen, ana sayfayla ayni temayi kullanan
 * statik bir "Hakkinda" sayfasi uretir.
 *
 * Usage: npm run build-hakkinda
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "README.md");
const DST = join(ROOT, "docs/hakkinda.html");

const md = readFileSync(SRC, "utf8");

marked.setOptions({ gfm: true, breaks: false });
const html = marked.parse(md);

const page = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hakkinda — Turk Role Exporter</title>
  <link rel="stylesheet" href="css/style.css" />
  <style>
    .doc-wrap {
      max-width: 860px;
      margin: 0 auto;
      padding: 24px;
    }
    .doc-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .doc-nav a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      transition: background 0.15s, color 0.15s;
    }
    .doc-nav a:hover {
      background: var(--accent);
      color: #fff;
    }
    .markdown-body {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      line-height: 1.65;
      color: var(--text);
    }
    .markdown-body h1,
    .markdown-body h2,
    .markdown-body h3 {
      color: var(--text);
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .markdown-body h1 { font-size: 2em; margin-top: 0; }
    .markdown-body h2 { font-size: 1.5em; }
    .markdown-body h3 { font-size: 1.2em; border-bottom: none; }
    .markdown-body a {
      color: var(--accent);
      text-decoration: none;
    }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body code {
      background: var(--surface-2);
      color: var(--text);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
    }
    .markdown-body pre {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
    }
    .markdown-body pre code {
      background: none;
      padding: 0;
      font-size: 0.85em;
      line-height: 1.5;
    }
    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      display: block;
      overflow-x: auto;
    }
    .markdown-body th,
    .markdown-body td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }
    .markdown-body th {
      background: var(--surface-2);
      font-weight: 600;
    }
    .markdown-body ul, .markdown-body ol {
      padding-left: 24px;
    }
    .markdown-body li { margin: 4px 0; }
    .markdown-body blockquote {
      border-left: 4px solid var(--accent);
      padding: 8px 16px;
      margin: 16px 0;
      color: var(--text-muted);
      background: var(--surface-2);
      border-radius: 0 8px 8px 0;
    }
    .markdown-body hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 24px 0;
    }
    @media (max-width: 600px) {
      .doc-wrap { padding: 12px; }
      .markdown-body { padding: 18px; }
      .markdown-body h1 { font-size: 1.5em; }
      .markdown-body h2 { font-size: 1.25em; }
    }
  </style>
</head>
<body>
  <div class="doc-wrap">
    <div class="doc-nav">
      <a href="index.html">← Uygulamaya Don</a>
      <button type="button" id="theme-toggle" class="theme-toggle" aria-label="Tema degistir">
        <span id="theme-icon">☀️</span> <span id="theme-label">Acik Tema</span>
      </button>
    </div>
    <article class="markdown-body">
${html}
    </article>
  </div>
  <script type="module">
    import { themeBaslat } from "./js/theme.js";
    themeBaslat();
  </script>
</body>
</html>
`;

writeFileSync(DST, page);
console.log(`✓ docs/hakkinda.html yazildi (${page.length} char)`);
