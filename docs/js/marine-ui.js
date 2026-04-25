/**
 * marine-ui.js
 * Marine picker: 3 accordion sections (VHF / SAR / Turk Sahil),
 * each with per-channel checkboxes.
 */

import { state } from "./state.js";

/**
 * Flatten marine dataset by user selection into a flat list for CSV export.
 * @param {{bolumler:Array}} dataset
 * @param {{vhf:string[], sar:string[], sahil:string[]}} secim
 * @returns {Array<{kanal, ad, frek, aciklama, bolum}>}
 */
export function secilenMarineFrekanslari(dataset, secim) {
  if (!dataset || !Array.isArray(dataset.bolumler)) return [];
  if (!secim) return [];
  const out = [];
  for (const b of dataset.bolumler) {
    const sec = Array.isArray(secim[b.id]) ? secim[b.id] : [];
    if (sec.length === 0) continue;
    for (const f of b.frekanslar || []) {
      if (sec.includes(f.kanal)) {
        out.push({
          kanal: f.kanal,
          ad: f.ad || f.kanal,
          frek: f.frek,
          aciklama: f.aciklama || "",
          bolum: b.id,
        });
      }
    }
  }
  return out;
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function marineUiKur() {
  const panel = document.getElementById("marine-panel");
  if (!panel) return;

  const data = state.marineData;
  if (!data || !Array.isArray(data.bolumler)) {
    panel.textContent = "Veri yuklenemedi.";
    return;
  }

  clearChildren(panel);

  for (const b of data.bolumler) {
    const det = document.createElement("details");
    det.className = "list-bolum";

    const sum = document.createElement("summary");
    sum.className = "list-bolum-sum";
    const title = document.createElement("span");
    title.textContent = b.ad;
    const count = document.createElement("span");
    count.className = "list-count";
    sum.appendChild(title);
    sum.appendChild(count);
    det.appendChild(sum);

    const refreshCount = () => {
      const sec = Array.isArray(state.marineSecim[b.id]) ? state.marineSecim[b.id] : [];
      count.textContent = `[${sec.length}/${b.frekanslar.length}]`;
    };
    refreshCount();

    const toggleAll = document.createElement("button");
    toggleAll.type = "button";
    toggleAll.className = "list-toggle-all";
    toggleAll.textContent = "Hepsi / Hicbiri";
    toggleAll.addEventListener("click", (e) => {
      e.preventDefault();
      const sec = Array.isArray(state.marineSecim[b.id]) ? state.marineSecim[b.id] : [];
      const hepsi = b.frekanslar.map((f) => f.kanal);
      state.marineSecim[b.id] = sec.length === hepsi.length ? [] : hepsi;
      det.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = state.marineSecim[b.id].includes(cb.dataset.kanal);
      });
      refreshCount();
      document.dispatchEvent(new CustomEvent("marine-secim-degisti"));
    });
    det.appendChild(toggleAll);

    for (const f of b.frekanslar || []) {
      const lbl = document.createElement("label");
      lbl.className = "list-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.kanal = f.kanal;
      const mevcut = Array.isArray(state.marineSecim[b.id]) ? state.marineSecim[b.id] : [];
      cb.checked = mevcut.includes(f.kanal);
      cb.addEventListener("change", () => {
        const sec = Array.isArray(state.marineSecim[b.id]) ? state.marineSecim[b.id] : [];
        if (cb.checked) state.marineSecim[b.id] = [...new Set([...sec, f.kanal])];
        else state.marineSecim[b.id] = sec.filter((x) => x !== f.kanal);
        refreshCount();
        document.dispatchEvent(new CustomEvent("marine-secim-degisti"));
      });
      lbl.appendChild(cb);
      const text = document.createElement("span");
      text.textContent = ` ${f.kanal}  ${f.frek}  ${f.ad || ""}`;
      lbl.appendChild(text);
      det.appendChild(lbl);
    }

    panel.appendChild(det);
  }
}
