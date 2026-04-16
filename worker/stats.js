/**
 * worker/stats.js
 * Visitor + download statistics backed by Cloudflare KV, deduped by client IP.
 *
 * Raw IPs are never persisted. Each CF-Connecting-IP is hashed with a
 * KV-resident random salt (SHA-256) before being used as a dedupe key, so the
 * stored material is a one-way digest.
 *
 * KV binding: env.STATS (namespace). Keys:
 *   site:firstLaunch                 ISO date string, set once on first ping
 *   site:statsSalt                   random salt used to hash IPs
 *   site:visits:total                running total unique-IP visitor count
 *   site:visits:day:YYYY-MM-DD       per-day unique-IP visitor count
 *   site:visits:ip:<hash>            seen-IP marker (permanent, for total dedup)
 *   site:visits:ip:<date>:<hash>     seen-IP-today marker (25h TTL)
 *   site:downloads:total             running total CSV download count
 *   site:downloads:day:YYYY-MM-DD    per-day download count
 *   site:downloads:device:<cihazId>  per-device download count
 *
 * Endpoints:
 *   POST /api/stats/ping      → { visitorNumber, firstLaunch }
 *   POST /api/stats/download  body: { cihaz } → { ok: true }
 *   GET  /api/stats           → aggregated JSON
 */

const DEVICES = [
  "quansheng-uv-k5-f4hwn",
  "baofeng-k5-plus",
  "opengd77",
  "tyt-md-uv390-plus",
];
const KNOWN_DEVICE_SET = new Set(DEVICES);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getNum(env, key) {
  const v = await env.STATS.get(key);
  const n = v === null || v === undefined ? 0 : parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

async function incr(env, key) {
  const next = (await getNum(env, key)) + 1;
  await env.STATS.put(key, String(next));
  return next;
}

async function getOrCreateSalt(env) {
  let salt = await env.STATS.get("site:statsSalt");
  if (!salt) {
    salt = crypto.randomUUID();
    await env.STATS.put("site:statsSalt", salt);
  }
  return salt;
}

async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function handlePing(request, env) {
  let firstLaunch = await env.STATS.get("site:firstLaunch");
  if (!firstLaunch) {
    firstLaunch = new Date().toISOString();
    await env.STATS.put("site:firstLaunch", firstLaunch);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const today = todayIso();
  let visitorNumber = await getNum(env, "site:visits:total");

  if (ip) {
    const salt = await getOrCreateSalt(env);
    const hash = await hashIp(ip, salt);
    const totalKey = `site:visits:ip:${hash}`;
    const dayKey = `site:visits:ip:${today}:${hash}`;

    const [seenEver, seenToday] = await Promise.all([
      env.STATS.get(totalKey),
      env.STATS.get(dayKey),
    ]);

    if (!seenEver) {
      visitorNumber = await incr(env, "site:visits:total");
      await env.STATS.put(totalKey, "1");
    }
    if (!seenToday) {
      await incr(env, `site:visits:day:${today}`);
      await env.STATS.put(dayKey, "1", { expirationTtl: 60 * 60 * 25 });
    }
  } else {
    // No IP header (shouldn't happen on CF): best-effort count without dedup.
    visitorNumber = await incr(env, "site:visits:total");
    await incr(env, `site:visits:day:${today}`);
  }

  return { visitorNumber, firstLaunch };
}

async function handleDownload(request, env) {
  let cihaz = null;
  try {
    const body = await request.json();
    cihaz = typeof body?.cihaz === "string" ? body.cihaz : null;
  } catch {
    // tolerate missing/empty body
  }
  await incr(env, "site:downloads:total");
  await incr(env, `site:downloads:day:${todayIso()}`);
  if (cihaz && KNOWN_DEVICE_SET.has(cihaz)) {
    await incr(env, `site:downloads:device:${cihaz}`);
  }
  return { ok: true };
}

async function handleAggregate(env) {
  const today = todayIso();
  const [
    firstLaunch,
    totalVisits,
    todayVisits,
    totalDownloads,
    todayDownloads,
    ...deviceCounts
  ] = await Promise.all([
    env.STATS.get("site:firstLaunch"),
    getNum(env, "site:visits:total"),
    getNum(env, `site:visits:day:${today}`),
    getNum(env, "site:downloads:total"),
    getNum(env, `site:downloads:day:${today}`),
    ...DEVICES.map((d) => getNum(env, `site:downloads:device:${d}`)),
  ]);

  const byDevice = {};
  DEVICES.forEach((d, i) => { byDevice[d] = deviceCounts[i]; });

  let daysActive = 1;
  if (firstLaunch) {
    const diffMs = Date.now() - new Date(firstLaunch).getTime();
    daysActive = Math.max(1, Math.floor(diffMs / 86400000) + 1);
  }

  return {
    firstLaunch: firstLaunch || null,
    daysActive,
    visits: { total: totalVisits, today: todayVisits },
    downloads: {
      total: totalDownloads,
      today: todayDownloads,
      byDevice,
    },
  };
}

/**
 * Router for /api/stats/* — returns null if path doesn't match.
 * Caller is responsible for jsonResponse wrapping.
 */
export async function handleStatsRoute(request, env, pathname) {
  if (!env || !env.STATS) {
    return { hata: "Stats not configured" };
  }
  if (pathname === "/api/stats/ping" && request.method === "POST") {
    return handlePing(request, env);
  }
  if (pathname === "/api/stats/download" && request.method === "POST") {
    return handleDownload(request, env);
  }
  if (pathname === "/api/stats" && request.method === "GET") {
    return handleAggregate(env);
  }
  return null; // not a stats route
}
