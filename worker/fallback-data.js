/**
 * worker/fallback-data.js
 * Embedded fallback datasets for protected endpoints (airband, marine).
 * Returned when the live scrape fails or the scraper parser throws.
 *
 * Shape matches the live response: orchestrator overrides `kaynak` and
 * `guncellenme` with "live" / current ISO timestamp on a successful scrape.
 */

export const AIRBAND_FALLBACK = {
  kaynak: "fallback",
  guncellenme: "2026-04-16T00:00:00Z",
  iller: [
    {
      il: "Adana",
      havalimanlari: [
        {
          ad: "Adana Sakirpasa Airport", icao: "LTAF", iata: "ADA", sehir: "Seyhan",
          frekanslar: [
            { tur: "Approach", frek: "126.500", aciklama: "INCIRLIK APP" },
            { tur: "ATIS", frek: "119.225" },
            { tur: "Ground", frek: "121.900" },
            { tur: "Tower", frek: "121.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Incirlik Air Base", icao: "LTAG", iata: "UAB", sehir: "Saricam",
          frekanslar: [
            { tur: "Approach", frek: "126.500", aciklama: "TuAF APP" },
            { tur: "Approach", frek: "128.000", aciklama: "USAF APP" },
            { tur: "ATIS", frek: "129.750", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.950" },
            { tur: "Ground", frek: "123.025", aciklama: "USAF GND" },
            { tur: "Diger", frek: "131.900", aciklama: "COMD POST" },
            { tur: "Tower", frek: "122.100", aciklama: "TuAF TWR" },
            { tur: "Tower", frek: "129.400", aciklama: "USAF TWR" },
          ],
        },
      ],
    },
    {
      il: "Adiyaman",
      havalimanlari: [
        {
          ad: "Adiyaman Airport", icao: "LTCP", iata: "ADF", sehir: "Adiyaman",
          frekanslar: [
            { tur: "Tower", frek: "119.050", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Afyonkarahisar",
      havalimanlari: [
        {
          ad: "Afyon Air Base", icao: "LTAH", iata: "AFY", sehir: "Afyonkarahisar",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Agri",
      havalimanlari: [
        {
          ad: "Agri Airport", icao: "LTCO", iata: "AJI", sehir: "Agri",
          frekanslar: [
            { tur: "Tower", frek: "118.475", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Amasya",
      havalimanlari: [
        {
          ad: "Amasya Merzifon Airport", icao: "LTAP", iata: "MZH", sehir: "Amasya",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "ATIS", frek: "122.425", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Ankara",
      havalimanlari: [
        {
          ad: "Akinci Air Base", icao: "LTAE", sehir: "Ankara",
          frekanslar: [
            { tur: "Approach", frek: "119.100", aciklama: "ESENBOGA APP" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Esenboga International Airport", icao: "LTAC", iata: "ESB", sehir: "Ankara",
          frekanslar: [
            { tur: "Approach", frek: "119.100", aciklama: "APP" },
            { tur: "ATIS", frek: "123.600", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "118.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Etimesgut Air Base", icao: "LTAD", iata: "ANK", sehir: "Ankara",
          frekanslar: [
            { tur: "Approach", frek: "119.100", aciklama: "ESENBOGA APP" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Guvercinlik Airport", icao: "LTAB", sehir: "Ankara",
          frekanslar: [
            { tur: "ATIS", frek: "118.675" },
            { tur: "Ground", frek: "120.200" },
            { tur: "Tower", frek: "132.000" },
          ],
        },
      ],
    },
    {
      il: "Antalya",
      havalimanlari: [
        {
          ad: "Antalya International Airport", icao: "LTAI", iata: "AYT", sehir: "Antalya",
          frekanslar: [
            { tur: "Approach", frek: "122.050", aciklama: "upper" },
            { tur: "Approach", frek: "119.650", aciklama: "arrival" },
            { tur: "ATIS", frek: "118.275", aciklama: "ATIS" },
            { tur: "Clearance", frek: "123.175", aciklama: "CLNC DEL" },
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Diger", frek: "131.450", aciklama: "Handling Services" },
            { tur: "Tower", frek: "125.000", aciklama: "TWR east" },
            { tur: "Tower", frek: "126.100", aciklama: "TWR west" },
          ],
        },
        {
          ad: "Gazipasa-Alanya Airport", icao: "LTFG", iata: "GZP", sehir: "Gazipasa",
          frekanslar: [
            { tur: "Tower", frek: "119.250" },
          ],
        },
      ],
    },
    {
      il: "Balikesir",
      havalimanlari: [
        {
          ad: "Balikesir Airport", icao: "LTBF", iata: "BZI", sehir: "Balikesir",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Balikesir Koca Seyit Airport", icao: "LTFD", iata: "EDO", sehir: "Edremit",
          frekanslar: [
            { tur: "Diger", frek: "123.100", aciklama: "SAR" },
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "119.700", aciklama: "TWR" },
          ],
        },
        {
          ad: "Bandirma Airport", icao: "LTBG", iata: "BDM", sehir: "Bandirma",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Batman",
      havalimanlari: [
        {
          ad: "Batman Airport", icao: "LTCJ", iata: "BAL", sehir: "Batman",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "DIYARBAKIR APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Bursa",
      havalimanlari: [
        {
          ad: "Bursa Yenisehir Airport", icao: "LTBR", iata: "YEI", sehir: "Yenisehir",
          frekanslar: [
            { tur: "Approach", frek: "120.325", aciklama: "APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR/APP" },
          ],
        },
      ],
    },
    {
      il: "Canakkale",
      havalimanlari: [
        {
          ad: "Canakkale Airport", icao: "LTBH", iata: "CKZ", sehir: "Canakkale",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "YESILKOY APP" },
            { tur: "Tower", frek: "123.600", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Denizli",
      havalimanlari: [
        {
          ad: "Cardak Airport", icao: "LTAY", iata: "DNZ", sehir: "Denizli",
          frekanslar: [
            { tur: "Approach", frek: "121.600", aciklama: "MENDERES APP" },
            { tur: "Tower", frek: "118.600", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Diyarbakir",
      havalimanlari: [
        {
          ad: "Diyarbakir Airport", icao: "LTCC", iata: "DIY", sehir: "Diyarbakir",
          frekanslar: [
            { tur: "Diger", frek: "123.200", aciklama: "MAC ALCE" },
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "ATIS", frek: "122.425", aciklama: "ATIS" },
            { tur: "Ground", frek: "122.100", aciklama: "GND" },
            { tur: "Tower", frek: "118.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Elazig",
      havalimanlari: [
        {
          ad: "Elazig Airport", icao: "LTCA", iata: "EZS", sehir: "Elazig",
          frekanslar: [
            { tur: "Approach", frek: "118.100", aciklama: "APP" },
            { tur: "Tower", frek: "118.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Erzincan",
      havalimanlari: [
        {
          ad: "Erzincan Airport", icao: "LTCD", iata: "ERC", sehir: "Erzincan",
          frekanslar: [
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "118.500", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Erzurum",
      havalimanlari: [
        {
          ad: "Erzurum International Airport", icao: "LTCE", iata: "ERZ", sehir: "Erzurum",
          frekanslar: [
            { tur: "Approach", frek: "118.100", aciklama: "APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "118.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Eskisehir",
      havalimanlari: [
        {
          ad: "Eskisehir Air Base", icao: "LTBI", iata: "ESK", sehir: "Eskisehir",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "ATIS", frek: "122.425", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Hasan Polatkan Airport", icao: "LTBY", iata: "AOE", sehir: "Eskisehir",
          frekanslar: [
            { tur: "Tower", frek: "123.750", aciklama: "TWR" },
          ],
        },
        {
          ad: "Sivrihisar Airport", icao: "LTAV", sehir: "Sivrihisar",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "ESKISEHIR APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Gaziantep",
      havalimanlari: [
        {
          ad: "Gaziantep Oguzeli International Airport", icao: "LTAJ", iata: "GZT", sehir: "Gaziantep",
          frekanslar: [
            { tur: "Approach", frek: "120.100", aciklama: "APP" },
            { tur: "ATIS", frek: "119.275" },
            { tur: "Tower", frek: "120.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Igdir",
      havalimanlari: [
        {
          ad: "Igdir Airport", icao: "LTCT", iata: "IGD", sehir: "Igdir",
          frekanslar: [
            { tur: "Diger", frek: "119.600", aciklama: "Igdir Approach/Departure" },
            { tur: "Diger", frek: "126.000", aciklama: "Igdir Approach/Departure" },
            { tur: "Ground", frek: "121.800", aciklama: "Igdir Ground" },
            { tur: "Tower", frek: "121.300", aciklama: "Igdir Tower" },
          ],
        },
      ],
    },
    {
      il: "Isparta",
      havalimanlari: [
        {
          ad: "Suleyman Demirel International Airport", icao: "LTFC", iata: "ISE", sehir: "Isparta",
          frekanslar: [
            { tur: "Ground", frek: "121.700", aciklama: "ISPARTA GND" },
            { tur: "Tower", frek: "118.650", aciklama: "ISPARTA TWR" },
          ],
        },
      ],
    },
    {
      il: "Istanbul",
      havalimanlari: [
        {
          ad: "Istanbul Airport", icao: "LTFM", iata: "IST", sehir: "Istanbul",
          frekanslar: [
            { tur: "Clearance", frek: "127.100", aciklama: "Istanbul Clearance Delivery" },
            { tur: "Ground", frek: "121.750", aciklama: "Istanbul Ground" },
            { tur: "Tower", frek: "131.100", aciklama: "Istanbul Tower" },
          ],
        },
        {
          ad: "Istanbul Ataturk Airport", icao: "LTBA", iata: "ISL", sehir: "Istanbul(Bakirkoy)",
          frekanslar: [
            { tur: "Approach", frek: "120.500", aciklama: "YESILKOY APP" },
            { tur: "ATIS", frek: "128.200", aciklama: "ATIS" },
            { tur: "Clearance", frek: "121.700", aciklama: "YESILKOY DELIVERY" },
            { tur: "Ground", frek: "121.800", aciklama: "YESILKOY GND" },
            { tur: "Ramp", frek: "121.900", aciklama: "YESILKOY RAMP" },
            { tur: "Tower", frek: "118.100", aciklama: "YESILKOY TWR" },
          ],
        },
        {
          ad: "Istanbul Hezarfen Airfield", icao: "LTBW", sehir: "Catalca",
          frekanslar: [
            { tur: "Tower", frek: "118.250" },
            { tur: "Tower", frek: "121.650" },
          ],
        },
        {
          ad: "Istanbul Sabiha Gokcen International Airport", icao: "LTFJ", iata: "SAW", sehir: "Pendik, Istanbul",
          frekanslar: [
            { tur: "ATIS", frek: "128.200", aciklama: "ATIS" },
            { tur: "Diger", frek: "126.425" },
            { tur: "Ground", frek: "121.750", aciklama: "GND" },
            { tur: "Tower", frek: "118.800", aciklama: "TWR" },
          ],
        },
        {
          ad: "Istanbul Samandira Army Air Base", icao: "LTBX", sehir: "Umraniye, Istanbul",
          frekanslar: [
            { tur: "Tower", frek: "132.000", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Izmir",
      havalimanlari: [
        {
          ad: "Adnan Menderes International Airport", icao: "LTBJ", iata: "ADB", sehir: "Gaziemir",
          frekanslar: [
            { tur: "Approach", frek: "119.500", aciklama: "MENDERES APP" },
            { tur: "Approach", frek: "134.200", aciklama: "MENDERES APP" },
            { tur: "ATIS", frek: "129.200", aciklama: "MENDERES ATIS" },
            { tur: "Ground", frek: "121.900", aciklama: "MENDERES GND" },
            { tur: "Ramp", frek: "121.700", aciklama: "MENDERES RAMP" },
            { tur: "Tower", frek: "118.100", aciklama: "MENDERES TWR" },
          ],
        },
        {
          ad: "Cigli Airbase", icao: "LTBL", iata: "IGL", sehir: "Cigli",
          frekanslar: [
            { tur: "Approach", frek: "120.100", aciklama: "MENDERES APP" },
            { tur: "ATIS", frek: "122.425", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Gaziemir Air Base", icao: "LTBK", sehir: "Gaziemir",
          frekanslar: [
            { tur: "Approach", frek: "120.100", aciklama: "MENDERES APP" },
          ],
        },
        {
          ad: "Kaklic Airport", icao: "LTFA", sehir: "Cigli",
          frekanslar: [
            { tur: "Approach", frek: "120.100", aciklama: "MENDERES APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Selcuk Efes Airport", icao: "LTFB", iata: "IZM", sehir: "Selcuk",
          frekanslar: [
            { tur: "Tower", frek: "133.050", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Kahramanmaras",
      havalimanlari: [
        {
          ad: "Kahramanmaras Airport", icao: "LTCN", iata: "KCM", sehir: "Kahramanmaras",
          frekanslar: [
            { tur: "Diger", frek: "123.100", aciklama: "SAR" },
            { tur: "Tower", frek: "118.750", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Kars",
      havalimanlari: [
        {
          ad: "Kars Airport", icao: "LTCF", iata: "KSY", sehir: "Kars",
          frekanslar: [
            { tur: "Tower", frek: "122.400", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Kayseri",
      havalimanlari: [
        {
          ad: "Kayseri Erkilet International Airport", icao: "LTAU", iata: "ASR", sehir: "Kayseri",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Kocaeli",
      havalimanlari: [
        {
          ad: "Cengiz Topel Airport", icao: "LTBQ", iata: "KCO", sehir: "Kartepe",
          frekanslar: [
            { tur: "Approach", frek: "120.500", aciklama: "YESILKOY APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Konya",
      havalimanlari: [
        {
          ad: "Konya Airport", icao: "LTAN", iata: "KYA", sehir: "Konya",
          frekanslar: [
            { tur: "Approach", frek: "121.500", aciklama: "Emergency" },
            { tur: "Approach", frek: "122.100", aciklama: "Main APP" },
            { tur: "Ground", frek: "122.100", aciklama: "GND" },
            { tur: "Diger", frek: "131.425", aciklama: "Handling Services" },
            { tur: "Tower", frek: "122.100", aciklama: "Main TWR" },
          ],
        },
      ],
    },
    {
      il: "Kutahya",
      havalimanlari: [
        {
          ad: "Kutahya Airport", icao: "LTBN", sehir: "Kutahya",
          frekanslar: [
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Malatya",
      havalimanlari: [
        {
          ad: "Malatya Erhac Airport", icao: "LTAT", iata: "MLX", sehir: "Malatya",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "ATIS", frek: "128.350", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
        {
          ad: "Malatya Tulga Airport", icao: "LTAO", sehir: "Malatya",
          frekanslar: [
            { tur: "Tower", frek: "125.600", aciklama: "TWR" },
            { tur: "Tower", frek: "132.000", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Manisa",
      havalimanlari: [
        {
          ad: "Akhisar Airport / Akhisar Air Base", icao: "LTBT", sehir: "Akhisar",
          frekanslar: [
            { tur: "Approach", frek: "120.100", aciklama: "MENDERES APP" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Mardin",
      havalimanlari: [
        {
          ad: "Mardin Airport", icao: "LTCR", iata: "MQM", sehir: "Mardin",
          frekanslar: [
            { tur: "Tower", frek: "118.650", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Mugla",
      havalimanlari: [
        {
          ad: "Bodrum-Imsik Airport", icao: "LTBV", iata: "BXN", sehir: "Bodrum",
          frekanslar: [
            { tur: "Tower", frek: "126.000", aciklama: "BODRUM TWR" },
          ],
        },
        {
          ad: "Dalaman International Airport", icao: "LTBS", iata: "DLM", sehir: "Dalaman",
          frekanslar: [
            { tur: "Approach", frek: "119.225", aciklama: "APP" },
            { tur: "ATIS", frek: "127.350", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "118.500", aciklama: "TWR" },
          ],
        },
        {
          ad: "Milas Bodrum International Airport", icao: "LTFE", iata: "BJV", sehir: "Bodrum",
          frekanslar: [
            { tur: "Approach", frek: "119.500", aciklama: "MENDERES APP" },
            { tur: "Approach", frek: "119.775", aciklama: "MENDERES APP" },
            { tur: "ATIS", frek: "128.500", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "120.500", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Mus",
      havalimanlari: [
        {
          ad: "Mus Airport", icao: "LTCK", iata: "MSR", sehir: "Mus",
          frekanslar: [
            { tur: "Approach", frek: "122.100", aciklama: "APP" },
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
            { tur: "Tower", frek: "122.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Nevsehir",
      havalimanlari: [
        {
          ad: "Nevsehir Kapadokya Airport", icao: "LTAZ", iata: "NAV", sehir: "Nevsehir",
          frekanslar: [
            { tur: "Approach", frek: "119.100", aciklama: "ESENBOGA APP" },
            { tur: "Tower", frek: "119.000", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Rize",
      havalimanlari: [
        {
          ad: "Rize–Artvin Airport", icao: "LTFO", iata: "RZV", sehir: "Rize",
          frekanslar: [
            { tur: "Approach", frek: "127.150", aciklama: "Rize-Artvin Approach" },
            { tur: "Diger", frek: "123.100", aciklama: "Rize-Artvin Rescue Subcenter" },
            { tur: "Tower", frek: "121.800", aciklama: "Ground" },
            { tur: "Tower", frek: "126.750", aciklama: "Rize-Artvin Tower" },
          ],
        },
      ],
    },
    {
      il: "Samsun",
      havalimanlari: [
        {
          ad: "Samsun-Carsamba Airport", icao: "LTFH", iata: "SZF", sehir: "Samsun",
          frekanslar: [
            { tur: "Approach", frek: "118.175", aciklama: "APP" },
            { tur: "ATIS", frek: "129.350", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.700", aciklama: "GND" },
            { tur: "Tower", frek: "118.350", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Siirt",
      havalimanlari: [
        {
          ad: "Siirt Airport", icao: "LTCL", iata: "SXZ", sehir: "Siirt",
          frekanslar: [
            { tur: "Tower", frek: "132.050", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Sivas",
      havalimanlari: [
        {
          ad: "Sivas Nuri Demirag Airport", icao: "LTAR", iata: "VAS", sehir: "Sivas",
          frekanslar: [
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "118.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Tekirdag",
      havalimanlari: [
        {
          ad: "Tekirdag Corlu Airport", icao: "LTBU", iata: "TEQ", sehir: "Corlu",
          frekanslar: [
            { tur: "Approach", frek: "120.500", aciklama: "YESILKOY APP" },
            { tur: "ATIS", frek: "119.925", aciklama: "ATIS" },
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "120.375", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Tokat",
      havalimanlari: [
        {
          ad: "Tokat Airport", icao: "LTAW", iata: "TJK", sehir: "Tokat",
          frekanslar: [
            { tur: "Tower", frek: "118.700", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Trabzon",
      havalimanlari: [
        {
          ad: "Trabzon International Airport", icao: "LTCG", iata: "TZX", sehir: "Trabzon",
          frekanslar: [
            { tur: "Approach", frek: "120.100", aciklama: "APP" },
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "120.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Usak",
      havalimanlari: [
        {
          ad: "Usak Airport", icao: "LTBO", iata: "USQ", sehir: "Usak",
          frekanslar: [
            { tur: "Approach", frek: "122.350", aciklama: "Usak Approach" },
            { tur: "Tower", frek: "121.425", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Van",
      havalimanlari: [
        {
          ad: "Van Ferit Melen Airport", icao: "LTCI", iata: "VAN", sehir: "Van",
          frekanslar: [
            { tur: "Approach", frek: "118.100", aciklama: "APP" },
            { tur: "Ground", frek: "121.900", aciklama: "GND" },
            { tur: "Tower", frek: "118.100", aciklama: "TWR" },
          ],
        },
      ],
    },
    {
      il: "Yalova",
      havalimanlari: [
        {
          ad: "Yalova Air Base", icao: "LTBP", sehir: "Ciftlikkoy",
          frekanslar: [
            { tur: "Ground", frek: "121.950", aciklama: "GND" },
          ],
        },
      ],
    },
    {
      il: "Genel",
      havalimanlari: [
        {
          ad: "Acil Guard", icao: "GUARD",
          frekanslar: [
            { tur: "Acil", frek: "121.500", aciklama: "Uluslararasi Havacilik Acil" },
          ],
        },
      ],
    },
  ],
};

export const MARINE_FALLBACK = {
  kaynak: "fallback",
  guncellenme: "2026-04-15T00:00:00Z",
  bolumler: [
    {
      id: "vhf",
      ad: "VHF Marine Band",
      frekanslar: [
        { kanal: "CH16", frek: "156.800", ad: "ACIL", aciklama: "Uluslararasi Deniz Acil/Cagri" },
        { kanal: "CH70", frek: "156.525", ad: "DSC", aciklama: "Digital Selective Calling" },
        { kanal: "CH6", frek: "156.300", ad: "INTSH", aciklama: "Gemiler Arasi Guvenlik" },
        { kanal: "CH13", frek: "156.650", ad: "BRIJ", aciklama: "Kopru-Kopru Navigasyon" },
        { kanal: "CH8", frek: "156.400", ad: "WORK", aciklama: "Sahil Guvenlik / Calisma" },
        { kanal: "CH69", frek: "156.475", ad: "SHIP", aciklama: "Gemiler Arasi" },
        { kanal: "CH72", frek: "156.625", ad: "SHIP", aciklama: "Gemiler Arasi" },
        { kanal: "CH77", frek: "156.875", ad: "SHIP", aciklama: "Gemiler Arasi" },
        { kanal: "CH10", frek: "156.500", ad: "VTS", aciklama: "Turk Bogazi VTS Sektoru" },
        { kanal: "CH11", frek: "156.550", ad: "VTS", aciklama: "Turk Bogazi VTS / Kilavuz" },
        { kanal: "CH12", frek: "156.600", ad: "VTS", aciklama: "Turk Bogazi VTS Sektoru" },
        { kanal: "CH14", frek: "156.700", ad: "VTS", aciklama: "Turk Bogazi VTS Sektoru" },
        { kanal: "CH67", frek: "156.375", ad: "METEO", aciklama: "Meteoroloji Yayini / SG Arama" },
        { kanal: "CH71", frek: "157.075", ad: "PILOT", aciklama: "Istanbul Kilavuz" },
      ],
    },
    {
      id: "sar",
      ad: "SAR Frekanslari",
      frekanslar: [
        { kanal: "SAR-1", frek: "156.650", ad: "Sahil Guvenlik SAR" },
        { kanal: "SAR-2", frek: "123.100", ad: "Hava SAR (AM)" },
      ],
    },
    {
      id: "sahil",
      ad: "Turk Sahil Radyolari",
      frekanslar: [
        { kanal: "Istanbul Radio", frek: "156.800", ad: "Istanbul Sahil" },
        { kanal: "Antalya Radio", frek: "156.800", ad: "Antalya Sahil" },
        { kanal: "Izmir Radio", frek: "156.800", ad: "Izmir Sahil" },
      ],
    },
  ],
};
