# Simplex Düzeltme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut "Dijital Simplex" özelliğindeki bug'ları gider; FM analog simplex desteğini ekle; ikisini de marine paterni gibi kullanıcının kanal-kanal seçebildiği iki ayrı checkbox + accordion paneli haline getir.

**Architecture:**
- Statik veri (`frekanslar.js`) iki dataset olarak yeniden yapılır (`FM_SIMPLEX`, `DIJITAL_SIMPLEX`).
- Marine UI paterninin generic versiyonu yeni `simplex-ui.js` modülünde implementasyon.
- CSV writer her cihaz formatı (CHIRP/CPS/OpenGD77) için doğru mod/tone/comment alanlarını yazar.
- `worker/index.js`'teki kullanılmayan `parseSimplex` ve `/api/tarole/simplex` route'ları temizlenir.

**Tech Stack:** Vanilla JavaScript ES modules, no build step. Tests via `node --test`. Cloudflare Worker arka uç.

**Spec:** `plans/superpowers/specs/2026-04-25-simplex-fix-design.md`

---

## File Structure

| Dosya | Sorumluluk | Aksiyon |
|---|---|---|
| `docs/js/frekanslar.js` | Statik frekans veri seti | `DIGITAL_SIMPLEX` silindi → `FM_SIMPLEX` + `DIJITAL_SIMPLEX`. `ekKanalSayisi`, `kanalDagilimi` güncel. |
| `docs/js/simplex-ui.js` | UI panel render + selection helper (yeni) | Yeni dosya. `secilenSimplexFrekanslari`, `simplexUiKur`. |
| `docs/css/style.css` | CSS sınıfları | `.marine-*` → `.list-*` rename (marine + simplex paylaşır). |
| `docs/js/marine-ui.js` | Marine accordion | Class isimleri `.list-*`'a güncellenir; logic değişmez. |
| `docs/js/state.js` | App state | Yeni alanlar: `fmSimplexEkle`, `fmSimplexSecim`, `dijitalSimplexEkle`, `dijitalSimplexSecim`. Eski `simplexEkle` kaldırılır. |
| `docs/js/presets.js` | Preset şeması | v2 → v3 migration. |
| `docs/js/csv.js` | CSV satır üreticileri | `chirpSatirlarUret`, `cpsSatirlarUret`, `opengd77SatirlarUret` üçünde de simplex bloğu yeniden yazıldı. |
| `docs/index.html` | UI markup | `opsiyon-simplex` → iki ayrı opsiyon + iki panel. |
| `docs/js/app.js` | UI wiring + uyarılar | Checkbox handler'lar, `simplexUiKur` çağrısı, dijital decode uyarısı güncellendi. |
| `worker/index.js` | Worker | `parseSimplex`, `parseTalkGruplar` korunur; `parseSimplex` ve `handleTaroleSimplex` silinir. |
| `tests/csv.test.js` | Unit testler | Yeni FM/dijital simplex test caseleri. |
| `tests/simplex.test.js` | Helper testleri (yeni) | `secilenSimplexFrekanslari` testleri. |

---

## Task 1: Veri yapısı — `FM_SIMPLEX` & `DIJITAL_SIMPLEX`

**Files:**
- Modify: `docs/js/frekanslar.js:418-435,441-485`

- [ ] **Step 1.1: Eski `DIGITAL_SIMPLEX` bloğunu sil ve yeni datasetleri ekle**

`docs/js/frekanslar.js:418-435`'i şu kodla değiştir:

```js
// ---------------------------------------------------------------------------
// FM Analog Simplex Frequencies (Türkiye band plani)
// ---------------------------------------------------------------------------

export const FM_SIMPLEX = {
  vhf: {
    id: "vhf",
    ad: "VHF FM Simplex",
    frekanslar: [
      { kanal: "V01", frek: 145.500,  ad: "VHF Calling", onemli: true,  mod: "FM"  },
      { kanal: "VSB", frek: 144.300,  ad: "SSB Calling", onemli: true,  mod: "USB" },
      { kanal: "V02", frek: 145.2125, ad: "Simplex 1",                  mod: "FM"  },
      { kanal: "V03", frek: 145.225,  ad: "Simplex 2",                  mod: "FM"  },
      { kanal: "V04", frek: 145.2375, ad: "Simplex 3",                  mod: "FM"  },
      { kanal: "V05", frek: 145.250,  ad: "Simplex 4",                  mod: "FM"  },
      { kanal: "V06", frek: 145.2625, ad: "Simplex 5",                  mod: "FM"  },
      { kanal: "V07", frek: 145.275,  ad: "Simplex 6",                  mod: "FM"  },
      { kanal: "V08", frek: 145.2875, ad: "Simplex 7",                  mod: "FM"  },
      { kanal: "V09", frek: 145.300,  ad: "Simplex 8",                  mod: "FM"  },
      { kanal: "V10", frek: 145.3125, ad: "Simplex 9",                  mod: "FM"  },
      { kanal: "V11", frek: 145.325,  ad: "Simplex 10",                 mod: "FM"  },
      { kanal: "V12", frek: 145.3375, ad: "Simplex 11",                 mod: "FM"  },
      { kanal: "V13", frek: 145.350,  ad: "Simplex 12",                 mod: "FM"  },
      { kanal: "V14", frek: 145.3625, ad: "Simplex 13",                 mod: "FM"  },
      { kanal: "V15", frek: 145.375,  ad: "Simplex 14",                 mod: "FM"  },
      { kanal: "V16", frek: 145.3875, ad: "Simplex 15",                 mod: "FM"  },
    ],
  },
  uhf: {
    id: "uhf",
    ad: "UHF FM Simplex",
    frekanslar: [
      { kanal: "U01", frek: 433.500,  ad: "UHF Calling", onemli: true, mod: "FM"  },
      { kanal: "USB", frek: 432.500,  ad: "UHF SSB",     onemli: true, mod: "USB" },
      { kanal: "U02", frek: 433.4000, ad: "Simplex 1",                 mod: "FM"  },
      { kanal: "U03", frek: 433.4125, ad: "Simplex 2",                 mod: "FM"  },
      { kanal: "U04", frek: 433.425,  ad: "Simplex 3",                 mod: "FM"  },
      { kanal: "U05", frek: 433.4625, ad: "Simplex 4",                 mod: "FM"  },
      { kanal: "U06", frek: 433.475,  ad: "Simplex 5",                 mod: "FM"  },
      { kanal: "U07", frek: 433.4875, ad: "Simplex 6",                 mod: "FM"  },
      { kanal: "U08", frek: 434.000,  ad: "Simplex 7",                 mod: "FM"  },
      { kanal: "U09", frek: 434.500,  ad: "Simplex 8",                 mod: "FM"  },
    ],
  },
};

// ---------------------------------------------------------------------------
// Dijital Simplex Frequencies
// ---------------------------------------------------------------------------

export const DIJITAL_SIMPLEX = {
  vhf: {
    id: "vhf",
    ad: "VHF Dijital Simplex",
    frekanslar: [
      { kanal: "DV1", frek: 144.5375, mod: "C4FM",   ad: "C4FM VHF" },
      { kanal: "DV2", frek: 144.5500, mod: "DMR",    ad: "DMR VHF",   param: "TG99 CC1 TS1" },
      { kanal: "DV3", frek: 144.5500, mod: "NXDN",   ad: "NXDN VHF",  param: "TG9 RAN1" },
      { kanal: "DV4", frek: 144.5625, mod: "D-STAR", ad: "DSTAR VHF" },
    ],
  },
  uhf: {
    id: "uhf",
    ad: "UHF Dijital Simplex",
    frekanslar: [
      { kanal: "DU1", frek: 433.4375, mod: "C4FM",   ad: "C4FM UHF" },
      { kanal: "DU2", frek: 433.4500, mod: "DMR",    ad: "DMR UHF",   param: "TG99 CC1 TS1" },
      { kanal: "DU3", frek: 433.4500, mod: "NXDN",   ad: "NXDN UHF",  param: "TG9 RAN1" },
      { kanal: "DU4", frek: 433.4625, mod: "D-STAR", ad: "DSTAR UHF" },
    ],
  },
};
```

- [ ] **Step 1.2: `ekKanalSayisi` ve `kanalDagilimi`'yi güncelle**

`docs/js/frekanslar.js:441-485` (mevcut iki simplex check'ini değiştir):

```js
// ekKanalSayisi içinde:
if (opsiyonlar.fmSimplexEkle) {
  const fm = secilenSimplexFrekanslari(FM_SIMPLEX, opsiyonlar.fmSimplexSecim);
  toplam += fm.length;
}
if (opsiyonlar.dijitalSimplexEkle) {
  const dij = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, opsiyonlar.dijitalSimplexSecim);
  toplam += dij.length;
}

// kanalDagilimi içinde:
if (opsiyonlar.fmSimplexEkle) {
  const n = secilenSimplexFrekanslari(FM_SIMPLEX, opsiyonlar.fmSimplexSecim).length;
  if (n > 0) items.push({ ad: "FM Simplex", sayi: n });
}
if (opsiyonlar.dijitalSimplexEkle) {
  const n = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, opsiyonlar.dijitalSimplexSecim).length;
  if (n > 0) items.push({ ad: "Dijital Simplex", sayi: n });
}
```

Eski `simplexEkle` kontrolünü tamamen sil.

Dosyanın en üstüne import ekle:

```js
// frekanslar.js'in EN ÜSTÜ (line 1 civarı, normalizeTurkce import'ından sonra)
import { secilenSimplexFrekanslari } from "./simplex-ui.js";
```

- [ ] **Step 1.3: Verify**

```bash
node -e "import('./docs/js/frekanslar.js').then(m => { console.log('FM_SIMPLEX:', !!m.FM_SIMPLEX); console.log('DIJITAL_SIMPLEX:', !!m.DIJITAL_SIMPLEX); console.log('DIGITAL_SIMPLEX still exists:', !!m.DIGITAL_SIMPLEX); }).catch(e => console.error(e.message))"
```

Expected: `FM_SIMPLEX: true`, `DIJITAL_SIMPLEX: true`, `DIGITAL_SIMPLEX still exists: false`. (Modül `simplex-ui.js`'in henüz olmaması hata atar — bu Task 2'den sonra düzelecek.)

---

## Task 2: `secilenSimplexFrekanslari` helper + tests

**Files:**
- Create: `docs/js/simplex-ui.js` (sadece helper bölümü, DOM Task 4'te)
- Create: `tests/simplex.test.js`

- [ ] **Step 2.1: Failing test yaz**

`tests/simplex.test.js` oluştur:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { secilenSimplexFrekanslari } from "../docs/js/simplex-ui.js";
import { FM_SIMPLEX, DIJITAL_SIMPLEX } from "../docs/js/frekanslar.js";

describe("secilenSimplexFrekanslari", () => {
  it("seçimi olan bantları flat liste olarak döner", () => {
    const out = secilenSimplexFrekanslari(FM_SIMPLEX, { vhf: ["V01"], uhf: ["U01"] });
    assert.equal(out.length, 2);
    assert.equal(out[0].kanal, "V01");
    assert.equal(out[0].bolum, "vhf");
    assert.equal(out[1].kanal, "U01");
    assert.equal(out[1].bolum, "uhf");
  });

  it("boş seçimde boş liste döner", () => {
    const out = secilenSimplexFrekanslari(FM_SIMPLEX, { vhf: [], uhf: [] });
    assert.equal(out.length, 0);
  });

  it("dataset null ise boş liste döner", () => {
    assert.deepEqual(secilenSimplexFrekanslari(null, { vhf: ["V01"] }), []);
  });

  it("dijital dataset DMR mod ve param alanlarını korur", () => {
    const out = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, { vhf: ["DV2"], uhf: [] });
    assert.equal(out.length, 1);
    assert.equal(out[0].mod, "DMR");
    assert.equal(out[0].param, "TG99 CC1 TS1");
  });

  it("var olmayan kanal seçimi sessizce yok sayılır", () => {
    const out = secilenSimplexFrekanslari(FM_SIMPLEX, { vhf: ["YOKBOYLE"], uhf: [] });
    assert.equal(out.length, 0);
  });
});
```

- [ ] **Step 2.2: Test'in fail ettiğini doğrula**

```bash
npm test 2>&1 | tail -20
```

Expected: `Cannot find module '../docs/js/simplex-ui.js'` veya benzeri import hatası.

- [ ] **Step 2.3: `simplex-ui.js` helper bölümünü yaz**

`docs/js/simplex-ui.js` oluştur:

```js
/**
 * simplex-ui.js
 * FM ve dijital simplex picker'ları (marine-ui ile aynı pattern).
 */

import { state } from "./state.js";

/**
 * Flatten simplex dataset by user selection.
 * @param {{vhf:{frekanslar:Array}, uhf:{frekanslar:Array}}} dataset
 * @param {{vhf?:string[], uhf?:string[]}} secim
 * @returns {Array<{kanal,frek,ad,mod,param,bolum,onemli}>}
 */
export function secilenSimplexFrekanslari(dataset, secim) {
  if (!dataset) return [];
  if (!secim) return [];
  const out = [];
  for (const bolumId of ["vhf", "uhf"]) {
    const bolum = dataset[bolumId];
    if (!bolum || !Array.isArray(bolum.frekanslar)) continue;
    const sec = Array.isArray(secim[bolumId]) ? secim[bolumId] : [];
    if (sec.length === 0) continue;
    for (const f of bolum.frekanslar) {
      if (sec.includes(f.kanal)) {
        out.push({
          kanal: f.kanal,
          frek: f.frek,
          ad: f.ad || f.kanal,
          mod: f.mod || "FM",
          param: f.param || "",
          bolum: bolumId,
          onemli: !!f.onemli,
        });
      }
    }
  }
  return out;
}
```

- [ ] **Step 2.4: Test'in geçtiğini doğrula**

```bash
npm test 2>&1 | tail -20
```

Expected: simplex.test.js'teki 5 test pass. csv.test.js mevcut testler de bozulmamalı (henüz csv.js değişmedi).

- [ ] **Step 2.5: Commit**

```bash
git add docs/js/frekanslar.js docs/js/simplex-ui.js tests/simplex.test.js
git commit -m "$(cat <<'EOF'
feat(simplex): add FM_SIMPLEX/DIJITAL_SIMPLEX datasets and selection helper

Replaces the flat DIGITAL_SIMPLEX export with two banded datasets that
match the marine-style picker shape. New secilenSimplexFrekanslari()
helper returns a flat list filtered by user selection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: CSS sınıflarını generic adlandır (`.marine-*` → `.list-*`)

**Files:**
- Modify: `docs/css/style.css:1335-1348`
- Modify: `docs/js/marine-ui.js:55,58,62,75,92`

- [ ] **Step 3.1: CSS sınıflarını yeniden adlandır**

`docs/css/style.css:1335-1348` bloğunu değiştir:

```css
/* List-style accordion picker (marine, simplex paylaşır) */
.list-bolum { margin: 8px 0; border: 1px solid var(--border); border-radius: 8px;
              padding: 8px; background: var(--surface-2); }
.list-bolum[open] { background: var(--surface); }
.list-bolum-sum { cursor: pointer; font-weight: 600; display: flex;
                  justify-content: space-between; padding: 4px 0; color: var(--text); }
.list-count { color: var(--text-muted); font-weight: 400; font-size: 0.85rem; }
.list-toggle-all { background: none; border: 1px solid var(--border);
                   color: var(--text-muted); padding: 2px 8px; margin: 6px 0;
                   border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
.list-toggle-all:hover { color: var(--text); border-color: var(--accent); }
.list-row { display: flex; align-items: center; gap: 6px; padding: 4px 0;
            font-size: 0.9rem; color: var(--text); cursor: pointer; }
.list-row:hover { background: var(--surface-2); }
.list-row-onemli { font-weight: 600; }
```

(`.list-row-onemli` Task 4'te `onemli: true` frekansları görsel ayırır.)

- [ ] **Step 3.2: `marine-ui.js` class isimlerini güncelle**

`docs/js/marine-ui.js`'te şu satırlar:
- `:55` `det.className = "marine-bolum"` → `det.className = "list-bolum"`
- `:58` `sum.className = "marine-bolum-sum"` → `"list-bolum-sum"`
- `:62` `count.className = "marine-count"` → `"list-count"`
- `:75` `toggleAll.className = "marine-toggle-all"` → `"list-toggle-all"`
- `:92` `lbl.className = "marine-row"` → `"list-row"`

- [ ] **Step 3.3: Verify — marine paneli görsel olarak hâlâ doğru**

Tarayıcıda `index.html` aç, "Denizcilik Kanalları" panelini genişlet. Accordion görünümü, count rozeti, "Hepsi/Hicbiri" butonu, hover stili eskisi gibi olmalı (renk/padding değişmemeli).

- [ ] **Step 3.4: Commit**

```bash
git add docs/css/style.css docs/js/marine-ui.js
git commit -m "$(cat <<'EOF'
refactor(css): rename .marine-* picker classes to generic .list-*

Marine and simplex pickers will share the same accordion styling.
Adds .list-row-onemli for the upcoming simplex picker's calling-channel
emphasis. Marine UI logic unchanged; only class names updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `simplexUiKur` DOM rendering

**Files:**
- Modify: `docs/js/simplex-ui.js` (DOM bölümünü ekle)

- [ ] **Step 4.1: `simplexUiKur` fonksiyonunu ekle**

`docs/js/simplex-ui.js`'in sonuna ekle:

```js
function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Renders an accordion picker for a simplex dataset.
 * @param {HTMLElement} panelEl
 * @param {{vhf,uhf}} dataset
 * @param {string} secimKey  state alan adı (örn. "fmSimplexSecim", "dijitalSimplexSecim")
 * @param {string} eventName  selection değiştiğinde dispatch edilecek custom event
 */
export function simplexUiKur(panelEl, dataset, secimKey, eventName) {
  if (!panelEl || !dataset) return;
  clearChildren(panelEl);

  for (const bolumId of ["vhf", "uhf"]) {
    const bolum = dataset[bolumId];
    if (!bolum) continue;

    const det = document.createElement("details");
    det.className = "list-bolum";

    const sum = document.createElement("summary");
    sum.className = "list-bolum-sum";
    const title = document.createElement("span");
    title.textContent = bolum.ad;
    const count = document.createElement("span");
    count.className = "list-count";
    sum.appendChild(title);
    sum.appendChild(count);
    det.appendChild(sum);

    const refreshCount = () => {
      const sec = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
      count.textContent = `[${sec.length}/${bolum.frekanslar.length}]`;
    };
    refreshCount();

    const toggleAll = document.createElement("button");
    toggleAll.type = "button";
    toggleAll.className = "list-toggle-all";
    toggleAll.textContent = "Hepsi / Hicbiri";
    toggleAll.addEventListener("click", (e) => {
      e.preventDefault();
      const sec = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
      const hepsi = bolum.frekanslar.map((f) => f.kanal);
      state[secimKey][bolumId] = sec.length === hepsi.length ? [] : hepsi;
      det.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = state[secimKey][bolumId].includes(cb.dataset.kanal);
      });
      refreshCount();
      document.dispatchEvent(new CustomEvent(eventName));
    });
    det.appendChild(toggleAll);

    for (const f of bolum.frekanslar) {
      const lbl = document.createElement("label");
      lbl.className = f.onemli ? "list-row list-row-onemli" : "list-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.kanal = f.kanal;
      const mevcut = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
      cb.checked = mevcut.includes(f.kanal);
      cb.addEventListener("change", () => {
        const sec = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
        if (cb.checked) state[secimKey][bolumId] = [...new Set([...sec, f.kanal])];
        else state[secimKey][bolumId] = sec.filter((x) => x !== f.kanal);
        refreshCount();
        document.dispatchEvent(new CustomEvent(eventName));
      });
      lbl.appendChild(cb);
      const text = document.createElement("span");
      const modBilgi = f.mod && f.mod !== "FM" ? ` ${f.mod}` : "";
      text.textContent = ` ${f.kanal}  ${f.frek}${modBilgi}  ${f.ad}`;
      lbl.appendChild(text);
      det.appendChild(lbl);
    }

    panelEl.appendChild(det);
  }
}
```

- [ ] **Step 4.2: Lint kontrolü**

```bash
npm run lint 2>&1 | grep -E "(simplex-ui|error|warning)" | head -10
```

Expected: simplex-ui.js'te yeni hata yok (mevcut harita.js/index.js warning'leri kalır).

- [ ] **Step 4.3: Commit**

```bash
git add docs/js/simplex-ui.js
git commit -m "feat(simplex): add simplexUiKur DOM renderer (marine-style accordion)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: State + preset migration

**Files:**
- Modify: `docs/js/state.js:7-30`
- Modify: `docs/js/presets.js:10,16-27,33-54`

- [ ] **Step 5.1: `state.js`'e yeni alanlar ekle**

`docs/js/state.js:18` (marineSecim'den sonra) ekle:

```js
fmSimplexSecim:      { vhf: ["V01", "VSB"], uhf: ["U01", "USB"] },
dijitalSimplexSecim: { vhf: [], uhf: [] },
```

Eski `simplexEkle` referansı `state.js`'te yok, sadece opsiyon objelerinde — orada kalsın, app.js'de kaldıracağız.

- [ ] **Step 5.2: Preset şemasını v3'e bump et**

`docs/js/presets.js:10`:

```js
const PRESET_VERSION = 3;
```

`docs/js/presets.js:16-27` `presetSerialize`'a yeni alanlar:

```js
export function presetSerialize(obj) {
  return JSON.stringify({
    version: PRESET_VERSION,
    airbandSecim: obj.airbandSecim || { iller: [], havalimanlari: {} },
    marineSecim:  obj.marineSecim  || { vhf: [], sar: [], sahil: [] },
    fmSimplexSecim:      obj.fmSimplexSecim      || { vhf: [], uhf: [] },
    dijitalSimplexSecim: obj.dijitalSimplexSecim || { vhf: [], uhf: [] },
    opsiyonlar: obj.opsiyonlar || {},
    filtreler:  obj.filtreler  || {},
    cihaz:      obj.cihaz || null,
    ad:         obj.ad || null,
    tarih:      obj.tarih || null,
  });
}
```

- [ ] **Step 5.3: `presetDeserialize`'a v2 → v3 migration ekle**

`docs/js/presets.js:33-54`'ü değiştir:

```js
export function presetDeserialize(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const airband = parsed.airbandSecim || {};
  const marine  = parsed.marineSecim  || {};
  const fmSx    = parsed.fmSimplexSecim || {};
  const dijSx   = parsed.dijitalSimplexSecim || {};
  const opsiyonlar = { ...(parsed.opsiyonlar || {}) };

  // v2 → v3 migration: simplexEkle (boolean) → dijitalSimplexEkle (true) + tum dijital frekanslar secili
  if ((parsed.version || 0) < 3 && opsiyonlar.simplexEkle === true) {
    opsiyonlar.dijitalSimplexEkle = true;
    opsiyonlar.fmSimplexEkle = false;
    if (!Array.isArray(dijSx.vhf) || dijSx.vhf.length === 0) {
      dijSx.vhf = ["DV1", "DV2", "DV3", "DV4"];
    }
    if (!Array.isArray(dijSx.uhf) || dijSx.uhf.length === 0) {
      dijSx.uhf = ["DU1", "DU2", "DU3", "DU4"];
    }
  }
  delete opsiyonlar.simplexEkle;

  return {
    airbandSecim: {
      iller: Array.isArray(airband.iller) ? airband.iller : [],
      havalimanlari: (airband.havalimanlari && typeof airband.havalimanlari === "object")
        ? airband.havalimanlari : {},
    },
    marineSecim: {
      vhf:   Array.isArray(marine.vhf)   ? marine.vhf   : [],
      sar:   Array.isArray(marine.sar)   ? marine.sar   : [],
      sahil: Array.isArray(marine.sahil) ? marine.sahil : [],
    },
    fmSimplexSecim: {
      vhf: Array.isArray(fmSx.vhf) ? fmSx.vhf : [],
      uhf: Array.isArray(fmSx.uhf) ? fmSx.uhf : [],
    },
    dijitalSimplexSecim: {
      vhf: Array.isArray(dijSx.vhf) ? dijSx.vhf : [],
      uhf: Array.isArray(dijSx.uhf) ? dijSx.uhf : [],
    },
    opsiyonlar,
    filtreler:  parsed.filtreler  || {},
    cihaz:      parsed.cihaz || null,
    ad:         parsed.ad || null,
    tarih:      parsed.tarih || null,
  };
}
```

- [ ] **Step 5.4: `presetKaydet`'i state'in yeni alanlarını içerecek şekilde güncelle**

`docs/js/presets.js:68-85` içindeki `presetSerialize` çağrısına ekle:

```js
const preset = JSON.parse(presetSerialize({
  ad,
  tarih: new Date().toISOString(),
  cihaz: typeof seciliCihaz === "function" ? seciliCihaz() : seciliCihaz,
  filtreler: filtreTopla(),
  opsiyonlar: opsiyonTopla(),
  airbandSecim: state.airbandSecim,
  marineSecim:  state.marineSecim,
  fmSimplexSecim:      state.fmSimplexSecim,
  dijitalSimplexSecim: state.dijitalSimplexSecim,
}));
```

- [ ] **Step 5.5: Migration testi**

`tests/simplex.test.js`'e ekle:

```js
import { presetDeserialize } from "../docs/js/presets.js";

describe("preset v2 → v3 migration", () => {
  it("simplexEkle:true olan v2 preseti dijitalSimplexEkle ve tüm dijital kanallarla migrate eder", () => {
    const v2 = {
      version: 2,
      opsiyonlar: { simplexEkle: true, pmrEkle: false },
      airbandSecim: {},
      marineSecim:  {},
    };
    const out = presetDeserialize(v2);
    assert.equal(out.opsiyonlar.dijitalSimplexEkle, true);
    assert.equal(out.opsiyonlar.fmSimplexEkle, false);
    assert.equal(out.opsiyonlar.simplexEkle, undefined);
    assert.deepEqual(out.dijitalSimplexSecim.vhf, ["DV1", "DV2", "DV3", "DV4"]);
    assert.deepEqual(out.dijitalSimplexSecim.uhf, ["DU1", "DU2", "DU3", "DU4"]);
  });

  it("v3 preset'i olduğu gibi kalır", () => {
    const v3 = {
      version: 3,
      opsiyonlar: { dijitalSimplexEkle: false, fmSimplexEkle: true },
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
      dijitalSimplexSecim: { vhf: [], uhf: [] },
      airbandSecim: {}, marineSecim: {},
    };
    const out = presetDeserialize(v3);
    assert.equal(out.opsiyonlar.fmSimplexEkle, true);
    assert.deepEqual(out.fmSimplexSecim.vhf, ["V01"]);
  });
});
```

```bash
npm test 2>&1 | tail -10
```

Expected: yeni 2 migration testi pass. Önceki testler hâlâ pass.

- [ ] **Step 5.6: Commit**

```bash
git add docs/js/state.js docs/js/presets.js tests/simplex.test.js
git commit -m "$(cat <<'EOF'
feat(presets): bump to v3, add fm/dijital simplex selection state

v2 presets with simplexEkle=true automatically migrate to
dijitalSimplexEkle=true with all four digital frequencies pre-selected
in each band, so existing user presets keep working unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: CHIRP CSV writer — FM + dijital simplex satırları

**Files:**
- Modify: `docs/js/csv.js:10-11,136-149`
- Modify: `tests/csv.test.js`

- [ ] **Step 6.1: Failing testler yaz**

`tests/csv.test.js`'in defaultOpsiyonlar (line 51-71)'i güncelle: `simplexEkle` kaldır, yenilerini ekle:

```js
const defaultOpsiyonlar = {
  pmrEkle: false,
  pmrRxOnly: false,
  dpmrEkle: false,
  dpmrRxOnly: false,
  fmRadyoEkle: false,
  fmSehirler: [],
  airbandEkle: false,
  airbandSecili: [],
  marineEkle: false,
  marineSecili: [],
  fmSimplexEkle: false,
  fmSimplexSecim: { vhf: [], uhf: [] },
  dijitalSimplexEkle: false,
  dijitalSimplexSecim: { vhf: [], uhf: [] },
  rxOnly: true,
  gucSeviyesi: "High",
  kanalAdiFormati: "plaka-konum-bant",
  dosyaAdi: "test.csv",
  bosAnalogAdet: 0,
  bosAnalogFrekans: "145.500",
  bosDijitalAdet: 0,
  bosDijitalFrekans: "438.500",
};
```

Aynı dosyaya yeni describe bloğu ekle:

```js
describe("CHIRP simplex satırları", () => {
  it("FM simplex açıkken seçili kanallar Mode=FM ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: ["U01"] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    assert.equal(satirlar.length, 2);
    const v01 = satirlar.find(r => parseFloat(r[2]) === 145.5);
    assert.ok(v01, "V01 satırı bulunamadı");
    assert.equal(v01[12], "FM");          // Mode
    assert.equal(v01[6], "");             // rToneFreq boş
    assert.equal(v01[5], "");             // Tone field boş
  });

  it("USB modu olan SSB Calling kanalı Mode=USB ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["VSB"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    const sb = satirlar.find(r => parseFloat(r[2]) === 144.3);
    assert.equal(sb[12], "USB");
  });

  it("dijital simplex analog cihazda Duplex=off (RX-only) yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV2"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    const dmr = satirlar.find(r => parseFloat(r[2]) === 144.55);
    assert.ok(dmr);
    assert.equal(dmr[3], "off");                 // Duplex
    assert.equal(dmr[12], "FM");                  // Mode (analog cihaz)
    assert.equal(dmr[14], "S");                   // Skip
    if (chirpProfil.csvSutunlari.includes("Comment")) {
      const cmt = chirpProfil.csvSutunlari.indexOf("Comment");
      assert.match(dmr[cmt], /DMR/);
      assert.match(dmr[cmt], /TG99/);
    }
  });

  it("hiçbir simplex açık değilse simplex satırı eklenmez", () => {
    const { satirlar } = csvSatirlarUret([], chirpProfil, defaultOpsiyonlar);
    assert.equal(satirlar.length, 0);
  });
});
```

- [ ] **Step 6.2: Test fail ettiğini doğrula**

```bash
npm test 2>&1 | tail -30
```

Expected: yeni 4 test fail (eski `simplexEkle` block'u dijital simplex satırlarını yanlış yazıyor; FM simplex hiç desteklenmiyor).

- [ ] **Step 6.3: `csv.js` import'u güncelle**

`docs/js/csv.js:8-11`:

```js
import {
  fmIstasyonlariGetir,
  FM_SIMPLEX,
  DIJITAL_SIMPLEX,
} from "./frekanslar.js";
import { secilenSimplexFrekanslari } from "./simplex-ui.js";
```

(Eski `DIGITAL_SIMPLEX` import'u kaldırıldı.)

- [ ] **Step 6.4: CHIRP simplex bloğunu yeniden yaz**

`docs/js/csv.js:136-149`'u sil ve yerine koy:

```js
  // FM Simplex
  if (opsiyonlar.fmSimplexEkle) {
    const fmList = secilenSimplexFrekanslari(FM_SIMPLEX, opsiyonlar.fmSimplexSecim);
    for (const sx of fmList) {
      const col = boslukSatir(n);
      col[0] = String(loc++);
      col[1] = `${sx.kanal}-${sx.ad.replace(/\s+/g, "")}`.slice(0, maxAd);
      col[2] = parseFloat(sx.frek).toFixed(6);
      col[3] = ""; col[4] = "0.000000";
      col[5] = ""; col[6] = ""; col[7] = "";   // tone yok
      col[8] = d.dtcsCode; col[9] = d.dtcsPolarity; col[10] = d.rxDtcsCode;
      col[11] = d.crossMode;
      col[12] = sx.mod === "USB" ? "USB" : "FM";
      col[13] = "12.50";
      col[14] = ""; col[15] = guc;
      if (n > 16) col[16] = sx.ad;             // Comment kolonu varsa
      rows.push(col);
    }
  }

  // Dijital Simplex (analog cihazlarda RX-only FM olarak; cihaz dijital decode edemez)
  if (opsiyonlar.dijitalSimplexEkle) {
    const dijList = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, opsiyonlar.dijitalSimplexSecim);
    for (const sx of dijList) {
      const col = boslukSatir(n);
      col[0] = String(loc++);
      col[1] = `${sx.mod.replace("-", "").slice(0, 4)}-${sx.bolum.toUpperCase()}`.slice(0, maxAd);
      col[2] = parseFloat(sx.frek).toFixed(6);
      col[3] = "off"; col[4] = "0.000000";    // RX-only
      col[5] = ""; col[6] = ""; col[7] = "";   // tone yok
      col[8] = d.dtcsCode; col[9] = d.dtcsPolarity; col[10] = d.rxDtcsCode;
      col[11] = d.crossMode;
      col[12] = "FM";                           // analog cihaz dijital decode edemez
      col[13] = "12.50";
      col[14] = "S";                            // Skip on
      col[15] = guc;
      if (n > 16) col[16] = `${sx.mod} ${sx.param || ""}`.trim();
      rows.push(col);
    }
  }
```

- [ ] **Step 6.5: Test pass kontrolü**

```bash
npm test 2>&1 | tail -20
```

Expected: yeni 4 CHIRP simplex testi PASS, mevcut testler hâlâ PASS.

- [ ] **Step 6.6: Commit**

```bash
git add docs/js/csv.js tests/csv.test.js
git commit -m "$(cat <<'EOF'
fix(csv): rewrite CHIRP simplex serializer with FM/digital split

Removes hardcoded Tone="88.5" / Mode="FM" injection on every simplex
row. FM simplex respects per-channel mod (FM/USB). Digital simplex on
analog devices is force-marked Duplex=off + Skip=S so the radio treats
it as RX-only without unintended squelch tones.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: CPS (MD-UV390) CSV writer — simplex satırları

**Files:**
- Modify: `docs/js/csv.js` (CPS bölümünde simplex eklenecek — şu an hiç yok)
- Modify: `tests/csv.test.js`

- [ ] **Step 7.1: Failing test yaz**

`tests/csv.test.js`'in en üstüne minimal CPS profili ekle (chirpProfil'in altına):

```js
const cpsProfil = {
  csvFormat: "cps",
  csvSutunlari: [
    "Channel Mode", "Channel Name", "RX Frequency(MHz)", "TX Frequency(MHz)",
    "Band Width", "Scan List", "Squelch", "RX Ref Frequency", "TX Ref Frequency",
    "TOT[s]", "TOT Rekey Delay[s]", "Power", "Admit Criteria", "Auto Scan",
    "Rx Only", "Lone Worker", "VOX", "Allow Talkaround", "Send GPS Info",
    "Receive GPS Info", "Private Call Confirmed", "Emergency Alarm Ack",
    "Data Call Confirmed", "Allow Interrupt", "DCDM Switch", "Leader/MS",
    "Emergency System", "Contact Name", "Group List", "Color Code",
    "Repeater Slot", "In Call Criteria", "Privacy", "Privacy No.", "GPS System",
    "CTCSS/DCS Dec", "CTCSS/DCS Enc", "Rx Signaling System", "Tx Signaling System",
    "QT Reverse", "Non-QT/DQT Turn-off Freq", "Display PTT ID",
    "Reverse Burst/Turn-off Code", "Decode 1", "Decode 2", "Decode 3",
    "Decode 4", "Decode 5", "Decode 6", "Decode 7", "Decode 8",
  ],
  varsayilanDegerler: {
    bandWidth: "0", squelch: "3", tot: "4", power: "2",
    leaderMS: "1", contactName: "1", groupList: "1", colorCode: "1",
    nonQtDqt: "2", displayPtt: "1", reverseBurst: "1",
  },
  shiftHesaplama: { VHF: -0.6, UHF: -7.6 },
  gucSeviyeleri: { High: "2", Mid: "1", Low: "0" },
  maxKanalAdi: 16,
  bantlar: ["VHF", "UHF"],
  modlar: ["Analog", "Dijital"],
  maxKanal: 3000,
};
```

`describe` ekle:

```js
describe("CPS simplex satırları", () => {
  it("FM simplex Channel Mode=1 (analog) ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], cpsProfil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][0], "1");                // Channel Mode = Analog
    assert.equal(satirlar[0][2], "145.50000");        // RX 5 decimal
    assert.equal(satirlar[0][36], "None");            // CTCSS/DCS Enc
  });

  it("dijital simplex Channel Mode=2 (DMR) ile Color Code+TimeSlot yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV2"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], cpsProfil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][0], "2");                // Channel Mode = Digital
    assert.equal(satirlar[0][29], "1");               // Color Code from "TG99 CC1 TS1"
    assert.equal(satirlar[0][30], "1");               // Repeater Slot
  });
});
```

- [ ] **Step 7.2: Fail doğrula**

```bash
npm test 2>&1 | tail -20
```

Expected: 2 yeni CPS test fail (CPS writer'a simplex eklenmemiş).

- [ ] **Step 7.3: `cpsSatirlarUret` fonksiyonuna simplex blokları ekle**

`docs/js/csv.js:240-250` (mevcut "Empty digital" bloğunun ÖNÜNE) ekle:

```js
  // FM Simplex (Analog)
  if (opsiyonlar.fmSimplexEkle) {
    const fmList = secilenSimplexFrekanslari(FM_SIMPLEX, opsiyonlar.fmSimplexSecim);
    for (const sx of fmList) {
      const col = Array(n).fill("0");
      const f = parseFloat(sx.frek).toFixed(5);
      col[0] = "1";                                   // Channel Mode = Analog
      col[1] = `${sx.kanal}-${sx.ad}`.slice(0, 16);
      col[2] = f; col[3] = f;
      col[4] = d.bandWidth; col[6] = d.squelch; col[9] = d.tot; col[11] = guc;
      col[14] = "0"; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
      col[35] = "None"; col[36] = "None";
      col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      rows.push(col);
    }
  }

  // Dijital Simplex (DMR)
  if (opsiyonlar.dijitalSimplexEkle) {
    const dijList = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, opsiyonlar.dijitalSimplexSecim);
    for (const sx of dijList) {
      const col = Array(n).fill("0");
      const f = parseFloat(sx.frek).toFixed(5);
      // param örn. "TG99 CC1 TS1" → CC=1, TS=1
      const ccMatch = (sx.param || "").match(/CC(\d+)/);
      const tsMatch = (sx.param || "").match(/TS(\d+)/);
      const cc = ccMatch ? ccMatch[1] : d.colorCode;
      const ts = tsMatch ? tsMatch[1] : "1";
      col[0] = "2";                                   // Channel Mode = Digital (DMR)
      col[1] = `${sx.mod}-${sx.bolum.toUpperCase()}`.slice(0, 16);
      col[2] = f; col[3] = f;
      col[4] = d.bandWidth; col[6] = d.squelch; col[9] = d.tot; col[11] = guc;
      col[14] = "0"; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList;
      col[29] = cc;                                   // Color Code
      col[30] = ts;                                   // Repeater Slot
      col[35] = "None"; col[36] = "None";
      col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      rows.push(col);
    }
  }
```

- [ ] **Step 7.4: Pass doğrula**

```bash
npm test 2>&1 | tail -20
```

Expected: 2 CPS testi PASS.

- [ ] **Step 7.5: Commit**

```bash
git add docs/js/csv.js tests/csv.test.js
git commit -m "feat(csv): add CPS simplex serializer for MD-UV390 family

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: OpenGD77 CSV writer — simplex satırları

**Files:**
- Modify: `docs/js/csv.js:316-324`
- Modify: `tests/csv.test.js`

- [ ] **Step 8.1: Failing test yaz**

`tests/csv.test.js`'e ekle:

```js
const opengd77Profil = {
  csvFormat: "opengd77",
  csvSutunlari: [
    "Channel Number", "Channel Name", "Channel Type", "Rx Frequency", "Tx Frequency",
    "Bandwidth (kHz)", "Colour Code", "Timeslot", "Contact", "TG List", "DMR ID",
    "TS1_TA_Tx", "TS2_TA_Tx ID", "RX Tone", "TX Tone", "Squelch", "Power",
    "Rx Only", "Zone Skip", "All Skip", "TOT", "VOX", "No Beep", "No Eco",
    "APRS", "Latitude", "Longitude", "Use Location",
  ],
  varsayilanDegerler: { bandwidth: "12.5", colourCode: "1", timeslot: "1", tgList: "None", dmrId: "None", squelch: "Disabled" },
  gucSeviyeleri: { Master: "Master" },
  maxKanalAdi: 16,
  bantlar: ["VHF", "UHF"], modlar: ["Analog", "Dijital"], maxKanal: 1023,
  shiftHesaplama: { VHF: -0.6, UHF: -7.6 },
};

describe("OpenGD77 simplex satırları", () => {
  it("FM simplex Channel Type=Analogue ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      gucSeviyesi: "Master",
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], opengd77Profil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][2], "Analogue");
  });

  it("dijital simplex Channel Type=Digital + Colour Code/Timeslot doğru yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      gucSeviyesi: "Master",
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV2"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], opengd77Profil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][2], "Digital");
    assert.equal(satirlar[0][6], "1");          // Colour Code
    assert.equal(satirlar[0][7], "1");          // Timeslot
  });
});
```

- [ ] **Step 8.2: Fail doğrula**

```bash
npm test 2>&1 | tail -10
```

Expected: 2 OpenGD77 testi fail.

- [ ] **Step 8.3: `opengd77SatirlarUret`'i güncelle**

`docs/js/csv.js:316-324`'ü değiştir:

```js
  // FM Simplex (Analogue)
  if (opsiyonlar.fmSimplexEkle) {
    const fmList = secilenSimplexFrekanslari(FM_SIMPLEX, opsiyonlar.fmSimplexSecim);
    for (const sx of fmList) {
      const f = parseFloat(sx.frek);
      const isim = `${sx.kanal}-${sx.ad}`.slice(0, maxAd);
      rows.push(opengd77Satir(profil, loc++, isim, f, f, false, null, false, gucLabel));
    }
  }

  // Dijital Simplex
  if (opsiyonlar.dijitalSimplexEkle) {
    const dijList = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, opsiyonlar.dijitalSimplexSecim);
    for (const sx of dijList) {
      const f = parseFloat(sx.frek);
      const isim = `${sx.mod.replace("-", "").slice(0, 4)}-${sx.bolum.toUpperCase()}`.slice(0, maxAd);
      const isDmrLike = sx.mod === "DMR" || sx.mod === "C4FM" || sx.mod === "D-STAR" || sx.mod === "NXDN";
      rows.push(opengd77Satir(profil, loc++, isim, f, f, isDmrLike, null, false, gucLabel));
    }
  }
```

- [ ] **Step 8.4: Pass doğrula**

```bash
npm test 2>&1 | tail -10
```

Expected: 2 OpenGD77 testi PASS, toplam 65+ test passing.

- [ ] **Step 8.5: Commit**

```bash
git add docs/js/csv.js tests/csv.test.js
git commit -m "feat(csv): add OpenGD77 simplex serializer with FM/digital split

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: HTML markup + app.js wiring

**Files:**
- Modify: `docs/index.html:301-305` ve `:299` civarındaki marine paneli sonrası
- Modify: `docs/js/app.js:81-87,180-185,354-358` ve checkbox handler bağlantıları
- Modify: `docs/js/app.js` opsiyonTopla'da yeni alanlar

- [ ] **Step 9.1: HTML markup'ı güncelle**

`docs/index.html:301-305` (mevcut `opsiyon-simplex-group`)'u değiştir:

```html
        <div class="filter-group" id="opsiyon-fm-simplex-group" style="display:none;">
          <label>
            <input type="checkbox" id="opsiyon-fm-simplex" class="toggle">
            FM Simplex Kanallari Ekle
          </label>
          <div id="fm-simplex-panel" class="protected-panel" style="display:none;"></div>
        </div>
        <div class="filter-group" id="opsiyon-dijital-simplex-group" style="display:none;">
          <label>
            <input type="checkbox" id="opsiyon-dijital-simplex" class="toggle">
            Dijital Simplex Kanallari Ekle
          </label>
          <div id="dijital-simplex-panel" class="protected-panel" style="display:none;"></div>
        </div>
```

- [ ] **Step 9.2: `app.js` opsiyonTopla'yı güncelle**

`docs/js/app.js`'te `opsiyonTopla` fonksiyonunu bul (Grep: `function opsiyonTopla` veya `opsiyonTopla = `). İçinde `simplexEkle: getCheck("opsiyon-simplex")` satırını şu ikisiyle değiştir:

```js
fmSimplexEkle:      getCheck("opsiyon-fm-simplex"),
fmSimplexSecim:     state.fmSimplexSecim,
dijitalSimplexEkle: getCheck("opsiyon-dijital-simplex"),
dijitalSimplexSecim: state.dijitalSimplexSecim,
```

- [ ] **Step 9.3: Preset apply path'inde checkbox restore'unu güncelle**

`docs/js/app.js:84` (`setCheck("opsiyon-simplex", opts.simplexEkle)`)'i değiştir:

```js
setCheck("opsiyon-fm-simplex", opts.fmSimplexEkle);
setCheck("opsiyon-dijital-simplex", opts.dijitalSimplexEkle);
```

- [ ] **Step 9.4: Uyarı mantığını güncelle**

`docs/js/app.js:183`'ü değiştir:

```js
if (opsiyonlar.dijitalSimplexEkle) uyarilar.push("Dijital simplex kanallari eklendi ama bu cihaz dijital decode edemez; RX-only FM olarak yazilacak.");
```

(`if (opsiyonlar.simplexEkle)` satırı silinmiş olur.)

- [ ] **Step 9.5: Change-handler listesini güncelle**

`docs/js/app.js:354-358`'in array'ini güncelle:

```js
[
  "filtre-aktif", "filtre-ruhsat", "filtre-puan",
  "opsiyon-pmr", "opsiyon-dpmr", "opsiyon-fmradyo",
  "opsiyon-fm-simplex", "opsiyon-dijital-simplex", "opsiyon-rxonly",
  "opsiyon-pmr-rxonly", "opsiyon-dpmr-rxonly",
].forEach((id) => {
  // ... değişiklik yok
});
```

- [ ] **Step 9.6: Panel'lere `simplexUiKur` çağrılarını ekle**

`app.js`'te marine UI çağrısının olduğu yeri bul (Grep: `marineUiKur`). Çağrıdan hemen sonra ekle:

```js
import { simplexUiKur } from "./simplex-ui.js";
import { FM_SIMPLEX, DIJITAL_SIMPLEX } from "./frekanslar.js";

// init bölümünde, marineUiKur() yanında:
simplexUiKur(
  document.getElementById("fm-simplex-panel"),
  FM_SIMPLEX,
  "fmSimplexSecim",
  "fm-simplex-secim-degisti",
);
simplexUiKur(
  document.getElementById("dijital-simplex-panel"),
  DIJITAL_SIMPLEX,
  "dijitalSimplexSecim",
  "dijital-simplex-secim-degisti",
);

// İki master checkbox panel toggle'ı:
for (const [chkId, panelId, evtName] of [
  ["opsiyon-fm-simplex", "fm-simplex-panel", "fm-simplex-secim-degisti"],
  ["opsiyon-dijital-simplex", "dijital-simplex-panel", "dijital-simplex-secim-degisti"],
]) {
  const chk = document.getElementById(chkId);
  const panel = document.getElementById(panelId);
  if (chk && panel) {
    chk.addEventListener("change", () => {
      panel.style.display = chk.checked ? "" : "none";
    });
  }
  document.addEventListener(evtName, () => {
    // önizleme yenileme — mevcut "marine-secim-degisti" handler'ı izliyor olabilir
    document.dispatchEvent(new CustomEvent("opsiyon-degisti"));
  });
}
```

(Tam handler ismi `app.js`'in mevcut event yapısına göre — ekleme yaparken event isminin önizleme refresh'i tetiklediğinden emin ol; mevcut "marine-secim-degisti" hangisini tetikliyorsa aynısını yap.)

- [ ] **Step 9.7: Cihaz değiştiğinde simplex grup görünürlüğü**

`app.js`'te `opsiyon-simplex-group` görünürlük mantığını bul (cihaz `dijitalDestekli` veya `bantlar.includes("APRS")` check'i olabilir). Aynı görünürlük mantığını iki yeni grup ID'sine kopyala:

```js
const fmGrup = document.getElementById("opsiyon-fm-simplex-group");
const dijGrup = document.getElementById("opsiyon-dijital-simplex-group");
if (fmGrup) fmGrup.style.display = "";   // FM tüm cihazlarda görünür
if (dijGrup) dijGrup.style.display = ""; // Dijital de görünür ama uyarı çıkar
```

- [ ] **Step 9.8: Manuel test (golden path)**

Browser'da `index.html'i aç. Şu adımları uygula:

1. UV-K5 cihazını seç → "FM Simplex Kanallari Ekle" ve "Dijital Simplex Kanallari Ekle" checkbox'ları görünsün.
2. "FM Simplex Kanallari Ekle" işaretle → panel görünsün, içinde VHF + UHF accordion'ları olsun. VHF'i aç → 17 satır (calling kanalları kalın). V01 ve VSB default işaretli olsun.
3. "Hepsi/Hicbiri" tıkla → 17 hepsi seçilsin, count `[17/17]`. Tekrar tıkla → 0/17.
4. CSV İndir → çıktıda V01 ve VSB satırları olsun, mod FM/USB doğru, tone alanı boş.
5. "Dijital Simplex Kanallari Ekle" işaretle → uyarı çıksın "RX-only FM olarak yazilacak".
6. CSV'de dijital satırlarda Duplex=`off`, Skip=`S`, Comment'te `DMR TG99...` olsun.
7. Preset kaydet → page reload → preset yükle → checkbox'lar restore edilsin, seçimler korunsun.
8. (Opsiyonel) MD-UV390 cihazına geç → CSV'de Channel Mode 1/2 doğru olsun.

Eğer UI bozulduysa — örn. checkbox bir satırı render etmiyor — geri dön ve `marineUiKur` paterniyle karşılaştır.

- [ ] **Step 9.9: Commit**

```bash
git add docs/index.html docs/js/app.js
git commit -m "$(cat <<'EOF'
feat(ui): split simplex into FM + Dijital with marine-style picker panels

Replaces the single 'Dijital Simplex Kanallari Ekle' checkbox with two
master toggles + accordion panels. Calling channels (145.500, 433.500,
144.300, 432.500) come pre-selected so casual users still get sensible
defaults without opening the picker.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Worker dead code temizliği + final test

**Files:**
- Modify: `worker/index.js:11,93,681-715,854-860`

- [ ] **Step 10.1: Worker'da `parseSimplex` ve `handleTaroleSimplex` siliniyor**

`worker/index.js:681-715` arasındaki `parseSimplex` fonksiyonunu sil.
`worker/index.js:854-860` arasındaki `handleTaroleSimplex` fonksiyonunu sil.
`worker/index.js:93` `case "/api/tarole/simplex":` line'ını sil.
`worker/index.js:11` top-level comment'te `GET /api/tarole/simplex` satırını sil.

- [ ] **Step 10.2: Worker test (parseTalkGruplar testleri etkilenmemeli)**

```bash
npm test 2>&1 | tail -10
```

Expected: tüm testler pass.

- [ ] **Step 10.3: Lint**

```bash
npm run lint 2>&1 | tail -10
```

Expected: yeni hata yok.

- [ ] **Step 10.4: Worker dev modunda smoke test (opsiyonel ama önerilir)**

```bash
npx wrangler dev --local 2>&1 &
sleep 5
curl -s "http://localhost:8787/api/tarole/simplex" | head -c 200
kill %1
```

Expected: `Bulunamadi` (404) — endpoint silindi.

- [ ] **Step 10.5: Commit**

```bash
git add worker/index.js
git commit -m "$(cat <<'EOF'
chore(worker): remove unused parseSimplex and /api/tarole/simplex route

Frontend never called this endpoint; the static FM_SIMPLEX/DIJITAL_SIMPLEX
datasets in the client are the source of truth now.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10.6: Final verification — full suite + lint**

```bash
npm test 2>&1 | tail -5
npm run lint 2>&1 | tail -5
```

Expected:
- Tests: tüm passing, çıktıda yeni FM simplex / dijital simplex / migration testleri görünür.
- Lint: simplex modüllerinde hata yok.

---

## Self-review checklist

- [ ] Spec'in her gereksinimi bir task'e bağlı:
  - Veri yapısı (FM_SIMPLEX, DIJITAL_SIMPLEX) → Task 1 ✓
  - State alanları → Task 5 ✓
  - simplex-ui.js yeni dosya + helper → Task 2 ✓
  - simplex-ui.js DOM rendering → Task 4 ✓
  - HTML markup değişikliği → Task 9 ✓
  - CSS generic rename → Task 3 ✓
  - CHIRP/CPS/OpenGD77 CSV writer fix → Task 6/7/8 ✓
  - Cihaz uyumluluk uyarısı → Task 9 ✓
  - Preset v2→v3 migration → Task 5 ✓
  - Worker temizliği → Task 10 ✓
  - Test stratejisi (csv.test.js + simplex.test.js) → Task 2/5/6/7/8 ✓

- [ ] No placeholders: tüm step'lerde gerçek kod blokları var.
- [ ] Type tutarlılığı: `secilenSimplexFrekanslari`, `simplexUiKur`, state key isimleri (`fmSimplexSecim`, `dijitalSimplexSecim`) tüm task'lerde aynı.
- [ ] Commit mesajları conventional commits formatında.
