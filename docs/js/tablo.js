/**
 * tablo.js
 * Renders the CSV preview table with editable cells, drag-drop reorder,
 * sortable headers, range selection (shift+click), column resize.
 *
 * Performance contract: render attaches NO per-cell listeners. All input
 * is handled by a small set of delegated tbody/thead/document listeners
 * that resolve target cells from data-attributes. This keeps a 3000×51
 * table from drowning Chrome in 600k closures.
 */

let mevcutSayfa = 1;
let sayfaBoyutu = 100;
let sortKolon = null;
let sortYon = null;
let kompaktMod = false;

const KOLON_GENISLIK_KEY = "tabloKolonGenislikleri";
const KOMPAKT_KEY = "tabloKompaktMod";

function genisliklerYukle() {
  try { return JSON.parse(localStorage.getItem(KOLON_GENISLIK_KEY)) || {}; }
  catch { return {}; }
}
function genisliklerKaydet(g) {
  try { localStorage.setItem(KOLON_GENISLIK_KEY, JSON.stringify(g)); } catch {}
}

// Range selection
let rangeAncor = null;
let rangeFocus = null;
let aktifSatirlar = null;     // captured on render so document-level listeners can read state
let aktifBasliklar = null;
let aktifCallbacks = null;

// Multi-row selection (checkbox-driven). Holds origIdx values.
const secimSatirlari = new Set();

// FLIP (row position animation)
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
  const tbody = tablo.querySelector("tbody");
  if (!tbody) return map;
  for (const tr of tbody.children) {
    const k = tr.dataset.rowKey;
    if (k) map.set(k, tr.getBoundingClientRect().top);
  }
  return map;
}
function flipUygula(tablo, eskiPos) {
  if (!tablo || eskiPos.size === 0) return;
  const tbody = tablo.querySelector("tbody");
  if (!tbody) return;
  for (const tr of tbody.children) {
    const eski = eskiPos.get(tr.dataset.rowKey);
    if (eski === undefined) continue;
    const yeni = tr.getBoundingClientRect().top;
    const delta = eski - yeni;
    if (Math.abs(delta) < 1) continue;
    tr.style.transition = "none";
    tr.style.transform = `translateY(${delta}px)`;
    requestAnimationFrame(() => {
      tr.style.transition = "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)";
      tr.style.transform = "";
      tr.addEventListener("transitionend", () => { tr.style.transition = ""; }, { once: true });
    });
  }
}

function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function rangeKoor() {
  if (!rangeAncor || !rangeFocus) return null;
  return {
    r1: Math.min(rangeAncor.rowIdx, rangeFocus.rowIdx),
    r2: Math.max(rangeAncor.rowIdx, rangeFocus.rowIdx),
    c1: Math.min(rangeAncor.colIdx, rangeFocus.colIdx),
    c2: Math.max(rangeAncor.colIdx, rangeFocus.colIdx),
  };
}
function rangeCoklu() {
  const k = rangeKoor();
  return !!k && (k.r1 !== k.r2 || k.c1 !== k.c2);
}
function rangeUygula() {
  document.querySelectorAll("#onizleme-tablosu td.hucre-range").forEach((td) => td.classList.remove("hucre-range"));
  const k = rangeKoor();
  if (!k) return;
  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;
  for (let r = k.r1; r <= k.r2; r++) {
    const tr = tablo.querySelector(`tbody tr[data-orig-idx="${r}"]`);
    if (!tr) continue;
    for (let c = k.c1; c <= k.c2; c++) {
      const td = tr.querySelector(`td[data-col-idx="${c}"]`);
      if (td) td.classList.add("hucre-range");
    }
  }
}
function rangeTemizle() {
  rangeAncor = null;
  rangeFocus = null;
  document.querySelectorAll("#onizleme-tablosu td.hucre-range").forEach((td) => td.classList.remove("hucre-range"));
}

// ─── Render ──────────────────────────────────────────────────────────────────

export function csvTabloGuncelle(basliklar, satirlar, callbacks) {
  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;

  aktifSatirlar = satirlar;
  aktifBasliklar = basliklar;
  aktifCallbacks = callbacks;

  if (!tablo.dataset.dinleyiciKurulu) {
    dinleyicileriBaglat(tablo);
    tablo.dataset.dinleyiciKurulu = "1";
  }

  // Compact mode
  kompaktMod = localStorage.getItem(KOMPAKT_KEY) === "1";
  tablo.classList.toggle("tablo-kompakt", kompaktMod);

  const eskiPos = flipPozTopla(tablo);

  // Filter
  const aramaInput = document.getElementById("tablo-arama");
  const aramaMetni = aramaInput ? aramaInput.value.toLowerCase() : "";
  const gorunurIndexler = [];
  for (let i = 0; i < satirlar.length; i++) {
    if (aramaMetni) {
      const match = satirlar[i].some((val) => String(val).toLowerCase().includes(aramaMetni));
      if (!match) continue;
    }
    gorunurIndexler.push(i);
  }

  // Pagination
  const toplamSayfa = sayfaBoyutu === 0 ? 1 : Math.max(1, Math.ceil(gorunurIndexler.length / sayfaBoyutu));
  if (mevcutSayfa > toplamSayfa) mevcutSayfa = toplamSayfa;
  const baslangic = sayfaBoyutu === 0 ? 0 : (mevcutSayfa - 1) * sayfaBoyutu;
  const bitis = sayfaBoyutu === 0 ? gorunurIndexler.length : Math.min(baslangic + sayfaBoyutu, gorunurIndexler.length);
  const sayfaIndexler = gorunurIndexler.slice(baslangic, bitis);

  // Header
  const thead = tablo.querySelector("thead");
  if (thead) {
    thead.replaceChildren();
    const tr = document.createElement("tr");

    const thSecim = document.createElement("th");
    thSecim.className = "th-secim";
    const masterCb = document.createElement("input");
    masterCb.type = "checkbox";
    masterCb.title = "Tümünü seç / temizle";
    masterCb.dataset.role = "master-secim";
    // Reflect "all visible selected" state
    const tumuSecili = sayfaIndexler.length > 0 && sayfaIndexler.every((i) => secimSatirlari.has(i));
    masterCb.checked = tumuSecili;
    thSecim.appendChild(masterCb);
    tr.appendChild(thSecim);

    const thIslem = document.createElement("th");
    thIslem.className = "th-islem";
    thIslem.textContent = "";
    tr.appendChild(thIslem);

    const thSira = document.createElement("th");
    thSira.className = "th-sira";
    thSira.textContent = "#";
    tr.appendChild(thSira);

    const genislikler = genisliklerYukle();
    basliklar.forEach((h, ci) => {
      // Hide the redundant Location column (col 0) — # already shows the same number
      if (ci === 0 && /^location$|^channel\s*number$/i.test(h)) return;
      const th = document.createElement("th");
      th.className = "th-sortable";
      th.dataset.colIdx = String(ci);
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
      const handle = document.createElement("div");
      handle.className = "th-resize-handle";
      handle.dataset.colHeader = h;
      handle.title = "Cift tikla: otomatik genislik";
      th.appendChild(handle);
      tr.appendChild(th);
    });

    thead.appendChild(tr);
  }

  // Body — uses DocumentFragment to keep layout off the critical path during build
  const tbody = tablo.querySelector("tbody");
  if (!tbody) return;
  tbody.replaceChildren();
  const frag = document.createDocumentFragment();

  // Drag-drop is page-local (HTML5 drag API can't cross pages anyway),
  // so we only need to disable it when the search filter is active —
  // filtered indices aren't contiguous in state.csvSatirlar.
  const dragEnabled = !aramaMetni;

  for (let vi = 0; vi < sayfaIndexler.length; vi++) {
    const origIdx = sayfaIndexler[vi];
    const row = satirlar[origIdx];
    const tr = document.createElement("tr");
    tr.dataset.origIdx = String(origIdx);
    tr.dataset.rowKey = satirAnahtar(row);
    if (dragEnabled) {
      tr.draggable = true;
      tr.classList.add("tr-draggable");
    }
    if (secimSatirlari.has(origIdx)) tr.classList.add("tr-secili");

    const secimTd = document.createElement("td");
    secimTd.className = "td-secim";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.role = "satir-secim";
    cb.checked = secimSatirlari.has(origIdx);
    cb.title = "Bu satırı seç (toplu silme için)";
    secimTd.appendChild(cb);
    tr.appendChild(secimTd);

    const islemTd = document.createElement("td");
    islemTd.className = "td-islem";
    const silBtn = document.createElement("button");
    silBtn.type = "button";
    silBtn.className = "btn-sil";
    silBtn.textContent = "\u00D7";
    silBtn.title = "Satiri sil";
    silBtn.dataset.action = "sil";
    islemTd.appendChild(silBtn);
    tr.appendChild(islemTd);

    const siraTd = document.createElement("td");
    siraTd.className = "td-sira";
    siraTd.contentEditable = "true";
    siraTd.spellcheck = false;
    siraTd.dataset.kind = "sira";
    siraTd.title = "Yeni sira numarasi yaz, kanal o satira tasinir";
    siraTd.textContent = baslangic + vi + 1;
    tr.appendChild(siraTd);

    for (let ci = 0; ci < row.length; ci++) {
      // Hide the redundant Location column from the UI (it's still in csvSatirlar for export)
      if (ci === 0 && /^location$|^channel\s*number$/i.test(basliklar[ci] || "")) continue;
      const td = document.createElement("td");
      td.dataset.colIdx = String(ci);
      const span = document.createElement("span");
      span.className = "td-kanal-adi";
      span.contentEditable = "true";
      span.textContent = row[ci];
      span.spellcheck = false;
      td.appendChild(span);
      tr.appendChild(td);
    }

    frag.appendChild(tr);
  }
  tbody.appendChild(frag);

  rangeUygula();
  flipUygula(tablo, eskiPos);

  const bilgiEl = document.getElementById("onizleme-bilgi");
  if (bilgiEl) bilgiEl.textContent = `(${gorunurIndexler.length} / ${satirlar.length} satir)`;
  renderPaginasyon(tablo, toplamSayfa);
}

// ─── Delegated listeners (attached once per tablo lifetime) ─────────────────

function dinleyicileriBaglat(tablo) {
  const tbody = tablo.querySelector("tbody");
  const thead = tablo.querySelector("thead");

  // Cell mousedown — handles range start/extend, click-to-clear-range
  tbody?.addEventListener("mousedown", (e) => {
    const td = e.target.closest("td[data-col-idx]");
    const tr = e.target.closest("tr[data-orig-idx]");
    if (!td || !tr) return;
    const rowIdx = parseInt(tr.dataset.origIdx, 10);
    const colIdx = parseInt(td.dataset.colIdx, 10);
    if (e.shiftKey) {
      e.preventDefault();
      if (!rangeAncor) rangeAncor = { rowIdx, colIdx };
      rangeFocus = { rowIdx, colIdx };
      if (document.activeElement?.blur) document.activeElement.blur();
      rangeUygula();
    } else if (rangeCoklu()) {
      rangeTemizle();
    }
  });

  // Cell focus — set anchor for next shift+click; for # cell, freeze
  // tr.draggable so contentEditable text-edit doesn't fight HTML5 drag.
  tbody?.addEventListener("focusin", (e) => {
    const tr = e.target.closest("tr[data-orig-idx]");
    if (!tr) return;
    if (e.target.matches("td.td-sira")) {
      tr.dataset.eskiDraggable = String(tr.draggable);
      tr.draggable = false;
      e.target.dataset.orijinal = e.target.textContent;
      requestAnimationFrame(() => selectAll(e.target));
      return;
    }
    const span = e.target.closest("span.td-kanal-adi");
    const td = e.target.closest("td[data-col-idx]");
    if (!span || !td) return;
    span.dataset.orijinal = span.textContent;
    rangeAncor = { rowIdx: parseInt(tr.dataset.origIdx, 10), colIdx: parseInt(td.dataset.colIdx, 10) };
    rangeFocus = { ...rangeAncor };
  });

  // Cell blur — commit edit
  tbody?.addEventListener("focusout", (e) => {
    const tr = e.target.closest("tr[data-orig-idx]");
    if (!tr) return;
    if (e.target.matches("td.td-sira")) {
      // Restore tr.draggable to whatever it was at focus-in
      if (tr.dataset.eskiDraggable !== undefined) {
        tr.draggable = tr.dataset.eskiDraggable === "true";
        delete tr.dataset.eskiDraggable;
      }
      const yeniSayi = parseInt(e.target.textContent.trim(), 10);
      const eskiIdx = parseInt(tr.dataset.origIdx, 10);
      const toplam = aktifSatirlar?.length ?? 0;
      if (isNaN(yeniSayi) || yeniSayi < 1 || yeniSayi > toplam) {
        // Bad input → revert
        e.target.textContent = e.target.dataset.orijinal ?? String(eskiIdx + 1);
        return;
      }
      const hedefIdx = yeniSayi - 1;
      if (hedefIdx === eskiIdx) {
        // No change → snap back to the canonical formatting
        e.target.textContent = String(eskiIdx + 1);
        return;
      }
      // Jump to the target page so the user actually sees the moved row land
      if (sayfaBoyutu > 0) {
        mevcutSayfa = Math.floor(hedefIdx / sayfaBoyutu) + 1;
      }
      aktifCallbacks?.onSiraDegistir?.(eskiIdx, hedefIdx);
      return;
    }
    const span = e.target.closest("span.td-kanal-adi");
    const td = e.target.closest("td[data-col-idx]");
    if (!span || !td) return;
    const rowIdx = parseInt(tr.dataset.origIdx, 10);
    const colIdx = parseInt(td.dataset.colIdx, 10);
    const yeni = span.textContent;
    if (aktifSatirlar?.[rowIdx]?.[colIdx] !== yeni && aktifCallbacks?.onHucreDegistir) {
      aktifCallbacks.onHucreDegistir(rowIdx, colIdx, yeni);
    }
  });

  // Cell keydown — navigation, edit shortcuts, full-cell copy/paste
  tbody?.addEventListener("keydown", (e) => {
    // # cell: only handle Enter/Esc — commits/cancels the row-position edit
    if (e.target.matches?.("td.td-sira")) {
      if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
      else if (e.key === "Escape") {
        e.preventDefault();
        e.target.textContent = e.target.dataset.orijinal ?? e.target.textContent;
        e.target.blur();
      }
      return;
    }
    const span = e.target.closest("span.td-kanal-adi");
    if (!span) return;
    const td = span.closest("td[data-col-idx]");
    const tr = span.closest("tr[data-orig-idx]");
    if (!td || !tr) return;

    if (e.key === "Enter") { e.preventDefault(); span.blur(); return; }
    if (e.key === "Escape") {
      span.textContent = span.dataset.orijinal ?? span.textContent;
      span.blur();
      return;
    }
    if (e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
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
      const target = targetTr?.children[colIdx]?.querySelector(".td-kanal-adi");
      if (target) { span.blur(); target.focus(); selectAll(target); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      const sel = window.getSelection();
      if (sel.isCollapsed) { e.preventDefault(); navigator.clipboard?.writeText(span.textContent); }
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

  // Delete row button
  tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='sil']");
    if (!btn) return;
    const tr = btn.closest("tr[data-orig-idx]");
    if (!tr) return;
    const rowIdx = parseInt(tr.dataset.origIdx, 10);
    if (aktifCallbacks?.onSil) aktifCallbacks.onSil(rowIdx);
  });

  // Per-row selection checkbox
  tbody?.addEventListener("change", (e) => {
    const cb = e.target.closest("input[type=checkbox][data-role='satir-secim']");
    if (!cb) return;
    const tr = cb.closest("tr[data-orig-idx]");
    if (!tr) return;
    const rowIdx = parseInt(tr.dataset.origIdx, 10);
    if (cb.checked) {
      secimSatirlari.add(rowIdx);
      tr.classList.add("tr-secili");
    } else {
      secimSatirlari.delete(rowIdx);
      tr.classList.remove("tr-secili");
    }
    // Refresh the toolbar (the bulk-delete button shows/hides + count updates)
    csvTabloGuncelle(aktifBasliklar, aktifSatirlar, aktifCallbacks);
  });

  // Master "select all visible" checkbox in the header
  thead?.addEventListener("change", (e) => {
    const cb = e.target.closest("input[type=checkbox][data-role='master-secim']");
    if (!cb) return;
    // Determine the currently visible rows (same logic as render, simplified)
    const trs = tablo.querySelectorAll("tbody tr[data-orig-idx]");
    if (cb.checked) {
      trs.forEach((tr) => secimSatirlari.add(parseInt(tr.dataset.origIdx, 10)));
    } else {
      trs.forEach((tr) => secimSatirlari.delete(parseInt(tr.dataset.origIdx, 10)));
    }
    csvTabloGuncelle(aktifBasliklar, aktifSatirlar, aktifCallbacks);
  });

  // Drag-drop reorder (delegated)
  let surukleyenIdx = null;
  tbody?.addEventListener("dragstart", (e) => {
    const tr = e.target.closest("tr.tr-draggable");
    if (!tr) return;
    surukleyenIdx = parseInt(tr.dataset.origIdx, 10);
    tr.classList.add("tr-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(surukleyenIdx));
  });
  tbody?.addEventListener("dragend", (e) => {
    const tr = e.target.closest("tr.tr-draggable");
    if (tr) tr.classList.remove("tr-dragging");
    tbody.querySelectorAll(".tr-drag-over").forEach((el) => el.classList.remove("tr-drag-over"));
    surukleyenIdx = null;
  });
  tbody?.addEventListener("dragover", (e) => {
    if (surukleyenIdx === null) return;
    const tr = e.target.closest("tr.tr-draggable");
    if (!tr) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    tbody.querySelectorAll(".tr-drag-over").forEach((el) => el.classList.remove("tr-drag-over"));
    tr.classList.add("tr-drag-over");
  });
  tbody?.addEventListener("drop", (e) => {
    if (surukleyenIdx === null) return;
    const tr = e.target.closest("tr.tr-draggable");
    if (!tr) return;
    e.preventDefault();
    const hedefIdx = parseInt(tr.dataset.origIdx, 10);
    if (hedefIdx === surukleyenIdx) return;
    aktifCallbacks?.onSiraDegistir?.(surukleyenIdx, hedefIdx);
  });

  // Header click → sort, resize handle drag → column width
  thead?.addEventListener("click", (e) => {
    if (e.target.classList.contains("th-resize-handle")) return;
    const th = e.target.closest("th[data-col-idx]");
    if (!th) return;
    const ci = parseInt(th.dataset.colIdx, 10);
    if (sortKolon === ci) {
      sortYon = sortYon === "asc" ? "desc" : sortYon === "desc" ? null : "asc";
      if (sortYon === null) sortKolon = null;
    } else {
      sortKolon = ci;
      sortYon = "asc";
    }
    if (aktifCallbacks?.onSortDegistir && sortKolon !== null) {
      aktifCallbacks.onSortDegistir(sortKolon, sortYon);
    } else {
      csvTabloGuncelle(aktifBasliklar, aktifSatirlar, aktifCallbacks);
    }
  });
  thead?.addEventListener("mousedown", (e) => {
    if (!e.target.classList.contains("th-resize-handle")) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.target;
    const th = handle.closest("th");
    const headerName = handle.dataset.colHeader;
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
      g[headerName] = th.offsetWidth;
      genisliklerKaydet(g);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
  thead?.addEventListener("dblclick", (e) => {
    if (!e.target.classList.contains("th-resize-handle")) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.target;
    const th = handle.closest("th");
    th.style.width = "";
    const g = genisliklerYukle();
    delete g[handle.dataset.colHeader];
    genisliklerKaydet(g);
  });

  // Document-level: range Delete / Ctrl+C / Ctrl+V / Esc
  document.addEventListener("keydown", (e) => {
    if (!aktifCallbacks) return;
    if (!rangeCoklu()) return;
    // Don't override default behavior while a span is being edited
    if (document.activeElement?.classList?.contains("td-kanal-adi")) return;
    const k = rangeKoor();
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      aktifCallbacks.onRangeBosalt?.(k.r1, k.r2, k.c1, k.c2);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      const lines = [];
      for (let r = k.r1; r <= k.r2; r++) {
        const cells = [];
        for (let c = k.c1; c <= k.c2; c++) cells.push(String(aktifSatirlar[r]?.[c] ?? ""));
        lines.push(cells.join("\t"));
      }
      navigator.clipboard?.writeText(lines.join("\n"));
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      navigator.clipboard?.readText().then((text) => {
        if (text) aktifCallbacks.onRangePaste?.(k.r1, k.c1, text);
      });
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      rangeTemizle();
    }
  });

  // Shift+wheel → horizontal scroll on the table container
  const container = tablo.closest(".table-container");
  if (container) {
    container.addEventListener("wheel", (e) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }, { passive: false });
  }
}

// ─── Pagination + compact toggle + help button ──────────────────────────────

function renderPaginasyon(tablo, toplamSayfa) {
  let navEl = document.getElementById("tablo-paginasyon");
  // Live in the .table-container's parent, ABOVE the table itself
  const container = tablo.closest(".table-container") || tablo;
  if (!navEl) {
    navEl = document.createElement("div");
    navEl.id = "tablo-paginasyon";
    navEl.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 12px 0;flex-wrap:wrap;font-size:0.85rem;";
    container.parentNode.insertBefore(navEl, container);
  } else if (navEl.nextSibling !== container) {
    // Fix position if a previous build inserted it after the table
    container.parentNode.insertBefore(navEl, container);
  }
  navEl.replaceChildren();

  // Page size
  const sizeDiv = document.createElement("div");
  sizeDiv.style.cssText = "display:flex;align-items:center;gap:8px;";
  const sizeLabel = document.createElement("span");
  sizeLabel.textContent = "Sayfa:";
  sizeLabel.style.color = "var(--text-muted)";
  const sizeSelect = document.createElement("select");
  sizeSelect.setAttribute("aria-label", "Sayfa boyutu");
  sizeSelect.style.cssText = "width:auto;padding:4px 8px;font-size:0.82rem;";
  for (const size of [50, 100, 250, 500]) {
    const opt = document.createElement("option");
    opt.value = size;
    opt.textContent = String(size);
    if (size === sayfaBoyutu) opt.selected = true;
    sizeSelect.appendChild(opt);
  }
  sizeSelect.addEventListener("change", () => {
    sayfaBoyutu = parseInt(sizeSelect.value);
    mevcutSayfa = 1;
    csvTabloGuncelle(aktifBasliklar, aktifSatirlar, aktifCallbacks);
  });
  sizeDiv.appendChild(sizeLabel);
  sizeDiv.appendChild(sizeSelect);

  // Compact toggle
  const kompaktBtn = document.createElement("button");
  kompaktBtn.type = "button";
  kompaktBtn.className = "btn-secondary btn-sm";
  kompaktBtn.textContent = kompaktMod ? "Genis" : "Kompakt";
  kompaktBtn.title = "Yogun goruntu — daha cok satir gorunur";
  kompaktBtn.addEventListener("click", () => {
    kompaktMod = !kompaktMod;
    localStorage.setItem(KOMPAKT_KEY, kompaktMod ? "1" : "0");
    csvTabloGuncelle(aktifBasliklar, aktifSatirlar, aktifCallbacks);
  });
  sizeDiv.appendChild(kompaktBtn);

  // Keyboard help
  const helpBtn = document.createElement("button");
  helpBtn.type = "button";
  helpBtn.className = "btn-secondary btn-sm";
  helpBtn.textContent = "Yardım";
  helpBtn.title = "Klavye kisayollari";
  helpBtn.addEventListener("click", yardimGoster);
  sizeDiv.appendChild(helpBtn);

  // Bulk delete (shows up only when 1+ rows are selected via checkbox)
  if (secimSatirlari.size > 0) {
    const topluSilBtn = document.createElement("button");
    topluSilBtn.type = "button";
    topluSilBtn.className = "btn-toplu-sil";
    topluSilBtn.textContent = `${secimSatirlari.size} satırı sil`;
    topluSilBtn.title = "Seçili satırları toplu sil";
    topluSilBtn.addEventListener("click", () => {
      if (!aktifCallbacks?.onTopluSil) return;
      const idxler = [...secimSatirlari].sort((a, b) => b - a); // descending so splice indices stay valid
      secimSatirlari.clear();
      aktifCallbacks.onTopluSil(idxler);
    });
    sizeDiv.appendChild(topluSilBtn);
  }

  navEl.appendChild(sizeDiv);

  if (toplamSayfa <= 1) return;
  const pageDiv = document.createElement("div");
  pageDiv.style.cssText = "display:flex;align-items:center;gap:6px;";
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "btn-secondary btn-sm";
  prevBtn.textContent = "\u2190 Onceki";
  prevBtn.disabled = mevcutSayfa <= 1;
  prevBtn.addEventListener("click", () => {
    if (mevcutSayfa > 1) { mevcutSayfa--; csvTabloGuncelle(aktifBasliklar, aktifSatirlar, aktifCallbacks); }
  });
  const pageInfo = document.createElement("span");
  pageInfo.style.color = "var(--text-muted)";
  pageInfo.textContent = `Sayfa ${mevcutSayfa} / ${toplamSayfa}`;
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "btn-secondary btn-sm";
  nextBtn.textContent = "Sonraki \u2192";
  nextBtn.disabled = mevcutSayfa >= toplamSayfa;
  nextBtn.addEventListener("click", () => {
    if (mevcutSayfa < toplamSayfa) { mevcutSayfa++; csvTabloGuncelle(aktifBasliklar, aktifSatirlar, aktifCallbacks); }
  });
  pageDiv.append(prevBtn, pageInfo, nextBtn);
  navEl.appendChild(pageDiv);
}

let yardimModalEl = null;
function kbd(text) {
  const el = document.createElement("kbd");
  el.textContent = text;
  return el;
}
function kbdRow(parts) {
  // parts: array of strings — strings turn into <kbd>, "+" stays plain
  const span = document.createElement("span");
  span.className = "yardim-keys";
  for (const p of parts) {
    if (p === "+" || p === "/") {
      const sep = document.createElement("span");
      sep.className = "yardim-sep";
      sep.textContent = " " + p + " ";
      span.appendChild(sep);
    } else {
      span.appendChild(kbd(p));
    }
  }
  return span;
}

function yardimGoster() {
  if (yardimModalEl) { yardimModalEl.style.display = "flex"; return; }
  const overlay = document.createElement("div");
  overlay.className = "yardim-overlay";
  const panel = document.createElement("div");
  panel.className = "yardim-panel";

  const baslik = document.createElement("h3");
  baslik.textContent = "Klavye Kısayolları";
  const altBaslik = document.createElement("p");
  altBaslik.className = "yardim-altbaslik";
  altBaslik.textContent = "CSV editörünü Excel hızında kullan.";

  const kapat = document.createElement("button");
  kapat.type = "button";
  kapat.className = "btn-sil";
  kapat.textContent = "\u00D7";
  kapat.style.cssText = "position:absolute;top:10px;right:10px;";
  kapat.addEventListener("click", () => { overlay.style.display = "none"; });

  const bolumler = [
    {
      ad: "Düzenleme",
      satirlar: [
        { keys: [], aciklama: "Hücreye tıkla, üzerine yaz" },
        { keys: ["Enter"], aciklama: "Değişikliği kaydet, çık" },
        { keys: ["Esc"], aciklama: "Vazgeç, eski değere dön" },
        { keys: ["Ctrl/⌘", "+", "Z"], aciklama: "Son değişikliği geri al" },
        { keys: ["Ctrl/⌘", "+", "Shift", "+", "Z"], aciklama: "İleri al" },
      ],
    },
    {
      ad: "Hücre arası gezinme",
      satirlar: [
        { keys: ["Tab"], aciklama: "Sağdaki hücreye geç" },
        { keys: ["Shift", "+", "Tab"], aciklama: "Soldaki hücreye geç" },
        { keys: ["↑"], aciklama: "Üstteki hücreye" },
        { keys: ["↓"], aciklama: "Alttaki hücreye" },
        { keys: ["←", "/", "→"], aciklama: "Yatay (sadece imleç hücre kenarındayken)" },
        { keys: ["Shift", "+", "Tekerlek"], aciklama: "Tabloyu yatay kaydır" },
      ],
    },
    {
      ad: "Kopyala / yapıştır",
      satirlar: [
        { keys: ["Ctrl/⌘", "+", "C"], aciklama: "Tek hücreyi kopyala" },
        { keys: ["Ctrl/⌘", "+", "V"], aciklama: "Tek hücreyi yapıştır (üzerine yazar)" },
        { keys: ["Shift", "+", "Tıkla"], aciklama: "Hücre aralığı seç (mavi vurgu)" },
        { keys: ["Ctrl/⌘", "+", "C"], aciklama: "Aralığı seçtikten sonra: TSV olarak kopyala (Excel'e direkt yapıştırılır)" },
        { keys: ["Ctrl/⌘", "+", "V"], aciklama: "Aralık seçiliyken: TSV'yi sol-üst köşeden başlayarak yapıştır" },
        { keys: ["Delete"], aciklama: "Aralık seçiliyken: aralıktaki tüm hücreleri boşalt" },
        { keys: ["Esc"], aciklama: "Aralık seçimini temizle" },
      ],
    },
    {
      ad: "Satır ve sütun",
      satirlar: [
        { keys: [], aciklama: "# kolonuna sayı yaz, Enter → satır o konuma animasyonla taşınır" },
        { keys: [], aciklama: "Satırı sürükle (× ve hücre dışından) → yeni konumuna bırak" },
        { keys: [], aciklama: "Sütun başlığına tıkla → A→Z, Z→A, sıfırla (3 hâl)" },
        { keys: [], aciklama: "Sütun kenarını sürükle → genişliği değiştir, çift tıkla → sıfırla" },
        { keys: ["×"], aciklama: "Sol baştaki kırmızı düğme → satırı sil" },
      ],
    },
    {
      ad: "Arama",
      satirlar: [
        { keys: ["Ctrl/⌘", "+", "F"], aciklama: "Bul ve değiştir paneli (regex + büyük/küçük harf)" },
        { keys: ["Enter"], aciklama: "Bul kutusunda: sonraki eşleşmeye geç" },
        { keys: ["Shift", "+", "Enter"], aciklama: "Önceki eşleşmeye geç" },
      ],
    },
  ];

  panel.append(baslik, altBaslik, kapat);
  for (const bolum of bolumler) {
    const h4 = document.createElement("h4");
    h4.className = "yardim-bolum-baslik";
    h4.textContent = bolum.ad;
    panel.appendChild(h4);
    const ul = document.createElement("ul");
    ul.className = "yardim-bolum-list";
    for (const sat of bolum.satirlar) {
      const li = document.createElement("li");
      if (sat.keys.length > 0) li.appendChild(kbdRow(sat.keys));
      const acik = document.createElement("span");
      acik.className = "yardim-acik";
      acik.textContent = sat.aciklama;
      li.appendChild(acik);
      ul.appendChild(li);
    }
    panel.appendChild(ul);
  }

  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.style.display = "none"; });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display !== "none") overlay.style.display = "none";
  });
  document.body.appendChild(overlay);
  yardimModalEl = overlay;
}
