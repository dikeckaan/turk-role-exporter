# Airband Havalimanı Seçici + Marine Bölüm Seçici + PMR Kilit

**Tarih:** 2026-04-15
**Branch:** feature/comprehensive-improvements

## Context

Şu anki durumda `/api/protected/airband` ve `/api/protected/marine` endpoint'leri `worker/index.js` içinde elle yazılmış sabit listeler döndürür (18 airband + 15 marine frekans). UI tarafında ikisi de "hep ya hep yok" checkbox: işaretlenirse tüm frekanslar CSV'ye eklenir, seçim yok.

**PMR ve dPMR** kanalları ise şu an serbest (hiç şifre gerektirmiyor), ama kullanıcı bunları da "Korunan Kanallar" bölümüne alıp aynı parolanın arkasına yerleştirmek istiyor — RX/TX alt seçimi (rx-only toggle) kilit açıldıktan sonra yine serbest çalışacak.

Kullanıcı üç iyileştirme istiyor:

1. **Airband:** İl → Havalimanı (çoklu seçim) → Frekans türü (ATIS / Tower / Ground / Approach) üç aşamalı seçim. Veri kaynağı: skyvector.com/airports/Turkey (runtime live fetch, başarısızsa gömülü fallback).
2. **Marine:** Üç bölüm — **VHF Marine Band**, **SAR Frekansları**, **Türk Sahil Radyoları** — her biri kendi içinde tek tek frekans multi-select. Veri kaynağı: qsl.net/ta1dx/amator/bandmarine.htm (aynı live-fetch + fallback deseni).
3. **PMR + dPMR:** Mevcut Korunan Kanallar (protected-group) yapısına eklensin, aynı parola ile açılsın. RX/TX alt seçimi kilitten sonra normal çalışsın.

## Goals

- `/api/protected/airband` yapılandırılmış veri döndürsün: `iller[].havalimanlari[].frekanslar[]` ağacı, her frekansın `tur` alanı var.
- `/api/protected/marine` üç bölümlü veri döndürsün: `bolumler[].frekanslar[]`.
- İkisi de live fetch + fallback mantığıyla (ilk önce upstream kaynak, 10s timeout, başarısızlıkta gömülü snapshot) çalışsın. Cache süresi 4 saat (mevcut `/api/roleler` ile aynı).
- Airband UI: il çoklu-seç dropdown + ildeki havalimanlarının listesi + her havalimanı için tür seçimi (ATIS/Tower/Ground/Approach).
- Marine UI: 3 accordion, her accordion başlığında `[tikli: X/Y]` sayacı, içinde frekans checkbox'ları.
- PMR ve dPMR `protected-group` class'ına alınsın, kilit/overlay aynen airband/marine gibi çalışsın; kilit açıldıktan sonra RX/TX checkbox'ı görünür ve çalışır durumda kalsın.
- Seçimler `presets.js` tarafından kaydedilip geri yüklenebilsin.

## Non-Goals

- Yeni bir parola mekanizması eklenmez; mevcut tek parola (HMAC, `PROTECTED_PASSWORD` secret) her üç grubu da açar.
- Airband için askeri/kapalı pist havalimanları kapsama dışı.
- Marine için kısa dalga (HF) band dışındaki (VHF dışı) kayıtlar kapsam dışı — sayfada varsa da dahil edilmez.
- Tür çevirisi (EN→TR) yapılmaz; skyvector "ATIS"/"Tower"/"Ground"/"Approach" etiketlerini aynen kullanır, başka dilli bir kaynaktan çekiliyorsa TR kısayol sözlüğü eklenmez.
- dPMR için ayrı bir parola ya da dPMR-only kilit yok; PMR ile birlikte aynı grupta.

## Mimari

```
┌─────────── Tarayıcı ───────────┐
│ auth-modal → token al          │
│ UI: il/havalimanı/tür seç      │
│ state.airbandSecim / marine…   │
│ CSV export seçimlere göre      │
└────────────────┬───────────────┘
                 │ Authorization: Bearer <token>
                 ▼
┌─────── Cloudflare Worker ──────┐
│ /api/protected/airband         │───► skyvector.com/airports/Turkey
│   (cache 4h, timeout 10s)      │        │
│   başarısız → AIRBAND_FALLBACK │◄───────┘
│                                │
│ /api/protected/marine          │───► qsl.net/ta1dx/amator/bandmarine.htm
│   (cache 4h, timeout 10s)      │        │
│   başarısız → MARINE_FALLBACK  │◄───────┘
└────────────────────────────────┘
```

Worker içindeki `AIRBAND_FALLBACK` ve `MARINE_FALLBACK` sabitleri — ilk live çekme başarılı olduğunda elle snapshot alınıp koda gömülür (tıpkı `docs/js/fallback-data.js` gibi, ama worker içinde).

## Veri şemaları

### Airband response

```json
{
  "kaynak": "live",
  "guncellenme": "2026-04-15T20:00:00Z",
  "iller": [
    {
      "il": "Istanbul",
      "havalimanlari": [
        {
          "ad": "Istanbul Havalimani",
          "icao": "LTFM",
          "frekanslar": [
            { "tur": "ATIS",     "frek": "128.250", "aciklama": "Arrival ATIS" },
            { "tur": "Tower",    "frek": "118.100" },
            { "tur": "Ground",   "frek": "121.900" },
            { "tur": "Approach", "frek": "119.400" }
          ]
        }
      ]
    }
  ]
}
```

**Tür alanı** set: `ATIS`, `Tower`, `Ground`, `Approach`. Skyvector'de başka tür varsa (ör. `Clearance`, `CTAF`) bu dördü dışında kalıyorsa veri içinde tutulur ama UI'da "Diğer" kutusunun altında gruplanır (opsiyonel, bkz. "Açık noktalar").

### Marine response

```json
{
  "kaynak": "live",
  "guncellenme": "2026-04-15T20:00:00Z",
  "bolumler": [
    {
      "id": "vhf",
      "ad": "VHF Marine Band",
      "frekanslar": [
        { "kanal": "CH06", "frek": "156.300", "ad": "Inter-ship safety" },
        { "kanal": "CH16", "frek": "156.800", "ad": "Distress/Calling", "aciklama": "Acil" },
        { "kanal": "CH70", "frek": "156.525", "ad": "DSC" }
      ]
    },
    { "id": "sar",   "ad": "SAR Frekanslari",       "frekanslar": [ ... ] },
    { "id": "sahil", "ad": "Turk Sahil Radyolari",  "frekanslar": [ ... ] }
  ]
}
```

Bölüm `id` değerleri: `vhf`, `sar`, `sahil` (state key olarak da kullanılır).

## Worker değişiklikleri (`worker/index.js`)

Yeni dahili fonksiyonlar:

- `fetchAirband(env)` — `https://skyvector.com/airports/Turkey` HTML'ini fetch, airport linklerini extract (ICAO + şehir adı + airport adı), sonra her airport için `/airport/<ICAO>` detay sayfasını çekip frekans tablosunu parse et. Eş zamanlı fetch limitini aşmamak için `Promise.all` yerine 5'erli batch. İl adı ICAO prefix + airport lokasyonundan çıkarılır ya da statik `ICAO_IL_MAP` tablosundan map edilir.
- `fetchMarine(env)` — `https://www.qsl.net/ta1dx/amator/bandmarine.htm` HTML'ini fetch, `<h2>` / `<h3>` başlıklarla 3 bölümü ayır, her bölümün tablosunu parse et.
- `AIRBAND_FALLBACK` ve `MARINE_FALLBACK` — ilk başarılı live çekimden oluşturulmuş statik JSON (build zamanında hazırlanır).
- **Handler güncellemeleri:** `/api/protected/airband` → token kontrolü → `getCached(env, "airband", fetchAirband, AIRBAND_FALLBACK)`. Marine için aynı.

**Cache key:** `airband-v2` / `marine-v2` — eski şemayla karışmasın.

## Frontend UI

### Airband paneli

`docs/index.html`'de `opsiyon-airband-group` içine yeni alt UI:

```
☑ Airband (parola ile açılır)
  İller: ⌄ [multi-select, search'li]
    ☑ İstanbul   ☑ Ankara   ☐ İzmir ...
  Havalimanları (seçili illerdekiler gösterilir):
    ┌─────────────────────────────────────────────────┐
    │ LTFM  Istanbul Havalimanı                       │
    │   Türler: ☑ATIS ☑Tower ☐Ground ☐Approach        │
    ├─────────────────────────────────────────────────┤
    │ LTFJ  Sabiha Gökçen                             │
    │   Türler: ☑ATIS ☑Tower ☐Ground ☐Approach        │
    └─────────────────────────────────────────────────┘
  [ Hepsini seç ] [ Hepsini temizle ]
```

- Üst ana checkbox (`opsiyon-airband`) — tüm airband grubu aç/kapa
- İl multi-select dropdown: mevcut TA bölge/şehir filtre UI stilinde
- Havalimanı listesi: seçili illere göre dinamik doldurulur; her havalimanı kendi tür chip'leriyle
- Havalimanı seçili değilse o havalimanı CSV'ye girmez; seçiliyse sadece tikli tür(ler)in frekansları girer
- "Hepsini seç" / "Hepsini temizle" kısayolları listeyi toplu etkiler

### Marine paneli

`opsiyon-marine-group` içinde:

```
☑ Marine Band (parola ile açılır)
  ▸ VHF Marine Band           [2/57]
    (tıklayınca açılır)
    ☑ CH16   156.800   Distress/Calling
    ☑ CH70   156.525   DSC
    ☐ CH06   156.300   Inter-ship
    ...
  ▸ SAR Frekansları            [0/3]
  ▸ Türk Sahil Radyoları        [0/12]
```

- Üst ana checkbox — tüm marine grubu aç/kapa
- Her bölüm accordion (`<details>` / `<summary>` elemanıyla); başlıkta `[tikli/toplam]` sayacı
- Accordion açıkken frekanslar tek tek checkbox
- Her bölümün başlığında "Hepsi / Hiçbiri" toggle butonu

### PMR + dPMR (yeni protected grup)

`docs/index.html`'de mevcut:
```html
<div class="filter-group" id="opsiyon-pmr-group">
```
→ Değişecek:
```html
<div class="filter-group protected-group" id="opsiyon-pmr-group" style="display:none;">
  <!-- overlay -->
  <!-- ana checkbox + rx-only alt seçimi -->
</div>
```

`docs/js/app.js` içinde:
- `["opsiyon-airband", "opsiyon-marine"]` listesine `"opsiyon-pmr"` ve `"opsiyon-dpmr"` eklenir
- `sifreModaliGoster(id)` çağrıları PMR/dPMR için de tetiklenir
- `korunanlariGuncelle(unlocked)` — unlocked true ise tüm 4 grubun overlay'ı gizlenir
- RX-only alt checkbox'ları (`opsiyon-pmr-rxonly`, `opsiyon-dpmr-rxonly`) mevcut mantığıyla kalır, kilit açıldıktan sonra erişilebilir

`.protected-group` CSS'i zaten overlay + padlock ikonuyla hazır — ekstra stil gerekmez.

## State + preset

`docs/js/state.js` → yeni alanlar:

```js
airbandSecim: {
  iller: [],           // ["Istanbul", "Ankara"]
  havalimanlari: {     // { "LTFM": ["ATIS","Tower"], ... }
    LTFM: [],
  },
},
marineSecim: {
  vhf: [],    // ["CH16", "CH70"]
  sar: [],
  sahil: [],
},
```

`docs/js/presets.js` — mevcut `presetKaydet()` / `presetUygula()` fonksiyonları bu iki state alanını da serialize eder. Preset format sürüm numarası 1 → 2 çıkılır; eski presetler okunurken yeni alanlar `null/[]` ile inisyalize edilir.

## CSV export (`docs/js/csv.js`)

Mevcut `airbandEkle` ve `marineEkle` bayrakları korunur (hızlı aç-kapa için). Yeni alt seçimler devreye girdiğinde:

```js
if (state.airbandEkle) {
  for (const il of state.airbandSecim.iller) {
    for (const hav of ilinHavalimanlari(il)) {
      const turler = state.airbandSecim.havalimanlari[hav.icao] || [];
      for (const f of hav.frekanslar) {
        if (turler.includes(f.tur)) pushRow(f, "airband");
      }
    }
  }
}
```

Marine için benzer: her bölüm üstünden geçip `state.marineSecim[bolumId]` kanallarını filtrele.

Bant genişliği / ton / mod ayarları aynı kalır (airband AM 25kHz, marine FM 12.5kHz, PMR FM 12.5kHz).

## Test planı

Yeni test dosyaları:

- `tests/airband.test.js`
  - Mock skyvector HTML → `fetchAirband()` doğru yapılı JSON çıkarıyor mu
  - Fallback path — fetch timeout simulate, `AIRBAND_FALLBACK` dönüyor mu
  - CSV export: seçili il/havalimanı/tür kombinasyonu sadece doğru satırları üretiyor mu
- `tests/marine.test.js`
  - Mock ta1dx HTML → 3 bölüme doğru ayrılıyor mu
  - Kanal parse (CH16 vs 156.800 formatları)
  - CSV export seçime göre filtreliyor mu
- `tests/protected-unlock.test.js` (yeni)
  - Şifre girildikten sonra 4 grubun (airband, marine, pmr, dpmr) hepsinin overlay'ı gizleniyor mu
  - RX-only checkbox'ı unlock sonrası enable oluyor ve CSV'yi etkiliyor mu

Mevcut `tests/csv.test.js` güncellenir — eski "tüm airband frekansları" test senaryosu kaldırılır, yerine seçime dayalı senaryolar eklenir.

## Kabul kriterleri

1. `POST /api/auth/verify` ile token al → `GET /api/protected/airband` → `kaynak: "live"` ve `iller[].havalimanlari[].frekanslar[]` dolu döner.
2. skyvector erişilemez durumdaysa (curl simüle) `kaynak: "fallback"` dönmeli, response body geçerli.
3. UI'da şifre girildikten sonra **4 grup** (airband, marine, pmr, dpmr) da kilitten çıkar.
4. Airband'de 1 il seçilince havalimanı listesi o ile filtrelenir; havalimanı+tür seçimine göre CSV export yalnızca seçilenleri üretir.
5. Marine'de 3 accordion başlığında doğru `[tikli/toplam]` sayaçları. Export sadece tikli kanalları içerir.
6. PMR + dPMR için RX-only alt checkbox'ı kilit sonrası görünür ve CSV'yi etkiler.
7. Preset kaydet → sayfa yenile → preset yükle → airband/marine seçimleri geri gelir.
8. `npm test` → mevcut 29 + yeni ~12 test yeşil.
9. `npm run lint` → 0 yeni hata.
10. Canlıda `kaandikec.com/turk-role-exporter/` → deploy sonrası yeni UI çalışır.

## Açık noktalar

- **Skyvector parse edilebilir mi?** İlk denemelerde ülke listesi sayfası JS-render gibi göründü (düz HTML'de Türk havalimanı linki çıkmadı). Implementation aşamasında gerçek HTML'i inceleyip:
  - A) Eğer listeyi JS ediyorsa → `worker/index.js` içinde sabit ICAO listesi (LTAC, LTBA, LTBJ, LTFJ, LTFM, LTAI, LTFE, LTAN, LTBD, …) tanımla; her birinin detay sayfasını bireysel çek.
  - B) Eğer `og:` meta veya JSON-LD'den çıkarılabiliyorsa → parse et.
  - C) Hiçbiri olmazsa → skyvector yerine alternatif kaynak (OurAirports.com free CSV, manuel curated liste) düşün.
- Implementation sırasında skyvector parse edilemezse ekibe/kullanıcıya geri dönülür.
- Spec'in diğer bölümleri bu karardan bağımsız (UI, state, CSV mantığı değişmez).

## Düzenlenecek dosyalar

- `worker/index.js` — yeni fetcher fonksiyonları + AIRBAND_FALLBACK / MARINE_FALLBACK sabitleri + endpoint'ler
- `docs/index.html` — 3 paneli güncelle (airband cascade, marine accordions, PMR/dPMR protected-group)
- `docs/js/state.js` — `airbandSecim` + `marineSecim` ekle
- `docs/js/filter-ui.js` — yeni state'i okuma/yazma
- `docs/js/app.js` — şifre modalı hedef listesine PMR + dPMR ekle, UI event listener'lar
- `docs/js/auth-modal.js` — `korunanlariGuncelle` 4 grubu hedef alsın
- `docs/js/csv.js` — seçim-temelli export mantığı
- `docs/js/presets.js` — yeni state alanlarını serialize
- `docs/js/api.js` — `airbandGetir` / `marineGetir` yeni yapıyı parse edecek şekilde
- `tests/airband.test.js`, `tests/marine.test.js`, `tests/protected-unlock.test.js` — yeni
- `tests/csv.test.js` — mevcut, seçim-temelli senaryolarla güncelle
