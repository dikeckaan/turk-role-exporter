/**
 * tablo.js
 * Renders the CSV preview table with fully editable cells.
 * Shows the exact CSV output — what you see is what you export.
 */

/**
 * Renders editable CSV preview table.
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

  // Build index map (filtered index → original index)
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

  const tbody = tablo.querySelector("tbody");
  if (!tbody) return;
  tbody.replaceChildren();

  for (let vi = 0; vi < gorunurIndexler.length; vi++) {
    const origIdx = gorunurIndexler[vi];
    const row = satirlar[origIdx];
    const tr = document.createElement("tr");

    // Row number
    const siraTd = document.createElement("td");
    siraTd.className = "td-sira";
    siraTd.textContent = vi + 1;
    tr.appendChild(siraTd);

    // CSV cells — all editable
    for (let ci = 0; ci < row.length; ci++) {
      const td = document.createElement("td");
      const span = document.createElement("span");
      span.className = "td-kanal-adi";
      span.contentEditable = "true";
      span.textContent = row[ci];
      span.spellcheck = false;

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

    // Delete button
    const islemTd = document.createElement("td");
    islemTd.className = "td-islem";
    const silBtn = document.createElement("button");
    silBtn.type = "button";
    silBtn.className = "btn-sil";
    silBtn.textContent = "\u00D7";
    silBtn.title = "Satiri sil";
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
}

function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
