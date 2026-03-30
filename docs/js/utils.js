/**
 * utils.js
 * Utility functions for the Turkish amateur radio repeater exporter.
 */

/**
 * Replaces Turkish characters with their ASCII equivalents,
 * then strips everything except A-Z, a-z, 0-9, and spaces.
 * Returns "" for falsy input.
 *
 * @param {string} text
 * @returns {string}
 */
export function temizleTurkce(text) {
  if (!text) return "";

  const replacements = [
    ["ç", "c"], ["Ç", "C"],
    ["ğ", "g"], ["Ğ", "G"],
    ["ı", "i"], ["İ", "I"],
    ["ö", "o"], ["Ö", "O"],
    ["ş", "s"], ["Ş", "S"],
    ["ü", "u"], ["Ü", "U"],
    ["â", "a"], ["Â", "A"],
    ["î", "i"], ["Î", "I"],
  ];

  let result = text;
  for (const [from, to] of replacements) {
    result = result.split(from).join(to);
  }

  // Strip everything except A-Z, a-z, 0-9, and spaces
  result = result.replace(/[^A-Za-z0-9 ]/g, "");

  return result.trim();
}

/**
 * Mapping of city names (lowercase ASCII) to plaka codes.
 * Includes all 81 Turkish cities plus common aliases.
 */
export const IL_PLAKA = {
  adana: "01",
  adiyaman: "02",
  afyonkarahisar: "03",
  afyon: "03",
  agri: "04",
  amasya: "05",
  ankara: "06",
  antalya: "07",
  artvin: "08",
  aydin: "09",
  balikesir: "10",
  bilecik: "11",
  bingol: "12",
  bitlis: "13",
  bolu: "14",
  burdur: "15",
  bursa: "16",
  canakkale: "17",
  cankiri: "18",
  corum: "19",
  denizli: "20",
  diyarbakir: "21",
  edirne: "22",
  elazig: "23",
  erzincan: "24",
  erzurum: "25",
  eskisehir: "26",
  gaziantep: "27",
  giresun: "28",
  gumushane: "29",
  hakkari: "30",
  hatay: "31",
  iskenderun: "31",
  antakya: "31",
  isparta: "32",
  mersin: "33",
  icel: "33",
  istanbul: "34",
  izmir: "35",
  kars: "36",
  kastamonu: "37",
  kayseri: "38",
  kirklareli: "39",
  kirsehir: "40",
  kocaeli: "41",
  izmit: "41",
  konya: "42",
  kutahya: "43",
  malatya: "44",
  manisa: "45",
  kahramanmaras: "46",
  mardin: "47",
  mugla: "48",
  mus: "49",
  nevsehir: "50",
  nigde: "51",
  ordu: "52",
  rize: "53",
  sakarya: "54",
  adapazari: "54",
  samsun: "55",
  siirt: "56",
  sinop: "57",
  sivas: "58",
  tekirdag: "59",
  tokat: "60",
  trabzon: "61",
  tunceli: "62",
  sanliurfa: "63",
  urfa: "63",
  usak: "64",
  van: "65",
  yozgat: "66",
  zonguldak: "67",
  aksaray: "68",
  bayburt: "69",
  karaman: "70",
  kirikkale: "71",
  batman: "72",
  sirnak: "73",
  bartin: "74",
  ardahan: "75",
  igdir: "76",
  yalova: "77",
  karabuk: "78",
  kilis: "79",
  osmaniye: "80",
  duzce: "81",
  kibris: "KKTC",
};

/**
 * Looks up the plaka code for a city name.
 * Cleans the input with temizleTurkce first.
 * Falls back to the first 3 characters of the cleaned name, uppercased.
 *
 * @param {string} sehir
 * @returns {string}
 */
export function sehirPlaka(sehir) {
  const temiz = temizleTurkce(sehir).toLowerCase().trim();
  if (IL_PLAKA[temiz] !== undefined) {
    return IL_PLAKA[temiz];
  }
  return temiz.slice(0, 3).toUpperCase();
}

/**
 * Returns a single-letter band indicator.
 */
function bantHarfi(bant) {
  const b = (bant || "").toUpperCase();
  return b.startsWith("U") ? "U"
    : b.startsWith("V") ? "V"
    : b.startsWith("A") ? "A"   // APRS
    : b.startsWith("C") ? "X"   // Cross-band
    : b.startsWith("E") ? "E"   // ECHO
    : "V";
}

/**
 * Compacts a konum string to fit maxLen chars.
 * Strategy: full text → remove spaces (CamelCase) → truncate.
 */
function konumSigdir(role, maxLen) {
  const konumFull = temizleTurkce(
    role.konum ? String(role.konum) : String(role.id)
  );
  const words = konumFull.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] || "").slice(0, maxLen);

  const spaced = words.join(" ");
  if (spaced.length <= maxLen) return spaced;

  const compact = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  return compact.slice(0, maxLen);
}

/**
 * Builds a channel name from a repeater role object.
 *
 * Supported formats:
 *   "plaka-konum-bant" (default): "{plaka} {konum} {bant}" (max 15)
 *   "sehir-konum":                "{sehir (7 chars)} {konum}" (max 15)
 *   "plaka-konum":                "{plaka} {konum}" (max 15)
 *   "plaka-bant-konum":           "{plaka}{V/U} {konum}" (max 16, MDUV390)
 *   "plaka-bant-konum-kisa":      "{plaka}{V/U}{konum}" (max 10, UV-K5)
 *
 * @param {object} role
 * @param {string} [format="plaka-konum-bant"]
 * @returns {string}
 */
export function kanalAdiOlustur(role, format = "plaka-konum-bant") {
  const plaka = sehirPlaka(role.sehir);
  const bant = role.bant ? temizleTurkce(String(role.bant)) : "";

  if (format === "plaka-bant-konum") {
    // MDUV390: "01V RuzgarliTepe" (max 16 chars)
    const prefix = `${plaka}${bantHarfi(bant)} `;
    return `${prefix}${konumSigdir(role, 16 - prefix.length)}`.trim();
  }

  if (format === "plaka-bant-konum-kisa") {
    // UV-K5: "01V Ruzgar" (max 10 chars)
    const prefix = `${plaka}${bantHarfi(bant)}`;
    return `${prefix}${konumSigdir(role, 10 - prefix.length)}`.trim();
  }

  const konumRaw = role.konum
    ? String(role.konum).split(" ")[0]
    : String(role.id);
  const konum = temizleTurkce(konumRaw).slice(0, 7);

  let name;

  if (format === "sehir-konum") {
    const sehirTemiz = temizleTurkce(role.sehir || "").slice(0, 7);
    name = `${sehirTemiz} ${konum}`;
  } else if (format === "plaka-konum") {
    name = `${plaka} ${konum}`;
  } else {
    // default: "plaka-konum-bant"
    name = `${plaka} ${konum} ${bant}`.trim();
    if (name.length > 15) {
      name = `${plaka} ${konum}`;
    }
  }

  if (name.length > 15) {
    name = name.slice(0, 15);
  }

  return name.trim();
}

/**
 * Calculates an approval rating as a percentage.
 * Returns 100 if there are no votes (0/0).
 *
 * @param {object} role
 * @returns {number}
 */
/**
 * Normalizes Turkish characters to lowercase ASCII.
 * Unlike temizleTurkce, keeps all characters (no stripping).
 */
export function normalizeTurkce(text) {
  if (!text) return "";
  return text
    .replace(/\u0130/g, "i").replace(/\u0131/g, "i")
    .replace(/[\u015e\u015f]/g, "s").replace(/[\u00c7\u00e7]/g, "c")
    .replace(/[\u011e\u011f]/g, "g").replace(/[\u00d6\u00f6]/g, "o")
    .replace(/[\u00dc\u00fc]/g, "u").replace(/\u0307/g, "")
    .toLowerCase();
}

/**
 * Returns true if a repeater role uses digital mode (DMR etc).
 */
export function isDijital(role) {
  return role.digital === 1 || role.digital === 2;
}

export function puanHesapla(role) {
  const up = role.thumbs_up || 0;
  const down = role.thumbs_down || 0;
  const total = up + down;
  if (total === 0) return 100;
  return Math.round((up / total) * 100);
}

/**
 * Calculates the TX frequency from a repeater role object.
 *
 * If rxtx is "TxRx" or "Tx":
 *   VHF (< 300 MHz): TX = RX - 0.600
 *   UHF (>= 300 MHz): TX = RX - 7.600
 * Otherwise (simplex): TX = RX
 *
 * Returns the frequency formatted to 5 decimal places.
 *
 * @param {object} role
 * @returns {string}
 */
export function txFrekansHesapla(role, shiftHesaplama) {
  const rxStr = String(role.frekans || "").replace(",", ".");
  const rx = parseFloat(rxStr);
  if (isNaN(rx)) return rxStr;

  const rxtx = role.rxtx || "";
  if ((rxtx === "TxRx" || rxtx === "Tx") && shiftHesaplama) {
    const shift = shiftHesaplama[role.bant];
    if (shift) return (rx + shift).toFixed(5);
  }

  return rx.toFixed(5);
}
