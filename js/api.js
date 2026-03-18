import { FALLBACK_ROLELER } from "./fallback-data.js";

const WORKER_BASE = "https://telsizrole.kaandikec.com";

/**
 * Fetches repeater data from the primary upstream API (amatortelsizcilik.com.tr).
 * Falls back to embedded fallback data on failure.
 */
export async function roleleriGetir() {
  try {
    const response = await fetch(`${WORKER_BASE}/api/roleler`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Bos veri");
    const cacheTime = response.headers.get("X-Cache-Time") || null;
    return { data, fallback: false, cacheTime };
  } catch (err) {
    console.warn("API hatasi, fallback kullaniliyor:", err.message);
    if (FALLBACK_ROLELER && FALLBACK_ROLELER.length > 0) {
      return { data: FALLBACK_ROLELER, fallback: true };
    }
    throw new Error("Veri alinamadi");
  }
}

/**
 * Fetches repeater data from ta-role.com via the worker scraper.
 * Calls 5 parallel part endpoints to stay under CF Workers' subrequest limit.
 * Returns empty array on failure (non-blocking).
 */
export async function taroleRoleleriGetir() {
  const parts = ["vhf1", "vhf2", "uhf1", "uhf2", "dmr"];

  let earliestCacheTime = null;

  async function fetchPart(part) {
    try {
      const response = await fetch(
        WORKER_BASE + "/api/tarole/roleler?part=" + part,
        { signal: AbortSignal.timeout(45000) }
      );
      if (!response.ok) return [];
      const ct = response.headers.get("X-Cache-Time");
      if (ct && (!earliestCacheTime || ct < earliestCacheTime)) earliestCacheTime = ct;
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn("ta-role " + part + " alinamadi:", err.message);
      return [];
    }
  }

  try {
    const results = await Promise.all(parts.map(fetchPart));
    const flat = results.flat();
    flat._cacheTime = earliestCacheTime;
    return flat;
  } catch (err) {
    console.warn("ta-role.com verisi alinamadi:", err.message);
    return [];
  }
}

/**
 * Fetches DMR talk groups from ta-role.com via the worker.
 * Returns empty array on failure.
 */
export async function taroleTalkGruplariGetir() {
  try {
    const response = await fetch(`${WORKER_BASE}/api/tarole/talkgruplar`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("ta-role.com talk gruplari alinamadi:", err.message);
    return [];
  }
}

/**
 * Fetches digital simplex frequencies from ta-role.com via the worker.
 * Returns null on failure.
 */
export async function taroleSimplex() {
  try {
    const response = await fetch(`${WORKER_BASE}/api/tarole/simplex`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn("ta-role.com simplex alinamadi:", err.message);
    return null;
  }
}
