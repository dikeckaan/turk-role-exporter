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

  for (let vi = 0; vi < sayfaIndexler.length; vi++) {
    const origIdx = sayfaIndexler[vi];
    const row = satirlar[origIdx];
    const tr = document.createElement("tr");

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

      span.addEventListener("blur", () => {
        const yeni = span.textContent;
        if (yeni !== row[ci] && callbacks?.onHucreDegistir) {
          callbacks.onHucreDegistir(origIdx, ci, yeni);
        }
      });
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); span.blur(); }
        if (e.key === "Tab") {
          e.preventDefault();
          span.blur();
          const next = e.shiftKey
            ? td.previousElementSibling?.querySelector(".td-kanal-adi")
            : td.nextElementSibling?.querySelector(".td-kanal-adi");
          if (next) { next.focus(); selectAll(next); }
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
