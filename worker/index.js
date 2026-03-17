/**
 * Cloudflare Worker — Turk Role Exporter Backend
 *
 * Dynamic scraper: discovers all pages from ta-role.com's own navigation menu,
 * so it automatically adapts when new cities/pages are added.
 *
 * Endpoints:
 *   GET /api/roleler            → proxy amatortelsizcilik.com.tr (10min cache)
 *   GET /api/tarole/roleler     → dynamic scrape VHF/UHF/DMR pages (1hr cache)
 *   GET /api/tarole/talkgruplar → scrape talk-gruplar page (1hr cache)
 *   GET /api/tarole/simplex     → scrape simplex page (1hr cache)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UPSTREAM_URL = "https://amatortelsizcilik.com.tr/roleler/data.json";
const CACHE_TTL = 600; // 10 min
const TAROLE_CACHE_TTL = 3600; // 1 hr
const TAROLE_BASE = "https://www.ta-role.com";

// ─── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return jsonResponse({ hata: "Sadece GET desteklenir" }, 405);
    }

    switch (url.pathname) {
      case "/api/roleler":
        return handleRoleler(request, ctx);
      case "/api/tarole/roleler":
        return handleTaroleRoleler(request, ctx);
      case "/api/tarole/talkgruplar":
        return handleTaroleTalkGruplar(request, ctx);
      case "/api/tarole/simplex":
        return handleTaroleSimplex(request, ctx);
      default:
        return jsonResponse({ hata: "Bulunamadi" }, 404);
    }
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200, cacheTtl = 0) {
  const headers = { ...CORS_HEADERS, "Content-Type": "application/json" };
  if (cacheTtl > 0) headers["Cache-Control"] = `public, max-age=${cacheTtl}`;
  return new Response(JSON.stringify(data), { status, headers });
}

async function fetchPage(url) {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "RoleExporter-Worker/2.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

// ─── Upstream proxy ──────────────────────────────────────────────────────────

async function handleRoleler(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(UPSTREAM_URL, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const r = new Response(cached.body, cached);
    r.headers.set("Access-Control-Allow-Origin", "*");
    r.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    r.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return r;
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(UPSTREAM_URL, {
      headers: { "User-Agent": "RoleExporter-Worker/2.0" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return jsonResponse({ hata: "Kaynak sunucu zaman asimina ugradi" }, 504);
    }
    return jsonResponse({ hata: "Kaynak sunucuya erisilemiyor" }, 502);
  }

  if (!upstreamResponse.ok) {
    return jsonResponse({ hata: "Kaynak sunucuya erisilemiyor" }, 502);
  }

  let bodyText;
  try {
    bodyText = await upstreamResponse.text();
    JSON.parse(bodyText); // validate
  } catch {
    return jsonResponse({ hata: "Gecersiz veri formati" }, 502);
  }

  const respHeaders = {
    ...CORS_HEADERS,
    "Content-Type": "application/json",
    "Cache-Control": `public, max-age=${CACHE_TTL}`,
  };

  const responseToCache = new Response(bodyText, { status: 200, headers: respHeaders });
  if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));
  else await cache.put(cacheKey, responseToCache.clone());

  return new Response(bodyText, { status: 200, headers: respHeaders });
}

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic ta-role.com discovery & scraping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * STEP 1: Discover all page URLs from ta-role.com's own navigation menu.
 *
 * The site's <nav> / hamburger menu contains 3 main sections:
 *   - "VHF Analog" section  → city pages with VHF repeater tables
 *   - "UHF Analog" section  → city pages with UHF repeater tables
 *   - "Digital Röleler" section → bölge pages + talk-gruplar + simplex etc.
 *
 * All internal links are <a href="https://www.ta-role.com/xxx.html">
 *
 * We fetch index.html once, parse all internal links, and categorize them
 * by the section they appear in.
 */
function discoverPages(html) {
  const result = {
    vhfPages: [],  // { url, label }
    uhfPages: [],  // { url, label }
    dmrPages: [],  // { url, label }
    otherPages: {} // special pages like talk-gruplar, simplex
  };

  // Known special pages (not repeater tables)
  const SPECIAL_SLUGS = new Set([
    "index.html", "talk-gruplar.html", "simplex.html",
    "geni--hs.html", "dmr-id-list.html", "iletisim.html",
  ]);

  // Extract all ta-role.com links with their surrounding context
  // The HTML has structured nav sections. We look for section markers.
  //
  // Strategy: The nav has these top-level menu items in order:
  //   "VHF Analog" ... links ... "UHF Analog" ... links ... "Digital" ... links
  //
  // We split the HTML by these section headers and extract links from each.

  // Find section boundaries
  const vhfIdx = html.indexOf(">VHF Analog<");
  const uhfIdx = html.indexOf(">UHF Analog<");
  const digitalIdx = html.indexOf(">Digital R");
  if (digitalIdx === -1) {
    // Try alternative marker
    var digIdx2 = html.indexOf(">Digital<");
  }
  const actualDigitalIdx = digitalIdx !== -1 ? digitalIdx : (digIdx2 || -1);

  // Extract links from each section
  const linkRegex = /href="https?:\/\/www\.ta-role\.com\/([^"]+\.html)"/gi;

  // VHF section: between vhfIdx and uhfIdx
  if (vhfIdx !== -1 && uhfIdx !== -1) {
    const vhfSection = html.slice(vhfIdx, uhfIdx);
    let m;
    const seen = new Set();
    while ((m = linkRegex.exec(vhfSection)) !== null) {
      const slug = m[1];
      if (SPECIAL_SLUGS.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      result.vhfPages.push({
        url: `${TAROLE_BASE}/${slug}`,
        slug,
        label: slugToLabel(slug),
      });
    }
  }

  // UHF section: between uhfIdx and digitalIdx
  linkRegex.lastIndex = 0;
  if (uhfIdx !== -1) {
    const uhfEnd = actualDigitalIdx !== -1 ? actualDigitalIdx : html.length;
    const uhfSection = html.slice(uhfIdx, uhfEnd);
    let m;
    const seen = new Set();
    while ((m = linkRegex.exec(uhfSection)) !== null) {
      const slug = m[1];
      if (SPECIAL_SLUGS.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      result.uhfPages.push({
        url: `${TAROLE_BASE}/${slug}`,
        slug,
        label: slugToLabel(slug),
      });
    }
  }

  // Digital section: after digitalIdx
  linkRegex.lastIndex = 0;
  if (actualDigitalIdx !== -1) {
    const digitalSection = html.slice(actualDigitalIdx);
    let m;
    const seen = new Set();
    while ((m = linkRegex.exec(digitalSection)) !== null) {
      const slug = m[1];
      if (seen.has(slug)) continue;
      seen.add(slug);

      if (slug === "talk-gruplar.html") {
        result.otherPages.talkGruplar = `${TAROLE_BASE}/${slug}`;
      } else if (slug === "simplex.html") {
        result.otherPages.simplex = `${TAROLE_BASE}/${slug}`;
      } else if (slug === "geni--hs.html" || slug === "dmr-id-list.html") {
        result.otherPages[slug.replace(".html", "")] = `${TAROLE_BASE}/${slug}`;
      } else if (!SPECIAL_SLUGS.has(slug)) {
        result.dmrPages.push({
          url: `${TAROLE_BASE}/${slug}`,
          slug,
          label: slugToLabel(slug),
        });
      }
    }
  }

  return result;
}

/**
 * Converts a URL slug to a human-readable city/label.
 * "istanbul-1-1.html" → "Istanbul"
 * "0.boelge-1.html"   → "0. Bolge"
 * "k.maras.html"      → "K.Maras"
 */
function slugToLabel(slug) {
  let name = slug.replace(".html", "");
  // For city pages: remove trailing -N suffixes (e.g. "-1", "-1-1")
  name = name.replace(/-\d+(-\d+)?$/, "");
  // Handle special cases
  if (name.startsWith("-")) name = name.slice(1); // "-sparta" → "sparta"
  if (/^\d\.boelge/.test(name)) {
    return name.replace(".", ". ").replace("boelge", "Bolge");
  }
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Derives sehir (city) name from page slug for data records.
 */
function slugToSehir(slug) {
  let name = slug.replace(".html", "");
  // Remove suffixes
  name = name.replace(/-\d+(-\d+)?$/, "");
  if (name.startsWith("-")) name = name.slice(1);
  if (/^\d\./.test(name)) return null; // bölge pages don't have single city

  // Special mappings
  const map = {
    "k.maras": "kahramanmaras",
    "sanliurfa": "sanliurfa",
  };
  return map[name] || name;
}

// ─── Table parsers (same as before but improved) ─────────────────────────────

/**
 * Normalizes frequency strings from ta-role's format.
 * Handles "145.712.5" → "145.71250", "439.175" → "439.17500"
 */
function normalizeFrekans(str) {
  if (!str || str === "-") return null;
  let clean = str.replace(/[^\d.]/g, "");
  const dots = (clean.match(/\./g) || []).length;
  if (dots > 1) {
    const parts = clean.split(".");
    clean = parts[0] + "." + parts.slice(1).join("");
  }
  const num = parseFloat(clean);
  if (isNaN(num) || num < 50 || num > 1000) return null;
  return num.toFixed(5);
}

/**
 * Generic table row extractor — finds all <tr> rows with <td> cells.
 */
function extractTableRows(html) {
  const rows = [];
  const rowRegex = /<tr[^>]*>\s*((?:<td[^>]*>[\s\S]*?<\/td>\s*)+)<\/tr>/gi;
  let rm;
  while ((rm = rowRegex.exec(html)) !== null) {
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cm;
    while ((cm = cellRegex.exec(rm[1])) !== null) {
      cells.push(cm[1].replace(/<[^>]*>/g, "").trim());
    }
    if (cells.length >= 3) rows.push(cells);
  }
  return rows;
}

/**
 * Detects table type from column headers.
 * Returns: "analog" (has TX/RX Tone) | "dmr" (has Time Slot) | null
 */
function detectTableType(rows) {
  for (const cells of rows) {
    const joined = cells.join(" ").toLowerCase();
    if (joined.includes("mevk")) {
      if (joined.includes("tone") || joined.includes("ton")) return "analog";
      if (joined.includes("time") || joined.includes("slot")) return "dmr";
      // If table has 5 columns it's likely analog, 4 columns likely DMR
      return cells.length >= 5 ? "analog" : "dmr";
    }
  }
  return null;
}

/**
 * Parses VHF/UHF Analog table.
 * Columns: MEVKİ | TX Frekansı | RX Frekansı | TX Tone | RX Tone
 * NOTE: TX/RX from repeater perspective → swap for radio perspective.
 */
function parseAnalogRows(rows, sehir, bant) {
  const roleler = [];

  for (const cells of rows) {
    if (cells[0].toLowerCase().includes("mevk")) continue; // header
    if (cells.length < 3) continue;

    const mevki = cells[0];
    const roleTx = cells[1]; // repeater TX = our RX
    const roleRx = cells[2]; // repeater RX = our TX
    const txTone = cells.length > 3 ? cells[3] : "";
    const rxTone = cells.length > 4 ? cells[4] : "";

    const rxFrek = normalizeFrekans(roleTx);
    const txFrek = normalizeFrekans(roleRx);
    if (!rxFrek) continue;

    const tone = (rxTone && rxTone !== "-") ? rxTone : null;

    roleler.push({
      kaynak: "tarole",
      sehir: sehir || "",
      bant: bant,
      konum: mevki,
      frekans: rxFrek,
      txFrekans: txFrek || rxFrek,
      ton: tone,
      digital: 0,
      durum: true,
    });
  }
  return roleler;
}

/**
 * Parses DMR/Digital table.
 * Columns: MEVKİ | TX Frekansı | RX Frekansı | Time Slot
 */
function parseDmrRows(rows, taBolge) {
  const roleler = [];

  for (const cells of rows) {
    if (cells[0].toLowerCase().includes("mevk")) continue;
    if (cells.length < 3) continue;

    const mevki = cells[0];
    const roleTx = cells[1];
    const roleRx = cells[2];
    const timeSlot = cells.length > 3 ? cells[3] : "";

    const rxFrek = normalizeFrekans(roleTx);
    const txFrek = normalizeFrekans(roleRx);
    if (!rxFrek) continue;

    const rx = parseFloat(rxFrek);
    const bant = rx < 200 ? "VHF" : "UHF";
    const isC4FM = timeSlot.toUpperCase().includes("C4FM");

    let ts = "";
    if (timeSlot.includes("TS-1") && timeSlot.includes("TS-2")) ts = "TS1+TS2";
    else if (timeSlot.includes("TS-2") || timeSlot.includes("TS2")) ts = "TS2";
    else if (timeSlot.includes("TS-1") || timeSlot.includes("TS1")) ts = "TS1";

    const sehir = mevki.split(" ")[0]?.toLowerCase() || "";

    roleler.push({
      kaynak: "tarole",
      sehir,
      bant,
      konum: mevki,
      frekans: rxFrek,
      txFrekans: txFrek || rxFrek,
      ton: null,
      digital: isC4FM ? 0 : 1,
      durum: true,
      timeSlot: ts,
      dijitalMod: isC4FM ? "C4FM" : "DMR",
      taBolge,
    });
  }
  return roleler;
}

/**
 * Smart parser: detects table type from headers and delegates.
 */
function parsePageTable(html, slug, forcedBant) {
  const rows = extractTableRows(html);
  if (rows.length === 0) return [];

  const tableType = detectTableType(rows);
  const sehir = slugToSehir(slug);

  if (tableType === "analog" || forcedBant) {
    const bant = forcedBant || (slug.includes("-1") ? "UHF" : "VHF");
    return parseAnalogRows(rows, sehir, bant);
  }

  if (tableType === "dmr") {
    const bolge = slug.match(/(\d)\.boelge/)?.[1] || "";
    return parseDmrRows(rows, bolge);
  }

  // Fallback: try analog
  return parseAnalogRows(rows, sehir, forcedBant || "VHF");
}

// ─── Talk Groups & Simplex parsers ───────────────────────────────────────────

function parseTalkGruplar(html) {
  const gruplar = [];
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "\n");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const seen = new Set();

  for (const line of lines) {
    const match = line.match(/^(\d+)\s*:?\s*(.+)$/);
    if (!match) continue;
    const tgId = parseInt(match[1], 10);
    const ad = match[2].trim();
    if (tgId < 6 || ad.length < 2 || seen.has(tgId)) continue;
    seen.add(tgId);

    let tip = "diger";
    if (tgId === 286) tip = "ulusal";
    else if (tgId === 28600) tip = "multimode";
    else if (tgId >= 2860 && tgId <= 2869) tip = "bolge";
    else if (tgId >= 28601 && tgId <= 28699) tip = "il";
    else if (tgId === 286112 || tgId === 286911) tip = "acil";
    else if (String(tgId).length > 5) tip = "uluslararasi";

    gruplar.push({ tgId, ad, tip });
  }
  return gruplar;
}

function parseSimplex(html) {
  const channels = { uhf: [], vhf: [] };
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "\n");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let band = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === "UHF") { band = "uhf"; continue; }
    if (upper === "VHF") { band = "vhf"; continue; }
    if (!band) continue;

    const match = line.match(/^(\d{3}\.\d{3,5})\s+(.+)$/);
    if (!match) continue;

    const frek = parseFloat(match[1]);
    const desc = match[2].trim();
    let mod = "FM";
    if (desc.includes("C4FM")) mod = "C4FM";
    else if (desc.includes("DMR")) mod = "DMR";
    else if (desc.includes("NXDN")) mod = "NXDN";
    else if (desc.includes("D-STAR")) mod = "D-STAR";

    channels[band].push({
      frek: frek.toFixed(4),
      mod,
      param: desc,
      aciklama: `${mod} Simplex ${band.toUpperCase()}`,
    });
  }
  return channels;
}

// ─── Batch fetch ─────────────────────────────────────────────────────────────

async function batchFetch(items, batchSize) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const html = await fetchPage(item.url);
        return { ...item, html };
      })
    );
    results.push(...batchResults);
  }
  return results;
}

// ─── Deduplication ───────────────────────────────────────────────────────────

function deduplicateRoleler(roleler) {
  const seen = new Map();
  for (const role of roleler) {
    const key = `${role.frekans}_${(role.konum || "").toLowerCase().slice(0, 8)}`;
    if (!seen.has(key)) seen.set(key, role);
  }
  return [...seen.values()];
}

// ─── Cached handler wrapper ──────────────────────────────────────────────────

async function cachedHandler(cacheId, ctx, producer) {
  const cache = caches.default;
  const cacheUrl = `${TAROLE_BASE}/__cache__/${cacheId}`;
  const cacheKey = new Request(cacheUrl, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const r = new Response(cached.body, cached);
    r.headers.set("Access-Control-Allow-Origin", "*");
    return r;
  }

  const data = await producer();
  const body = JSON.stringify(data);

  const resp = new Response(body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${TAROLE_CACHE_TTL}`,
    },
  });

  if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  else await cache.put(cacheKey, resp.clone());

  return jsonResponse(data, 200, TAROLE_CACHE_TTL);
}

// ─── ta-role route handlers ──────────────────────────────────────────────────

async function handleTaroleRoleler(request, ctx) {
  return cachedHandler("roleler", ctx, async () => {
    // Step 1: Fetch index page and discover all URLs
    const indexHtml = await fetchPage(`${TAROLE_BASE}/index.html`);
    if (!indexHtml) return [];

    const pages = discoverPages(indexHtml);
    const allRoleler = [];

    // Step 2: Fetch VHF pages
    const vhfResults = await batchFetch(pages.vhfPages, 6);
    for (const { slug, html } of vhfResults) {
      if (!html) continue;
      allRoleler.push(...parsePageTable(html, slug, "VHF"));
    }

    // Step 3: Fetch UHF pages
    const uhfResults = await batchFetch(pages.uhfPages, 6);
    for (const { slug, html } of uhfResults) {
      if (!html) continue;
      allRoleler.push(...parsePageTable(html, slug, "UHF"));
    }

    // Step 4: Fetch DMR pages
    const dmrResults = await batchFetch(pages.dmrPages, 6);
    for (const { slug, html } of dmrResults) {
      if (!html) continue;
      allRoleler.push(...parsePageTable(html, slug, null));
    }

    // Step 5: Deduplicate
    return deduplicateRoleler(allRoleler);
  });
}

async function handleTaroleTalkGruplar(request, ctx) {
  return cachedHandler("talkgruplar", ctx, async () => {
    const html = await fetchPage(`${TAROLE_BASE}/talk-gruplar.html`);
    if (!html) return [];
    return parseTalkGruplar(html);
  });
}

async function handleTaroleSimplex(request, ctx) {
  return cachedHandler("simplex", ctx, async () => {
    const html = await fetchPage(`${TAROLE_BASE}/simplex.html`);
    if (!html) return { uhf: [], vhf: [] };
    return parseSimplex(html);
  });
}
