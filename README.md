# Türk Röle Exporter

Türkiye amatör telsiz röle verilerini cihazına özel CSV formatına dönüştüren web uygulaması. Filtrele, harita üzerinde gör, telsizine yükle.

## İçindekiler

- [Ne işe yarar?](#ne-işe-yarar)
- [Canlı versiyon](#canlı-versiyon)
- [Veri kaynakları](#veri-kaynakları)
- [Mimari](#mimari)
- [Proje yapısı](#proje-yapısı)
- [Geliştirme](#geliştirme)
- [Veri güncelleme script'leri](#veri-güncelleme-scriptleri)
- [Ziyaretçi istatistikleri](#ziyaretçi-istatistikleri)
- [Deploy](#deploy)
- [Test](#test)
- [Lisans ve katkı](#lisans-ve-katkı)

## Ne işe yarar?

CHIRP / üretici CPS yazılımıyla uyumlu CSV üretir. Şu cihazlar için hazır profil var:

- **Quansheng UV-K5** (F4HWN v4.3 firmware)
- **Baofeng K5 Plus**
- **OpenGD77** (Radioddity GD-77, TYT MD-380, Baofeng DM-1801, Radioddity RD-5R)
- **TYT MD-UV390 Plus**
- **TYT MD-UV390** (GPS'siz)

Temel özellikler:

- TA bölgesi, şehir, ilçe, bant (VHF/UHF), mod (analog/dijital), aktiflik, lisans, QRZ skoruna göre filtre
- Ek kanallar: PMR, dPMR, FM Radyo, dijital simplex
- Leaflet harita, sürüklenebilir röle pinleri
- Önizleme tablosu, hücre editi, undo/redo, arama
- Önayar (preset) kaydetme/yükleme (v2 şema: airband/marine seçimleri dahil)
- 4 tema seçici (Pure Dark, Navy, Kömür, Açık) — sağ alt köşede FAB
- Mevcut CSV'yi içe aktarıp birleştirme, JSON export, RX-only mod, boş kanal eklenmesi

### Korunan kanallar (parola gerektirir)

Parola arkasında 4 grup — tek parola ile dördü birden açılır:

- **Airband** — il → havalimanı → tür (ATIS / Tower / Ground / Approach / Clearance / Departure / Ramp / Center / …) kademeli seçim. **~65 TR havalimanı**, ~180 frekans; OurAirports.com CC0 dataset'inden otomatik çekilir.
- **Marine** — 3 bölüm akordiyon: VHF Marine Band (ta1dx canlı scrape, ~60 kanal), SAR Frekansları, Türk Sahil Radyoları. Her bölüm içinde frekans başına checkbox + "Hepsi / Hiçbiri" kısayolu ve `[tikli/toplam]` sayaç.
- **PMR + dPMR** — PMR446 analog ve dijital kanallar. Kilit açıldıktan sonra RX-only alt seçimi serbest çalışır.

## Canlı versiyon

Statik site `docs/` klasöründen GitHub Pages üzerinden yayınlanır:

- **Site**: [http://kaandikec.com/turk-role-exporter/](http://kaandikec.com/turk-role-exporter/)
- **Hakkında**: `/hakkinda.html` (README'den otomatik üretilir)
- **Repo**: [`dikeckaan/turk-role-exporter`](https://github.com/dikeckaan/turk-role-exporter)
- **Worker API**: `https://telsizrole.kaandikec.com`

## Veri kaynakları

| Kaynak | Açıklama | Cache |
|---|---|---|
| `amatortelsizcilik.com.tr/roleler/data.json` | Birincil röle JSON API. **Upstream login arkasında**, anonim erişim 500 dönüyor — fallback aktif. | 4 saat |
| `telsizcilik.com` (Supabase REST) | Üçüncü röle kaynağı. `sktymkkqjandkwjdqrfs.supabase.co/rest/v1/relays` — SPA bundle'ındaki public anon JWT ile tek istekle ~600 röle + lat/lng dönüyor. | 4 saat |
| `ta-role.com` | İkincil röle kaynağı. 5 paralel parça (`vhf1`, `vhf2`, `uhf1`, `uhf2`, `dmr`) HTML scraping. Talkgroup + dijital simplex'i de buradan çeker. | 4 saat |
| `ta1dx.qsl.net/amator/bandmarine.htm` | **Marine VHF band** canlı scrape (regex tabanlı HTML parse, windows-1254 kaynak). SAR + Sahil radyoları bölümleri ayrı sayfalarda yaşadığı için `MARINE_FALLBACK`'ten gelir. | 4 saat |
| `ourairports.com` CSV dataset | **Airband** için havalimanı + frekans verisi. Runtime'da çekilmez; `npm run update-airband` ile periyodik olarak `worker/fallback-data.js`'e gömülür. | — |
| `docs/js/fallback-data.js` | Röle verisi offline yedeği. `npm run update-fallback` ile yenilenir. | — |
| `worker/fallback-data.js` | Airband + Marine gömülü snapshot. Scraper başarısızsa / worker tarafında kaynak anonim erişime kapalıysa dönülür. | — |

## Mimari

```
                       ┌─────────────────────────────────────┐
                       │           Tarayıcı                  │
                       │   docs/ (vanilla ES modules)        │
                       └────────────────┬────────────────────┘
                                        │ fetch
                                        ▼
                       ┌─────────────────────────────────────┐
                       │     Cloudflare Worker               │
                       │     telsizrole.kaandikec.com        │
                       │     worker/index.js                 │
                       │  ┌────────┬──────────┬───────────┐  │
                       │  │ proxy  │ scrapers │ stats KV  │  │
                       │  └────────┴──────────┴───────────┘  │
                       └─────┬─────────┬─────────┬───────────┘
                             │         │         │
                             ▼         ▼         ▼
            amatortelsizcilik.com.tr  ta-role.com  ta1dx.qsl.net
             + (gömülü fallback-data.js: röle, airband, marine snapshot)
```

**Frontend** (`docs/`) — vanilla ES modules, statik. Önemli dosyalar:

| Dosya | Sorumluluk |
|---|---|
| `docs/index.html` | UI iskeleti |
| `docs/js/app.js` | Ana orkestratör: modülleri bağlar, event listener'lar, boot akışı |
| `docs/js/api.js` | Worker API çağrıları + röle fallback |
| `docs/js/cihazlar.js` | Cihaz profilleri (sütunlar, güç, varsayılanlar) |
| `docs/js/csv.js` | CSV + JSON serileştirme |
| `docs/js/data-sources.js` | Kaynak birleştirme + TA bölge eşleme (`SEHIR_TABOLGE`) |
| `docs/js/filter-ui.js` | Filtre UI + seçim-temelli airband/marine export'u toplar |
| `docs/js/filtreler.js` | Filtre uygulama mantığı |
| `docs/js/harita.js` | Leaflet harita |
| `docs/js/tablo.js` | Önizleme tablosu, hücre editi |
| `docs/js/auth-modal.js` | Parola modalı, 4 korunan grubun kilit açma akışı |
| `docs/js/airband-ui.js` | İl→Havalimanı→Tür cascade picker (yeni) |
| `docs/js/marine-ui.js` | 3-bölüm accordion picker (yeni) |
| `docs/js/stats.js` | Anonim ziyaretçi + indirme sayaçları istemci tarafı (yeni) |
| `docs/js/presets.js` | v2 preset schema, v1 geriye uyum, `state.airbandSecim`/`marineSecim` persist |
| `docs/js/theme.js` | 4 temalı FAB menü, OS tercihini takip |
| `docs/js/fallback-data.js` | Röle offline yedeği (otomatik üretilir — elle düzenleme) |

**Backend** (`worker/`) — Cloudflare Worker:

| Dosya | Sorumluluk |
|---|---|
| `worker/index.js` | Router, token HMAC, fetch orkestratörü (`handleProtectedDataset`), asset serving |
| `worker/fallback-data.js` | `AIRBAND_FALLBACK` (iller ağacı) + `MARINE_FALLBACK` (3 bölüm) |
| `worker/scrapers.js` | Saf HTML parsers: `parseAirbandHtml` (stub, skyvector JS-rendered), `parseMarineHtml` (ta1dx VHF live) |
| `worker/stats.js` | KV-destekli anonim istatistik endpoint'leri |
| `worker/SCRAPER-NOTES.md` | Scraper fizibilite notları (skyvector neden elde değil, OurAirports alternatifi) |

### API endpoint'leri

| Method | Path | Açıklama | Auth |
|---|---|---|---|
| GET  | `/api/roleler` | amatortelsizcilik.com.tr proxy | — |
| GET  | `/api/telsizcilik/roleler` | telsizcilik.com Supabase proxy | — |
| GET  | `/api/tarole/roleler?part=…` | ta-role.com VHF/UHF/DMR scraper | — |
| GET  | `/api/tarole/talkgruplar` | DMR talk grupları | — |
| GET  | `/api/tarole/simplex` | Dijital simplex frekansları | — |
| GET  | `/api/tarole/debug` | Tanı bilgisi (cache yok) | — |
| POST | `/api/auth/verify` | HMAC parola → saatlik token | — |
| GET  | `/api/protected/airband` | Airband iller ağacı (live fetch + fallback) | Bearer |
| GET  | `/api/protected/marine` | Marine 3-bölüm (VHF live + SAR/sahil fallback) | Bearer |
| POST | `/api/stats/ping` | Anonim ziyaret kaydı | — |
| POST | `/api/stats/download` | CSV indirme kaydı | — |
| GET  | `/api/stats` | Agrege ziyaret + indirme sayaçları | — |

## Proje yapısı

```
.
├── docs/                      # Statik frontend (GitHub Pages)
│   ├── index.html
│   ├── hakkinda.html          # README'den üretilir
│   ├── css/style.css
│   ├── js/                    # ES modules — yukarıdaki tabloya bakın
│   └── sw.js                  # Service worker (offline cache)
├── worker/
│   ├── index.js               # Cloudflare Worker
│   ├── fallback-data.js       # Airband + Marine gömülü snapshot
│   ├── scrapers.js            # HTML parsers
│   ├── stats.js               # KV istatistik endpoint'leri
│   └── SCRAPER-NOTES.md
├── scripts/
│   ├── update-fallback.js     # backup.json → docs/js/fallback-data.js
│   ├── update-airband.js      # OurAirports.com → worker/fallback-data.js
│   └── build-hakkinda.js      # README.md → docs/hakkinda.html
├── tests/                     # node --test
│   ├── airband.test.js
│   ├── marine.test.js
│   ├── csv.test.js
│   ├── filtreler.test.js
│   ├── utils.test.js
│   ├── scrapers.test.js
│   ├── protected-unlock.test.js
│   └── fixtures/              # scraper test fixtures
├── docs/superpowers/          # Design spec + implementation plan
├── backup.json                # (opsiyonel) en son röle data.json snapshot'ı
├── wrangler.toml              # KV binding + site bucket
└── package.json
```

## Geliştirme

**Gereksinimler:** Node.js 20+, npm, [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/).

**Kurulum:**

```bash
npm install
```

Air/Marine/PMR parolasını yerelde test etmek için repo köküne `.dev.vars`:

```
PROTECTED_PASSWORD=secret-değerin
```

**Komutlar:**

| Komut | Açıklama |
|---|---|
| `npm run dev` | `wrangler dev` — worker + statik site (http://localhost:8787) |
| `npm run lint` | ESLint — `docs/js/` ve `worker/` |
| `npm run format` | Prettier — `docs/js/`, `worker/`, `docs/css/` |
| `npm test` | `node --test tests/*.test.js` |
| `npm run update-fallback` | `backup.json` → `docs/js/fallback-data.js` (röle) |
| `npm run update-airband` | OurAirports CSV → `worker/fallback-data.js` (airband) |
| `npm run build-hakkinda` | `README.md` → `docs/hakkinda.html` |
| `npm run deploy` | `wrangler deploy` — worker'ı production'a gönderir |

## Veri güncelleme script'leri

### Röle verisi (`npm run update-fallback`)

amatortelsizcilik.com.tr `/roleler/data.json` endpoint'i login gerektirdiği için CF Worker anonim olarak 500 alıyor. Röle verisi gömülü `docs/js/fallback-data.js`'ten geliyor ve elle yenilenmesi gerek:

1. Tarayıcıda amatortelsizcilik.com.tr'ye giriş yap
2. `https://amatortelsizcilik.com.tr/roleler/data.json` URL'sini aç → JSON çıktısını olduğu gibi kaydet
3. Repo köküne `backup.json` olarak yapıştır
4. `npm run update-fallback`
5. Üretilen `docs/js/fallback-data.js`'i commit'le

### Airband verisi (`npm run update-airband`)

OurAirports.com'un açık (CC0) CSV dataset'inden TR havalimanları + VHF airband frekansları (108-137 MHz) çekilir, ISO 3166-2:TR plaka kodlarına göre illere göre gruplanır, `worker/fallback-data.js`'teki `AIRBAND_FALLBACK`'i günceller. Script internet erişimi gerektirir, sonra commit + `npm run deploy`.

### Hakkında sayfası (`npm run build-hakkinda`)

`README.md` → `docs/hakkinda.html`. README'yi her güncellediğinizde çalıştırın; dosyayı commit edin.

## Ziyaretçi istatistikleri

Ana sayfada ve hakkında sayfasında "Ziyaretçi İstatistikleri" kartı: çalışma süresi, toplam/bugün ziyaretçi, "Sen N. ziyaretçisin", toplam/bugün indirme, cihaza göre indirme dağılımı (yatay bar).

**Gizlilik:** Hiçbir PII saklanmaz — **IP, user-agent, referrer, fingerprint hiçbiri yok**. Ziyaret kimliği yalnızca tarayıcı sessionStorage flag'iyle belirlenir; session başına 1 ping. CSV indirmesinde `recordDownload(cihazId)` fire-and-forget POST atar.

**Depolama:** Cloudflare KV namespace `STATS`. Anahtarlar:
- `site:firstLaunch` — ilk ziyaretin ISO tarihi
- `site:visits:total`, `site:visits:day:YYYY-MM-DD`
- `site:downloads:total`, `site:downloads:day:YYYY-MM-DD`, `site:downloads:device:<cihaz>`

KV namespace bir kereliğine oluşturulur:

```bash
npx wrangler kv namespace create STATS
```

Dönen `id`'yi `wrangler.toml`'daki `[[kv_namespaces]]` bloğuna yapıştır.

## Deploy

**Frontend:** Herhangi bir branch'e push → GitHub Actions (`.github/workflows/deploy-pages.yml`) otomatik olarak `docs/`'u GitHub Pages'e deploy eder.

**Worker:**

```bash
npm run deploy
```

Production parola sırrı:

```bash
wrangler secret put PROTECTED_PASSWORD
```

CI'da: GitHub secret `PROTECTED_PASSWORD` deploy workflow'una env olarak geçirilir.

## Test

```bash
npm test
```

Mevcut suite'ler (56 test):

- `tests/airband.test.js` — seçim filtresi, dedup, preset roundtrip
- `tests/marine.test.js` — 3-bölüm seçim semantiği
- `tests/csv.test.js` — CSV format + seçim-temelli airband/marine export
- `tests/scrapers.test.js` — ta1dx parser + fallback merge + fallback shape
- `tests/protected-unlock.test.js` — 4 grubun `protected-group` class'ı + `*-unlocked` wrapper invariant
- `tests/filtreler.test.js` — filtre mantığı
- `tests/utils.test.js` — Türkçe normalizasyon, bant tespiti, TX hesabı, puanlama

## Lisans ve katkı

Repo'da `LICENSE` dosyası yok; lisans henüz belirtilmemiştir. OurAirports verisi CC0, ta1dx içeriği qsl.net kullanım şartlarına tabidir — canlı scraping ilgili sitelerin ToS'una saygılı cache süreleriyle (4 saat) yapılır.

Katkı için:

1. Branch aç
2. Değişikliklerini yap
3. `npm run lint && npm test` geçtiğinden emin ol
4. README'yi etkileyen değişiklikler için `npm run build-hakkinda`
5. PR aç
