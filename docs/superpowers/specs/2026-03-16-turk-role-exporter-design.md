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
- Dropdown: TYT MD-UV390 Plus (secili, tek secenek)
- Altinda: "Diger cihaz destekleri yakinda eklenecektir" notu
- Cihaz profili secilen cihaza gore bant, mod ve CSV formatini belirler

### 3. Istatistik Paneli
- Toplam role sayisi
- Aktif / pasif dagilimi
- VHF / UHF / APRS dagilimi
- Analog / dijital dagilimi
- Secilen filtrelerle kac role kaldiginin ozeti

### 4. Harita (Leaflet.js)
- **TA Bolge katmani:** TA1-TA7 bolgeleri renkli polygon olarak gosterilir, tiklaninca sec/kaldir
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
-> 10 dakika cache (Cache API veya KV)
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
│   └── utils.js            # Yardimci fonksiyonlar (Turkce temizleme, vb.)
├── worker/
│   └── index.js            # Cloudflare Worker kodu
└── docs/
    └── superpowers/specs/  # Tasarim dokumanlari
```

## TA Bolgeleri

| Bolge | Iller |
|-------|-------|
| TA1 | Istanbul, Edirne, Kirklareli, Tekirdag, Canakkale, Balikesir, Bursa, Kocaeli, Sakarya, Bolu, Duzce, Bilecik, Eskisehir, Yalova |
| TA2 | Ankara, Cankiri, Kastamonu, Corum, Amasya, Tokat, Sivas, Kirikkale, Kirsehir, Nevsehir, Yozgat, Kayseri |
| TA3 | Samsun, Ordu, Giresun, Trabzon, Rize, Artvin, Gumushane, Bayburt, Erzincan, Erzurum, Kars, Igdir, Agri, Ardahan |
| TA4 | Izmir, Manisa, Aydin, Denizli, Mugla, Kutahya, Afyonkarahisar, Usak, Burdur, Isparta |
| TA5 | Antalya, Mersin, Adana, Hatay, Osmaniye, Kahramanmaras, Gaziantep, Kilis, Konya, Karaman, Aksaray, Nigde |
| TA7 | Malatya, Elazig, Tunceli, Bingol, Mus, Bitlis, Van, Hakkari, Diyarbakir, Batman, Siirt, Sirnak, Mardin, Sanliurfa, Adiyaman |

## Il Plaka Kodlari
Mevcut scraper'daki 81 il + KKTC plaka eslestirmesi korunur.
