/**
 * Cloudflare Worker — Turk Role Exporter Backend
 *
 * Dynamic scraper: discovers all pages from ta-role.com's own navigation menu,
 * so it automatically adapts when new cities/pages are added.
 *
 * Endpoints:
 *   GET  /api/roleler            → proxy amatortelsizcilik.com.tr (4hr cache)
 *   GET  /api/tarole/roleler     → dynamic scrape VHF/UHF/DMR pages (4hr cache)
 *   GET  /api/tarole/talkgruplar → scrape talk-gruplar page (4hr cache)
 *   GET  /api/tarole/simplex     → scrape simplex page (4hr cache)
 *   GET  /api/tarole/debug       → diagnostic info (no cache)
 *   POST /api/auth/verify        → password verification, returns token
 *   GET  /api/protected/airband  → airband frequencies (token required)
 *   GET  /api/protected/marine   → marine frequencies (token required)
 *   *    /*                      → static site from Workers Sites KV
 */

import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "X-Cache-Time, Age",
};

const UPSTREAM_URL = "https://amatortelsizcilik.com.tr/roleler/data.json";
const CACHE_TTL = 14400; // 4 hours
const TAROLE_CACHE_TTL = 14400; // 4 hours
const TAROLE_BASE = "https://www.ta-role.com";
const FETCH_TIMEOUT = 20000; // 20s per page

// ─── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Serve static assets for non-API paths
    if (!url.pathname.startsWith("/api/")) {
      try {
        return await getAssetFromKV(
          { request, waitUntil: (p) => ctx.waitUntil(p) },
          {}
        );
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }

    // API routes — allow GET and POST
    if (request.method !== "GET" && request.method !== "POST") {
      return jsonResponse({ hata: "Sadece GET ve POST desteklenir" }, 405);
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
      case "/api/tarole/debug":
        return handleTaroleDebug();
      case "/api/auth/verify":
        return handleAuthVerify(request, env);
      case "/api/protected/airband":
        return handleProtected(request, env, AIRBAND_FREKANSLARI);
      case "/api/protected/marine":
        return handleProtected(request, env, MARINE_FREKANSLARI);
      default:
        return jsonResponse({ hata: "Bulunamadi" }, 404);
    }
  },
};

// ─── Frequency data (protected) ──────────────────────────────────────────────

const AIRBAND_FREKANSLARI = [
  { frek: 121.500, ad: "ACIL GUARD", aciklama: "Uluslararasi Havacilik Acil Frekansi" },
  { frek: 126.350, ad: "IST ATIS1", aciklama: "Istanbul Havalimanı ATIS" },
  { frek: 128.850, ad: "IST ATIS2", aciklama: "Istanbul Havalimanı ATIS 2" },
  { frek: 131.100, ad: "IST TWR", aciklama: "Istanbul Havalimanı Tower" },
  { frek: 121.750, ad: "IST GND", aciklama: "Istanbul Havalimanı Ground" },
  { frek: 128.550, ad: "SAW ATIS", aciklama: "Sabiha Gokcen ATIS" },
  { frek: 118.100, ad: "SAW TWR", aciklama: "Sabiha Gokcen Tower" },
  { frek: 121.800, ad: "SAW GND", aciklama: "Sabiha Gokcen Ground" },
  { frek: 123.600, ad: "ESB ATIS", aciklama: "Esenboga ATIS" },
  { frek: 118.100, ad: "ESB TWR", aciklama: "Esenboga Tower" },
  { frek: 121.900, ad: "ESB GND", aciklama: "Esenboga Ground" },
  { frek: 129.200, ad: "ADB ATIS", aciklama: "Adnan Menderes ATIS" },
  { frek: 118.100, ad: "ADB TWR", aciklama: "Adnan Menderes Tower" },
  { frek: 121.700, ad: "ADB GND", aciklama: "Adnan Menderes Ground" },
  { frek: 128.200, ad: "AYT ATIS", aciklama: "Antalya ATIS" },
  { frek: 118.100, ad: "AYT TWR", aciklama: "Antalya Tower" },
];

const MARINE_FREKANSLARI = [
  { frek: 156.800, ad: "CH16 ACIL", kanal: 16, aciklama: "Uluslararasi Deniz Acil/Cagri" },
  { frek: 156.525, ad: "CH70 DSC", kanal: 70, aciklama: "Digital Selective Calling" },
  { frek: 156.300, ad: "CH06 INTSH", kanal: 6, aciklama: "Gemiler Arasi Guvenlik" },
  { frek: 156.650, ad: "CH13 BRIJ", kanal: 13, aciklama: "Kopru-Kopru Navigasyon" },
  { frek: 156.400, ad: "CH08 WORK", kanal: 8, aciklama: "Sahil Guvenlik / Calisma" },
  { frek: 156.475, ad: "CH69 SHIP", kanal: 69, aciklama: "Gemiler Arasi" },
  { frek: 156.625, ad: "CH72 SHIP", kanal: 72, aciklama: "Gemiler Arasi" },
  { frek: 156.875, ad: "CH77 SHIP", kanal: 77, aciklama: "Gemiler Arasi" },
  { frek: 156.500, ad: "CH10 VTS", kanal: 10, aciklama: "Turk Bogazi VTS Sektoru" },
  { frek: 156.550, ad: "CH11 VTS", kanal: 11, aciklama: "Turk Bogazi VTS / Kilavuz" },
  { frek: 156.600, ad: "CH12 VTS", kanal: 12, aciklama: "Turk Bogazi VTS Sektoru" },
  { frek: 156.700, ad: "CH14 VTS", kanal: 14, aciklama: "Turk Bogazi VTS Sektoru" },
  { frek: 156.375, ad: "CH67 METEO", kanal: 67, aciklama: "Meteoroloji Yayini / SG Arama" },
  { frek: 157.075, ad: "CH71 PILOT", kanal: 71, aciklama: "Istanbul Kilavuz" },
];

// ─── Token generation & verification ─────────────────────────────────────────

async function generateToken(password, secret) {
  const ts = Math.floor(Date.now() / (3600 * 1000)); // hourly bucket
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC", key, encoder.encode(password + ":" + ts)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyToken(token, password, secret) {
  // Check current hour and previous hour (for tokens near boundary)
  const current = await generateToken(password, secret);
  if (token === current) return true;
  const ts = Math.floor(Date.now() / (3600 * 1000)) - 1;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC", key, encoder.encode(password + ":" + ts)
  );
  const prev = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return token === prev;
}

// ─── Auth & protected handlers ───────────────────────────────────────────────

async function handleAuthVerify(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ hata: "POST gerekli" }, 405);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ hata: "Gecersiz istek" }, 400);
  }
  const password = body?.password;
  const secret = env.PROTECTED_PASSWORD;
  if (!password || !secret || password !== secret) {
    return jsonResponse({ hata: "Yanlis sifre" }, 401);
  }
  const token = await generateToken(password, secret);
  return jsonResponse({ token });
}

async function handleProtected(request, env, data) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token || !(await verifyToken(token, env.PROTECTED_PASSWORD, env.PROTECTED_PASSWORD))) {
    return jsonResponse({ hata: "Yetkilendirme gerekli" }, 401);
  }
  return jsonResponse(data);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200, cacheTtl = 0) {
  const headers = { ...CORS_HEADERS, "Content-Type": "application/json" };
  if (cacheTtl > 0) headers["Cache-Control"] = `public, max-age=${cacheTtl}`;
  return new Response(JSON.stringify(data), { status, headers });
}

async function fetchPage(url, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RoleExporter/2.0)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "tr-TR,tr;q=0.9",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!resp.ok) return null;
      return await resp.text();
    } catch {
      if (attempt < retries) continue;
      return null;
    }
  }
  return null;
}

// ─── Upstream proxy ──────────────────────────────────────────────────────────

async function handleRoleler(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(UPSTREAM_URL, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const r = new Response(cached.body, cached);
    for (const [k, v] of Object.entries(CORS_HEADERS)) r.headers.set(k, v);
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

  const now = new Date().toISOString();
  const respHeaders = {
    ...CORS_HEADERS,
    "Content-Type": "application/json",
    "Cache-Control": `public, max-age=${CACHE_TTL}`,
    "X-Cache-Time": now,
  };

  const responseToCache = new Response(bodyText, { status: 200, headers: respHeaders });
  if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));
  else await cache.put(cacheKey, responseToCache.clone());

  return new Response(bodyText, { status: 200, headers: respHeaders });
}

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic ta-role.com discovery & scraping
// ═══════════════════════════════════════════════════════════════════════════

const SPECIAL_SLUGS = new Set([
  "index.html", "talk-gruplar.html", "simplex.html",
  "geni--hs.html", "dmr-id-list.html", "ileti-im.html",
]);

function getLinksFromSection(sectionHtml) {
  if (!sectionHtml) return [];
  const linkRegex = /href="(?:https?:\/\/(?:www\.)?ta-role\.com\/)?([^"]+\.html)"/gi;
  const links = [];
  let m;
  while ((m = linkRegex.exec(sectionHtml)) !== null) {
    links.push(m[1]);
  }
  return links;
}

/**
 * Extracts links WITH TA bölge assignment from a nav section.
 * Detects "N.Bölge" sub-headers and assigns tabolge to links that follow.
 */
function getLinksWithBolge(sectionHtml) {
  if (!sectionHtml) return [];

  // Collect bölge markers: >1.Bölge< or >1.Bolge< etc.
  const bolgeMarkers = [];
  const bolgeRe = />(\d)\.B[öo]lge</gi;
  let bm;
  while ((bm = bolgeRe.exec(sectionHtml)) !== null) {
    bolgeMarkers.push({ pos: bm.index, bolge: bm[1] });
  }

  // Collect links with positions
  const linkRegex = /href="(?:https?:\/\/(?:www\.)?ta-role\.com\/)?([^"]+\.html)"/gi;
  const results = [];
  let lm;
  while ((lm = linkRegex.exec(sectionHtml)) !== null) {
    // Find the bölge this link falls under (last marker before this link)
    let bolge = "0";
    for (const marker of bolgeMarkers) {
      if (marker.pos < lm.index) bolge = marker.bolge;
    }
    results.push({ slug: lm[1], tabolge: "TA" + bolge });
  }
  return results;
}

function findSectionIndex(html, text) {
  let idx = html.indexOf(">" + text + "<");
  if (idx !== -1) return idx;
  const re = new RegExp(">\\s*" + text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*<", "i");
  const match = html.match(re);
  return match ? match.index : -1;
}

function discoverPages(html) {
  const result = { vhfPages: [], uhfPages: [], dmrPages: [], otherPages: {} };

  const vhfIdx = findSectionIndex(html, "VHF Analog");
  const uhfIdx = findSectionIndex(html, "UHF Analog");
  const digitalIdx = findSectionIndex(html, "Digital Röleler");
  const digitalFallback = digitalIdx !== -1 ? digitalIdx : findSectionIndex(html, "Digital");

  if (vhfIdx !== -1 && uhfIdx !== -1) {
    const section = html.slice(vhfIdx, uhfIdx);
    const seen = new Set();
    for (const { slug, tabolge } of getLinksWithBolge(section)) {
      if (SPECIAL_SLUGS.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      result.vhfPages.push({ url: TAROLE_BASE + "/" + slug, slug, label: slugToLabel(slug), tabolge });
    }
  }

  if (uhfIdx !== -1) {
    const end = digitalFallback !== -1 ? digitalFallback : html.length;
    const section = html.slice(uhfIdx, end);
    const seen = new Set();
    for (const { slug, tabolge } of getLinksWithBolge(section)) {
      if (SPECIAL_SLUGS.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      result.uhfPages.push({ url: TAROLE_BASE + "/" + slug, slug, label: slugToLabel(slug), tabolge });
    }
  }

  if (digitalFallback !== -1) {
    const afterDigital = html.slice(digitalFallback);
    const nextTopLi = afterDigital.indexOf("ileti-im.html");
    const section = nextTopLi !== -1 ? afterDigital.slice(0, nextTopLi) : afterDigital.slice(0, 3000);
    const seen = new Set();
    for (const slug of getLinksFromSection(section)) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      if (slug === "talk-gruplar.html") {
        result.otherPages.talkGruplar = TAROLE_BASE + "/" + slug;
      } else if (slug === "simplex.html") {
        result.otherPages.simplex = TAROLE_BASE + "/" + slug;
      } else if (slug === "geni--hs.html" || slug === "dmr-id-list.html") {
        result.otherPages[slug.replace(".html", "")] = TAROLE_BASE + "/" + slug;
      } else if (!SPECIAL_SLUGS.has(slug)) {
        const bolge = slug.match(/(\d)\.boelge/)?.[1] || "0";
        result.dmrPages.push({ url: TAROLE_BASE + "/" + slug, slug, label: slugToLabel(slug), tabolge: "TA" + bolge });
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
 * Normalizes Turkish characters to ASCII for consistent matching.
 * İ→i, ı→i, Ş→s, ş→s, Ç→c, ç→c, Ğ→g, ğ→g, Ö→o, ö→o, Ü→u, ü→u
 */
function normalizeTurkish(str) {
  return str
    .replace(/\u0130/g, "i")   // İ (Turkish capital I with dot)
    .replace(/\u0131/g, "i")   // ı (Turkish lowercase dotless i)
    .replace(/[\u015e\u015f]/g, "s")
    .replace(/[\u00c7\u00e7]/g, "c")
    .replace(/[\u011e\u011f]/g, "g")
    .replace(/[\u00d6\u00f6]/g, "o")
    .replace(/[\u00dc\u00fc]/g, "u")
    .replace(/\u0307/g, "")    // combining dot above (from İ.toLowerCase())
    .toLowerCase();
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

  // Special mappings — align with amatortelsizcilik.com.tr naming
  const map = {
    "k.maras": "kahramanmaras",
    "sparta": "isparta",
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
function parseAnalogRows(rows, sehir, bant, tabolge) {
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
      tabolge: tabolge || "",
    });
  }
  return roleler;
}

/**
 * Parses DMR/Digital table.
 * Columns: MEVKİ | TX Frekansı | RX Frekansı | Time Slot
 */
function parseDmrRows(rows, tabolge) {
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

    const sehir = normalizeTurkish(mevki.split(" ")[0] || "");

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
      tabolge: tabolge || "",
    });
  }
  return roleler;
}

/**
 * Smart parser: detects table type from headers and delegates.
 */
function parsePageTable(html, slug, forcedBant, tabolge) {
  const rows = extractTableRows(html);
  if (rows.length === 0) return [];

  const tableType = detectTableType(rows);
  const sehir = slugToSehir(slug);

  if (tableType === "analog" || forcedBant) {
    const bant = forcedBant || (slug.includes("-1") ? "UHF" : "VHF");
    return parseAnalogRows(rows, sehir, bant, tabolge);
  }

  if (tableType === "dmr") {
    return parseDmrRows(rows, tabolge);
  }

  // Fallback: try analog
  return parseAnalogRows(rows, sehir, forcedBant || "VHF", tabolge);
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

function isEmptyResult(data) {
  if (Array.isArray(data)) return data.length === 0;
  if (data && typeof data === "object") {
    return Object.values(data).every((v) => Array.isArray(v) && v.length === 0);
  }
  return !data;
}

async function cachedHandler(cacheId, ctx, producer) {
  const cache = caches.default;
  const cacheUrl = TAROLE_BASE + "/__cache__/v3/" + cacheId;
  const cacheKey = new Request(cacheUrl, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const body = await cached.text();
    // Don't serve cached empty results
    if (body && body !== "[]" && body !== "{}") {
      const r = new Response(body, {
        status: cached.status,
        headers: cached.headers,
      });
      for (const [k, v] of Object.entries(CORS_HEADERS)) r.headers.set(k, v);
      return r;
    }
  }

  const data = await producer();

  // Never cache empty results — likely a transient fetch failure
  if (isEmptyResult(data)) {
    return jsonResponse(data, 200);
  }

  const now = new Date().toISOString();
  const resp = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=" + TAROLE_CACHE_TTL,
      "X-Cache-Time": now,
    },
  });

  if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  else await cache.put(cacheKey, resp.clone());

  return resp;
}

// ─── ta-role route handlers ──────────────────────────────────────────────────

// Max ~40 page fetches per invocation to stay under CF Workers' 50 subrequest limit.
// Parts: vhf1 (first half VHF), vhf2 (second half), uhf1, uhf2, dmr
const VALID_PARTS = new Set(["vhf1", "vhf2", "uhf1", "uhf2", "dmr"]);

async function handleTaroleRoleler(request, ctx) {
  const url = new URL(request.url);
  const part = url.searchParams.get("part");

  if (!part || !VALID_PARTS.has(part)) {
    return jsonResponse({
      hata: "part parametresi gerekli: vhf1, vhf2, uhf1, uhf2, dmr",
      parts: [...VALID_PARTS],
    }, 400);
  }

  return cachedHandler("roleler-" + part, ctx, async () => {
    const indexHtml = await fetchPage(TAROLE_BASE + "/index.html", 1);
    if (!indexHtml) return [];

    const pages = discoverPages(indexHtml);
    const allRoleler = [];

    let pageList;
    let forcedBant;
    if (part === "dmr") {
      pageList = pages.dmrPages;
      forcedBant = null;
    } else {
      const isVhf = part.startsWith("vhf");
      const source = isVhf ? pages.vhfPages : pages.uhfPages;
      const half = Math.ceil(source.length / 2);
      pageList = part.endsWith("1") ? source.slice(0, half) : source.slice(half);
      forcedBant = isVhf ? "VHF" : "UHF";
    }

    const results = await batchFetch(pageList, 6);
    for (const { slug, html, tabolge } of results) {
      if (!html) continue;
      allRoleler.push(...parsePageTable(html, slug, forcedBant, tabolge));
    }

    return deduplicateRoleler(allRoleler);
  });
}

async function handleTaroleTalkGruplar(request, ctx) {
  return cachedHandler("talkgruplar", ctx, async () => {
    const html = await fetchPage(TAROLE_BASE + "/talk-gruplar.html", 1);
    if (!html) return [];
    return parseTalkGruplar(html);
  });
}

async function handleTaroleSimplex(request, ctx) {
  return cachedHandler("simplex", ctx, async () => {
    const html = await fetchPage(TAROLE_BASE + "/simplex.html", 1);
    if (!html) return { uhf: [], vhf: [] };
    return parseSimplex(html);
  });
}

async function handleTaroleDebug() {
  const result = { ts: new Date().toISOString() };

  try {
    const resp = await fetch(TAROLE_BASE + "/index.html", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RoleExporter/2.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    result.indexStatus = resp.status;
    result.indexOk = resp.ok;
    result.indexSize = parseInt(resp.headers.get("content-length") || "0", 10);

    if (resp.ok) {
      const html = await resp.text();
      result.htmlLen = html.length;
      const pages = discoverPages(html);
      result.vhfCount = pages.vhfPages.length;
      result.uhfCount = pages.uhfPages.length;
      result.dmrCount = pages.dmrPages.length;
      result.vhfFirst3 = pages.vhfPages.slice(0, 3).map((p) => p.slug);
      result.uhfFirst3 = pages.uhfPages.slice(0, 3).map((p) => p.slug);
      result.dmrFirst3 = pages.dmrPages.slice(0, 3).map((p) => p.slug);

      // Test one page fetch + parse
      if (pages.vhfPages.length > 0) {
        const testPage = pages.vhfPages[0];
        const testHtml = await fetchPage(testPage.url);
        result.testPage = testPage.slug;
        result.testFetched = !!testHtml;
        if (testHtml) {
          const rows = extractTableRows(testHtml);
          result.testRows = rows.length;
          const parsed = parsePageTable(testHtml, testPage.slug, "VHF");
          result.testParsed = parsed.length;
          if (parsed.length > 0) result.testFirst = parsed[0];
        }
      }
    }
  } catch (err) {
    result.error = err.message || String(err);
  }

  return jsonResponse(result);
}
