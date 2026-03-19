import { FALLBACK_ROLELER } from "./fallback-data.js";

const WORKER_BASE = "https://telsizrole.kaandikec.com";

/** Extracts cache metadata from CF worker response headers. */
function cacheMeta(response) {
  return {
    cacheTime: response.headers.get("X-Cache-Time") || null,
    age: parseInt(response.headers.get("Age") || "0", 10),
  };
}

/**
 * Fetches repeater data from the primary upstream API (amatortelsizcilik.com.tr).
 * Falls back to embedded fallback data on failure.
 * @returns {{ data: Array, fallback: boolean, cacheTime: string|null, age: number }}
 */
export async function roleleriGetir() {
  try {
    const response = await fetch(`${WORKER_BASE}/api/roleler`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Bos veri");
    return { data, fallback: false, ...cacheMeta(response) };
  } catch (err) {
    console.warn("API hatasi, fallback kullaniliyor:", err.message);
    if (FALLBACK_ROLELER && FALLBACK_ROLELER.length > 0) {
      return { data: FALLBACK_ROLELER, fallback: true, cacheTime: null, age: 0 };
    }
    throw new Error("Veri alinamadi");
  }
}

/**
 * Fetches repeater data from ta-role.com via the worker scraper.
 * Calls 5 parallel part endpoints to stay under CF Workers' subrequest limit.
 * @returns {{ data: Array, cacheTime: string|null, age: number }}
 */
export async function taroleRoleleriGetir() {
  const parts = ["vhf1", "vhf2", "uhf1", "uhf2", "dmr"];
  let earliestCacheTime = null;
  let maxAge = 0;

  async function fetchPart(part) {
    try {
      const response = await fetch(
        WORKER_BASE + "/api/tarole/roleler?part=" + part,
        { signal: AbortSignal.timeout(45000) }
      );
      if (!response.ok) return [];
      const { cacheTime, age } = cacheMeta(response);
      if (cacheTime && (!earliestCacheTime || cacheTime < earliestCacheTime)) {
        earliestCacheTime = cacheTime;
      }
      if (age > maxAge) maxAge = age;
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn("ta-role " + part + " alinamadi:", err.message);
      return [];
    }
  }

  try {
    const results = await Promise.all(parts.map(fetchPart));
    return { data: results.flat(), cacheTime: earliestCacheTime, age: maxAge };
  } catch (err) {
    console.warn("ta-role.com verisi alinamadi:", err.message);
    return { data: [], cacheTime: null, age: 0 };
  }
}

/**
 * Fetches DMR talk groups from ta-role.com via the worker.
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

/** Verifies password and returns auth token */
export async function sifreDogrula(password) {
  const response = await fetch(`${WORKER_BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.hata || "Dogrulama hatasi");
  }
  const { token } = await response.json();
  return token;
}

/** Fetches protected Air Band data with auth token */
export async function airbandGetir(token) {
  const response = await fetch(`${WORKER_BASE}/api/protected/airband`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Airband verisi alinamadi");
  return response.json();
}

/** Fetches protected Marine Band data with auth token */
export async function marineGetir(token) {
  const response = await fetch(`${WORKER_BASE}/api/protected/marine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Marine verisi alinamadi");
  return response.json();
}
