/**
 * stats.js
 * Anonymous visitor + download stats client.
 * No IP/UA/fingerprint stored — counting is session-honest.
 */

const WORKER_BASE = "https://telsizrole.kaandikec.com";
const SESSION_KEY = "roleExporterStatsPinged";
const VISITOR_KEY = "roleExporterVisitorNumber";

const CIHAZ_LABEL = {
  "quansheng-uv-k5-f4hwn": "Quansheng UV-K5 (F4HWN)",
  "baofeng-k5-plus":       "Baofeng K5 Plus",
  "opengd77":              "OpenGD77",
  "tyt-md-uv390-plus":     "TYT MD-UV390 Plus",
};

/** Record a visit once per browser session, store + return visitor number. */
export async function pingIfFirstVisit() {
  if (sessionStorage.getItem(SESSION_KEY)) {
    const saved = sessionStorage.getItem(VISITOR_KEY);
    return { visitorNumber: saved ? parseInt(saved, 10) : null, cached: true };
  }
  try {
    const resp = await fetch(`${WORKER_BASE}/api/stats/ping`, {
      method: "POST",
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return { visitorNumber: null, cached: false };
    const data = await resp.json();
    sessionStorage.setItem(SESSION_KEY, "1");
    if (data.visitorNumber !== null && data.visitorNumber !== undefined) {
      sessionStorage.setItem(VISITOR_KEY, String(data.visitorNumber));
    }
    return { visitorNumber: data.visitorNumber ?? null, cached: false };
  } catch {
    return { visitorNumber: null, cached: false };
  }
}

/** Fire-and-forget CSV download record. */
export function recordDownload(cihazId) {
  try {
    fetch(`${WORKER_BASE}/api/stats/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cihaz: cihazId || null }),
      signal: AbortSignal.timeout(6000),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // best-effort; never block the user
  }
}

/** Fetch aggregated stats for the panel. */
export async function loadStats() {
  try {
    const resp = await fetch(`${WORKER_BASE}/api/stats`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function fmt(n) {
  return new Intl.NumberFormat("tr-TR").format(n ?? 0);
}

function statCard(label, value, sub) {
  const card = document.createElement("div");
  card.className = "visitor-stat-card";
  const v = document.createElement("div");
  v.className = "visitor-stat-value";
  v.textContent = value;
  const l = document.createElement("div");
  l.className = "visitor-stat-label";
  l.textContent = label;
  card.appendChild(v);
  card.appendChild(l);
  if (sub) {
    const s = document.createElement("div");
    s.className = "visitor-stat-sub";
    s.textContent = sub;
    card.appendChild(s);
  }
  return card;
}

function deviceBar(label, count, max) {
  const row = document.createElement("div");
  row.className = "visitor-device-row";
  const name = document.createElement("div");
  name.className = "visitor-device-name";
  name.textContent = label;
  const barWrap = document.createElement("div");
  barWrap.className = "visitor-device-bar-wrap";
  const bar = document.createElement("div");
  bar.className = "visitor-device-bar";
  const pct = max > 0 ? (count / max) * 100 : 0;
  bar.style.width = `${Math.max(2, pct)}%`;
  barWrap.appendChild(bar);
  const num = document.createElement("div");
  num.className = "visitor-device-count";
  num.textContent = fmt(count);
  row.appendChild(name);
  row.appendChild(barWrap);
  row.appendChild(num);
  return row;
}

/** Render the panel into `containerId`. Takes the stats object + optional visitorNumber. */
export function renderStatsPanel(containerId, stats, visitorNumber) {
  const host = document.getElementById(containerId);
  if (!host) return;
  while (host.firstChild) host.removeChild(host.firstChild);

  if (!stats) {
    host.textContent = "Istatistikler su an yuklenemedi.";
    return;
  }

  // Top row: overview cards
  const grid = document.createElement("div");
  grid.className = "visitor-stat-grid";
  grid.appendChild(statCard("Calisma suresi", `${fmt(stats.daysActive)} gun`,
    stats.firstLaunch ? `Sitede ilk ziyaret: ${stats.firstLaunch.slice(0, 10)}` : null));
  grid.appendChild(statCard("Toplam ziyaretci", fmt(stats.visits?.total),
    visitorNumber ? `Sen ${fmt(visitorNumber)}. ziyaretcisin` : null));
  grid.appendChild(statCard("Bugun ziyaret", fmt(stats.visits?.today)));
  grid.appendChild(statCard("Toplam indirme", fmt(stats.downloads?.total)));
  grid.appendChild(statCard("Bugun indirme", fmt(stats.downloads?.today)));
  host.appendChild(grid);

  // Device download breakdown
  const byDevice = stats.downloads?.byDevice || {};
  const entries = Object.entries(byDevice);
  if (entries.length > 0) {
    const heading = document.createElement("div");
    heading.className = "visitor-device-heading";
    heading.textContent = "Cihaza gore indirme";
    host.appendChild(heading);

    const max = Math.max(1, ...entries.map(([, c]) => c));
    // Sort desc by count
    entries.sort((a, b) => b[1] - a[1]);
    const list = document.createElement("div");
    list.className = "visitor-device-list";
    for (const [id, count] of entries) {
      const label = CIHAZ_LABEL[id] || id;
      list.appendChild(deviceBar(label, count, max));
    }
    host.appendChild(list);
  }

  const note = document.createElement("div");
  note.className = "visitor-stat-note";
  note.textContent = "IP ve kisisel veri saklanmaz. Sayaclar anonim, session basina bir kere artar.";
  host.appendChild(note);
}
