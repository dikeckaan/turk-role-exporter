#!/usr/bin/env node
/**
 * Reads backup.json (raw amatortelsizcilik.com.tr/roleler/data.json dump)
 * and regenerates docs/js/fallback-data.js.
 *
 * Usage:
 *   1. Save the latest data.json to project root as backup.json
 *   2. Run: npm run update-fallback
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "backup.json");
const DST = join(ROOT, "docs/js/fallback-data.js");

const raw = readFileSync(SRC, "utf8");
const data = JSON.parse(raw);

if (!Array.isArray(data) || data.length === 0) {
  console.error("backup.json must be a non-empty JSON array");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const body = data.map((r) => JSON.stringify(r)).join(", ");
const out =
  `// Fallback veri - Son guncelleme: ${today}\n` +
  `// API erisim hatasi durumunda kullanilir\n` +
  `export const FALLBACK_ROLELER = [${body}];\n`;

writeFileSync(DST, out);
console.log(`✓ ${data.length} role yazildi → docs/js/fallback-data.js`);
