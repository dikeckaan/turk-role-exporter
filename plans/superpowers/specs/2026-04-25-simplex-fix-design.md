# Simplex Düzeltme & Kanal Listesi — Tasarım

**Tarih:** 2026-04-25
**Durum:** Tasarım onay bekliyor
**Kapsam:** Mevcut "Dijital Simplex" özelliğindeki bug'ları gider; FM analog simplex desteğini ekle; ikisini de marine pattern'i gibi kullanıcı tarafından kanal-kanal seçilebilir yap.

---

## 1. Sorun

### 1.1 Mevcut bug'lar
- **`docs/js/csv.js:144,146,322`** — Dijital simplex (DMR/C4FM/D-STAR/NXDN) satırları yazılırken `Mode = "FM"` ve `Tone = "88.5"` hardcoded. Analog cihazlarda squelch'i yanlış davrandırır; dijital cihazlarda yanlış mod ile yazar.
- **`docs/js/frekanslar.js:425`** — `param: "TG 99 CC1 TS1"` field tanımlı ama CSV writer hiçbir yere yazmıyor → DMR talkgroup/colorcode/timeslot bilgisi kayboluyor.
- **`docs/js/frekanslar.js:425-426`** — `433.4500` MHz hem DMR hem NXDN için aynı freq'te listelenmiş; analog cihazda iki özdeş RX kaydı yaratıyor.
- **`worker/index.js:681-715, 854-859`** — `parseSimplex` ve `handleTaroleSimplex` ta-role.com'dan veri çekiyor ama frontend hiç çağırmıyor (dead code).
- **Eksik içerik:** Türkiye'de en çok kullanılan FM simplex çağrı kanalları (145.500 VHF Calling, 433.500 UHF Calling, 144.300 SSB Calling) listede hiç yok.

### 1.2 UI eksikliği
Mevcut `opsiyon-simplex` checkbox tek anahtarla 8 dijital frekansı toplu ekler. Kullanıcı tek tek seçemez; FM simplex hiç yok.

---

## 2. Hedef

1. **İki ayrı checkbox**: "FM Simplex Kanalları" + "Dijital Simplex Kanalları"
2. Her ikisinin altında **VHF/UHF accordion** + kanal-kanal seçim (marine pattern'i ile bire bir tutarlı).
3. CSV writer'ları cihaz profiline göre doğru mod, tone, comment alanlarını yazacak.
4. Çağrı kanalları (`onemli: true`) ilk açılışta default seçili gelsin.
5. Worker'daki dead simplex scrape kodu silinecek.

---

## 3. Kapsam dışı (yagni)

- Ta-role.com simplex sayfasından canlı scrape — kapsam dışı (mevcut listeyi worker'dan geri yükleme planı yok). Statik liste güncellenmek istenirse `frekanslar.js` üzerinden manuel.
- Kullanıcının kendi simplex frekansı eklemesi (custom freq UI) — kapsam dışı.
- Diğer source bug'ları (ta-role `sehir: ""`, dedup 8-char truncate) — ayrı iş olarak ele alınacak, bu spec'in dışında.

---

## 4. Mimari

### 4.1 Veri (`docs/js/frekanslar.js`)

Mevcut `DIGITAL_SIMPLEX` (`:422`) **silinir**. Yerine iki yeni export:

```js
export const FM_SIMPLEX = {
  vhf: {
    ad: "VHF FM Simplex",
    frekanslar: [
      { kanal: "V01", frek: 145.500,  ad: "VHF Calling", onemli: true,  mod: "FM" },
      { kanal: "V02", frek: 145.2125, ad: "Simplex 1",                 mod: "FM" },
      { kanal: "V03", frek: 145.225,  ad: "Simplex 2",                 mod: "FM" },
      // ... 145.2125 → 145.3875 arası 12.5 kHz adım (15 frekans)
      { kanal: "VSB", frek: 144.300,  ad: "SSB Calling",  onemli: true, mod: "USB" },
    ],
  },
  uhf: {
    ad: "UHF FM Simplex",
    frekanslar: [
      { kanal: "U01", frek: 433.500,  ad: "UHF Calling", onemli: true, mod: "FM" },
      { kanal: "U02", frek: 433.4000, ad: "Simplex 1",                mod: "FM" },
      // ... 433.4000 → 434.6750 arası 12.5 kHz adım
      { kanal: "USB", frek: 432.500,  ad: "UHF SSB",     onemli: true, mod: "USB" },
    ],
  },
};

export const DIJITAL_SIMPLEX = {
  vhf: {
    ad: "VHF Dijital Simplex",
    frekanslar: [
      { kanal: "DV1", frek: 144.5375, mod: "C4FM",   ad: "C4FM VHF" },
      { kanal: "DV2", frek: 144.5500, mod: "DMR",    ad: "DMR VHF",   param: "TG99 CC1 TS1" },
      { kanal: "DV3", frek: 144.5500, mod: "NXDN",   ad: "NXDN VHF",  param: "TG9 RAN1" },
      { kanal: "DV4", frek: 144.5625, mod: "D-STAR", ad: "DSTAR VHF" },
    ],
  },
  uhf: {
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

**Tam frekans listesi (FM):**
- VHF (16 kanal): 145.500, 144.300, 145.2125, 145.225, 145.2375, 145.250, 145.2625, 145.275, 145.2875, 145.300, 145.3125, 145.325, 145.3375, 145.350, 145.3625, 145.3875
- UHF (10 kanal): 433.500, 432.500, 433.4000, 433.4125, 433.425, 433.4625, 433.475, 433.4875, 434.000, 434.500

**Dijital:** mevcut 8 frekans korunur, sadece bölümlendirildi.

### 4.2 State (`docs/js/state.js`)

```js
state.fmSimplexEkle      = false;   // master toggle
state.dijitalSimplexEkle = false;
state.fmSimplexSecim     = { vhf: ["V01","VSB"], uhf: ["U01","USB"] }; // onemli: true defaults
state.dijitalSimplexSecim = { vhf: [], uhf: [] };
```

Mevcut `state.simplexEkle` kaldırılır.

### 4.3 UI (`docs/js/simplex-ui.js` — yeni dosya)

Marine UI mimari deseninin (`docs/js/marine-ui.js`) bire bir kopyası, dataset/state-key parametreli. İki public fonksiyon:

```js
export function simplexUiKur(panelEl, dataset, secimRefGetter, refreshUyari);
export function secilenSimplexFrekanslari(dataset, secim); // flat list, CSV writer'a verilir
```

`panelEl` içinde her bant (`vhf`, `uhf`) bir `<details>` accordion'u; her frekans bir checkbox + label (örn. `145.500  VHF Calling`); başlıkta `[seçili/toplam]` rozeti + "Hepsi / Hiçbiri" toggle butonu.

`onemli: true` olanlar ilk açılışta `state.*Secim` içinde gelir, kullanıcı kapatabilir.

### 4.4 HTML (`docs/index.html`)

Mevcut `opsiyon-simplex` satırı kaldırılır. Yerine:

```html
<div class="opsiyon-grup">
  <label><input type="checkbox" id="opsiyon-fm-simplex"> FM Simplex Kanalları</label>
  <div id="fm-simplex-panel" class="simplex-panel"></div>
</div>
<div class="opsiyon-grup">
  <label><input type="checkbox" id="opsiyon-dijital-simplex"> Dijital Simplex Kanalları</label>
  <div id="dijital-simplex-panel" class="simplex-panel"></div>
</div>
```

CSS: marine ile aynı sınıfları paylaşır (`marine-bolum`, `marine-toggle-all`, `marine-count` → simplex'e generic isim verip ortak hale getir veya birebir kopyala). Bölüm 8'deki açık karara bağlı; default tercih A (generic class isimleri).

### 4.5 CSV writer (`docs/js/csv.js`)

Mevcut iki simplex blok (`:137-148`, `:317-323`) silinir. Yerine cihaz tipine göre dispatch eden helper:

```js
function simplexSatirlariUret(profil, opsiyonlar, locStart) {
  const fmFlat  = secilenSimplexFrekanslari(FM_SIMPLEX,      opsiyonlar.fmSimplexSecim);
  const digFlat = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, opsiyonlar.dijitalSimplexSecim);
  // her birini cihaz formatına göre satır olarak yaz
}
```

**Mod/tone kuralları:**

| Cihaz csvFormat | FM Simplex satırı | Dijital Simplex satırı |
|---|---|---|
| `chirp` (UV-K5/UV-K1/K5+) | `Duplex = ""` (simplex), `Offset = "0.000000"`, `Mode = "FM"` veya `"USB"` (kanaldaki `mod`'a göre), `Tone = ""`, `rToneFreq/cToneFreq = ""`, `TStep = "12.50"`, `Power = profil.gucSeviyeleri[secili]` | Cihaz dijital decode edemez → `Duplex = "off"` (RX-only zorla), `Mode = "FM"`, `Skip = "S"`, `Comment = "{mod} {param}"` (örn. `"DMR TG99 CC1 TS1"`) |
| `cps` (MD-UV390 / Plus) | `Channel Mode = 1`, `Band Width = 0`, `CTCSS/DCS = "None"` | `Channel Mode = 2` (DMR), `Color Code` ve `Repeater Slot` `param`'dan parse, default TG = 99, Contact Name = 1 |
| `opengd77` | `Channel Type = "Analogue"`, `Bandwidth = 12.5`, `RX/TX Tone = "None"` | `Channel Type = "Digital"`, `Colour Code` + `Timeslot` `param`'dan, `Contact = "None"`, `TG List = "None"` |

**Hardcoded `"88.5"` tone tamamen kaldırılır** — FM simplex'lerin gerçek tonu yoktur (open squelch).

**Duplicate freq (`144.5500` hem DMR hem NXDN):** her satır ayrı kanal olarak yazılır; kullanıcı UI'da hangisini istediğini seçti, CSV'de iki ayrı satır var. Analog cihazda bu iki satırın `Comment` alanlarından biri DMR diğeri NXDN olarak görünür.

**Kanal adı oluşturma** (CHIRP `maxKanalAdi` 10 char, CPS 16 char):
- FM: `${kanal}-${ad.slice(0,7)}` örn. `V01-VHFCal` (10), `U01-UHFCalling ` (16)
- Dijital: `${mod}-${kanal.slice(1,3)}` örn. `DMR-V2`, `C4F-U1`

### 4.6 ekKanalSayisi & kanalDagilimi (`docs/js/frekanslar.js:441,462`)

```js
if (opsiyonlar.fmSimplexEkle) {
  toplam += secilenSimplexFrekanslari(FM_SIMPLEX, opsiyonlar.fmSimplexSecim).length;
}
if (opsiyonlar.dijitalSimplexEkle) {
  toplam += secilenSimplexFrekanslari(DIJITAL_SIMPLEX, opsiyonlar.dijitalSimplexSecim).length;
}
```

Kanal dağılımı tablosunda iki ayrı satır olarak gösterilir.

### 4.7 Cihaz uyumluluk uyarıları (`docs/js/app.js:181`)

Mevcut `dijitalDestekli` kontrolü (`profil.modlar.includes("Dijital")`) zaten var. `simplexEkle` referansı `dijitalSimplexEkle`'ye taşınır:

```js
if (!dijitalDestekli && opsiyonlar.dijitalSimplexEkle) {
  uyarilar.push("Dijital simplex kanallari eklendi ama bu cihaz dijital decode edemez; RX-only FM olarak yazilacak.");
}
```

FM simplex tüm cihazlarda destekli, uyarı yok.

### 4.8 Preset şeması (`docs/js/presets.js`)

Şema versiyonu **v2 → v3**. Yeni alanlar: `fmSimplexEkle`, `fmSimplexSecim`, `dijitalSimplexEkle`, `dijitalSimplexSecim`.

**v2 → v3 migration:**
```js
if (preset.version === 2 && preset.simplexEkle) {
  preset.dijitalSimplexEkle  = true;
  preset.dijitalSimplexSecim = { vhf: ["DV1","DV2","DV3","DV4"], uhf: ["DU1","DU2","DU3","DU4"] };
  preset.fmSimplexEkle  = false;
  preset.fmSimplexSecim = { vhf: ["V01","VSB"], uhf: ["U01","USB"] };
  delete preset.simplexEkle;
  preset.version = 3;
}
```

### 4.9 Worker temizliği

`worker/index.js`:
- `:681-715` — `parseSimplex` fonksiyonu silinir
- `:854-859` — `handleTaroleSimplex` ve `/api/tarole/simplex` route silinir
- Top-level comment block (`:11`) güncellenir

---

## 5. Test stratejisi

### 5.1 Unit testler (`tests/csv.test.js`)
- FM simplex satırının `Mode = "FM"`, tone alanlarının boş yazıldığı (CHIRP)
- Dijital simplex'in analog cihazda `Mode = "FM"`, `Skip = "S"`, `Comment` alanında `"DMR TG99 CC1 TS1"` içerdiği
- OpenGD77 dijital simplex satırında `Channel Type = "Digital"`, `Colour Code = 1`, `Timeslot = 1`
- CPS (MD-UV390) dijital simplex satırında `Channel Mode = 2`
- Önemli (`onemli: true`) frekansların default seçim listesinde olduğu
- Çağrı kanallarının seçili olmamasının desteklendiği (kullanıcı tüm checkbox'ları açabilir)
- Duplicate freq (DMR + NXDN aynı freq) iki ayrı CSV satırı yazıldığı

### 5.2 Manuel test (golden path)
- UV-K5 profili, FM Simplex açık, sadece çağrı kanalları seçili → CSV'de 4 kanal (VHF Calling, SSB Calling, UHF Calling, UHF SSB)
- UV-K5, dijital simplex açık → 8 satır, hepsi RX-only FM, Comment'lerde mod tanımı
- OpenGD77, dijital simplex tüm seçili → DMR/C4FM/D-STAR/NXDN ayrı kanallar
- MD-UV390, FM + dijital ikisi açık → karışık 16+ kanal, mode'lar doğru

### 5.3 Migration testi
- `localStorage`'da v2 preset (`simplexEkle: true`) → uygulamaya yüklenince v3'e migrate olur, dijital simplex kanalları seçili gelir, uyarı/error yok.

---

## 6. Risk & Trade-off

| Risk | Etki | Hafifletme |
|---|---|---|
| Default seçili çağrı kanalları beklenmedik kanal eklenmesine neden olabilir | Düşük — kullanıcı görür ve kapatabilir | UI'da `onemli` etiketli kanalları görsel ayırt et (kalın font / yıldız) |
| Preset migration v2 → v3 başarısız olursa kullanıcı eski preset'ini kaybedebilir | Orta | Migration sırasında orijinal v2'yi `localStorage[presetKey + "_v2_backup"]` olarak yedekle |
| Marine ile CSS sınıf paylaşımı stil değişikliği yaparsa iki feature'ı birden etkiler | Düşük | Generic class isimleri seçilirken net dokümante (kod yorum + spec) |
| Duplicate DMR/NXDN aynı freq hala karışıklık yaratabilir | Düşük | UI'da kanal adı `"DMR VHF"` vs `"NXDN VHF"` net; CSV `Comment` alanında da görünür |

---

## 7. Etkilenen dosyalar (özet)

```
docs/js/frekanslar.js       — DIGITAL_SIMPLEX silindi, FM_SIMPLEX + DIJITAL_SIMPLEX eklendi
docs/js/state.js            — yeni state alanları
docs/js/simplex-ui.js       — yeni dosya (marine-ui paterninin generic versiyonu)
docs/js/csv.js              — 3 serializer'da simplex bloğu yeniden yazıldı
docs/js/presets.js          — v2 → v3 migration
docs/js/app.js              — checkbox handler'lar, uyarı mesajları
docs/index.html             — opsiyon-simplex → fm/dijital ayırımı + paneller
docs/css/styles.css         — list-bolum/list-count/list-toggle-all generic
worker/index.js             — parseSimplex + handleTaroleSimplex silindi
tests/csv.test.js           — yeni test caseleri
```

---

## 8. Açık karar (onay gerekli)

CSS sınıf isimlerini generic yapma (Marine ile paylaşılsın mı):
- **A.** Generic (`list-bolum` vb.) — kod tekrarı yok, ama scope marine'i de etkiler
- **B.** Birebir kopya (`simplex-bolum` vb.) — daha izole, ama 30-40 satır CSS tekrarı

Önerim: **A** — projenin geneli zaten DRY tutuluyor, marine sınıflarını yeniden adlandırma riski düşük (tek yerde kullanılıyor).
