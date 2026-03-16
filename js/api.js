import { FALLBACK_ROLELER } from "./fallback-data.js";

const WORKER_URL = "https://telsizrole.kaandikec.com/api/roleler";

export async function roleleriGetir() {
  try {
    const response = await fetch(WORKER_URL, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Bos veri");
    return { data, fallback: false };
  } catch (err) {
    console.warn("API hatasi, fallback kullaniliyor:", err.message);
    if (FALLBACK_ROLELER && FALLBACK_ROLELER.length > 0) {
      return { data: FALLBACK_ROLELER, fallback: true };
    }
    throw new Error("Veri alinamadi");
  }
}
