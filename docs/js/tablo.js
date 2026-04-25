/**
 * tablo.js
 * Renders the CSV preview table with fully editable cells and pagination.
 * Shows the exact CSV output — what you see is what you export.
 */

let mevcutSayfa = 1;
let sayfaBoyutu = 100;
let sortKolon = null;   // 0-based index into basliklar (the data columns, NOT including # and Islem)
let sortYon = null;     // "asc" | "desc" | null

const KOLON_GENISLIK_KEY = "tabloKolonGenislikleri";
function genisliklerYukle() {
  try { return JSON.parse(localStorage.getItem(KOLON_GENISLIK_KEY)) || {}; }
  catch { return {}; }
}
function genisliklerKaydet(g) {
  try { localStorage.setItem(KOLON_GENISLIK_KEY, JSON.stringify(g)); } catch {}
}

// Range selection state (cell rectangle, inclusive on both corners)
let rangeAncor = null;   // { rowIdx, colIdx }
let rangeFocus = null;   // { rowIdx, colIdx }
let rangeCallbacks = null;

// FLIP animation: assign a stable key to each row reference so the renderer
// can match "before" and "after" positions across re-render and animate the
// delta with a transform.
const satirAnahtarlari = new WeakMap();
let sonrakiAnahtar = 0;
function satirAnahtar(row) {
  let k = satirAnahtarlari.get(row);
  if (!k) { k = String(++sonrakiAnahtar); satirAnahtarlari.set(row, k); }
  return k;
}

function flipPozTopla(tablo) {
  const map = new Map();
  if (!tablo) return map;
  tablo.querySelectorAll("tbody tr[data-row-key]").forEach((tr) => {
    map.set(tr.dataset.rowKey, tr.getBoundingClientRect().top);
  });
  return map;
}

function flipUygula(tablo, eskiPos) {
  if (!tablo || eskiPos.size === 0) return;
  tablo.querySelectorAll("tbody tr[data-row-key]").forEach((tr) => {
    const eski = eskiPos.get(tr.dataset.rowKey);
    if (eski === undefined) return;
    const yeni = tr.getBoundingClientRect().top;
    const delta = eski - yeni;
    if (Math.abs(delta) < 1) return;
    tr.style.transition = "none";
    tr.style.transform = `translateY(${delta}px)`;
    requestAnimationFrame(() => {
      tr.style.transition = "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)";
      tr.style.transform = "";
      tr.addEventListener("transitionend", () => {
        tr.style.transition = "";
      }, { once: true });
    });
  });
}

function rangeTemizle() {
  rangeAncor = null;
  rangeFocus = null;
  document.querySelectorAll("#onizleme-tablosu td.hucre-range").forEach((td) => td.classList.remove("hucre-range"));
}

function rangeUygula() {
  document.querySelectorAll("#onizleme-tablosu td.hucre-range").forEach((td) => td.classList.remove("hucre-range"));
  if (!rangeAncor || !rangeFocus) return;
  const r1 = Math.min(rangeAncor.rowIdx, rangeFocus.rowIdx);
  const r2 = Math.max(rangeAncor.rowIdx, rangeFocus.rowIdx);
  const c1 = Math.min(rangeAncor.colIdx, rangeFocus.colIdx);
  const c2 = Math.max(rangeAncor.colIdx, rangeFocus.colIdx);
  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;
  for (let r = r1; r <= r2; r++) {
    const tr = tablo.querySelector(`tbody tr[data-orig-idx="${r}"]`);
    if (!tr) continue;
    for (let c = c1; c <= c2; c++) {
      const td = tr.children[c + 1]; // +1 for # column
      if (td) td.classList.add("hucre-range");
    }
  }
}


/**
 * Renders editable CSV preview table with pagination.
 * @param {string[]} basliklar - CSV column headers
 * @param {string[][]} satirlar - CSV row arrays (mutable)
 * @param {object} callbacks - { onSil(rowIndex), onHucreDegistir(rowIndex, colIndex, value) }
 */
export function csvTabloGuncelle(basliklar, satirlar, callbacks) {
  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;
  rangeCallbacks = { satirlar, callbacks };

  // FLIP — capture current row positions before we rebuild the DOM
  const eskiPos = flipPozTopla(tablo);

  // Rebuild headers dynamically
  const thead = tablo.querySelector("thead");
  if (thead) {
    thead.replaceChildren();
    const tr = document.createElement("tr");

    const thSira = document.createElement("th");
    thSira.className = "th-sira";
    thSira.textContent = "#";
    tr.appendChild(thSira);

    const genislikler = genisliklerYukle();
    basliklar.forEach((h, ci) => {
      const th = document.createElement("th");
      th.className = "th-sortable";
      const baslikSpan = document.createElement("span");
      baslikSpan.textContent = h;
      th.appendChild(baslikSpan);
      if (sortKolon === ci && sortYon) {
        const ind = document.createElement("span");
        ind.className = "th-sort-ind";
        ind.textContent = sortYon === "asc" ? " \u25B2" : " \u25BC";
        th.appendChild(ind);
      }
      if (genislikler[h]) th.style.width = genislikler[h] + "px";

      // Resize handle
      const handle = document.createElement("div");
      handle.className = "th-resize-handle";
      handle.title = "Cift tikla: otomatik genislik";
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = th.offsetWidth;
        const move = (ev) => {
          const w = Math.max(40, startWidth + (ev.clientX - startX));
          th.style.width = w + "px";
        };
        const up = () => {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          const g = genisliklerYukle();
          g[h] = th.offsetWidth;
          genisliklerKaydet(g);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      });
      handle.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        th.style.width = "";
        const g = genisliklerYukle();
        delete g[h];
        genisliklerKaydet(g);
      });
      th.appendChild(handle);

      th.addEventListener("click", (e) => {
        // Ignore clicks that originated on the resize handle
        if (e.target.classList.contains("th-resize-handle")) return;
        if (sortKolon === ci) {
          sortYon = sortYon === "asc" ? "desc" : sortYon === "desc" ? null : "asc";
          if (sortYon === null) sortKolon = null;
        } else {
          sortKolon = ci;
          sortYon = "asc";
        }
        if (callbacks?.onSortDegistir && sortKolon !== null) {
          callbacks.onSortDegistir(sortKolon, sortYon);
        } else {
          csvTabloGuncelle(basliklar, satirlar, callbacks);
        }
      });
      tr.appendChild(th);
    });

    const thIslem = document.createElement("th");
    thIslem.className = "th-islem";
    thIslem.textContent = "Islem";
    tr.appendChild(thIslem);

    thead.appendChild(tr);
  }

  // Filter by search
  const aramaInput = document.getElementById("tablo-arama");
  const aramaMetni = aramaInput ? aramaInput.value.toLowerCase() : "";

  const gorunurIndexler = [];
  for (let i = 0; i < satirlar.length; i++) {
    if (aramaMetni) {
      const match = satirlar[i].some((val) =>
        String(val).toLowerCase().includes(aramaMetni)
      );
      if (!match) continue;
    }
    gorunurIndexler.push(i);
  }

  // Pagination calculations
  const toplamSayfa = sayfaBoyutu === 0
    ? 1
    : Math.max(1, Math.ceil(gorunurIndexler.length / sayfaBoyutu));
  if (mevcutSayfa > toplamSayfa) mevcutSayfa = toplamSayfa;

  const baslangic = sayfaBoyutu === 0 ? 0 : (mevcutSayfa - 1) * sayfaBoyutu;
  const bitis = sayfaBoyutu === 0 ? gorunurIndexler.length : Math.min(baslangic + sayfaBoyutu, gorunurIndexler.length);
  const sayfaIndexler = gorunurIndexler.slice(baslangic, bitis);

  const tbody = tablo.querySelector("tbody");
  if (!tbody) return;
  tbody.replaceChildren();

  // Drag-drop only safe when there's no filter and we render every row.
  // Otherwise the displayed row index doesn't map cleanly to state.csvSatirlar.
  const dragEnabled = !aramaMetni && gorunurIndexler.length === satirlar.length;

  for (let vi = 0; vi < sayfaIndexler.length; vi++) {
    const origIdx = sayfaIndexler[vi];
    const row = satirlar[origIdx];
    const tr = document.createElement("tr");
    tr.dataset.origIdx = String(origIdx);
    tr.dataset.rowKey = satirAnahtar(row);
    if (dragEnabled) {
      tr.draggable = true;
      tr.classList.add("tr-draggable");
    } else {
      tr.title = "Surukle-birak icin filtreyi temizleyin ve sayfa boyutunu 'Tumu' yapin";
    }

    const siraTd = document.createElement("td");
    siraTd.className = "td-sira";
    siraTd.textContent = baslangic + vi + 1;
    tr.appendChild(siraTd);

    for (let ci = 0; ci < row.length; ci++) {
      const td = document.createElement("td");
      const span = document.createElement("span");
      span.className = "td-kanal-adi";
      span.contentEditable = "true";
      span.textContent = row[ci];
      span.spellcheck = false;
      span.setAttribute("role", "textbox");
      span.setAttribute("aria-label", basliklar[ci] || `Sutun ${ci + 1}`);

      const orijinalDeger = row[ci];
      // Shift+click → start/extend range. Plain click clears any existing range.
      td.addEventListener("mousedown", (e) => {
        if (e.shiftKey) {
          e.preventDefault();
          if (!rangeAncor) rangeAncor = { rowIdx: origIdx, colIdx: ci };
          rangeFocus = { rowIdx: origIdx, colIdx: ci };
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          rangeUygula();
        } else if (rangeAncor) {
          rangeTemizle();
        }
      });
      span.addEventListener("focus", () => {
        span.dataset.orijinal = span.textContent;
        // A focused cell becomes the implicit anchor for the next Shift+click range
        rangeAncor = { rowIdx: origIdx, colIdx: ci };
        rangeFocus = { rowIdx: origIdx, colIdx: ci };
      });
      span.addEventListener("blur", () => {
        const yeni = span.textContent;
        if (yeni !== row[ci] && callbacks?.onHucreDegistir) {
          callbacks.onHucreDegistir(origIdx, ci, yeni);
        }
      });
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); span.blur(); return; }
        if (e.key === "Escape") {
          // Revert to original value and blur without saving
          span.textContent = span.dataset.orijinal ?? orijinalDeger;
          span.blur();
          return;
        }
        if (e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          // Horizontal nav: Tab always moves; arrows only when cursor is at the cell boundary
          if (e.key !== "Tab") {
            const sel = window.getSelection();
            const collapsed = sel.isCollapsed;
            const offset = sel.focusOffset;
            const len = span.textContent.length;
            if (e.key === "ArrowLeft" && (!collapsed || offset > 0)) return;
            if (e.key === "ArrowRight" && (!collapsed || offset < len)) return;
          }
          e.preventDefault();
          const goLeft = (e.key === "Tab" && e.shiftKey) || e.key === "ArrowLeft";
          span.blur();
          const next = goLeft
            ? td.previousElementSibling?.querySelector(".td-kanal-adi")
            : td.nextElementSibling?.querySelector(".td-kanal-adi");
          if (next) { next.focus(); selectAll(next); }
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const colIdx = Array.from(tr.children).indexOf(td);
          const targetTr = e.key === "ArrowUp" ? tr.previousElementSibling : tr.nextElementSibling;
          const targetTd = targetTr?.children[colIdx];
          const target = targetTd?.querySelector(".td-kanal-adi");
          if (target) {
            span.blur();
            target.focus();
            selectAll(target);
          }
          return;
        }
        // Excel-style full-cell copy/paste: when no text is selected,
        // Ctrl+C copies the whole cell, Ctrl+V replaces it.
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
          const sel = window.getSelection();
          if (sel.isCollapsed) {
            e.preventDefault();
            navigator.clipboard?.writeText(span.textContent);
          }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
          const sel = window.getSelection();
          if (sel.isCollapsed && span.textContent.length > 0) {
            e.preventDefault();
            navigator.clipboard?.readText().then((text) => {
              if (text === null || text === undefined) return;
              span.textContent = text.replace(/\r?\n/g, " ").trim();
              span.blur();
            });
          }
        }
      });

      td.appendChild(span);
      tr.appendChild(td);
    }

    const islemTd = document.createElement("td");
    islemTd.className = "td-islem";
    const silBtn = document.createElement("button");
    silBtn.type = "button";
    silBtn.className = "btn-sil";
    silBtn.textContent = "\u00D7";
    silBtn.title = "Satiri sil";
    silBtn.setAttribute("aria-label", `Satir ${baslangic + vi + 1} sil`);
    silBtn.addEventListener("click", () => {
      if (callbacks?.onSil) callbacks.onSil(origIdx);
    });
    islemTd.appendChild(silBtn);
    tr.appendChild(islemTd);

    tbody.appendChild(tr);
  }

  if (dragEnabled) {
    surukleBirakKur(tbody, satirlar, basliklar, callbacks);
  }

  // FLIP — animate every row whose Y position changed since the previous render
  flipUygula(tablo, eskiPos);

  // Info
  const bilgiEl = document.getElementById("onizleme-bilgi");
  if (bilgiEl) {
    bilgiEl.textContent = `(${gorunurIndexler.length} / ${satirlar.length} satir)`;
  }

  // Pagination controls
  renderPaginasyon(tablo, gorunurIndexler.length, toplamSayfa, basliklar, satirlar, callbacks);
}

function renderPaginasyon(tablo, toplamGorunur, toplamSayfa, basliklar, satirlar, callbacks) {
  let navEl = document.getElementById("tablo-paginasyon");
  if (!navEl) {
    navEl = document.createElement("div");
    navEl.id = "tablo-paginasyon";
    navEl.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;flex-wrap:wrap;font-size:0.85rem;";
    tablo.parentNode.insertBefore(navEl, tablo.nextSibling);
  }
  navEl.replaceChildren();

  // Page size selector
  const sizeDiv = document.createElement("div");
  sizeDiv.style.cssText = "display:flex;align-items:center;gap:6px;";
  const sizeLabel = document.createElement("span");
  sizeLabel.textContent = "Sayfa boyutu:";
  sizeLabel.style.color = "var(--text-muted)";
  const sizeSelect = document.createElement("select");
  sizeSelect.setAttribute("aria-label", "Sayfa boyutu");
  sizeSelect.style.cssText = "width:auto;padding:4px 8px;font-size:0.82rem;";
  for (const size of [50, 100, 250, 0]) {
    const opt = document.createElement("option");
    opt.value = size;
    opt.textContent = size === 0 ? "Tumu" : String(size);
    if (size === sayfaBoyutu) opt.selected = true;
    sizeSelect.appendChild(opt);
  }
  sizeSelect.addEventListener("change", () => {
    sayfaBoyutu = parseInt(sizeSelect.value);
    mevcutSayfa = 1;
    csvTabloGuncelle(basliklar, satirlar, callbacks);
  });
  sizeDiv.appendChild(sizeLabel);
  sizeDiv.appendChild(sizeSelect);
  navEl.appendChild(sizeDiv);

  if (toplamSayfa <= 1) return;

  // Page navigation
  const pageDiv = document.createElement("div");
  pageDiv.style.cssText = "display:flex;align-items:center;gap:6px;";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "btn-secondary btn-sm";
  prevBtn.textContent = "← Onceki";
  prevBtn.disabled = mevcutSayfa <= 1;
  prevBtn.addEventListener("click", () => {
    if (mevcutSayfa > 1) { mevcutSayfa--; csvTabloGuncelle(basliklar, satirlar, callbacks); }
  });

  const pageInfo = document.createElement("span");
  pageInfo.style.color = "var(--text-muted)";
  pageInfo.textContent = `Sayfa ${mevcutSayfa} / ${toplamSayfa}`;

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "btn-secondary btn-sm";
  nextBtn.textContent = "Sonraki →";
  nextBtn.disabled = mevcutSayfa >= toplamSayfa;
  nextBtn.addEventListener("click", () => {
    if (mevcutSayfa < toplamSayfa) { mevcutSayfa++; csvTabloGuncelle(basliklar, satirlar, callbacks); }
  });

  pageDiv.appendChild(prevBtn);
  pageDiv.appendChild(pageInfo);
  pageDiv.appendChild(nextBtn);
  navEl.appendChild(pageDiv);
}

function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function rangeKoordinatlari() {
  if (!rangeAncor || !rangeFocus) return null;
  const r1 = Math.min(rangeAncor.rowIdx, rangeFocus.rowIdx);
  const r2 = Math.max(rangeAncor.rowIdx, rangeFocus.rowIdx);
  const c1 = Math.min(rangeAncor.colIdx, rangeFocus.colIdx);
  const c2 = Math.max(rangeAncor.colIdx, rangeFocus.colIdx);
  return { r1, r2, c1, c2 };
}

function rangeCokluHucreMi() {
  const k = rangeKoordinatlari();
  if (!k) return false;
  return k.r1 !== k.r2 || k.c1 !== k.c2;
}

document.addEventListener("keydown", (e) => {
  if (!rangeCallbacks) return;
  const k = rangeKoordinatlari();
  if (!k) return;
  // Suppress range ops while a span is being edited (so single-cell typing keeps working)
  if (document.activeElement && document.activeElement.classList?.contains("td-kanal-adi") && rangeCokluHucreMi() === false) {
    return;
  }
  // Delete: clear all cells in the range
  if (rangeCokluHucreMi() && (e.key === "Delete" || e.key === "Backspace")) {
    e.preventDefault();
    if (rangeCallbacks.callbacks?.onRangeBosalt) {
      rangeCallbacks.callbacks.onRangeBosalt(k.r1, k.r2, k.c1, k.c2);
    }
    return;
  }
  // Ctrl+C on a multi-cell range → TSV
  if (rangeCokluHucreMi() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
    e.preventDefault();
    const { satirlar } = rangeCallbacks;
    const lines = [];
    for (let r = k.r1; r <= k.r2; r++) {
      const cells = [];
      for (let c = k.c1; c <= k.c2; c++) {
        cells.push(String(satirlar[r]?.[c] ?? ""));
      }
      lines.push(cells.join("\t"));
    }
    navigator.clipboard?.writeText(lines.join("\n"));
    return;
  }
  // Ctrl+V on a multi-cell range → parse TSV, fill from top-left of range
  if (rangeCokluHucreMi() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    e.preventDefault();
    navigator.clipboard?.readText().then((text) => {
      if (!text) return;
      if (rangeCallbacks.callbacks?.onRangePaste) {
        rangeCallbacks.callbacks.onRangePaste(k.r1, k.c1, text);
      }
    });
    return;
  }
  // Esc clears the range
  if (e.key === "Escape" && rangeCokluHucreMi()) {
    e.preventDefault();
    rangeTemizle();
  }
});

let surukleyenIdx = null;

function surukleBirakKur(tbody, satirlar, basliklar, callbacks) {
  tbody.addEventListener("dragstart", (e) => {
    const tr = e.target.closest("tr.tr-draggable");
    if (!tr) return;
    surukleyenIdx = parseInt(tr.dataset.origIdx, 10);
    tr.classList.add("tr-dragging");
    e.dataTransfer.effectAllowed = "move";
    // Firefox needs payload to start the drag
    e.dataTransfer.setData("text/plain", String(surukleyenIdx));
  });

  tbody.addEventListener("dragend", (e) => {
    const tr = e.target.closest("tr.tr-draggable");
    if (tr) tr.classList.remove("tr-dragging");
    tbody.querySelectorAll(".tr-drag-over").forEach((el) => el.classList.remove("tr-drag-over"));
    surukleyenIdx = null;
  });

  tbody.addEventListener("dragover", (e) => {
    if (surukleyenIdx === null) return;
    const tr = e.target.closest("tr.tr-draggable");
    if (!tr) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    tbody.querySelectorAll(".tr-drag-over").forEach((el) => el.classList.remove("tr-drag-over"));
    tr.classList.add("tr-drag-over");
  });

  tbody.addEventListener("drop", (e) => {
    if (surukleyenIdx === null) return;
    const tr = e.target.closest("tr.tr-draggable");
    if (!tr) return;
    e.preventDefault();
    const hedefIdx = parseInt(tr.dataset.origIdx, 10);
    if (hedefIdx === surukleyenIdx) return;
    if (callbacks?.onSiraDegistir) {
      callbacks.onSiraDegistir(surukleyenIdx, hedefIdx);
    }
  });
}
