/**
 * worker/scrapers.js
 * Pure source-specific parsers/normalizers.
 * Kept dependency-free so unit tests can import straight from Node.
 */

/**
 * Turkish chars → ASCII lowercase. Keep in sync with docs/js/utils.js normalizeTurkce.
 */
export function normalizeTurkish(str) {
  return String(str || "")
    .replace(/\u0130/g, "i")
    .replace(/\u0131/g, "i")
    .replace(/[\u015e\u015f]/g, "s")
    .replace(/[\u00c7\u00e7]/g, "c")
    .replace(/[\u011e\u011f]/g, "g")
    .replace(/[\u00d6\u00f6]/g, "o")
    .replace(/[\u00dc\u00fc]/g, "u")
    .replace(/\u0307/g, "")
    .toLowerCase();
}

/**
 * Parse a Turkish-formatted frequency ("145.737,5" or "439.375") to "145.7375".
 * Returns null when out of amateur/utility range or unparseable.
 */
export function normalizeFrekansComma(raw) {
  if (raw === null || raw === undefined) return null;
  const clean = String(raw).replace(/,/g, "").replace(/[^\d.]/g, "");
  const num = parseFloat(clean);
  if (!isFinite(num) || num < 50 || num > 1000) return null;
  return num.toFixed(4);
}

/**
 * Map a telsizcilik.com Supabase row onto the project's role object shape.
 * Returns null when the row has no usable RX frequency.
 */
export function normalizeTelsizcilikRow(row) {
  const rxFrek = normalizeFrekansComma(row?.rx);
  if (!rxFrek) return null;
  const txFrek = normalizeFrekansComma(row?.tx) || rxFrek;

  const cd = String(row.city_district || "");
  const [sehirRaw = "", ilceRaw = ""] = cd.split("/").map((s) => s.trim());
  const sehir = normalizeTurkish(sehirRaw);
  const ilce = ilceRaw;

  const bandRaw = String(row.band || "").trim().toUpperCase();
  const rxNum = parseFloat(rxFrek);
  let bant;
  let digital;
  if (bandRaw === "DİJİTAL" || bandRaw === "DIJITAL") {
    digital = 1;
    bant = rxNum < 200 ? "VHF" : "UHF";
  } else if (bandRaw === "VHF" || bandRaw === "UHF") {
    digital = 0;
    bant = bandRaw;
  } else {
    digital = 0;
    bant = rxNum < 200 ? "VHF" : "UHF";
  }

  const tonStr = String(row.ton || "").trim();
  let ton = null;
  let timeSlot = "";
  let dijitalMod = "";
  if (digital === 1) {
    const hasTS1 = /TS[\s-]*1/i.test(tonStr);
    const hasTS2 = /TS[\s-]*2/i.test(tonStr);
    if (hasTS1 && hasTS2) timeSlot = "TS1+TS2";
    else if (hasTS2) timeSlot = "TS2";
    else if (hasTS1) timeSlot = "TS1";
    dijitalMod = /C4FM/i.test(tonStr) ? "C4FM" : "DMR";
  } else {
    const m = tonStr.match(/\d+(?:\.\d+)?/);
    if (m) ton = m[0];
  }

  const notes = String(row.notes || "").trim();
  let konum = ilce;
  if (notes && notes !== ilce) {
    konum = konum ? `${konum} (${notes})` : notes;
  }
  if (!konum) konum = sehirRaw;

  const rec = {
    kaynak: "telsizcilik",
    sehir,
    bant,
    konum,
    frekans: rxFrek,
    txFrekans: txFrek,
    ton,
    digital,
    durum: row.is_active !== false,
    tabolge: String(row.region || "").trim(),
  };
  if (timeSlot) rec.timeSlot = timeSlot;
  if (dijitalMod) rec.dijitalMod = dijitalMod;
  if (typeof row.latitude === "number" && typeof row.longitude === "number") {
    rec.lat = row.latitude;
    rec.lon = row.longitude;
  }
  return rec;
}

export function parseAirbandHtml(_html) {
  throw new Error("not-implemented");
}

/**
 * Parse the ta1dx bandmarine.htm VHF Marine Band table.
 * Only the VHF section is scraped live — SAR and Turk Sahil Radyolari live on
 * separate ta1dx pages; callers should merge those from fallback.
 *
 * The page is windows-1254 encoded Turkish HTML with comma decimal separators.
 * Digits/commas/ASCII survive UTF-8 decoding — sufficient for channel+freq
 * extraction.
 *
 * @param {string} html  Raw HTML of bandmarine.htm (UTF-8 decoded)
 * @param {{bolumler?:Array}} [fallback]  Optional fallback to source sar/sahil bolumler from
 * @returns {{bolumler:Array}}
 */
export function parseMarineHtml(html, fallback) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const rowRegex = /\s(\d{1,2})\s+(1[56]\d),(\d{3})\s+(1[56]\d),(\d{3})\s+([SD])\b/g;

  const frekanslar = [];
  const seen = new Set();
  let m;
  while ((m = rowRegex.exec(text)) !== null) {
    const chNum = parseInt(m[1], 10);
    if (chNum < 1 || chNum > 88) continue;
    const kanal = `CH${chNum}`;
    if (seen.has(kanal)) continue;
    seen.add(kanal);

    const txFrek = `${m[2]}.${m[3]}`;
    const tx = parseFloat(txFrek);
    if (tx < 155 || tx > 163) continue;

    frekanslar.push({ kanal, frek: txFrek, ad: `Kanal ${chNum}` });
  }

  if (frekanslar.length === 0) {
    throw new Error("no VHF marine frequencies parsed");
  }

  const vhfBolum = { id: "vhf", ad: "VHF Marine Band", frekanslar };
  const other = (fallback && Array.isArray(fallback.bolumler))
    ? fallback.bolumler.filter((b) => b.id !== "vhf")
    : [];

  return {
    kaynak: "live",
    guncellenme: new Date().toISOString(),
    bolumler: [vhfBolum, ...other],
  };
}
