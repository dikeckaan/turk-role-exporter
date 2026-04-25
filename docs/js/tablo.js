/**
 * tablo.js
 * Renders the CSV preview table with fully editable cells and pagination.
 * Shows the exact CSV output — what you see is what you export.
 */

let mevcutSayfa = 1;
let sayfaBoyutu = 100;

/**
 * Renders editable CSV preview table with pagination.
 * @param {string[]} basliklar - CSV column headers
 * @param {string[][]} satirlar - CSV row arrays (mutable)
 * @param {object} callbacks - { onSil(rowIndex), onHucreDegistir(rowIndex, colIndex, value) }
 */
export function csvTabloGuncelle(basliklar, satirlar, callbacks) {
  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;

  // Rebuild headers dynamically
  const thead = tablo.querySelector("thead");
  if (thead) {
    thead.replaceChildren();
    const tr = document.createElement("tr");

    const thSira = document.createElement("th");
    thSira.className = "th-sira";
    thSira.textContent = "#";
    tr.appendChild(thSira);

    for (const h of basliklar) {
      const th = document.createElement("th");
      th.textContent = h;
      tr.appendChild(th);
    }

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
      span.addEventListener("focus", () => {
        span.dataset.orijinal = span.textContent;
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
