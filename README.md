# Türk Röle Exporter

Türkiye amatör telsiz röle verilerini cihazına özel CSV formatına dönüştüren web uygulaması. Filtrele, harita üzerinde gör, telsizine yükle.

## İçindekiler

- [Ne işe yarar?](#ne-işe-yarar)
- [Canlı versiyon](#canlı-versiyon)
- [Veri kaynakları](#veri-kaynakları)
- [Mimari](#mimari)
- [Proje yapısı](#proje-yapısı)
- [Geliştirme](#geliştirme)
- [Fallback verisini güncelleme](#fallback-verisini-güncelleme)
- [Deploy](#deploy)
- [Test](#test)
- [Lisans ve katkı](#lisans-ve-katkı)

## Ne işe yarar?

CHIRP / üretici CPS yazılımıyla uyumlu CSV üretir. Şu cihazlar için hazır profil var:

- **Quansheng UV-K5** (F4HWN v4.3 firmware)
- **Baofeng K5 Plus**
- **OpenGD77** (Radioddity GD-77, TYT MD-380, Baofeng DM-1801, Radioddity RD-5R)
- **TYT MD-UV390 Plus**

Özellikler:

- TA bölgesi, şehir, ilçe, bant (VHF/UHF), mod (analog/dijital), aktiflik, lisans, QRZ skoruna göre filtre
- Ek kanallar: PMR, dPMR, FM Radyo, dijital simplex
- Parola korumalı Air Band ve Marine Band frekans seti
- Leaflet harita, sürüklenebilir röle pin'leri
- Önizleme tablosu, undo/redo, arama
- Önayar (preset) kaydetme/yükleme
- Koyu mod
- Mevcut CSV'yi içe aktarıp birleştirme
- RX-only mod, boş kanal eklenmesi, güç seviyesi ve kanal adı şablonu özelleştirme

## Canlı versiyon

Statik site `docs/` klasöründen GitHub Pages üzerinden yayınlanır. Repo: [`dikeckaan/turk-role-exporter`](https://github.com/dikeckaan/turk-role-exporter).

API trafiği `https://telsizrole.kaandikec.com` adresindeki Cloudflare Worker'a gider.

## Veri kaynakları

| Kaynak | Açıklama | Cache |
|---|---|---|
| `amatortelsizcilik.com.tr/roleler/data.json` | Birincil JSON API. **Şu an upstream login arkasında**, anonim erişim 500 dönüyor. Bu yüzden site fallback'e düşüyor — aşağıdaki bölüme bakın. | 4 saat |
| `ta-role.com` | İkincil. CF Worker subrequest limitine uymak için 5 paralel parça (`vhf1`, `vhf2`, `uhf1`, `uhf2`, `dmr`) halinde HTML scrape edilir. Talkgrup ve dijital simplex listelerini de buradan çeker. | 4 saat |
| `docs/js/fallback-data.js` | Gömülü yedek. `npm run update-fallback` ile yenilenir. ~507 röle. | — |

## Mimari

```
                       ┌─────────────────────────────────────┐
                       │           Tarayıcı                  │
                       │   docs/ (vanilla ES modules)        │
                       └────────────────┬────────────────────┘
                                        │ fetch
                                        ▼
                       ┌─────────────────────────────────────┐
                       │   Cloudflare Worker                 │
                       │   telsizrole.kaandikec.com          │
                       │   worker/index.js                   │
                       └─────────┬──────────────┬────────────┘
                                 │              │
                                 ▼              ▼
              amatortelsizcilik.com.tr     ta-role.com
              (4h cache, login arkasında)  (4h cache, 5 part scrape)
```

**Frontend** (`docs/`) — vanilla ES modules, statik. Anahtar dosyalar:

- `docs/index.html` — UI
- `docs/js/app.js` — modülleri bağlayan ana orkestratör
- `docs/js/api.js` — worker'a istek + fallback
- `docs/js/cihazlar.js` — cihaz profilleri (sütunlar, güç, varsayılanlar)
- `docs/js/csv.js` — CSV serileştirme
- `docs/js/data-sources.js` — kaynak birleştirme + TA bölge eşleme (`SEHIR_TABOLGE`)
- `docs/js/filtreler.js`, `filter-ui.js` — filtre mantığı + UI
- `docs/js/harita.js` — Leaflet harita
- `docs/js/tablo.js` — önizleme tablosu
- `docs/js/auth-modal.js` — Air/Marine için parola modal'ı
- `docs/js/fallback-data.js` — gömülü yedek (otomatik üretilir, elle düzenleme)

**Backend** (`worker/index.js`) — Cloudflare Worker. Endpoint listesi:

| Method | Path | Açıklama |
|---|---|---|
| GET | `/api/roleler` | amatortelsizcilik.com.tr proxy |
| GET | `/api/tarole/roleler?part={vhf1\|vhf2\|uhf1\|uhf2\|dmr}` | ta-role scraper |
| GET | `/api/tarole/talkgruplar` | DMR talk grupları |
| GET | `/api/tarole/simplex` | Dijital simplex frekansları |
| GET | `/api/tarole/debug` | Tanı bilgisi (cache yok) |
| POST | `/api/auth/verify` | HMAC parola → saatlik token |
| GET | `/api/protected/airband` | Bearer token gerekir |
| GET | `/api/protected/marine` | Bearer token gerekir |

## Proje yapısı

```
.
├── docs/                    # Statik frontend (GitHub Pages'e deploy edilir)
│   ├── index.html
│   ├── css/style.css
│   └── js/                  # ES modules
├── worker/
│   └── index.js             # Cloudflare Worker
├── scripts/
│   └── update-fallback.js   # backup.json → fallback-data.js
├── tests/                   # node --test
├── plans/                   # geliştirme planları (referans)
├── backup.json              # (opsiyonel) en son data.json snapshot'ı
├── wrangler.toml
└── package.json
```

## Geliştirme

**Gereksinimler:** Node.js 20+, npm, [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm i -g wrangler` veya devDependency olarak).

**Kurulum:**

```bash
npm install
```

Air Band / Marine Band parolasını yerelde test etmek için repo köküne `.dev.vars` dosyası oluştur:

```
PROTECTED_PASSWORD=secret-değerin
```

**Komutlar:**

| Komut | Açıklama |
|---|---|
| `npm run dev` | `wrangler dev` — worker + statik site (varsayılan: http://localhost:8787) |
| `npm run lint` | ESLint — `docs/js/` ve `worker/` |
| `npm run format` | Prettier — `docs/js/`, `worker/`, `docs/css/` |
| `npm test` | `node --test tests/*.test.js` |
| `npm run update-fallback` | `backup.json` → `docs/js/fallback-data.js` |
| `npm run deploy` | `wrangler deploy` — worker'ı production'a gönderir |

## Fallback verisini güncelleme

amatortelsizcilik.com.tr `/roleler/data.json` endpoint'i artık login gerektiriyor; CF Worker anonim olarak 500 alıyor. Bu nedenle birincil veri şu an gömülü `fallback-data.js`'ten geliyor ve **elle yenilenmesi gerek**.

Workflow:

1. Tarayıcıda amatortelsizcilik.com.tr'ye giriş yap
2. `https://amatortelsizcilik.com.tr/roleler/data.json` URL'sini aç → JSON çıktısını **olduğu gibi** kaydet
3. Repo köküne `backup.json` olarak yapıştır (mevcut dosyanın üzerine yaz)
4. Yenile:

   ```bash
   npm run update-fallback
   ```

5. Üretilen `docs/js/fallback-data.js`'i commit'le

`backup.json` formatı, upstream `data.json`'ın birebir kendisi: röle objelerinden oluşan bir JSON array. Script (`scripts/update-fallback.js`) sayıyı doğrular, ESM export'a sarar, üst satırına tarih damgası koyar.

## Deploy

**Frontend:** `main` veya `feature/cf-worker-full-site` branch'ine push → GitHub Actions (`.github/workflows/deploy-pages.yml`) otomatik olarak `docs/`'u GitHub Pages'e deploy eder. Manuel tetiklemek için `workflow_dispatch` kullanılabilir.

**Worker:**

```bash
npm run deploy
```

Production parola sırrını ayarlamak için:

```bash
wrangler secret put PROTECTED_PASSWORD
```

CI/CD ortamında ise GitHub repository secret'ı olarak `PROTECTED_PASSWORD` tanımlanır ve deploy workflow'unda env'e geçirilir.

## Test

Birim testler `tests/` altında, Node'un yerleşik test runner'ı ile:

```bash
npm test
```

Mevcut suite'ler:

- `tests/csv.test.js` — CSV format/serileştirme
- `tests/filtreler.test.js` — filtre mantığı
- `tests/utils.test.js` — yardımcılar (Türkçe normalizasyon, bant tespiti)

## Lisans ve katkı

Repo'da `LICENSE` dosyası yok; lisans henüz belirtilmemiştir.

Katkı vermek için:

1. Branch aç
2. Değişikliklerini yap
3. `npm run lint && npm test` geçtiğinden emin ol
4. PR aç
