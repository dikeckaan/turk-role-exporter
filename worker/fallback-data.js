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
  guncellenme: "2026-04-15T00:00:00Z",
  iller: [
    {
      il: "Istanbul",
      havalimanlari: [
        {
          ad: "Istanbul Havalimani",
          icao: "LTFM",
          frekanslar: [
            { tur: "ATIS", frek: "126.350", aciklama: "Istanbul Havalimani ATIS" },
            { tur: "ATIS", frek: "128.850", aciklama: "Istanbul Havalimani ATIS 2" },
            { tur: "Tower", frek: "131.100", aciklama: "Istanbul Havalimani Tower" },
            { tur: "Ground", frek: "121.750", aciklama: "Istanbul Havalimani Ground" },
          ],
        },
        {
          ad: "Sabiha Gokcen",
          icao: "LTFJ",
          frekanslar: [
            { tur: "ATIS", frek: "128.550", aciklama: "Sabiha Gokcen ATIS" },
            { tur: "Tower", frek: "118.100", aciklama: "Sabiha Gokcen Tower" },
            { tur: "Ground", frek: "121.800", aciklama: "Sabiha Gokcen Ground" },
          ],
        },
      ],
    },
    {
      il: "Ankara",
      havalimanlari: [
        {
          ad: "Esenboga",
          icao: "LTAC",
          frekanslar: [
            { tur: "ATIS", frek: "123.600", aciklama: "Esenboga ATIS" },
            { tur: "Tower", frek: "118.100", aciklama: "Esenboga Tower" },
            { tur: "Ground", frek: "121.900", aciklama: "Esenboga Ground" },
          ],
        },
      ],
    },
    {
      il: "Izmir",
      havalimanlari: [
        {
          ad: "Adnan Menderes",
          icao: "LTBJ",
          frekanslar: [
            { tur: "ATIS", frek: "129.200", aciklama: "Adnan Menderes ATIS" },
            { tur: "Tower", frek: "118.100", aciklama: "Adnan Menderes Tower" },
            { tur: "Ground", frek: "121.700", aciklama: "Adnan Menderes Ground" },
          ],
        },
      ],
    },
    {
      il: "Antalya",
      havalimanlari: [
        {
          ad: "Antalya",
          icao: "LTAI",
          frekanslar: [
            { tur: "ATIS", frek: "128.200", aciklama: "Antalya ATIS" },
            { tur: "Tower", frek: "118.100", aciklama: "Antalya Tower" },
          ],
        },
      ],
    },
    {
      il: "Genel",
      havalimanlari: [
        {
          ad: "Acil Guard",
          icao: "GUARD",
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
