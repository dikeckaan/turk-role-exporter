/**
 * simplex-ui.js
 * FM ve dijital simplex picker'ları (marine-ui ile aynı pattern).
 */

import { state } from "./state.js";

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

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Renders an accordion picker for a simplex dataset.
 * @param {HTMLElement} panelEl  Container element to render into
 * @param {{vhf,uhf}} dataset
 * @param {string} secimKey      state object key (e.g. "fmSimplexSecim", "dijitalSimplexSecim")
 * @param {string} eventName     custom event dispatched when selection changes
 */
export function simplexUiKur(panelEl, dataset, secimKey, eventName) {
  if (!panelEl || !dataset) return;
  clearChildren(panelEl);

  for (const bolumId of ["vhf", "uhf"]) {
    const bolum = dataset[bolumId];
    if (!bolum) continue;

    const det = document.createElement("details");
    det.className = "list-bolum";

    const sum = document.createElement("summary");
    sum.className = "list-bolum-sum";
    const title = document.createElement("span");
    title.textContent = bolum.ad;
    const count = document.createElement("span");
    count.className = "list-count";
    sum.appendChild(title);
    sum.appendChild(count);
    det.appendChild(sum);

    const refreshCount = () => {
      const sec = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
      count.textContent = `[${sec.length}/${bolum.frekanslar.length}]`;
    };
    refreshCount();

    const toggleAll = document.createElement("button");
    toggleAll.type = "button";
    toggleAll.className = "list-toggle-all";
    toggleAll.textContent = "Hepsi / Hicbiri";
    toggleAll.addEventListener("click", (e) => {
      e.preventDefault();
      const sec = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
      const hepsi = bolum.frekanslar.map((f) => f.kanal);
      state[secimKey][bolumId] = sec.length === hepsi.length ? [] : hepsi;
      det.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = state[secimKey][bolumId].includes(cb.dataset.kanal);
      });
      refreshCount();
      document.dispatchEvent(new CustomEvent(eventName));
    });
    det.appendChild(toggleAll);

    for (const f of bolum.frekanslar) {
      const lbl = document.createElement("label");
      lbl.className = f.onemli ? "list-row list-row-onemli" : "list-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.kanal = f.kanal;
      const mevcut = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
      cb.checked = mevcut.includes(f.kanal);
      cb.addEventListener("change", () => {
        const sec = Array.isArray(state[secimKey][bolumId]) ? state[secimKey][bolumId] : [];
        if (cb.checked) state[secimKey][bolumId] = [...new Set([...sec, f.kanal])];
        else state[secimKey][bolumId] = sec.filter((x) => x !== f.kanal);
        refreshCount();
        document.dispatchEvent(new CustomEvent(eventName));
      });
      lbl.appendChild(cb);
      const text = document.createElement("span");
      const modBilgi = f.mod && f.mod !== "FM" ? ` ${f.mod}` : "";
      text.textContent = ` ${f.kanal}  ${f.frek}${modBilgi}  ${f.ad}`;
      lbl.appendChild(text);
      det.appendChild(lbl);
    }

    panelEl.appendChild(det);
  }
}
