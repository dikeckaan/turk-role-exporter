/**
 * find-replace.js
 * Excel-style Ctrl+F popup for the CSV preview table.
 * Searches across all cells in state.csvSatirlar (not just the visible page).
 */

import { state } from "./state.js";
import { undoKaydet } from "./undo.js";

let modalEl = null;
let bulunanlar = [];   // [{rowIdx, colIdx}]
let mevcutMatch = -1;

function buildRegex(needle, useRegex, caseSensitive, global) {
  if (!needle) return null;
  const flags = (caseSensitive ? "" : "i") + (global ? "g" : "");
  try {
    if (useRegex) return new RegExp(needle, flags);
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, flags);
  } catch {
    return null;
  }
}

function findAll(needle, useRegex, caseSensitive) {
  const out = [];
  const re = buildRegex(needle, useRegex, caseSensitive, false);
  if (!re) return out;
  for (let r = 0; r < state.csvSatirlar.length; r++) {
    const row = state.csvSatirlar[r];
    for (let c = 0; c < row.length; c++) {
      if (re.test(String(row[c] ?? ""))) out.push({ rowIdx: r, colIdx: c });
    }
  }
  return out;
}

function replaceAll(needle, replacement, useRegex, caseSensitive) {
  const re = buildRegex(needle, useRegex, caseSensitive, true);
  if (!re) return 0;
  undoKaydet(state.csvSatirlar);
  let count = 0;
  for (const row of state.csvSatirlar) {
    for (let c = 0; c < row.length; c++) {
      const before = String(row[c] ?? "");
      const after = before.replace(re, replacement);
      if (before !== after) {
        row[c] = after;
        count++;
      }
    }
  }
  return count;
}

function focusMatch(idx, csvTabloYenileFn) {
  if (bulunanlar.length === 0) return;
  mevcutMatch = ((idx % bulunanlar.length) + bulunanlar.length) % bulunanlar.length;
  const m = bulunanlar[mevcutMatch];
  csvTabloYenileFn();
  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;
  const tr = tablo.querySelector(`tbody tr[data-orig-idx="${m.rowIdx}"]`);
  if (!tr) return;
  const td = tr.children[m.colIdx + 1]; // +1 because col 0 is the # column
  if (!td) return;
  const span = td.querySelector(".td-kanal-adi");
  if (!span) return;
  td.classList.add("hucre-vurgu");
  setTimeout(() => td.classList.remove("hucre-vurgu"), 1500);
  span.scrollIntoView({ block: "center", behavior: "smooth" });
  span.focus();
}

function makeBtn(label, className, onClick, title) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  if (title) b.title = title;
  b.addEventListener("click", onClick);
  return b;
}

function makeInput(id, placeholder) {
  const i = document.createElement("input");
  i.type = "text";
  i.id = id;
  i.placeholder = placeholder;
  i.autocomplete = "off";
  return i;
}

function makeCheckLabel(id, labelText) {
  const lbl = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = id;
  lbl.appendChild(cb);
  lbl.appendChild(document.createTextNode(" " + labelText));
  return { label: lbl, checkbox: cb };
}

function buildModal(csvTabloYenileFn) {
  const overlay = document.createElement("div");
  overlay.id = "find-replace-modal";
  overlay.className = "find-replace-overlay";

  const panel = document.createElement("div");
  panel.className = "find-replace-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Bul ve Degistir");

  // Row 1: find + count + nav
  const row1 = document.createElement("div");
  row1.className = "find-replace-row";
  const findInput = makeInput("fr-find", "Bul...");
  const countEl = document.createElement("span");
  countEl.id = "fr-count";
  countEl.className = "fr-count";
  const prevBtn = makeBtn("\u2191", "btn-secondary btn-sm", () => navigate(-1), "Onceki (Shift+Enter)");
  const nextBtn = makeBtn("\u2193", "btn-secondary btn-sm", () => navigate(1), "Sonraki (Enter)");
  const closeBtn = makeBtn("\u00D7", "btn-sil", kapat, "Kapat (Esc)");
  closeBtn.setAttribute("aria-label", "Kapat");
  row1.append(findInput, countEl, prevBtn, nextBtn, closeBtn);

  // Row 2: replace + replaceAll
  const row2 = document.createElement("div");
  row2.className = "find-replace-row";
  const replaceInput = makeInput("fr-replace", "Yerine...");
  const replaceAllBtn = makeBtn("Tumunu Degistir", "btn-secondary btn-sm", () => {
    const n = replaceAll(findInput.value, replaceInput.value, regexCb.checked, caseCb.checked);
    countEl.textContent = `${n} degisiklik`;
    csvTabloYenileFn();
    refresh();
  });
  row2.append(replaceInput, replaceAllBtn);

  // Row 3: options
  const row3 = document.createElement("div");
  row3.className = "find-replace-row find-replace-opts";
  const { label: regexLbl, checkbox: regexCb } = makeCheckLabel("fr-regex", "Regex");
  const { label: caseLbl, checkbox: caseCb } = makeCheckLabel("fr-case", "Buyuk/kucuk harf");
  row3.append(regexLbl, caseLbl);

  panel.append(row1, row2, row3);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const refresh = () => {
    bulunanlar = findAll(findInput.value, regexCb.checked, caseCb.checked);
    mevcutMatch = bulunanlar.length > 0 ? 0 : -1;
    countEl.textContent = bulunanlar.length === 0
      ? (findInput.value ? "0 sonuc" : "")
      : `${mevcutMatch + 1} / ${bulunanlar.length}`;
  };

  const navigate = (delta) => {
    if (bulunanlar.length === 0) return;
    focusMatch(mevcutMatch + delta, csvTabloYenileFn);
    countEl.textContent = `${mevcutMatch + 1} / ${bulunanlar.length}`;
  };

  findInput.addEventListener("input", refresh);
  regexCb.addEventListener("change", refresh);
  caseCb.addEventListener("change", refresh);
  findInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (bulunanlar.length > 0) navigate(e.shiftKey ? -1 : 1);
    }
    if (e.key === "Escape") { e.preventDefault(); kapat(); }
  });
  replaceInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); kapat(); }
  });

  return overlay;
}

function kapat() {
  if (modalEl) modalEl.style.display = "none";
}

export function findReplaceUiKur(csvTabloYenileFn) {
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      if (!modalEl) modalEl = buildModal(csvTabloYenileFn);
      modalEl.style.display = "flex";
      const findInput = modalEl.querySelector("#fr-find");
      findInput.focus();
      findInput.select();
    }
  });
}
