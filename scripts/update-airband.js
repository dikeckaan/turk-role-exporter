#!/usr/bin/env node
/**
 * update-airband.js
 *
 * Regenerates `AIRBAND_FALLBACK` in `worker/fallback-data.js` by pulling all
 * Turkish airports + VHF airband frequencies from the OurAirports.com
 * community dataset (CC0 licensed, community-maintained).
 *
 * Source:
 *   https://davidmegginson.github.io/ourairports-data/airports.csv
 *   https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv
 *
 * Usage:
 *   npm run update-airband
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FALLBACK_PATH = join(ROOT, "worker/fallback-data.js");

const OA_AIRPORTS_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const OA_FREQS_URL =
  "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv";

// ISO 3166-2:TR plaka kodu → il adı
const TR_PROVINCE = {
  "01": "Adana", "02": "Adiyaman", "03": "Afyonkarahisar", "04": "Agri",
  "05": "Amasya", "06": "Ankara", "07": "Antalya", "08": "Artvin",
  "09": "Aydin", "10": "Balikesir", "11": "Bilecik", "12": "Bingol",
  "13": "Bitlis", "14": "Bolu", "15": "Burdur", "16": "Bursa",
  "17": "Canakkale", "18": "Cankiri", "19": "Corum", "20": "Denizli",
  "21": "Diyarbakir", "22": "Edirne", "23": "Elazig", "24": "Erzincan",
  "25": "Erzurum", "26": "Eskisehir", "27": "Gaziantep", "28": "Giresun",
  "29": "Gumushane", "30": "Hakkari", "31": "Hatay", "32": "Isparta",
  "33": "Mersin", "34": "Istanbul", "35": "Izmir", "36": "Kars",
  "37": "Kastamonu", "38": "Kayseri", "39": "Kirklareli", "40": "Kirsehir",
  "41": "Kocaeli", "42": "Konya", "43": "Kutahya", "44": "Malatya",
  "45": "Manisa", "46": "Kahramanmaras", "47": "Mardin", "48": "Mugla",
  "49": "Mus", "50": "Nevsehir", "51": "Nigde", "52": "Ordu",
  "53": "Rize", "54": "Sakarya", "55": "Samsun", "56": "Siirt",
  "57": "Sinop", "58": "Sivas", "59": "Tekirdag", "60": "Tokat",
  "61": "Trabzon", "62": "Tunceli", "63": "Sanliurfa", "64": "Usak",
  "65": "Van", "66": "Yozgat", "67": "Zonguldak", "68": "Aksaray",
  "69": "Bayburt", "70": "Karaman", "71": "Kirikkale", "72": "Batman",
  "73": "Sirnak", "74": "Bartin", "75": "Ardahan", "76": "Igdir",
  "77": "Yalova", "78": "Karabuk", "79": "Kilis", "80": "Osmaniye",
  "81": "Duzce",
};

// Map OurAirports frequency type codes to our canonical tur labels
const TUR_MAP = {
  ATIS: "ATIS",
  TWR: "Tower", TOWER: "Tower",
  GND: "Ground", GROUND: "Ground",
  APP: "Approach", APPROACH: "Approach",
  DEP: "Departure", DEPARTURE: "Departure",
  CLD: "Clearance", CLEARANCE: "Clearance", DEL: "Clearance",
  CTAF: "CTAF",
  UNICOM: "Unicom",
  RMP: "Ramp", RAMP: "Ramp",
  CTR: "Center", CENTER: "Center",
  INFO: "Info", FIS: "FIS", AAS: "AAS",
  RDO: "Radio", RADIO: "Radio",
  AWOS: "AWOS", ASOS: "ASOS",
};
function normalizeTur(raw) {
  const key = (raw || "").toUpperCase().trim();
  return TUR_MAP[key] || "Diger";
}

async function downloadCsv(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": "turk-role-exporter/update-airband" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

// Minimal CSV parser — handles quoted fields with embedded commas + escaped quotes.
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === "\"") {
        if (text[i + 1] === "\"") { field += "\""; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === "\"") inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function parseCsvAsObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter((r) => r.length === headers.length)
    .map((r) => {
      const o = {};
      for (let i = 0; i < headers.length; i++) o[headers[i]] = r[i];
      return o;
    });
}

function cleanName(s) {
  return (s || "")
    .replace(/İ/g, "I").replace(/ı/g, "i")
    .replace(/Ğ/g, "G").replace(/ğ/g, "g")
    .replace(/Ü/g, "U").replace(/ü/g, "u")
    .replace(/Ş/g, "S").replace(/ş/g, "s")
    .replace(/Ö/g, "O").replace(/ö/g, "o")
    .replace(/Ç/g, "C").replace(/ç/g, "c")
    .trim();
}

async function main() {
  console.log("Fetching OurAirports CSVs...");
  const [airportsCsv, freqsCsv] = await Promise.all([
    downloadCsv(OA_AIRPORTS_URL),
    downloadCsv(OA_FREQS_URL),
  ]);

  const allAirports = parseCsvAsObjects(airportsCsv);
  const trAirports = allAirports.filter((a) =>
    a.iso_country === "TR" &&
    ["small_airport", "medium_airport", "large_airport"].includes(a.type),
  );
  console.log(`TR airports (small/medium/large): ${trAirports.length}`);

  const byIcao = new Map();
  for (const a of trAirports) {
    if (!a.ident) continue;
    byIcao.set(a.ident, a);
  }

  const allFreqs = parseCsvAsObjects(freqsCsv);
  const trFreqs = allFreqs.filter((f) => {
    if (!byIcao.has(f.airport_ident)) return false;
    const mhz = parseFloat(f.frequency_mhz);
    return mhz >= 108 && mhz <= 137;
  });
  console.log(`TR VHF airband freqs (108-137 MHz): ${trFreqs.length}`);

  // Build nested structure: iller -> havalimanlari -> frekanslar
  const ilMap = new Map(); // il name -> { il, havalimanlari: Map(icao -> hav) }

  for (const f of trFreqs) {
    const a = byIcao.get(f.airport_ident);
    const regionCode = (a.iso_region || "").replace(/^TR-/, "");
    const il = TR_PROVINCE[regionCode] || "Diger";

    if (!ilMap.has(il)) ilMap.set(il, { il, havalimanlari: new Map() });
    const ilEntry = ilMap.get(il);

    const icao = a.ident;
    if (!ilEntry.havalimanlari.has(icao)) {
      ilEntry.havalimanlari.set(icao, {
        ad: cleanName(a.name),
        icao,
        iata: a.iata_code || undefined,
        sehir: cleanName(a.municipality),
        frekanslar: [],
      });
    }
    const hav = ilEntry.havalimanlari.get(icao);
    const mhz = parseFloat(f.frequency_mhz);
    const tur = normalizeTur(f.type);
    hav.frekanslar.push({
      tur,
      frek: mhz.toFixed(3),
      aciklama: cleanName(f.description) || undefined,
    });
  }

  // Flatten + sort
  const iller = [...ilMap.values()]
    .map((il) => ({
      il: il.il,
      havalimanlari: [...il.havalimanlari.values()]
        .map((h) => ({
          ad: h.ad,
          icao: h.icao,
          iata: h.iata,
          sehir: h.sehir,
          frekanslar: dedupeFreqs(h.frekanslar),
        }))
        .sort((a, b) => a.ad.localeCompare(b.ad)),
    }))
    .filter((il) => il.havalimanlari.length > 0)
    .sort((a, b) => a.il.localeCompare(b.il));

  // Append the international guard freq under a synthetic "Genel" province
  iller.push({
    il: "Genel",
    havalimanlari: [{
      ad: "Acil Guard", icao: "GUARD",
      frekanslar: [{
        tur: "Acil", frek: "121.500",
        aciklama: "Uluslararasi Havacilik Acil",
      }],
    }],
  });

  const airbandCount = iller.reduce((sum, il) =>
    sum + il.havalimanlari.reduce((s, h) => s + h.frekanslar.length, 0), 0);
  console.log(`Generated: ${iller.length} iller, ` +
    `${iller.reduce((s, il) => s + il.havalimanlari.length, 0)} havalimanlari, ` +
    `${airbandCount} frekanslar`);

  // Regenerate worker/fallback-data.js: replace AIRBAND_FALLBACK export
  const currentContent = readFileSync(FALLBACK_PATH, "utf8");
  const newAirband = generateAirbandExport(iller);

  const updated = currentContent.replace(
    /export const AIRBAND_FALLBACK = \{[\s\S]*?^\};/m,
    newAirband,
  );
  if (updated === currentContent) {
    throw new Error("AIRBAND_FALLBACK block not found in fallback-data.js");
  }

  writeFileSync(FALLBACK_PATH, updated);
  console.log(`Wrote ${FALLBACK_PATH}`);
}

function dedupeFreqs(list) {
  const seen = new Set();
  const out = [];
  for (const f of list) {
    const key = `${f.tur}::${f.frek}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function generateAirbandExport(iller) {
  const today = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
  const lines = [
    "export const AIRBAND_FALLBACK = {",
    "  kaynak: \"fallback\",",
    `  guncellenme: "${today}",`,
    "  iller: [",
  ];
  for (const il of iller) {
    lines.push("    {");
    lines.push(`      il: ${JSON.stringify(il.il)},`);
    lines.push("      havalimanlari: [");
    for (const h of il.havalimanlari) {
      lines.push("        {");
      lines.push(`          ad: ${JSON.stringify(h.ad)}, icao: ${JSON.stringify(h.icao)}` +
        (h.iata ? `, iata: ${JSON.stringify(h.iata)}` : "") +
        (h.sehir ? `, sehir: ${JSON.stringify(h.sehir)}` : "") + ",");
      lines.push("          frekanslar: [");
      for (const f of h.frekanslar) {
        const parts = [`tur: ${JSON.stringify(f.tur)}`, `frek: ${JSON.stringify(f.frek)}`];
        if (f.aciklama) parts.push(`aciklama: ${JSON.stringify(f.aciklama)}`);
        lines.push("            { " + parts.join(", ") + " },");
      }
      lines.push("          ],");
      lines.push("        },");
    }
    lines.push("      ],");
    lines.push("    },");
  }
  lines.push("  ],");
  lines.push("};");
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
