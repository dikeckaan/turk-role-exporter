# Turk Role Exporter - Tasarim Dokumani

## Ozet

Turkiye amator telsiz role verilerini amatortelsizcilik.com.tr API'sinden cekip, kullanicinin secimlerine gore filtreleyip, CPS uyumlu CSV formatinda export eden web tabanli bir uygulama.

- **Frontend:** Vanilla HTML/CSS/JS — GitHub Pages (`kaandikec.com/turk-role-exporter`)
- **Backend:** Cloudflare Worker — CORS proxy (`telsizrole.kaandikec.com`)
- **Dil:** Turkce
- **Tema:** Koyu (dark mode)
- **Repo:** `git@github.com:dikeckaan/turk-role-exporter.git`

## Mimari

```
[GitHub Pages]                         [Cloudflare Worker]
kaandikec.com/turk-role-exporter       telsizrole.kaandikec.com
Statik SPA (Vanilla JS)                CORS Proxy + 10dk Cache
         |                                      |
         +---- fetch /api/roleler ------------->+
                                                |
                                  amatortelsizcilik.com.tr/roleler/data.json
```

- API verisi Cloudflare Worker uzerinden proxy edilir (CORS sorunu icin)
- CSV uretimi tamamen client-side yapilir
- Tum filtreleme ve donusum islemleri tarayicida gerceklesir

## Arayuz Duzeni

### 1. Ust Bar
- Proje adi ve kisa aciklama

### 2. Cihaz Secici
- Dropdown: CIHAZ_PROFILLERI anahtarlarindan dinamik olarak doldurulur
- Su an tek secenek: TYT MD-UV390 Plus (varsayilan secili)
- Altinda: "Diger cihaz destekleri yakinda eklenecektir" notu
- Cihaz profili secilen cihaza gore bant, mod ve CSV formatini belirler
- Yeni cihaz eklendiginde sadece CIHAZ_PROFILLERI'ne eklenmesi yeterli, UI otomatik guncellenir

### 3. Istatistik Paneli
- Toplam role sayisi
- Aktif / pasif dagilimi
- VHF / UHF / APRS dagilimi
- Analog / dijital dagilimi
- Secilen filtrelerle kac role kaldiginin ozeti

### 4. Harita (Leaflet.js)
- **TA Bolge katmani:** TA1-TA7 (TA6 dahil) bolgeleri renkli polygon olarak gosterilir, tiklaninca sec/kaldir
- **Role pin katmani:** Her role pin olarak, popup'ta detay (frekans, guc, yukseklik, puan, konum)
- Filtreler haritadaki pinleri de gunceller
- TA bolge secimi haritadan da filtreler panelinden de yapilabilir (senkron)

### 5. Filtreler Paneli

| Filtre | Tip | Varsayilan | Aciklama |
|--------|-----|------------|----------|
| Durum | Toggle | Acik | Sadece aktif roleler |
| Ruhsat | Toggle | Kapali | Sadece ruhsatli roleler |
| Bant | Checkbox | Hepsi secili | VHF / UHF / APRS (cihaz profiline gore kisitlanir) |
| Mod | Dropdown | Hepsi | Sadece Analog / Sadece Dijital / Dijital Oncelikli / Hepsi (cihaz profiline gore kisitlanir) |
| TA Bolgesi | Checkbox + Harita | Hepsi secili | TA1-TA7, harita ile entegre |
| Sehir | Arama kutulu coklu secim | Hepsi secili | Tumunu sec / hicbirini secme butonlari |
| Ilce | Dinamik coklu secim | Hepsi secili | Secilen sehirlere gore dinamik guncellenir |
| Topluluk puani | Toggle | Kapali | Dusuk puanlilari gizle |

### 6. Kanal Opsiyonlari

| Opsiyon | Tip | Varsayilan |
|---------|-----|------------|
| PMR kanallari ekle | Toggle | Kapali |
| dPMR kanallari ekle | Toggle | Kapali |
| Tum roleleri RX Only yap | Toggle | Acik |
| Guc seviyesi | Dropdown | High |
| Kanal adi formati | Dropdown | Plaka+Konum+Bant |
| Dosya adi | Text input | roleler_programlama.csv |

### 7. Onizleme Tablosu
- Filtrelenmis rolelerin listesi
- Sutunlar: Kanal adi, frekans, TX frekans, bant, mod, guc (W), yukseklik (m), puan, sehir, ilce, konum
- Siralama ve arama destegi
- Sadece secili sehir/ilce/bant/mod/bolge filtrelerine uyan roleler gosterilir

### 8. Indir Butonu
- "CSV Indir (TYT MD-UV390 Plus)" — secili cihaz formatinda export
- Sadece filtrelenmis roleler CSV'ye yazilir

## Cihaz Profil Sistemi

```js
const CIHAZ_PROFILLERI = {
  "tyt-md-uv390-plus": {
    ad: "TYT MD-UV390 Plus",
    bantlar: ["VHF", "UHF"],
    modlar: ["Analog", "Dijital"],
    maxKanal: 3000,
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
      "Decode 4", "Decode 5", "Decode 6", "Decode 7", "Decode 8"
    ],
    varsayilanDegerler: {
      bandWidth: "0",
      squelch: "3",
      tot: "4",
      power: "2",
      leaderMS: "1",
      contactName: "1",
      groupList: "1",
      colorCode: "1",
      nonQtDqt: "2",
      displayPtt: "1",
      reverseBurst: "1"
    },
    shiftHesaplama: {
      VHF: -0.600,
      UHF: -7.600
    }
  }
  // Ileride eklenecek cihazlar
};
```

Cihaz secildiginde:
- Desteklenmeyen bant filtreleri devre disi kalir
- Desteklenmeyen mod filtreleri devre disi kalir
- CSV formati cihaza ozgu sutunlarla uretilir

## Cloudflare Worker

```
GET telsizrole.kaandikec.com/api/roleler
-> Proxy: amatortelsizcilik.com.tr/roleler/data.json
-> CORS headers eklenir
-> 10 dakika cache (Cache API)
-> Hata durumunda uygun HTTP status + mesaj
```

## CSV Uretim Kurallari

- Turkce karakter temizleme: i->i, g->g, u->u, s->s, o->o, c->c vb.
- Kanal adi max 15 karakter
- Kanal adi formatlari:
  - Plaka+Konum+Bant: `06 Ankara VHF` (varsayilan)
  - Sehir+Konum: `Ankara Kvk`
  - Plaka+Konum: `06 Ankara`
- Shift hesaplamasi: VHF -0.6 MHz, UHF -7.6 MHz (rxtx TxRx veya Tx ise)
- Dijital kanallar: Channel Mode = 2, Analog: Channel Mode = 1
- PMR: 16 analog kanal (446.00625 - 446.19375 MHz)
- dPMR: 16 dijital kanal (446.103125 - 446.196875 MHz)
- Sadece filtrelenmis (secili sehir, ilce, bant, mod, bolge, durum, ruhsat, puan) roleler dahil edilir

## Dosya Yapisi

```
turk-role-exporter/
├── index.html              # Ana sayfa
├── css/
│   └── style.css           # Koyu tema stilleri
├── js/
│   ├── app.js              # Ana uygulama, baslatma
│   ├── api.js              # Worker API iletisimi
│   ├── cihazlar.js         # Cihaz profilleri
│   ├── filtreler.js        # Filtreleme mantigi
│   ├── harita.js           # Leaflet harita yonetimi
│   ├── tablo.js            # Onizleme tablosu
│   ├── csv.js              # CSV uretimi
│   ├── utils.js            # Yardimci fonksiyonlar (Turkce temizleme, vb.)
│   └── fallback-data.js    # API fallback verisi (gomulu JSON snapshot)
├── worker/
│   └── index.js            # Cloudflare Worker kodu
└── docs/
    └── superpowers/specs/  # Tasarim dokumanlari
```

## TA Bolgeleri

NOT: Bolge atamasi icin API'daki `tabolge` alani tek kaynak olarak kullanilir.
Asagidaki tablo yalnizca referans ve harita polygon cizimi icindir. Filtreleme `tabolge` alanina gore yapilir.

| Bolge | Iller |
|-------|-------|
| TA1 | Istanbul, Edirne, Kirklareli, Tekirdag, Canakkale, Balikesir, Bursa, Kocaeli, Sakarya, Bolu, Duzce, Bilecik, Eskisehir, Yalova |
| TA2 | Ankara, Cankiri, Kastamonu, Corum, Amasya, Tokat, Sivas, Kirikkale, Kirsehir, Nevsehir, Yozgat, Kayseri |
| TA3 | Erzincan, Erzurum, Kars, Igdir, Agri, Ardahan |
| TA4 | Izmir, Manisa, Aydin, Denizli, Mugla, Kutahya, Afyonkarahisar, Usak, Burdur, Isparta |
| TA5 | Antalya, Mersin, Adana, Hatay, Osmaniye, Kahramanmaras, Gaziantep, Kilis, Konya, Karaman, Aksaray, Nigde |
| TA6 | Zonguldak, Bartin, Karabuk, Sinop, Samsun, Ordu, Giresun, Trabzon, Rize, Artvin, Gumushane, Bayburt |
| TA7 | Malatya, Elazig, Tunceli, Bingol, Mus, Bitlis, Van, Hakkari, Diyarbakir, Batman, Siirt, Sirnak, Mardin, Sanliurfa, Adiyaman, Erzincan, Erzurum, Kars, Igdir, Agri, Ardahan |

## Il Plaka Kodlari
Mevcut scraper'daki 81 il + KKTC plaka eslestirmesi korunur.

## Upstream API Sema

Kaynak: `amatortelsizcilik.com.tr/roleler/data.json`

Ornek kayit:
```json
{
  "id": 1,
  "sehir": "adana",
  "ilce": null,
  "bant": "VHF",
  "konum": "Ruzgarli Tepe",
  "frekans": "145.700",
  "ton": "88.5",
  "rxtx": "TxRx",
  "lat": 37.0775,
  "lon": 35.2109,
  "ruhsat": true,
  "digital": 0,
  "guc": 5,
  "yukseklik": 270,
  "durum": true,
  "tabolge": "TA5",
  "thumbs_up": 32,
  "thumbs_down": 14,
  "thumbs_up_count": 32,
  "thumbs_down_count": 14,
  "comments_count": 0
}
```

Alan tanimlari:
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | integer | Benzersiz role ID |
| sehir | string | Sehir adi (kucuk harf, Turkce karakterli) |
| ilce | string/null | Ilce adi (nullable) |
| bant | string | "VHF", "UHF", "APRS", "ECHO" vb. |
| konum | string | Role konumu aciklamasi |
| frekans | string | RX frekans MHz (ornek: "145.700") |
| ton | string/null | CTCSS tonu Hz (ornek: "88.5", nullable) |
| rxtx | string/null | "TxRx" (cift yonlu), "Tx" (sadece TX shift), null |
| lat | float | Enlem |
| lon | float | Boylam |
| ruhsat | boolean | Ruhsat durumu |
| digital | integer/null | 0=Analog, 1=Dijital, 2=Dual mode, null |
| guc | integer/null | Cikis gucu Watt (5, 10, 25 vb., nullable) |
| yukseklik | integer/null | Deniz seviyesinden yukseklik metre (nullable) |
| durum | boolean | true=Aktif, false=Pasif |
| tabolge | string | TA bolgesi ("TA1"-"TA7") |
| thumbs_up | integer | Olumlu oy sayisi |
| thumbs_down | integer | Olumsuz oy sayisi |

## Hata Yonetimi

### Cloudflare Worker
- Upstream API erisim hatasi: HTTP 502 + `{"hata": "Kaynak sunucuya erisilemiyor"}`
- Timeout: HTTP 504 + `{"hata": "Kaynak sunucu zaman asimina ugradi"}`
- Gecersiz JSON: HTTP 502 + `{"hata": "Gecersiz veri formati"}`

### Frontend
- Worker erisilemezse: Fallback veriye gecilir (asagiya bkz.) + Sari banner "API hatasi ile karsilasildi. Fallback surum kullanilmaktadir." + Tekrar Dene butonu
- Fallback da bos/hataliysa: Kirmizi banner "Sunucuya erisilemiyor. Lutfen internet baglantinizi kontrol edin."
- Bos veri gelirse: "Hicbir role verisi bulunamadi." mesaji
- Sema degisikligi: Eksik alan varsa o role atlanir, konsola uyari yazilir

### Fallback Veri
- `js/fallback-data.js` dosyasinda API'nin anlık goruntusunu gomulu olarak barindirir
- Build/deploy sirasinda veya manuel olarak guncellenir
- Format: `const FALLBACK_ROLELER = [...]` (API JSON'u ile ayni sema)
- Kullanim sirasi: Worker API -> basarisizsa fallback-data.js
- Fallback aktifken sari uyari banner'i her zaman gorunur kalir, kullanici "Tekrar Dene" ile canli veriyi tekrar deneyebilir

## Turkce Karakter Temizleme (Unicode -> ASCII)

Kanal adlari CPS'in destekledigi ASCII ile sinirli oldugu icin:

| Turkce | ASCII | Unicode |
|--------|-------|---------|
| ç / Ç | c / C | U+00E7 / U+00C7 |
| ğ / Ğ | g / G | U+011F / U+011E |
| ı / İ | i / I | U+0131 / U+0130 |
| ö / Ö | o / O | U+00F6 / U+00D6 |
| ş / Ş | s / S | U+015F / U+015E |
| ü / Ü | u / U | U+00FC / U+00DC |
| â / Â | a / A | U+00E2 / U+00C2 |
| î / Î | i / I | U+00EE / U+00CE |

Yalnizca alfanumerik (A-Z, a-z, 0-9) ve bosluk karakterleri tutulur, gerisi cikarilir.

## Kanal Adi Kesme Stratejisi

Maksimum 15 karakter. Format: `{plaka} {konum} {bant}`

Kesme kurallari (sirasyla):
1. Konum kelimesini 7 karaktere kes
2. Toplam hala 15'i asiyorsa bant kismini kaldir
3. Toplam hala 15'i asiyorsa konum kelimesini gerekli kadar kes
4. Ornek: Kahramanmaras VHF rolesi -> konum "Kahramanm" (7 char) -> "46 Kahram VHF" (13 char, uygun)

## Topluluk Puani Filtresi

Puan hesabi: `thumbs_up / (thumbs_up + thumbs_down) * 100` (yuzde olarak)
- Hic oy yoksa (0/0): puan = 100 (notr, filtrelenmez)
- Toggle acikken: Puani %40'in altindaki roleler gizlenir
- Esik degeri sabit %40 (ilerde ayarlanabilir yapilamaz ama suan basit toggle)

## maxKanal Limiti

Cihaz profilindeki `maxKanal` (TYT MD-UV390 Plus icin 3000) asildiginda:
- CSV export butonu devre disi kalir
- Uyari mesaji gosterilir: "Secili filtrelerle X kanal olusacak. {cihaz} maksimum {maxKanal} kanal destekler. Lutfen filtrelerinizi daraltin."
- Kullanici filtreleri daralttikca sayi guncellenir

## Shift Hesaplama Kurallari

Kaynak alan: JSON'daki `rxtx` alani.
Olasi degerler: `"TxRx"`, `"Tx"`, `null`, `""` (bos string)

| rxtx degeri | bant | TX Frekans |
|-------------|------|------------|
| "TxRx" veya "Tx" | VHF | RX - 0.600 MHz |
| "TxRx" veya "Tx" | UHF | RX - 7.600 MHz |
| null, "", diger | herhangi | TX = RX (simplex) |

## PMR / dPMR Kanal Detaylari

### Analog PMR (ETSI EN 446 MHz, 12.5 kHz aralik)
| Kanal | Frekans (MHz) |
|-------|---------------|
| PMR 1 | 446.00625 |
| PMR 2 | 446.01875 |
| PMR 3 | 446.03125 |
| PMR 4 | 446.04375 |
| PMR 5 | 446.05625 |
| PMR 6 | 446.06875 |
| PMR 7 | 446.08125 |
| PMR 8 | 446.09375 |
| PMR 9 | 446.10625 |
| PMR 10 | 446.11875 |
| PMR 11 | 446.13125 |
| PMR 12 | 446.14375 |
| PMR 13 | 446.15625 |
| PMR 14 | 446.16875 |
| PMR 15 | 446.18125 |
| PMR 16 | 446.19375 |

### Dijital PMR (6.25 kHz aralik)
| Kanal | Frekans (MHz) |
|-------|---------------|
| dPMR 1 | 446.103125 |
| dPMR 2 | 446.109375 |
| dPMR 3 | 446.115625 |
| dPMR 4 | 446.121875 |
| dPMR 5 | 446.128125 |
| dPMR 6 | 446.134375 |
| dPMR 7 | 446.140625 |
| dPMR 8 | 446.146875 |
| dPMR 9 | 446.153125 |
| dPMR 10 | 446.159375 |
| dPMR 11 | 446.165625 |
| dPMR 12 | 446.171875 |
| dPMR 13 | 446.178125 |
| dPMR 14 | 446.184375 |
| dPMR 15 | 446.190625 |
| dPMR 16 | 446.196875 |
