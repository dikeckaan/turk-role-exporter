/**
 * simplex-ui.js
 * FM ve dijital simplex picker'ları (marine-ui ile aynı pattern).
 */

/**
 * Flatten simplex dataset by user selection.
 * @param {{vhf:{frekanslar:Array}, uhf:{frekanslar:Array}}} dataset
 * @param {{vhf?:string[], uhf?:string[]}} secim
 * @returns {Array<{kanal,frek,ad,mod,param,bolum,onemli}>}
 */
export function secilenSimplexFrekanslari(dataset, secim) {
  if (!dataset) return [];
  if (!secim) return [];
  const out = [];
  for (const bolumId of ["vhf", "uhf"]) {
    const bolum = dataset[bolumId];
    if (!bolum || !Array.isArray(bolum.frekanslar)) continue;
    const sec = Array.isArray(secim[bolumId]) ? secim[bolumId] : [];
    if (sec.length === 0) continue;
    for (const f of bolum.frekanslar) {
      if (sec.includes(f.kanal)) {
        out.push({
          kanal: f.kanal,
          frek: f.frek,
          ad: f.ad || f.kanal,
          mod: f.mod || "FM",
          param: f.param || "",
          bolum: bolumId,
          onemli: !!f.onemli,
        });
      }
    }
  }
  return out;
}
