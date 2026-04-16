/**
 * worker/scrapers.js
 * Pure HTML → structured JSON parsers.
 * Live implementations arrive in later tasks; stubs throw so the orchestrator
 * immediately falls back to embedded data.
 */

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
