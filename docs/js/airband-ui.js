/**
 * airband-ui.js
 * Airband picker: Il > Havalimani > Tur cascade selection.
 */

import { state } from "./state.js";

/**
 * Flatten airband dataset by user selection into a flat list for CSV export.
 * @param {{iller:Array}} dataset
 * @param {{iller:string[], havalimanlari:Object<string,string[]>}} secim
 * @returns {Array<{icao, ad, tur, frek, aciklama}>}
 */
export function secilenAirbandFrekanslari(dataset, secim) {
  if (!dataset || !Array.isArray(dataset.iller)) return [];
  if (!secim || !Array.isArray(secim.iller) || secim.iller.length === 0) return [];
  const out = [];
  for (const il of dataset.iller) {
    if (!secim.iller.includes(il.il)) continue;
    for (const hav of il.havalimanlari || []) {
      const turler = (secim.havalimanlari || {})[hav.icao];
      if (!Array.isArray(turler) || turler.length === 0) continue;
      for (const f of hav.frekanslar || []) {
        if (turler.includes(f.tur)) {
          out.push({
            icao: hav.icao,
            ad: `${hav.icao} ${f.tur}`,
            tur: f.tur,
            frek: f.frek,
            aciklama: f.aciklama || hav.ad,
          });
        }
      }
    }
  }
  const seen = new Set();
  const dedup = [];
  for (const item of out) {
    const key = `${item.icao}::${item.tur}::${item.frek}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(item);
  }
  return dedup;
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function airbandListeYenile() {
  const list = document.getElementById("airband-havalimani-liste");
  if (!list) return;
  clearChildren(list);

  const data = state.airbandData;
  if (!data || !Array.isArray(data.iller)) return;
  const secim = state.airbandSecim;

  for (const il of data.iller) {
    if (!secim.iller.includes(il.il)) continue;
    for (const hav of il.havalimanlari || []) {
      const row = document.createElement("div");
      row.className = "airband-hav-row";

      const title = document.createElement("div");
      title.className = "airband-hav-title";
      title.textContent = `${hav.icao}  ${hav.ad}`;
      row.appendChild(title);

      const turWrap = document.createElement("div");
      turWrap.className = "airband-tur-wrap";

      // Only render chips for types the airport actually has
      const availableTurler = [...new Set((hav.frekanslar || []).map((f) => f.tur))];
      for (const tur of availableTurler) {
        const lbl = document.createElement("label");
        lbl.className = "chip";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        const mevcut = secim.havalimanlari[hav.icao] || [];
        cb.checked = mevcut.includes(tur);
        cb.addEventListener("change", () => {
          let sel = secim.havalimanlari[hav.icao] || [];
          if (cb.checked) sel = [...new Set([...sel, tur])];
          else sel = sel.filter((x) => x !== tur);
          secim.havalimanlari[hav.icao] = sel;
          document.dispatchEvent(new CustomEvent("airband-secim-degisti"));
        });
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(" " + tur));
        turWrap.appendChild(lbl);
      }

      row.appendChild(turWrap);
      list.appendChild(row);
    }
  }
}

export function airbandUiKur() {
  const panel = document.getElementById("airband-panel");
  if (!panel) return;

  const data = state.airbandData;
  if (!data || !Array.isArray(data.iller)) {
    panel.textContent = "Veri yuklenemedi.";
    return;
  }

  clearChildren(panel);

  // Province selector row
  const ilWrap = document.createElement("div");
  ilWrap.className = "airband-il-wrap";
  const ilLabel = document.createElement("label");
  ilLabel.className = "airband-panel-label";
  ilLabel.textContent = "Iller:";
  ilWrap.appendChild(ilLabel);

  for (const il of data.iller) {
    const lbl = document.createElement("label");
    lbl.className = "chip";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = state.airbandSecim.iller.includes(il.il);
    cb.addEventListener("change", () => {
      if (cb.checked && !state.airbandSecim.iller.includes(il.il)) {
        state.airbandSecim.iller.push(il.il);
      } else if (!cb.checked) {
        state.airbandSecim.iller = state.airbandSecim.iller.filter((x) => x !== il.il);
      }
      airbandListeYenile();
      document.dispatchEvent(new CustomEvent("airband-secim-degisti"));
    });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(" " + il.il));
    ilWrap.appendChild(lbl);
  }
  panel.appendChild(ilWrap);

  // Airports container (populated by airbandListeYenile)
  const list = document.createElement("div");
  list.id = "airband-havalimani-liste";
  panel.appendChild(list);

  airbandListeYenile();
}
