# Turk Role Exporter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based Turkish amateur radio repeater exporter with filtering, map, preview table, and CPS-compatible CSV export.

**Architecture:** Static SPA (Vanilla HTML/CSS/JS) on GitHub Pages with a Cloudflare Worker as CORS proxy. All filtering and CSV generation happens client-side. Leaflet.js for maps.

**Tech Stack:** Vanilla JS (ES modules), Leaflet.js (CDN), Cloudflare Workers, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-03-16-turk-role-exporter-design.md`

---

## Chunk 1: Core Data Layer + Cloudflare Worker

### Task 1: Cloudflare Worker (CORS Proxy)

**Files:**
- Create: `worker/index.js`

- [ ] **Step 1: Create the Worker file**

Worker handles:
- `OPTIONS` requests with CORS headers
- `GET /api/roleler` proxies to `amatortelsizcilik.com.tr/roleler/data.json`
- CORS headers: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS`
- Cache API with 10min TTL (`Cache-Control: public, max-age=600`)
- Error responses with JSON bodies:
  - 502 + `{"hata": "Kaynak sunucuya erisilemiyor"}` for upstream failure
  - 504 + `{"hata": "Kaynak sunucu zaman asimina ugradi"}` for timeout
  - 502 + `{"hata": "Gecersiz veri formati"}` for invalid JSON
- 8 second timeout on upstream fetch via `AbortSignal.timeout(8000)`

- [ ] **Step 2: Commit**

```bash
git add worker/index.js
git commit -m "feat: add Cloudflare Worker CORS proxy with caching"
```

### Task 2: Utils - Turkish Character Cleaning and Il Plaka Mapping

**Files:**
- Create: `js/utils.js`

- [ ] **Step 1: Create utils.js**

Functions to implement:
- `temizleTurkce(text)` — replaces Turkish chars with ASCII equivalents using explicit mapping: c/C, g/G, i/I, o/O, s/S, u/U, a/A, i/I. Then strips non-alphanumeric except spaces.
- `IL_PLAKA` — object mapping 81 city names + KKTC to plaka codes. Copy full mapping from scraper.py including city aliases: afyon->03, iskenderun->31, antakya->31, icel->33, izmit->41, adapazari->54, urfa->63. KKTC key must be `"kibris"` (ASCII, since matching happens after temizleTurkce)
- `sehirPlaka(sehir)` — looks up plaka, falls back to first 3 chars uppercase
- `kanalAdiOlustur(role, format)` — builds channel name max 15 chars with truncation strategy:
  1. Konum first word, max 7 chars
  2. Format: plaka-konum-bant (default), sehir-konum, plaka-konum
  3. If >15 chars: drop bant, then truncate konum further
- `puanHesapla(role)` — `thumbs_up / (thumbs_up + thumbs_down) * 100`, returns 100 if no votes

- [ ] **Step 2: Commit**

```bash
git add js/utils.js
git commit -m "feat: add utils with Turkish char cleaning, plaka mapping, channel naming"
```

### Task 3: Device Profiles

**Files:**
- Create: `js/cihazlar.js`

- [ ] **Step 1: Create cihazlar.js**

Export:
- `CIHAZ_PROFILLERI` object with `tyt-md-uv390-plus` profile containing: ad, bantlar, modlar, maxKanal (3000), csvSutunlari (50 columns), varsayilanDegerler, shiftHesaplama, gucSeviyeleri (mapping: `{ High: "2", Mid: "1", Low: "0" }` — CPS power column values)
- `cihazListesi()` — returns array of {id, ad} from profile keys
- `cihazProfili(id)` — returns profile by id

- [ ] **Step 2: Commit**

```bash
git add js/cihazlar.js
git commit -m "feat: add device profile system with TYT MD-UV390 Plus"
```

### Task 4: API Module + Fallback Data

**Files:**
- Create: `js/api.js`
- Create: `js/fallback-data.js`

- [ ] **Step 1: Fetch current API data and create fallback-data.js**

```bash
curl -s "https://amatortelsizcilik.com.tr/roleler/data.json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('// Fallback veri - Son guncelleme: 2026-03-16')
print('// API erisim hatasi durumunda kullanilir')
print('export const FALLBACK_ROLELER = ' + json.dumps(data, ensure_ascii=False) + ';')
" > js/fallback-data.js
```

- [ ] **Step 2: Create api.js**

Export `roleleriGetir()`:
- Fetches from `https://telsizrole.kaandikec.com/api/roleler` with 10s timeout
- On success: returns `{ data, fallback: false }`
- On failure: falls back to `FALLBACK_ROLELER` from fallback-data.js, returns `{ data, fallback: true }`
- If fallback also empty: throws Error

- [ ] **Step 3: Commit**

```bash
git add js/api.js js/fallback-data.js
git commit -m "feat: add API module with fallback data support"
```

### Task 5: Filter Logic

**Files:**
- Create: `js/filtreler.js`

- [ ] **Step 1: Create filtreler.js**

Export:
- `filtrele(roleler, filtreler, cihazProfil)` — applies all filters:
  - sadeceAktif: `durum === true`
  - sadeceRuhsatli: `ruhsat === true`
  - bantlar: check `bant` against selected bands (intersected with cihaz profile)
  - mod: sadece-analog (only digital=0/null), sadece-dijital (only digital=1/2), dijital-oncelikli (show all but sort digital first in results), hepsi (no filter)
  - taBolgeleri: check `tabolge`
  - sehirler: check `sehir`
  - ilceler: check `ilce`
  - dusukPuanGizle: hide if puanHesapla < 40
- `benzersizSehirler(roleler)` — sorted unique cities
- `benzersizIlceler(roleler, seciliSehirler)` — dynamic based on selected cities
- `benzersizTaBolgeleri(roleler)` — sorted unique TA regions

- [ ] **Step 2: Commit**

```bash
git add js/filtreler.js
git commit -m "feat: add filtering logic with all filter types"
```

### Task 6: CSV Generation

**Files:**
- Create: `js/csv.js`

- [ ] **Step 1: Create csv.js**

Export:
- `csvOlustur(roleler, profil, opsiyonlar)` — generates CSV string:
  - Header row from `profil.csvSutunlari`
  - One row per filtered role with proper column mapping (50 columns)
  - TX frequency shift: VHF -0.6MHz, UHF -7.6MHz when rxtx is TxRx/Tx. Format with 5 decimal places: `freq.toFixed(5)`
  - Channel mode: digital=2, analog=1
  - CTCSS from role.ton or "None"
  - Appends 16 PMR channels if pmrEkle
  - Appends 16 dPMR channels if dpmrEkle
  - Uses csvEscape for values containing commas/quotes
- `csvIndir(icerik, dosyaAdi)` — creates Blob, triggers download via temporary anchor element
- PMR frequencies: 446.00625 - 446.19375 (12.5kHz spacing)
- dPMR frequencies: 446.103125 - 446.196875 (6.25kHz spacing)

- [ ] **Step 2: Commit**

```bash
git add js/csv.js
git commit -m "feat: add CSV generation with PMR/dPMR and download support"
```

---

## Chunk 2: UI Layer (HTML + CSS + Table)

### Task 7: Dark Theme CSS

**Files:**
- Create: `css/style.css`

- [ ] **Step 1: Create style.css with full dark theme**

CSS variables:
- `--bg: #1a1a2e; --surface: #16213e; --surface-2: #0f3460; --accent: #e94560; --text: #eee; --text-muted: #999; --success: #4ecca3; --warning: #f0a500; --error: #e94560;`

Components to style:
- Body reset, dark bg, system-ui font
- `.header` centered with padding
- `.device-select` styled dropdown
- `.stats-panel` flex row of stat cards
- `.banner` / `.banner-error` / `.banner-warning` banners
- `.filters-panel` grid layout
- `.filter-group` label + control pairs
- `.toggle` custom toggle switch (checkbox based)
- `.multi-select` searchable container with scrollable checkbox list
- `.map-container` 400px height with border-radius
- `.table-container` scrollable with sticky header
- `table` striped rows, hover
- `.btn-primary` accent download button
- `.btn-secondary` outline retry button
- `.channel-count` badge near download
- `.disabled` state (opacity, pointer-events)
- Dark scrollbar
- Responsive: stack vertically on mobile (max-width: 768px)

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add dark theme CSS with all component styles"
```

### Task 8: HTML Structure

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html**

**NOTE:** All work happens on `main` branch directly.

Structure:
- `<!DOCTYPE html>` with `lang="tr"`
- Head: meta charset, viewport, title "Turk Role Exporter"
- Leaflet CSS from `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
- Leaflet JS from `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
- Link to `css/style.css`
- `<script type="module" src="js/app.js"></script>`

Body sections in order:
1. `#banner-container` — empty, for dynamic banners
2. `.header` — h1 "Turk Role Exporter", p subtitle
3. `#cihaz-secici` — label + `#cihaz-select` dropdown + "yakinda" note
4. `#istatistik-panel` — 8 stat cards: toplam, aktif, pasif, VHF, UHF, APRS, dijital, filtrelenmis
5. `#harita` div (id="harita", class="map-container")
6. `#filtreler-panel`:
   - Durum toggle (`#filtre-aktif`, checked)
   - Ruhsat toggle (`#filtre-ruhsat`)
   - Bant checkboxes: VHF (`data-bant="VHF"`, checked), UHF (checked), APRS (checked)
   - Mod select (`#mod-select`): Hepsi, Sadece Analog, Sadece Dijital, Dijital Oncelikli
   - TA Bolgesi: `#ta-bolge-listesi` container (dynamically filled)
   - Sehir: `#sehir-arama` input + `#sehir-tumunu-sec` / `#sehir-temizle` buttons + `#sehir-listesi` container
   - Ilce: `#ilce-listesi` container
   - Topluluk puani toggle (`#filtre-puan`)
7. `#kanal-opsiyonlari`:
   - PMR toggle (`#opsiyon-pmr`)
   - dPMR toggle (`#opsiyon-dpmr`)
   - RX Only toggle (`#opsiyon-rxonly`, checked)
   - Guc select (`#guc-select`): High, Mid, Low
   - Kanal format select (`#kanal-format-select`): Plaka+Konum+Bant, Sehir+Konum, Plaka+Konum
   - Dosya adi input (`#dosya-adi`, value="roleler_programlama.csv")
8. `#onizleme-container`:
   - Search input (`#tablo-arama`)
   - Table (`#onizleme-tablosu`) with sortable headers (`data-alan` attributes): Kanal Adi, RX Frekans (frekans), TX Frekans, Bant (bant), Mod (digital), Guc (guc), Yukseklik (yukseklik), Puan, Sehir (sehir), Ilce (ilce), Konum (konum)
   - Empty tbody
9. `#indir-bolumu`:
   - Channel count span (`#kanal-sayisi`)
   - Warning div (`#max-kanal-uyari`, hidden)
   - Download button (`#csv-indir-btn`, class="btn-primary")

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add main HTML structure with all UI sections"
```

### Task 9: Preview Table Module

**Files:**
- Create: `js/tablo.js`

- [ ] **Step 1: Create tablo.js**

Export:
- `tabloGuncelle(roleler, kanalAdiFormati)`:
  - Gets search text from `#tablo-arama`
  - Filters displayed rows by search across sehir, ilce, konum, bant, frekans, tabolge
  - Applies sorting (field + direction state)
  - Renders rows into `#onizleme-tablosu tbody` using safe DOM creation (createElement, textContent — NOT innerHTML with user data)
  - Columns: channel name, RX frekans, TX frekans (calculated), bant, mod (Dijital/Analog), guc (W), yukseklik (m), puan (%), sehir, ilce, konum
  - TX frekans calculation: same logic as CSV (VHF -0.6, UHF -7.6 when rxtx=TxRx/Tx, else same as RX)
- `tabloBasliklariAyarla()`:
  - Attaches click handlers to `th[data-alan]` for sorting
  - Toggles asc/desc, dispatches `filtre-degisti` event

**IMPORTANT:** Use `document.createElement` + `textContent` for row creation to prevent XSS. Do not use innerHTML with role data.

- [ ] **Step 2: Commit**

```bash
git add js/tablo.js
git commit -m "feat: add preview table with search and sorting"
```

---

## Chunk 3: Map + Main App

### Task 10: Map Module (Leaflet)

**Files:**
- Create: `js/harita.js`

- [ ] **Step 1: Create harita.js**

Export:
- `haritaBaslat()`:
  - Creates Leaflet map centered at [39.0, 35.0], zoom 6
  - OpenStreetMap tile layer
  - Pin layer group
  - TA region polygons with colors: TA1=#e94560, TA2=#f0a500, TA3=#4ecca3, TA4=#3282b8, TA5=#bb86fc, TA6=#03dac6, TA7=#cf6679
  - Approximate polygon coordinates for each TA region
  - Click handler on polygons: toggle selection, sync checkboxes, dispatch filtre-degisti
  - Tooltips with TA labels
- `pinleriGuncelle(roleler)`:
  - Clears existing pins
  - Adds circle markers for each role with lat/lon
  - Color: purple (#bb86fc) for digital, green (#4ecca3) for analog
  - Popup with safe DOM: konum, sehir/ilce, frekans, bant, mod, guc, yukseklik, puan
  - **Use Leaflet's built-in popup text escaping or create popup content via DOM methods**
- `bolgeSeciminiSenkronla(secili)` — updates polygon styles based on selected regions
- `getSeciliBolgeler()` — returns array of selected TA region names

- [ ] **Step 2: Commit**

```bash
git add js/harita.js
git commit -m "feat: add Leaflet map with TA region polygons and repeater pins"
```

### Task 11: Main Application (app.js)

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Create app.js**

The main orchestrator that:
- Imports all modules
- On DOMContentLoaded: populates device selector, initializes map, sets up table headers, attaches event listeners, fetches data
- `basla()` async — fetch data, show fallback banner if needed, populate city/ilce/TA lists, call uygula()
- `uygula()` — collects filters, runs filtrele(), updates table, map pins, stats, maxKanal check
- `istatistikleriGuncelle()` — updates 8 stat cards via textContent: toplam, aktif, pasif, VHF, UHF, APRS, dijital, filtrelenmis
- `cihazSeciciDoldur()` — populates dropdown from cihazListesi()
- `cihazFiltreleriGuncelle()` — disables unsupported bands/mods for selected device
- `sehirListesiDoldur()` / `ilceListesiDoldur()` / `taBolgesiDoldur()` — populate filter checkboxes
- `filtreTopla()` / `opsiyonTopla()` — read current UI state
- `bannerGoster(tip, mesaj)` — shows warning/error banner with safe textContent (not innerHTML with user data)
- `bannerGizle()` — removes banner
- Event listeners: all toggles, selects, checkboxes dispatch `filtre-degisti` custom event
- CSV download button: generates CSV via csvOlustur(), triggers download via csvIndir()
- Retry button: re-fetches data

**IMPORTANT:** All DOM text updates must use textContent or safe DOM methods. No innerHTML with dynamic/user data.

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "feat: add main app orchestrator wiring all modules together"
```

---

## Chunk 4: Integration, Testing and Deploy

### Task 12: Local Testing

- [ ] **Step 1: Serve locally and verify**

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Verify:
- Page loads with dark theme
- Data fetched (fallback OK if Worker not yet deployed)
- All filters work (toggles, checkboxes, dropdowns, city search)
- Map shows TA regions and repeater pins
- TA region click syncs with checkboxes
- Table shows filtered data with search and sort
- CSV download produces valid CPS-format file
- Stats panel reflects data
- maxKanal warning appears when limit exceeded
- Device selector shows TYT MD-UV390 Plus
- Banner system works (error/warning/retry)

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve issues found during local testing"
```

### Task 13: Deploy Cloudflare Worker

- [ ] **Step 1: Deploy worker**

User deploys via Cloudflare dashboard or wrangler CLI:
- Create new Worker, paste `worker/index.js`
- Set custom domain: `telsizrole.kaandikec.com`

- [ ] **Step 2: Verify worker**

```bash
curl -s "https://telsizrole.kaandikec.com/api/roleler" | head -c 200
```

### Task 14: Deploy to GitHub Pages

- [ ] **Step 1: Push all code**

```bash
git push origin main
```

- [ ] **Step 2: Enable GitHub Pages**

Settings > Pages > Source: branch `main`, folder `/`

- [ ] **Step 3: Verify live site at kaandikec.com/turk-role-exporter**

- [ ] **Step 4: Remove old scraper.py**

```bash
git rm scraper.py
git commit -m "chore: remove old Python scraper, replaced by web app"
git push origin main
```
