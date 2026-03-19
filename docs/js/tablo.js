import { puanHesapla, kanalAdiOlustur, txFrekansHesapla, isDijital } from "./utils.js";

let siralamaAlani = null;
let siralamaYonu = "asc";

/**
 * Editable column definitions.
 * Each maps to a role field and provides display logic.
 */
const EDITABLE_COLUMNS = [
  { key: "kanalAdi",  label: "Kanal Adi", override: "kanalAdiOverride",
    getValue: (role, fmt, sh) => role.kanalAdiOverride || kanalAdiOlustur(role, fmt) },
  { key: "frekans",   label: "RX Frekans", field: "frekans",
    getValue: (role) => role.frekans || "-" },
  { key: "txFrekans", label: "TX Frekans", field: "txFrekansOverride",
    getValue: (role, _f, sh) => role.txFrekansOverride || txFrekansHesapla(role, sh) || "-" },
  { key: "bant",      label: "Bant", field: "bant",
    getValue: (role) => role.bant || "-" },
  { key: "digital",   label: "Mod", field: "modOverride",
    getValue: (role) => role.modOverride || (isDijital(role) ? "Dijital" : "Analog") },
  { key: "guc",       label: "Guc", field: "gucOverride",
    getValue: (role) => role.gucOverride || (role.guc ? role.guc + "W" : "-") },
  { key: "yukseklik", label: "Yukseklik", field: "yukseklikOverride",
    getValue: (role) => role.yukseklikOverride || (role.yukseklik ? role.yukseklik + "m" : "-") },
  { key: "puan",      label: "Puan",
    getValue: (role) => puanHesapla(role) + "%", editable: false },
  { key: "sehir",     label: "Sehir", field: "sehir",
    getValue: (role) => role.sehir || "-" },
  { key: "ilce",      label: "Ilce", field: "ilce",
    getValue: (role) => role.ilce || "-" },
  { key: "konum",     label: "Konum", field: "konum",
    getValue: (role) => role.konum || "-" },
];

/**
 * Updates the preview table with fully editable cells and delete buttons.
 */
export function tabloGuncelle(roleler, kanalAdiFormati, shiftHesaplama, callbacks, bosKanallar) {
  const aramaInput = document.getElementById("tablo-arama");
  const aramaMetni = aramaInput ? aramaInput.value.toLowerCase() : "";

  const filtrelenmis = roleler.filter((role) => {
    if (!aramaMetni) return true;
    const alanlar = [
      role.sehir, role.ilce, role.konum, role.bant, role.frekans, role.tabolge,
    ];
    return alanlar.some((alan) =>
      alan != null && String(alan).toLowerCase().includes(aramaMetni)
    );
  });

  if (siralamaAlani) {
    filtrelenmis.sort((a, b) => {
      const aVal = a[siralamaAlani];
      const bVal = b[siralamaAlani];
      let sonuc;
      if (aVal == null && bVal == null) sonuc = 0;
      else if (aVal == null) sonuc = 1;
      else if (bVal == null) sonuc = -1;
      else if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) sonuc = Number(aVal) - Number(bVal);
      else sonuc = String(aVal).localeCompare(String(bVal), "tr");
      return siralamaYonu === "asc" ? sonuc : -sonuc;
    });
  }

  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;
  const tbody = tablo.querySelector("tbody");
  if (!tbody) return;

  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  let siraNo = 1;

  for (let i = 0; i < filtrelenmis.length; i++) {
    const role = filtrelenmis[i];
    const satir = document.createElement("tr");

    // Row number
    const siraTd = document.createElement("td");
    siraTd.className = "td-sira";
    siraTd.textContent = siraNo++;
    satir.appendChild(siraTd);

    // Editable columns
    for (const col of EDITABLE_COLUMNS) {
      const td = document.createElement("td");
      const displayVal = col.getValue(role, kanalAdiFormati, shiftHesaplama);

      if (col.editable === false) {
        td.textContent = displayVal;
      } else {
        const span = document.createElement("span");
        span.className = "td-kanal-adi";
        span.contentEditable = "true";
        span.textContent = displayVal;
        span.spellcheck = false;
        span.addEventListener("blur", () => {
          const yeni = span.textContent.trim();
          if (yeni !== displayVal && callbacks?.onHucreDegistir) {
            callbacks.onHucreDegistir(i, col, yeni);
          }
        });
        span.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); span.blur(); }
          if (e.key === "Tab") {
            e.preventDefault();
            span.blur();
            // Focus next editable cell
            const nextCell = e.shiftKey
              ? td.previousElementSibling?.querySelector(".td-kanal-adi")
              : td.nextElementSibling?.querySelector(".td-kanal-adi");
            if (nextCell) { nextCell.focus(); selectAll(nextCell); }
          }
        });
        td.appendChild(span);
      }
      satir.appendChild(td);
    }

    // Delete button
    const islemTd = document.createElement("td");
    islemTd.className = "td-islem";
    const silBtn = document.createElement("button");
    silBtn.type = "button";
    silBtn.className = "btn-sil";
    silBtn.textContent = "\u00D7";
    silBtn.title = "Kanali kaldir";
    silBtn.addEventListener("click", () => {
      if (callbacks?.onSil) callbacks.onSil(i);
    });
    islemTd.appendChild(silBtn);
    satir.appendChild(islemTd);

    tbody.appendChild(satir);
  }

  // Empty channels
  if (bosKanallar && bosKanallar.length > 0) {
    for (const bk of bosKanallar) {
      const satir = document.createElement("tr");
      satir.className = "tr-bos-kanal";

      const siraTd = document.createElement("td");
      siraTd.className = "td-sira";
      siraTd.textContent = siraNo++;
      satir.appendChild(siraTd);

      const sutunlar = [
        bk.ad, bk.frekans, bk.frekans, bk.bant, bk.mod,
        "-", "-", "-", "-", "-", "Bos Kanal",
      ];
      for (const deger of sutunlar) {
        const hucre = document.createElement("td");
        hucre.textContent = deger;
        satir.appendChild(hucre);
      }

      const islemTd = document.createElement("td");
      islemTd.className = "td-islem";
      satir.appendChild(islemTd);
      tbody.appendChild(satir);
    }
  }

  // Update info
  const bilgiEl = document.getElementById("onizleme-bilgi");
  if (bilgiEl) {
    const bosAdet = bosKanallar?.length || 0;
    const parts = [`${filtrelenmis.length} role`];
    if (bosAdet > 0) parts.push(`${bosAdet} bos kanal`);
    bilgiEl.textContent = `(${parts.join(" + ")})`;
  }
}

function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export function tabloBasliklariAyarla() {
  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;

  const basliklar = tablo.querySelectorAll("th[data-alan]");
  basliklar.forEach((th) => {
    th.addEventListener("click", () => {
      const alan = th.dataset.alan;
      if (siralamaAlani === alan) {
        siralamaYonu = siralamaYonu === "asc" ? "desc" : "asc";
      } else {
        siralamaAlani = alan;
        siralamaYonu = "asc";
      }
      basliklar.forEach((b) => b.classList.remove("sort-asc", "sort-desc"));
      th.classList.add(siralamaYonu === "asc" ? "sort-asc" : "sort-desc");
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });
}
