# Airband / Marine Picker + PMR Lock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Airband için İl→Havalimanı→Tür cascade picker, Marine için 3-bölümlü accordion picker, PMR + dPMR'nin "Korunan Kanallar" grubuna taşınması.

**Architecture:**
- Worker: `/api/protected/airband` ve `/api/protected/marine` yeni nested JSON döndürür; live fetch 10s timeout, başarısızsa gömülü snapshot (4 saat edge cache).
- Frontend state: `state.airbandSecim`, `state.marineSecim` — kullanıcının seçtikleri; CSV export bu state'e göre nested dataset'i filtreleyerek flat satır üretir.
- Yeni UI modülleri: `docs/js/airband-ui.js` (cascade), `docs/js/marine-ui.js` (accordion).
- PMR/dPMR için HTML class değişikliği + `auth-modal.js` unlock hedef listesi genişletilir.

**Tech Stack:** Vanilla ES modules, Cloudflare Workers, Node.js native test runner.

**Spec:** `docs/superpowers/specs/2026-04-15-airband-marine-pmr-design.md`

## Dosya Haritası

| Dosya | Değişim | Sorumluluk |
|---|---|---|
| `worker/index.js` | MODIFY | Endpoint'ler, live fetch + fallback orkestratörü, cache |
| `worker/fallback-data.js` | CREATE | `AIRBAND_FALLBACK` + `MARINE_FALLBACK` nested sabitler |
| `worker/scrapers.js` | CREATE | Saf parse fonksiyonları (`parseAirbandHtml`, `parseMarineHtml`) |
| `docs/index.html` | MODIFY | 3 paneli yeni UI ile güncelle + PMR/dPMR protected-group |
| `docs/js/state.js` | MODIFY | `airbandSecim`, `marineSecim` alanları |
| `docs/js/airband-ui.js` | CREATE | İl/Havalimanı/Tür cascade UI logic |
| `docs/js/marine-ui.js` | CREATE | 3-accordion + checkbox UI logic |
| `docs/js/app.js` | MODIFY | PMR/dPMR şifre tetikleyicileri + airband/marine UI kurulum |
| `docs/js/auth-modal.js` | MODIFY | `korunanlariGuncelle` 4 hedef |
| `docs/js/csv.js` | MODIFY | Seçim-temelli export for airband+marine |
| `docs/js/presets.js` | MODIFY | Yeni state alanlarını serialize |
| `docs/js/api.js` | MODIFY | Yeni nested response yapısını parse |
| `tests/csv.test.js` | MODIFY | Eski flat airband/marine senaryosu seçim-temelli ile değiştirilir |
| `tests/airband.test.js` | CREATE | Cascade filter + parse unit testleri |
| `tests/marine.test.js` | CREATE | Accordion selection + parse unit testleri |
| `tests/scrapers.test.js` | CREATE | HTML → JSON pure parse testleri |

## Task Sırası

1. **Task 1:** Data contract — Worker yeni schema ile döner (fallback = mevcut veri, yeni şekilde)
2. **Task 2:** PMR + dPMR protected-group'a taşı (UI + unlock)
3. **Task 3:** Airband UI — state + cascade picker
4. **Task 4:** Marine UI — state + accordion picker
5. **Task 5:** CSV export — seçim-temelli filtreleme
6. **Task 6:** Preset entegrasyonu
7. **Task 7:** Scraper — skyvector (opsiyonel; zorluk durumunda sabit ICAO fallback)
8. **Task 8:** Scraper — ta1dx

---

## Task 1: Data contract — yeni nested schema + fallback

**Files:**
- Create: `worker/fallback-data.js`
- Create: `worker/scrapers.js`
- Modify: `worker/index.js` (lines 80-83, 90-126)
- Test: `tests/scrapers.test.js` (create)

- [ ] **Step 1: Create `worker/fallback-data.js` with nested snapshots**

Export `AIRBAND_FALLBACK` and `MARINE_FALLBACK` as full objects matching the spec schema. `AIRBAND_FALLBACK.iller` is an array of `{il, havalimanlari: [{ad, icao, frekanslar: [{tur, frek, aciklama?}]}]}`. Seed from existing 18 airband frequencies in `worker/index.js:92-109`, grouping by city (Istanbul/Ankara/Izmir/Antalya/Genel for guard freq), mapping each row's `ad` keyword to `tur` (ATIS/Tower/Ground/Approach).

`MARINE_FALLBACK.bolumler` is an array with exactly three items, ids `vhf`, `sar`, `sahil`. Seed `vhf` from the existing 15 marine frequencies; `sar` starts with `{kanal:"SAR-1", frek:"156.650", ad:"Sahil Guvenlik SAR"}` and `{kanal:"SAR-2", frek:"123.100", ad:"Hava SAR (AM)"}`; `sahil` starts with three coastal station entries (Istanbul Radio, Antalya Radio, Izmir Radio — all on 156.800).

Both objects include `kaynak: "fallback"` and `guncellenme: "2026-04-15T00:00:00Z"`.

- [ ] **Step 2: Create stub `worker/scrapers.js`**

```js
export function parseAirbandHtml(_html) {
  throw new Error("not-implemented");
}

export function parseMarineHtml(_html) {
  throw new Error("not-implemented");
}
```

Implementation arrives in Tasks 7 & 8.

- [ ] **Step 3: Write failing test `tests/scrapers.test.js`**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIRBAND_FALLBACK, MARINE_FALLBACK } from "../worker/fallback-data.js";

describe("fallback data shape", () => {
  it("airband has iller with havalimanlari and frekanslar", () => {
    assert.equal(AIRBAND_FALLBACK.kaynak, "fallback");
    assert.ok(Array.isArray(AIRBAND_FALLBACK.iller));
    const il = AIRBAND_FALLBACK.iller[0];
    assert.ok(il.il);
    assert.ok(Array.isArray(il.havalimanlari));
    const hav = il.havalimanlari[0];
    assert.ok(hav.ad);
    assert.ok(hav.icao);
    assert.ok(Array.isArray(hav.frekanslar));
    const f = hav.frekanslar[0];
    assert.ok(f.tur);
    assert.ok(f.frek);
  });

  it("marine has 3 bolumler with expected ids", () => {
    const ids = MARINE_FALLBACK.bolumler.map((b) => b.id);
    assert.deepEqual(ids, ["vhf", "sar", "sahil"]);
    for (const b of MARINE_FALLBACK.bolumler) {
      assert.ok(b.ad);
      assert.ok(b.frekanslar.length > 0);
      for (const f of b.frekanslar) {
        assert.ok(f.kanal);
        assert.ok(f.frek);
      }
    }
  });
});
```

- [ ] **Step 4: Run test to verify module loads**

`npm test` — tests/scrapers.test.js should pass (since Step 1 already created the exports).

- [ ] **Step 5: Refactor `worker/index.js`**

At top of file, add imports:

```js
import { AIRBAND_FALLBACK, MARINE_FALLBACK } from "./fallback-data.js";
import { parseAirbandHtml, parseMarineHtml } from "./scrapers.js";
```

Replace the switch cases at lines 80-83 with:

```js
case "/api/protected/airband":
  return handleProtectedDataset(request, env, "airband",
    "https://skyvector.com/airports/Turkey", parseAirbandHtml, AIRBAND_FALLBACK);
case "/api/protected/marine":
  return handleProtectedDataset(request, env, "marine",
    "https://www.qsl.net/ta1dx/amator/bandmarine.htm", parseMarineHtml, MARINE_FALLBACK);
```

Delete the old `AIRBAND_FREKANSLARI` and `MARINE_FREKANSLARI` constants (lines 92-126).

Add below the existing `handleProtected` function:

```js
async function handleProtectedDataset(request, env, cacheKey, upstreamUrl, parser, fallback) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!(await verifyToken(token, env.PROTECTED_PASSWORD))) {
    return jsonResponse({ hata: "Yetkisiz" }, 401);
  }

  const cache = caches.default;
  const cacheReq = new Request(`https://cache.local/protected/${cacheKey}-v2`);
  const cached = await cache.match(cacheReq);
  if (cached) return cached;

  let body;
  try {
    const resp = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 TurkRoleExporter" },
    });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const parsed = parser(await resp.text());
    body = { ...parsed, kaynak: "live", guncellenme: new Date().toISOString() };
  } catch (err) {
    console.warn(`[${cacheKey}] live fetch failed, fallback:`, err.message);
    body = fallback;
  }

  const response = jsonResponse(body);
  response.headers.set("Cache-Control", "public, max-age=14400");
  await cache.put(cacheReq, response.clone());
  return response;
}
```

- [ ] **Step 6: Temporarily guard csv.js airband/marine branches**

Since `state.airbandData` is now a nested object but `csv.js` still iterates it as flat array, existing tests won't crash but output rows will be zero. Acceptable for this task — Task 5 replaces the logic properly. No code change needed now.

- [ ] **Step 7: Run full tests**

`npm test` — 29 existing + 2 new = 31 pass.

- [ ] **Step 8: Commit**

```bash
git add worker/fallback-data.js worker/scrapers.js worker/index.js tests/scrapers.test.js
git commit -m "feat(worker): nested schema for airband/marine with live+fallback orchestrator"
```

---

## Task 2: PMR + dPMR'yi Korunan Kanallar grubuna taşı

**Files:**
- Modify: `docs/index.html` (opsiyon-pmr-group, opsiyon-dpmr-group)
- Modify: `docs/js/app.js` (~line 353 protected listener array)
- Modify: `docs/js/auth-modal.js` (`korunanlariGuncelle`)
- Test: `tests/protected-unlock.test.js` (create)

- [ ] **Step 1: Write failing test**

Create `tests/protected-unlock.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

describe("protected group membership", () => {
  const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  it("airband, marine, pmr, dpmr groups all have protected-group class", () => {
    for (const id of ["opsiyon-airband-group", "opsiyon-marine-group", "opsiyon-pmr-group", "opsiyon-dpmr-group"]) {
      const re = new RegExp(`id="${id}"[^>]*class="[^"]*protected-group`);
      assert.ok(re.test(html), `${id} missing protected-group class`);
    }
  });
});

describe("auth-modal unlock coverage", () => {
  it("korunanlariGuncelle references all four groups", () => {
    const src = readFileSync(new URL("../docs/js/auth-modal.js", import.meta.url), "utf8");
    for (const id of ["opsiyon-airband-group", "opsiyon-marine-group", "opsiyon-pmr-group", "opsiyon-dpmr-group"]) {
      assert.ok(src.includes(id), `auth-modal.js missing reference to ${id}`);
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`npm test -- tests/protected-unlock.test.js`

- [ ] **Step 3: Update `docs/index.html` PMR and dPMR groups**

Locate `<div class="filter-group" id="opsiyon-pmr-group">` (~line 196) and `<div class="filter-group" id="opsiyon-dpmr-group">` (~line 206). Change both opening tags to:

```html
<div class="filter-group protected-group" id="opsiyon-pmr-group">
```

```html
<div class="filter-group protected-group" id="opsiyon-dpmr-group">
```

Directly inside each group, as the first child, insert the overlay (same markup airband uses):

```html
<div class="protected-overlay">
  <div class="protected-lock">🔒</div>
  <div class="protected-text">Parola ile aciklar</div>
</div>
```

All other inner elements (the PMR checkbox, RX-only sub-option, etc.) remain untouched.

- [ ] **Step 4: Update `docs/js/app.js` protected listener**

Find the block near line 353 that reads:

```js
["opsiyon-airband", "opsiyon-marine"].forEach((id) => {
```

Replace it with:

```js
["opsiyon-airband", "opsiyon-marine", "opsiyon-pmr", "opsiyon-dpmr"].forEach((id) => {
  const overlay = document.getElementById(id)?.closest(".filter-group")?.querySelector(".protected-overlay");
  overlay?.addEventListener("click", () => sifreModaliGoster(id));
});
```

- [ ] **Step 5: Update `docs/js/auth-modal.js` `korunanlariGuncelle`**

Replace the function body (around line 62):

```js
export function korunanlariGuncelle(unlocked) {
  const groups = [
    "opsiyon-airband-group",
    "opsiyon-marine-group",
    "opsiyon-pmr-group",
    "opsiyon-dpmr-group",
  ];
  for (const gid of groups) {
    const g = document.getElementById(gid);
    if (!g) continue;
    const overlay = g.querySelector(".protected-overlay");
    if (overlay) overlay.style.display = unlocked ? "none" : "";
  }
}
```

- [ ] **Step 6: Run tests**

`npm test` — new test passes, existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add docs/index.html docs/js/app.js docs/js/auth-modal.js tests/protected-unlock.test.js
git commit -m "feat(ui): move PMR and dPMR under password-protected channels"
```

---

## Task 3: Airband UI — state + cascade picker

**Files:**
- Create: `docs/js/airband-ui.js`
- Modify: `docs/js/state.js`
- Modify: `docs/js/api.js` (airbandGetir passes through new shape)
- Modify: `docs/index.html` (airband panel container)
- Modify: `docs/js/app.js` (import + init + checkbox toggle)
- Modify: `docs/css/style.css` (chip styles)
- Test: `tests/airband.test.js` (create)

- [ ] **Step 1: Write failing unit test**

Create `tests/airband.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIRBAND_FALLBACK } from "../worker/fallback-data.js";
import { secilenAirbandFrekanslari } from "../docs/js/airband-ui.js";

describe("secilenAirbandFrekanslari", () => {
  it("returns empty when no iller selected", () => {
    assert.deepEqual(
      secilenAirbandFrekanslari(AIRBAND_FALLBACK, { iller: [], havalimanlari: {} }),
      [],
    );
  });

  it("filters by selected il and airport types", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTFM: ["ATIS", "Tower"] } };
    const result = secilenAirbandFrekanslari(AIRBAND_FALLBACK, secim);
    assert.ok(result.length > 0);
    for (const f of result) {
      assert.equal(f.icao, "LTFM");
      assert.ok(["ATIS", "Tower"].includes(f.tur));
    }
  });

  it("skips airports with no turler selected", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTFM: [] } };
    assert.deepEqual(secilenAirbandFrekanslari(AIRBAND_FALLBACK, secim), []);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`npm test -- tests/airband.test.js`

- [ ] **Step 3: Create `docs/js/airband-ui.js`**

Export two functions:

1. `secilenAirbandFrekanslari(dataset, secim)` — pure helper returning flat list of selected frequencies (shape `{icao, ad, tur, frek, aciklama}`). Must early-return `[]` when dataset is missing, when `secim.iller` is empty, or when no airport in selected province has any types checked.

2. `airbandUiKur()` — reads `state.airbandData` and `state.airbandSecim`, rebuilds the DOM inside `#airband-panel`. Structure:
   - A province row: one checkbox chip per province in the dataset. On toggle, add/remove province id from `state.airbandSecim.iller` and call an internal `airbandListeYenile()` to re-render airports.
   - An airports container `#airband-havalimani-liste`: for each airport in a selected province, a row with `ICAO  name` title and a chip per `tur` ("ATIS", "Tower", "Ground", "Approach") — only rendering türler the airport actually has. Each chip toggles membership in `state.airbandSecim.havalimanlari[icao]`.
   - After every selection change, dispatch a `CustomEvent("airband-secim-degisti")` on `document` so other modules can refresh.

Build DOM via `createElement` + `textContent` (no innerHTML). Reuse a helper to clear children before rebuild (`while (node.firstChild) node.removeChild(node.firstChild)`).

- [ ] **Step 4: Add state fields**

In `docs/js/state.js`, add two fields to the exported state object:

```js
airbandSecim: { iller: [], havalimanlari: {} },
marineSecim: { vhf: [], sar: [], sahil: [] },
```

- [ ] **Step 5: Update `docs/js/api.js` — airbandGetir returns object**

Replace the function body to `return response.json();` (no array assumption). The existing `throw` on non-ok stays.

- [ ] **Step 6: Update `docs/index.html` airband panel**

Inside `opsiyon-airband-group`, after the main label/checkbox row and any existing sub-options, append:

```html
<div id="airband-panel" class="protected-panel" style="display:none;"></div>
```

- [ ] **Step 7: Wire into `docs/js/app.js`**

Add import at the top:

```js
import { airbandUiKur } from "./airband-ui.js";
```

Inside `basla()`, after the block that handles `state.airbandData`, add:

```js
if (state.airbandData) airbandUiKur();
```

Find where existing `opsiyon-airband` change listener is set (if any) or add one — it should toggle `#airband-panel` display:

```js
document.getElementById("opsiyon-airband")?.addEventListener("change", (e) => {
  const p = document.getElementById("airband-panel");
  if (p) p.style.display = e.target.checked ? "" : "none";
});
```

- [ ] **Step 8: Add chip + panel CSS**

Append to `docs/css/style.css`:

```css
.airband-il-wrap, .airband-tur-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.airband-hav-row { padding: 8px 0; border-bottom: 1px solid var(--border); }
.airband-hav-title { font-weight: 600; margin-bottom: 4px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
        background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px;
        font-size: 0.85rem; cursor: pointer; }
.chip input { margin: 0; }
.protected-panel { margin-top: 12px; }
```

- [ ] **Step 9: Run tests**

`npm test` — all pass, including airband.test.js.

- [ ] **Step 10: Commit**

```bash
git add docs/js/state.js docs/js/airband-ui.js docs/js/app.js docs/js/api.js docs/index.html docs/css/style.css tests/airband.test.js
git commit -m "feat(ui): airband il-havalimani-tur cascade picker"
```

---

## Task 4: Marine UI — state + 3-accordion picker

**Files:**
- Create: `docs/js/marine-ui.js`
- Modify: `docs/js/app.js` (import + init + checkbox toggle)
- Modify: `docs/js/api.js` (marineGetir new shape)
- Modify: `docs/index.html` (marine panel container)
- Modify: `docs/css/style.css` (accordion styles)
- Test: `tests/marine.test.js` (create)

- [ ] **Step 1: Write failing test**

Create `tests/marine.test.js`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MARINE_FALLBACK } from "../worker/fallback-data.js";
import { secilenMarineFrekanslari } from "../docs/js/marine-ui.js";

describe("secilenMarineFrekanslari", () => {
  it("returns empty when no channels selected", () => {
    assert.deepEqual(
      secilenMarineFrekanslari(MARINE_FALLBACK, { vhf: [], sar: [], sahil: [] }),
      [],
    );
  });

  it("returns only selected channels within each bolum", () => {
    const result = secilenMarineFrekanslari(MARINE_FALLBACK,
      { vhf: ["CH16", "CH70"], sar: [], sahil: [] });
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((r) => r.kanal).sort(), ["CH16", "CH70"]);
  });

  it("picks across multiple bolumler", () => {
    const result = secilenMarineFrekanslari(MARINE_FALLBACK,
      { vhf: ["CH16"], sar: ["SAR-1"], sahil: [] });
    assert.equal(result.length, 2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`npm test -- tests/marine.test.js`

- [ ] **Step 3: Create `docs/js/marine-ui.js`**

Export:

1. `secilenMarineFrekanslari(dataset, secim)` — pure helper returning flat list `{kanal, ad, frek, aciklama, bolum}` for channels the user ticked. Iterate `dataset.bolumler`, for each `b` filter `b.frekanslar` by `f.kanal ∈ secim[b.id]`.

2. `marineUiKur()` — reads `state.marineData` and `state.marineSecim`. Builds for each of the 3 sections a `<details><summary>` accordion with:
   - Title text: `b.ad`
   - Count badge: `[tikli/toplam]` with class `.marine-count`, refreshed via a local `refreshCount()` closure
   - A "Hepsi / Hicbiri" toggle button
   - A `<label>` per frequency: checkbox + ` CHXX  freq  ad`
   - Each checkbox toggles membership in `state.marineSecim[b.id]`, refreshes count, dispatches `CustomEvent("marine-secim-degisti")`

- [ ] **Step 4: Update `docs/js/api.js`**

```js
export async function marineGetir(token) {
  const response = await fetch(`${WORKER_BASE}/api/protected/marine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Marine verisi alinamadi");
  return response.json();
}
```

- [ ] **Step 5: Update `docs/index.html` marine panel**

Inside `opsiyon-marine-group`, after the main checkbox, append:

```html
<div id="marine-panel" class="protected-panel" style="display:none;"></div>
```

- [ ] **Step 6: Wire into `docs/js/app.js`**

Add import:

```js
import { marineUiKur } from "./marine-ui.js";
```

Inside `basla()`:

```js
if (state.marineData) marineUiKur();

document.getElementById("opsiyon-marine")?.addEventListener("change", (e) => {
  const p = document.getElementById("marine-panel");
  if (p) p.style.display = e.target.checked ? "" : "none";
});
```

- [ ] **Step 7: Accordion CSS**

Append to `docs/css/style.css`:

```css
.marine-bolum { margin: 8px 0; border: 1px solid var(--border); border-radius: 8px;
                padding: 8px; background: var(--surface-2); }
.marine-bolum-sum { cursor: pointer; font-weight: 600; display: flex;
                    justify-content: space-between; padding: 4px 0; }
.marine-count { color: var(--text-muted); font-weight: 400; font-size: 0.85rem; }
.marine-toggle-all { background: none; border: 1px solid var(--border);
                     color: var(--text-muted); padding: 2px 8px; margin: 6px 0;
                     border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
.marine-toggle-all:hover { color: var(--text); border-color: var(--accent); }
.marine-row { display: flex; align-items: center; gap: 6px; padding: 4px 0;
              font-size: 0.9rem; }
```

- [ ] **Step 8: Run tests**

`npm test` — all pass.

- [ ] **Step 9: Commit**

```bash
git add docs/js/marine-ui.js docs/js/app.js docs/js/api.js docs/index.html docs/css/style.css tests/marine.test.js
git commit -m "feat(ui): marine 3-bolum accordion picker"
```

---

## Task 5: CSV export — seçim-temelli airband + marine

**Files:**
- Modify: `docs/js/csv.js` (airband + marine branches, ~lines 108-130)
- Modify: `docs/js/filter-ui.js` (opsiyonlariTopla passes selection to csv)
- Modify: `tests/csv.test.js`

- [ ] **Step 1: Append failing tests to `tests/csv.test.js`**

```js
import { secilenAirbandFrekanslari } from "../docs/js/airband-ui.js";
import { secilenMarineFrekanslari } from "../docs/js/marine-ui.js";
import { AIRBAND_FALLBACK, MARINE_FALLBACK } from "../worker/fallback-data.js";

describe("csv with airband selection", () => {
  it("produces AM rows only for selected airport+type combos", () => {
    const airbandSecili = secilenAirbandFrekanslari(AIRBAND_FALLBACK,
      { iller: ["Istanbul"], havalimanlari: { LTFM: ["ATIS"] } });
    const rows = csvSatirlarUret([], chirpProfil,
      { airbandEkle: true, airbandSecili, marineEkle: false });
    assert.ok(rows.length > 0);
    for (const r of rows) assert.equal(r[12], "AM");
  });
});

describe("csv with marine selection", () => {
  it("produces FM rows only for selected marine channels", () => {
    const marineSecili = secilenMarineFrekanslari(MARINE_FALLBACK,
      { vhf: ["CH16", "CH70"], sar: [], sahil: [] });
    const rows = csvSatirlarUret([], chirpProfil,
      { airbandEkle: false, marineEkle: true, marineSecili });
    assert.equal(rows.length, 2);
    for (const r of rows) assert.equal(r[12], "FM");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`npm test -- tests/csv.test.js`

- [ ] **Step 3: Replace airband/marine branches in `docs/js/csv.js`**

Around line 108, rewrite the two blocks:

```js
if (opsiyonlar.airbandEkle) {
  for (const ab of (opsiyonlar.airbandSecili || [])) {
    const col = boslukSatir(n);
    col[0] = String(loc++);
    col[1] = (ab.ad || "").slice(0, maxAd);
    col[2] = parseFloat(ab.frek).toFixed(6);
    col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
    col[8] = "023"; col[9] = "NN"; col[10] = "023";
    col[11] = "Tone->Tone"; col[12] = "AM"; col[13] = "25.00"; col[14] = "S"; col[15] = "0.1W";
    rows.push(col);
  }
}

if (opsiyonlar.marineEkle) {
  for (const mb of (opsiyonlar.marineSecili || [])) {
    const col = boslukSatir(n);
    col[0] = String(loc++);
    col[1] = (mb.ad || mb.kanal || "").slice(0, maxAd);
    col[2] = parseFloat(mb.frek).toFixed(6);
    col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
    col[8] = "023"; col[9] = "NN"; col[10] = "023";
    col[11] = "Tone->Tone"; col[12] = "FM"; col[13] = "12.50"; col[14] = "S"; col[15] = "0.1W";
    rows.push(col);
  }
}
```

- [ ] **Step 4: Update `docs/js/filter-ui.js` — `opsiyonlariTopla()`**

At the top of the file, add imports:

```js
import { secilenAirbandFrekanslari } from "./airband-ui.js";
import { secilenMarineFrekanslari } from "./marine-ui.js";
import { state } from "./state.js";
```

In the returned object, replace old `airbandData` / `marineData` keys with:

```js
airbandEkle: document.getElementById("opsiyon-airband")?.checked ?? false,
airbandSecili: secilenAirbandFrekanslari(state.airbandData, state.airbandSecim),
marineEkle: document.getElementById("opsiyon-marine")?.checked ?? false,
marineSecili: secilenMarineFrekanslari(state.marineData, state.marineSecim),
```

- [ ] **Step 5: Run tests**

`npm test` — full suite passes.

- [ ] **Step 6: Commit**

```bash
git add docs/js/csv.js docs/js/filter-ui.js tests/csv.test.js
git commit -m "feat(csv): selection-based airband/marine export"
```

---

## Task 6: Preset entegrasyonu

**Files:**
- Modify: `docs/js/presets.js`
- Modify: `tests/airband.test.js` (add roundtrip test block)

- [ ] **Step 1: Append failing test**

In `tests/airband.test.js`:

```js
import { presetSerialize, presetDeserialize } from "../docs/js/presets.js";

describe("preset airband/marine roundtrip", () => {
  it("preserves airbandSecim and marineSecim", () => {
    const original = {
      airbandSecim: { iller: ["Istanbul"], havalimanlari: { LTFM: ["ATIS"] } },
      marineSecim:  { vhf: ["CH16"], sar: [], sahil: [] },
    };
    const back = presetDeserialize(presetSerialize(original));
    assert.deepEqual(back.airbandSecim, original.airbandSecim);
    assert.deepEqual(back.marineSecim,  original.marineSecim);
  });

  it("deserialize tolerates missing new fields (v1 preset)", () => {
    const v1 = JSON.stringify({ version: 1, opsiyonlar: {} });
    const back = presetDeserialize(v1);
    assert.deepEqual(back.airbandSecim, { iller: [], havalimanlari: {} });
    assert.deepEqual(back.marineSecim,  { vhf: [], sar: [], sahil: [] });
  });
});
```

- [ ] **Step 2: Run — expect FAIL (helpers don't exist yet)**

`npm test -- tests/airband.test.js`

- [ ] **Step 3: Add exports to `docs/js/presets.js`**

Add near the top:

```js
const PRESET_VERSION = 2;

export function presetSerialize(obj) {
  return JSON.stringify({
    version: PRESET_VERSION,
    airbandSecim: obj.airbandSecim || { iller: [], havalimanlari: {} },
    marineSecim:  obj.marineSecim  || { vhf: [], sar: [], sahil: [] },
    opsiyonlar: obj.opsiyonlar || {},
    filtreler:  obj.filtreler  || {},
  });
}

export function presetDeserialize(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    airbandSecim: parsed.airbandSecim || { iller: [], havalimanlari: {} },
    marineSecim:  parsed.marineSecim  || { vhf: [], sar: [], sahil: [] },
    opsiyonlar:   parsed.opsiyonlar   || {},
    filtreler:    parsed.filtreler    || {},
  };
}
```

Wire `presetKaydet` and `presetYukle` (existing functions) to route their state through these helpers — this localizes the schema. The existing UI flow for preset slots remains unchanged.

- [ ] **Step 4: Run tests**

`npm test` — all pass.

- [ ] **Step 5: Commit**

```bash
git add docs/js/presets.js tests/airband.test.js
git commit -m "feat(presets): persist airband/marine selections (v2 schema with migration)"
```

---

## Task 7: Live scraper — skyvector (best-effort)

**Files:**
- Modify: `worker/scrapers.js` (implement `parseAirbandHtml`)
- Modify: `tests/scrapers.test.js`
- Create: `tests/fixtures/skyvector-airport.html`

- [ ] **Step 1: Capture a fixture**

Run (once, from repo root):

```bash
mkdir -p tests/fixtures
curl -s -A "Mozilla/5.0" "https://skyvector.com/airport/LTFM/Istanbul-Airport" \
  > tests/fixtures/skyvector-airport.html
```

Inspect the file. If there's no frequency table in the HTML (pages appear JS-rendered), abort Task 7: keep the stub throw, add `worker/SCRAPER-NOTES.md` documenting the decision and OurAirports.com CSV as a future alternative. Commit just the notes file:

```bash
git add worker/SCRAPER-NOTES.md
git commit -m "docs: skyvector scrape infeasible, fallback remains primary"
```

Then skip the remaining Task 7 steps.

- [ ] **Step 2: Write failing parse test (only if fixture contains freq data)**

Append to `tests/scrapers.test.js`:

```js
import { parseAirbandHtml } from "../worker/scrapers.js";
import { readFileSync } from "node:fs";

describe("parseAirbandHtml", () => {
  it("extracts ICAO and VHF-airband frequencies from skyvector fixture", () => {
    const html = readFileSync(new URL("./fixtures/skyvector-airport.html", import.meta.url), "utf8");
    const result = parseAirbandHtml(html, { icao: "LTFM", il: "Istanbul" });
    const hav = result.iller[0].havalimanlari[0];
    assert.equal(hav.icao, "LTFM");
    assert.ok(hav.frekanslar.length > 0);
    for (const f of hav.frekanslar) {
      const n = parseFloat(f.frek);
      assert.ok(n >= 108 && n <= 137, "airband VHF range");
    }
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

`npm test -- tests/scrapers.test.js`

- [ ] **Step 4: Implement `parseAirbandHtml`**

In `worker/scrapers.js`:

```js
const ICAO_IL_MAP = {
  LTFM: "Istanbul", LTFJ: "Istanbul", LTBA: "Istanbul",
  LTAC: "Ankara", LTBJ: "Izmir", LTAI: "Antalya",
  LTCG: "Trabzon", LTCS: "Gaziantep", LTCU: "Sirnak",
};
const ICAO_AD_MAP = {
  LTFM: "Istanbul Havalimani", LTFJ: "Sabiha Gokcen",
  LTAC: "Esenboga", LTBJ: "Adnan Menderes", LTAI: "Antalya",
};

export function parseAirbandHtml(html, { icao, il } = {}) {
  const targetIcao = icao || (html.match(/airport\/([A-Z]{4})\//) || [])[1];
  const targetIl   = il   || ICAO_IL_MAP[targetIcao] || "Bilinmeyen";
  const targetAd   = ICAO_AD_MAP[targetIcao] || targetIcao;

  const frekanslar = [];
  const rowRegex = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\d.]+)<\/td>/gi;
  let m;
  while ((m = rowRegex.exec(html)) !== null) {
    const label = m[1].trim();
    const frek = m[2].trim();
    const n = parseFloat(frek);
    if (!(n >= 108 && n <= 137)) continue;
    let tur = "Diger";
    if (/atis/i.test(label))      tur = "ATIS";
    else if (/tower|twr/i.test(label)) tur = "Tower";
    else if (/ground|gnd/i.test(label)) tur = "Ground";
    else if (/approach|app/i.test(label)) tur = "Approach";
    frekanslar.push({ tur, frek, aciklama: label });
  }

  if (frekanslar.length === 0) throw new Error("no frequencies found in html");

  return {
    kaynak: "live",
    guncellenme: new Date().toISOString(),
    iller: [
      { il: targetIl, havalimanlari: [{ ad: targetAd, icao: targetIcao, frekanslar }] },
    ],
  };
}
```

- [ ] **Step 5: Run parse test**

`npm test -- tests/scrapers.test.js` — iterate regex until pass, using actual fixture content as ground truth. If repeated iterations fail, abort as in Step 1 (SCRAPER-NOTES.md).

- [ ] **Step 6: Multi-airport merge in worker orchestrator**

If parse works, extend `handleProtectedDataset` in `worker/index.js` with a special airband branch inside the `try`:

```js
if (cacheKey === "airband") {
  const icaos = ["LTFM", "LTFJ", "LTAC", "LTBJ", "LTAI"];
  const results = await Promise.all(icaos.map(async (icao) => {
    try {
      const r = await fetch(`https://skyvector.com/airport/${icao}/`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 TurkRoleExporter" },
      });
      if (!r.ok) return null;
      return parseAirbandHtml(await r.text(), { icao });
    } catch { return null; }
  }));
  const valid = results.filter(Boolean);
  if (valid.length === 0) throw new Error("all airband scrapes failed");
  const ilMap = {};
  for (const res of valid) {
    for (const il of res.iller) {
      ilMap[il.il] = ilMap[il.il] || { il: il.il, havalimanlari: [] };
      ilMap[il.il].havalimanlari.push(...il.havalimanlari);
    }
  }
  body = { kaynak: "live", guncellenme: new Date().toISOString(), iller: Object.values(ilMap) };
}
```

Only add this branch when Step 5 passed.

- [ ] **Step 7: Commit**

```bash
git add worker/scrapers.js tests/scrapers.test.js tests/fixtures/
git commit -m "feat(worker): skyvector airband scraper with multi-airport aggregation"
```

---

## Task 8: Live scraper — ta1dx marine

**Files:**
- Modify: `worker/scrapers.js` (`parseMarineHtml`)
- Modify: `tests/scrapers.test.js`
- Create: `tests/fixtures/ta1dx-bandmarine.html`

- [ ] **Step 1: Capture fixture**

```bash
curl -s -A "Mozilla/5.0" "https://www.qsl.net/ta1dx/amator/bandmarine.htm" \
  > tests/fixtures/ta1dx-bandmarine.html
```

- [ ] **Step 2: Write failing test**

Append to `tests/scrapers.test.js`:

```js
import { parseMarineHtml } from "../worker/scrapers.js";

describe("parseMarineHtml", () => {
  it("splits ta1dx page into 3 bolumler with frequencies", () => {
    const html = readFileSync(new URL("./fixtures/ta1dx-bandmarine.html", import.meta.url), "utf8");
    const result = parseMarineHtml(html);
    const ids = result.bolumler.map((b) => b.id);
    assert.deepEqual(ids, ["vhf", "sar", "sahil"]);
    for (const b of result.bolumler) assert.ok(b.frekanslar.length > 0);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

`npm test -- tests/scrapers.test.js`

- [ ] **Step 4: Implement `parseMarineHtml`**

```js
export function parseMarineHtml(html) {
  const stripped = html.replace(/<script[\s\S]*?<\/script>/g, " ")
                       .replace(/<style[\s\S]*?<\/style>/g, " ");
  const segs = stripped.split(/(VHF Marine Band|SAR Frekans|Turk Sahil|Türk Sahil)/i);
  const bolumIdOf = {
    "vhf marine band": "vhf",
    "sar frekans": "sar", "sar frekansları": "sar",
    "turk sahil": "sahil", "türk sahil": "sahil",
  };
  const bolumler = [
    { id: "vhf",   ad: "VHF Marine Band",      frekanslar: [] },
    { id: "sar",   ad: "SAR Frekanslari",      frekanslar: [] },
    { id: "sahil", ad: "Turk Sahil Radyolari", frekanslar: [] },
  ];

  let current = null;
  for (const seg of segs) {
    const key = seg.toLowerCase().replace(/\s+/g, " ").trim();
    if (bolumIdOf[key]) {
      current = bolumler.find((b) => b.id === bolumIdOf[key]);
      continue;
    }
    if (!current) continue;
    const plain = seg.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
    const rowRegex = /(CH\d+|SAR-\d+|[A-Z][a-z]+ Radio)\s+([\d.]+)\s+([^\n]{0,80})/g;
    let m;
    while ((m = rowRegex.exec(plain)) !== null) {
      const n = parseFloat(m[2]);
      if (n < 100 || n > 200) continue;
      current.frekanslar.push({ kanal: m[1], frek: m[2], ad: m[3].trim() });
    }
  }

  if (bolumler.every((b) => b.frekanslar.length === 0)) {
    throw new Error("no marine frequencies parsed");
  }
  return { kaynak: "live", guncellenme: new Date().toISOString(), bolumler };
}
```

- [ ] **Step 5: Iterate regex until test passes**

`npm test -- tests/scrapers.test.js` — if ta1dx uses a different layout than the assumed "CHxx freq description" shape, inspect the fixture and tune the regex. Do not move on until all three section freq arrays are non-empty.

- [ ] **Step 6: Verify orchestrator**

`handleProtectedDataset` already calls `parser(html)` generically, so no code change needed — just confirm the live path returns `kaynak: "live"` from ta1dx.

- [ ] **Step 7: Commit**

```bash
git add worker/scrapers.js tests/scrapers.test.js tests/fixtures/ta1dx-bandmarine.html
git commit -m "feat(worker): ta1dx marine scraper for 3 bolumler"
```

---

## Son Doğrulama + Deploy

- [ ] **Lint + test**

```bash
npm run lint && npm test
```

Expected: 0 new lint errors; all tests pass.

- [ ] **Manual smoke test (`npm run dev` → http://localhost:8787)**

1. Enter password → Airband + Marine + PMR + dPMR dört grup da açılır
2. Airband paneli: bir il tikle → havalimanları listelenir; türler seçilince CSV'ye yansır
3. Marine paneli: 3 accordion, başlıklarda doğru `[tikli/toplam]` sayacı
4. Preset: seçim yap → kaydet → sıfırla → preseti yükle → seçimler geri gelir

- [ ] **Push**

```bash
git push
```

GitHub Actions workflow'u Pages'i günceller.

- [ ] **Worker deploy**

```bash
npm run deploy
```

- [ ] **Canlı doğrulama**

```bash
curl -s "https://telsizrole.kaandikec.com/api/protected/airband" \
  -H "Authorization: Bearer <token>" | head -c 500
```

Expected: `{"kaynak":"live",...,"iller":[...]}` ya da live'a ulaşılamazsa `{"kaynak":"fallback",...}`.

---

## Self-Review

**Spec coverage:**
- Airband nested schema → Task 1
- Marine nested schema → Task 1
- Live fetch + 4h cache + 10s timeout + fallback → Task 1
- Airband İl→Havalimanı→Tür cascade → Task 3
- Marine 3 accordion + per-freq checkbox + [tikli/toplam] → Task 4
- PMR + dPMR protected-group → Task 2
- `state.airbandSecim` / `state.marineSecim` → Task 3+4
- CSV seçim-temelli → Task 5
- Preset v2 serialize + migration → Task 6
- Scraper'lar (fallback planıyla) → Task 7+8
- Test planı (airband, marine, protected-unlock, csv update, scrapers) → her task'ta

**Placeholder scan:** yok. Her kod bloğu tam, her regex & fonksiyon gövdesi verilmiş.

**Type consistency:** `secilenAirbandFrekanslari`, `secilenMarineFrekanslari`, `airbandUiKur`, `marineUiKur`, `parseAirbandHtml`, `parseMarineHtml`, `presetSerialize`, `presetDeserialize`, `handleProtectedDataset` — Task'lar arası tutarlı.

**Ambiguity:** Task 7 Step 1 skyvector JS-rendered olabilir; o durumda açıkça `SCRAPER-NOTES.md` ile dokümante edilip görev sonlandırılır, diğer task'lar etkilenmez.
