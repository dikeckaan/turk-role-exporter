/**
 * worker/stats.js
 * Anonymous visitor + download statistics backed by Cloudflare KV.
 *
 * NO personally identifiable data is stored: no IP, user-agent, referrer,
 * or fingerprint. Counts are based on session-scoped client flags (the user
 * decides when to ping), so numbers are best-effort approximations.
 *
 * KV binding: env.STATS (namespace). Keys:
 *   site:firstLaunch                 ISO date string, set once on first ping
 *   site:visits:total                running total visitor count
 *   site:visits:day:YYYY-MM-DD       per-day visitor count
 *   site:downloads:total             running total CSV download count
 *   site:downloads:day:YYYY-MM-DD    per-day download count
 *   site:downloads:device:<cihazId>  per-device download count
 *
 * Endpoints:
 *   POST /api/stats/ping      → { visitorNumber, firstLaunch }
 *   POST /api/stats/download  body: { cihaz } → { ok: true }
 *   GET  /api/stats           → aggregated JSON
 */

const DEVICES = ["uv-k5", "baofeng-k5-plus", "opengd77", "md-uv390"];
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

async function handlePing(env) {
  let firstLaunch = await env.STATS.get("site:firstLaunch");
  if (!firstLaunch) {
    firstLaunch = new Date().toISOString();
    await env.STATS.put("site:firstLaunch", firstLaunch);
  }
  const visitorNumber = await incr(env, "site:visits:total");
  await incr(env, `site:visits:day:${todayIso()}`);
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
    return handlePing(env);
  }
  if (pathname === "/api/stats/download" && request.method === "POST") {
    return handleDownload(request, env);
  }
  if (pathname === "/api/stats" && request.method === "GET") {
    return handleAggregate(env);
  }
  return null; // not a stats route
}
