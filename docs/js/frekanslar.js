import { normalizeTurkce } from "./utils.js";

/**
 * frekanslar.js
 * Static frequency data for FM broadcast, aviation (airband), maritime (marine),
 * DMR talk groups, and digital simplex channels.
 *
 * All frequencies are in MHz unless otherwise noted.
 * Aviation and maritime channels are RX-only by nature for amateur radios.
 *
 * FM data: Per-city frequencies for major national stations. Sources:
 *   - powerapp.com.tr (Power FM official)
 *   - radyod.com (Radyo D official)
 *   - Wikipedia "List of radio stations in Turkey"
 *   - radyotara.com cross-reference
 */

// ---------------------------------------------------------------------------
// FM Broadcast — Real Turkish radio stations organized by city
// Each city maps to röle filtre sehir names (lowercase, ASCII)
// ---------------------------------------------------------------------------

export const FM_SEHIRLER = {
  istanbul: {
    ad: "Istanbul",
    istasyonlar: [
      { frek: 88.2, ad: "TRT Radyo3" },
      { frek: 88.6, ad: "IstanbulFM" },
      { frek: 89.0, ad: "Joy Turk" },
      { frek: 89.2, ad: "Alem FM" },
      { frek: 89.6, ad: "Kafa Radyo" },
      { frek: 89.8, ad: "Show Radyo" },
      { frek: 90.0, ad: "Radyo Viva" },
      { frek: 90.4, ad: "Haberturk" },
      { frek: 90.8, ad: "Super FM" },
      { frek: 91.4, ad: "TRT FM" },
      { frek: 92.0, ad: "Kral FM" },
      { frek: 92.5, ad: "CNN Turk R" },
      { frek: 94.9, ad: "Acik Radyo" },
      { frek: 95.3, ad: "Slow Turk" },
      { frek: 95.6, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 98.4, ad: "Best FM" },
      { frek: 99.2, ad: "Pal FM" },
      { frek: 99.4, ad: "Virgin Rad" },
      { frek: 99.8, ad: "Power Turk" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 100.4, ad: "R Fenomen" },
      { frek: 102.8, ad: "NTV Radyo" },
      { frek: 104.0, ad: "Radyo D" },
      { frek: 104.6, ad: "Radyo 7" },
    ],
  },
  ankara: {
    ad: "Ankara",
    istasyonlar: [
      { frek: 87.7, ad: "Pal FM" },
      { frek: 88.0, ad: "TRT FM" },
      { frek: 88.8, ad: "Show Radyo" },
      { frek: 89.8, ad: "Radyo 7" },
      { frek: 90.4, ad: "Haberturk" },
      { frek: 90.8, ad: "Super FM" },
      { frek: 91.2, ad: "TRT Radyo3" },
      { frek: 93.3, ad: "TRT Radyo1" },
      { frek: 93.6, ad: "Radyo Viva" },
      { frek: 93.8, ad: "Virgin Rad" },
      { frek: 95.3, ad: "Slow Turk" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 98.3, ad: "Best FM" },
      { frek: 98.8, ad: "R Fenomen" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 100.7, ad: "Kafa Radyo" },
      { frek: 102.4, ad: "Kral FM" },
      { frek: 104.0, ad: "Radyo D" },
      { frek: 104.7, ad: "NTV Radyo" },
      { frek: 105.3, ad: "Alem FM" },
      { frek: 106.0, ad: "Joy Turk" },
    ],
  },
  izmir: {
    ad: "Izmir",
    istasyonlar: [
      { frek: 87.9, ad: "Pal FM" },
      { frek: 88.4, ad: "TRT Radyo3" },
      { frek: 89.3, ad: "Radyo Viva" },
      { frek: 90.8, ad: "Super FM" },
      { frek: 91.0, ad: "TRT FM" },
      { frek: 92.3, ad: "Kral FM" },
      { frek: 93.0, ad: "TRT Radyo1" },
      { frek: 94.0, ad: "Joy Turk" },
      { frek: 95.0, ad: "Slow Turk" },
      { frek: 96.0, ad: "Show Radyo" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 98.4, ad: "Best FM" },
      { frek: 99.0, ad: "Alem FM" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 101.6, ad: "R Fenomen" },
      { frek: 102.4, ad: "NTV Radyo" },
      { frek: 104.0, ad: "Radyo D" },
      { frek: 104.2, ad: "Virgin Rad" },
      { frek: 106.0, ad: "Haberturk" },
    ],
  },
  antalya: {
    ad: "Antalya",
    istasyonlar: [
      { frek: 87.6, ad: "TRT FM" },
      { frek: 89.4, ad: "Kral FM" },
      { frek: 91.8, ad: "TRT Radyo1" },
      { frek: 93.4, ad: "Slow Turk" },
      { frek: 94.2, ad: "Super FM" },
      { frek: 95.0, ad: "Power FM" },
      { frek: 96.6, ad: "Best FM" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 99.0, ad: "Radyo D" },
      { frek: 100.4, ad: "NTV Radyo" },
      { frek: 101.0, ad: "Show Radyo" },
      { frek: 104.0, ad: "Radyo D" },
      { frek: 104.4, ad: "Virgin Rad" },
    ],
  },
  bursa: {
    ad: "Bursa",
    istasyonlar: [
      { frek: 88.0, ad: "TRT Radyo3" },
      { frek: 89.6, ad: "TRT FM" },
      { frek: 90.6, ad: "TRT Radyo1" },
      { frek: 90.8, ad: "Super FM" },
      { frek: 92.8, ad: "Kral FM" },
      { frek: 95.3, ad: "Slow Turk" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 98.4, ad: "Best FM" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 101.2, ad: "NTV Radyo" },
      { frek: 102.6, ad: "Radyo D" },
      { frek: 104.0, ad: "Show Radyo" },
    ],
  },
  adana: {
    ad: "Adana",
    istasyonlar: [
      { frek: 88.6, ad: "TRT FM" },
      { frek: 89.2, ad: "TRT Radyo3" },
      { frek: 92.0, ad: "Super FM" },
      { frek: 93.6, ad: "TRT Radyo1" },
      { frek: 95.0, ad: "Slow Turk" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 98.4, ad: "Best FM" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 102.9, ad: "Power FM 2" },
      { frek: 104.4, ad: "Radyo D" },
    ],
  },
  konya: {
    ad: "Konya",
    istasyonlar: [
      { frek: 88.4, ad: "TRT FM" },
      { frek: 90.0, ad: "TRT Radyo3" },
      { frek: 91.6, ad: "TRT Radyo1" },
      { frek: 93.4, ad: "Super FM" },
      { frek: 96.0, ad: "Kral FM" },
      { frek: 97.0, ad: "Power FM" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 99.0, ad: "Best FM" },
      { frek: 104.0, ad: "Radyo D" },
    ],
  },
  kocaeli: {
    ad: "Kocaeli",
    istasyonlar: [
      { frek: 88.8, ad: "Haberturk" },
      { frek: 89.2, ad: "Alem FM" },
      { frek: 89.8, ad: "Show Radyo" },
      { frek: 90.0, ad: "Radyo Viva" },
      { frek: 90.8, ad: "Super FM" },
      { frek: 92.0, ad: "Kral FM" },
      { frek: 95.6, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 104.0, ad: "Radyo D" },
    ],
  },
  samsun: {
    ad: "Samsun",
    istasyonlar: [
      { frek: 88.0, ad: "TRT FM" },
      { frek: 90.4, ad: "TRT Radyo3" },
      { frek: 93.2, ad: "TRT Radyo1" },
      { frek: 96.3, ad: "Super FM" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 104.4, ad: "Radyo D" },
    ],
  },
  trabzon: {
    ad: "Trabzon",
    istasyonlar: [
      { frek: 88.0, ad: "TRT FM" },
      { frek: 90.3, ad: "Super FM" },
      { frek: 91.4, ad: "TRT Radyo3" },
      { frek: 93.0, ad: "TRT Radyo1" },
      { frek: 96.4, ad: "Power FM" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 104.0, ad: "Radyo D" },
    ],
  },
  gaziantep: {
    ad: "Gaziantep",
    istasyonlar: [
      { frek: 88.0, ad: "TRT FM" },
      { frek: 90.6, ad: "TRT Radyo3" },
      { frek: 93.0, ad: "TRT Radyo1" },
      { frek: 99.3, ad: "Super FM" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 104.0, ad: "Radyo D" },
      { frek: 104.6, ad: "Power FM" },
    ],
  },
  eskisehir: {
    ad: "Eskisehir",
    istasyonlar: [
      { frek: 88.4, ad: "TRT FM" },
      { frek: 90.2, ad: "TRT Radyo3" },
      { frek: 91.8, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 97.8, ad: "Super FM" },
      { frek: 100.5, ad: "Power FM" },
      { frek: 104.0, ad: "Radyo D" },
    ],
  },
  diyarbakir: {
    ad: "Diyarbakir",
    istasyonlar: [
      { frek: 88.4, ad: "TRT FM" },
      { frek: 91.0, ad: "TRT Radyo3" },
      { frek: 93.4, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 97.5, ad: "Super FM" },
      { frek: 100.3, ad: "Power FM" },
      { frek: 104.0, ad: "Radyo D" },
    ],
  },
  erzurum: {
    ad: "Erzurum",
    istasyonlar: [
      { frek: 88.0, ad: "TRT FM" },
      { frek: 89.8, ad: "Super FM" },
      { frek: 91.2, ad: "TRT Radyo3" },
      { frek: 93.0, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 100.7, ad: "Power FM" },
      { frek: 104.0, ad: "Radyo D" },
    ],
  },
  kayseri: {
    ad: "Kayseri",
    istasyonlar: [
      { frek: 88.8, ad: "TRT FM" },
      { frek: 90.4, ad: "TRT Radyo3" },
      { frek: 93.6, ad: "TRT Radyo1" },
      { frek: 96.0, ad: "Radyo D" },
      { frek: 96.2, ad: "Super FM" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 100.0, ad: "Power FM" },
    ],
  },
  mersin: {
    ad: "Mersin",
    istasyonlar: [
      { frek: 88.2, ad: "TRT FM" },
      { frek: 90.6, ad: "TRT Radyo3" },
      { frek: 93.2, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 97.3, ad: "Super FM" },
      { frek: 104.0, ad: "Radyo D" },
      { frek: 105.0, ad: "Power FM" },
    ],
  },
  tekirdag: {
    ad: "Tekirdag",
    istasyonlar: [
      { frek: 88.2, ad: "TRT Radyo3" },
      { frek: 90.4, ad: "Haberturk" },
      { frek: 91.4, ad: "TRT FM" },
      { frek: 91.8, ad: "Super FM" },
      { frek: 95.6, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 100.0, ad: "Power FM" },
      { frek: 104.8, ad: "Radyo D" },
    ],
  },
  edirne: {
    ad: "Edirne",
    istasyonlar: [
      { frek: 88.0, ad: "TRT FM" },
      { frek: 90.2, ad: "TRT Radyo3" },
      { frek: 93.0, ad: "TRT Radyo1" },
      { frek: 97.2, ad: "Metro FM" },
      { frek: 98.4, ad: "Super FM" },
      { frek: 100.0, ad: "Power FM" },
    ],
  },
};

/**
 * Maps röle filter city names to FM city keys.
 * Repeater data uses Turkish city names; this maps them to our FM keys.
 */
const SEHIR_FM_MAP = {
  istanbul: "istanbul",
  ankara: "ankara",
  izmir: "izmir",
  antalya: "antalya",
  bursa: "bursa",
  adana: "adana",
  konya: "konya",
  kocaeli: "kocaeli",
  samsun: "samsun",
  trabzon: "trabzon",
  gaziantep: "gaziantep",
  eskisehir: "eskisehir",
  diyarbakir: "diyarbakir",
  erzurum: "erzurum",
  kayseri: "kayseri",
  mersin: "mersin",
  tekirdag: "tekirdag",
  edirne: "edirne",
  // Aliases (common variations)
  "i̇stanbul": "istanbul",
  "i̇zmir": "izmir",
  "eskişehir": "eskisehir",
  "diyarbakır": "diyarbakir",
  "tekirdağ": "tekirdag",
};

/** Returns a flat list of FM city keys available */
export function fmSehirListesi() {
  return Object.entries(FM_SEHIRLER).map(([id, { ad }]) => ({ id, ad }));
}

/**
 * GM: Returns FM stations for the given city IDs.
 * Deduplicates by frequency.
 */
export function fmIstasyonlariGetir(sehirIdleri) {
  const istasyonlar = [];
  const gorulen = new Set();

  for (const id of sehirIdleri) {
    const sehir = FM_SEHIRLER[id];
    if (!sehir) continue;
    for (const ist of sehir.istasyonlar) {
      const key = ist.frek.toFixed(1);
      if (gorulen.has(key)) continue;
      gorulen.add(key);
      istasyonlar.push(ist);
    }
  }

  return istasyonlar.sort((a, b) => a.frek - b.frek);
}

/**
 * Maps a röle filter city name to an FM city key.
 * Returns null if the city doesn't have FM data.
 */
export function sehirdenFmKey(sehirAdi) {
  if (!sehirAdi) return null;
  const norm = normalizeTurkce(sehirAdi).trim();
  return SEHIR_FM_MAP[norm] || FM_SEHIRLER[norm] ? norm : null;
}

// ---------------------------------------------------------------------------
// DMR Talk Groups
// ---------------------------------------------------------------------------

export const TALK_GRUPLARI = [
  { tgId: 286, ad: "TURKiYE Genel", tip: "ulusal" },
  { tgId: 28600, ad: "Multimode TR", tip: "multimode" },
  { tgId: 2860, ad: "0.Bolge Sohbet", tip: "bolge" },
  { tgId: 2861, ad: "1.Bolge Sohbet", tip: "bolge" },
  { tgId: 2862, ad: "2.Bolge Sohbet", tip: "bolge" },
  { tgId: 2863, ad: "3.Bolge Sohbet", tip: "bolge" },
  { tgId: 2864, ad: "4.Bolge Sohbet", tip: "bolge" },
  { tgId: 2865, ad: "5.Bolge Sohbet", tip: "bolge" },
  { tgId: 2866, ad: "6.Bolge Sohbet", tip: "bolge" },
  { tgId: 2867, ad: "7.Bolge Sohbet", tip: "bolge" },
  { tgId: 2868, ad: "8.Bolge Sohbet", tip: "bolge" },
  { tgId: 2869, ad: "9.Bolge Sohbet", tip: "bolge" },
  { tgId: 286112, ad: "Acil Afet", tip: "acil" },
  { tgId: 286911, ad: "Acil Afet 2", tip: "acil" },
  { tgId: 263286, ad: "Almanya-Turkiye", tip: "uluslararasi" },
  { tgId: 28601, ad: "ADANA", tip: "il" },
  { tgId: 28602, ad: "ADIYAMAN", tip: "il" },
  { tgId: 28603, ad: "AFYON", tip: "il" },
  { tgId: 28606, ad: "ANKARA", tip: "il" },
  { tgId: 28607, ad: "ANTALYA", tip: "il" },
  { tgId: 28610, ad: "BALIKESIR", tip: "il" },
  { tgId: 28616, ad: "BURSA", tip: "il" },
  { tgId: 28620, ad: "DENIZLI", tip: "il" },
  { tgId: 28621, ad: "DIYARBAKIR", tip: "il" },
  { tgId: 28622, ad: "EDIRNE", tip: "il" },
  { tgId: 28625, ad: "ERZURUM", tip: "il" },
  { tgId: 28626, ad: "ESKISEHIR", tip: "il" },
  { tgId: 28627, ad: "GAZIANTEP", tip: "il" },
  { tgId: 28634, ad: "ISTANBUL", tip: "il" },
  { tgId: 28635, ad: "IZMIR", tip: "il" },
  { tgId: 28638, ad: "KAYSERI", tip: "il" },
  { tgId: 28641, ad: "KOCAELI", tip: "il" },
  { tgId: 28642, ad: "KONYA", tip: "il" },
  { tgId: 28645, ad: "MANISA", tip: "il" },
  { tgId: 28633, ad: "MERSIN", tip: "il" },
  { tgId: 28655, ad: "SAMSUN", tip: "il" },
  { tgId: 28659, ad: "TEKIRDAG", tip: "il" },
  { tgId: 28661, ad: "TRABZON", tip: "il" },
];

// ---------------------------------------------------------------------------
// Digital Simplex Frequencies
// ---------------------------------------------------------------------------

export const DIGITAL_SIMPLEX = {
  uhf: [
    { frek: 433.4375, mod: "C4FM", param: "TX 00 RX 00", aciklama: "C4FM Simplex UHF" },
    { frek: 433.4500, mod: "DMR", param: "TG 99 CC1 TS1", aciklama: "DMR Simplex UHF" },
    { frek: 433.4500, mod: "NXDN", param: "TG 9 6.25kHz RAN 1", aciklama: "NXDN Simplex UHF" },
    { frek: 433.4625, mod: "D-STAR", param: "", aciklama: "D-STAR Simplex UHF" },
  ],
  vhf: [
    { frek: 144.5375, mod: "C4FM", param: "TX 00 RX 00", aciklama: "C4FM Simplex VHF" },
    { frek: 144.5500, mod: "DMR", param: "TG 99 CC1 TS1", aciklama: "DMR Simplex VHF" },
    { frek: 144.5500, mod: "NXDN", param: "TG 9 6.25kHz RAN 1", aciklama: "NXDN Simplex VHF" },
    { frek: 144.5625, mod: "D-STAR", param: "", aciklama: "D-STAR Simplex VHF" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function ekKanalSayisi(opsiyonlar) {
  let toplam = 0;
  if (opsiyonlar.pmrEkle) toplam += 16;
  if (opsiyonlar.dpmrEkle) toplam += 16;
  if (opsiyonlar.fmRadyoEkle && opsiyonlar.fmSehirler?.length > 0) {
    toplam += fmIstasyonlariGetir(opsiyonlar.fmSehirler).length;
  }
  if (opsiyonlar.airbandEkle && opsiyonlar.airbandData) {
    toplam += opsiyonlar.airbandData.length;
  }
  if (opsiyonlar.marineEkle && opsiyonlar.marineData) {
    toplam += opsiyonlar.marineData.length;
  }
  if (opsiyonlar.simplexEkle) {
    toplam += DIGITAL_SIMPLEX.uhf.length + DIGITAL_SIMPLEX.vhf.length;
  }
  return toplam;
}

export function kanalDagilimi(roleCount, opsiyonlar) {
  const items = [];
  items.push({ ad: "Roleler", sayi: roleCount, zorunlu: true });

  if (opsiyonlar.pmrEkle) items.push({ ad: "PMR", sayi: 16 });
  if (opsiyonlar.dpmrEkle) items.push({ ad: "dPMR", sayi: 16 });
  if (opsiyonlar.fmRadyoEkle && opsiyonlar.fmSehirler?.length > 0) {
    const n = fmIstasyonlariGetir(opsiyonlar.fmSehirler).length;
    items.push({ ad: "FM Radyo", sayi: n });
  }
  if (opsiyonlar.airbandEkle && opsiyonlar.airbandData) {
    items.push({ ad: "Havacilik", sayi: opsiyonlar.airbandData.length });
  }
  if (opsiyonlar.marineEkle && opsiyonlar.marineData) {
    items.push({ ad: "Denizcilik", sayi: opsiyonlar.marineData.length });
  }
  if (opsiyonlar.simplexEkle) {
    items.push({
      ad: "Simplex",
      sayi: DIGITAL_SIMPLEX.uhf.length + DIGITAL_SIMPLEX.vhf.length,
    });
  }

  return items;
}
