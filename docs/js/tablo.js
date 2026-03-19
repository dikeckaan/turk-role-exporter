import { puanHesapla, kanalAdiOlustur, txFrekansHesapla, isDijital } from "./utils.js";

let siralamaAlani = null;
let siralamaYonu = "asc";

/**
 * Updates the preview table with editable channel names and delete buttons.
 * @param {Array} roleler - Repeater list
 * @param {string} kanalAdiFormati - Channel name format
 * @param {object} shiftHesaplama - TX shift map
 * @param {object} [callbacks] - { onSil, onAdDegistir } callbacks
 * @param {Array} [bosKanallar] - Empty channels to append
 */
export function tabloGuncelle(roleler, kanalAdiFormati, shiftHesaplama, callbacks, bosKanallar) {
  const aramaInput = document.getElementById("tablo-arama");
  const aramaMetni = aramaInput ? aramaInput.value.toLowerCase() : "";

  const filtrelenmis = roleler.filter((role) => {
    if (!aramaMetni) return true;
    const alanlar = [
      role.sehir,
      role.ilce,
      role.konum,
      role.bant,
      role.frekans,
      role.tabolge,
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
      if (aVal == null && bVal == null) {
        sonuc = 0;
      } else if (aVal == null) {
        sonuc = 1;
      } else if (bVal == null) {
        sonuc = -1;
      } else if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        sonuc = Number(aVal) - Number(bVal);
      } else {
        sonuc = String(aVal).localeCompare(String(bVal), "tr");
      }

      return siralamaYonu === "asc" ? sonuc : -sonuc;
    });
  }

  const tablo = document.getElementById("onizleme-tablosu");
  if (!tablo) return;

  const tbody = tablo.querySelector("tbody");
  if (!tbody) return;

  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  let siraNo = 1;

  for (let i = 0; i < filtrelenmis.length; i++) {
    const role = filtrelenmis[i];
    const satir = document.createElement("tr");

    // Row number
    const siraTd = document.createElement("td");
    siraTd.className = "td-sira";
    siraTd.textContent = siraNo++;
    satir.appendChild(siraTd);

    // Editable channel name
    const kanalAdi = role.kanalAdiOverride || kanalAdiOlustur(role, kanalAdiFormati);
    const kanalTd = document.createElement("td");
    const kanalSpan = document.createElement("span");
    kanalSpan.className = "td-kanal-adi";
    kanalSpan.contentEditable = "true";
    kanalSpan.textContent = kanalAdi;
    kanalSpan.spellcheck = false;
    kanalSpan.addEventListener("blur", () => {
      const yeniAd = kanalSpan.textContent.trim();
      if (yeniAd && yeniAd !== kanalAdi && callbacks?.onAdDegistir) {
        callbacks.onAdDegistir(i, yeniAd);
      }
    });
    kanalSpan.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); kanalSpan.blur(); }
    });
    kanalTd.appendChild(kanalSpan);
    satir.appendChild(kanalTd);

    const sutunlar = [
      role.frekans || "-",
      txFrekansHesapla(role, shiftHesaplama) || "-",
      role.bant || "-",
      isDijital(role) ? "Dijital" : "Analog",
      role.guc ? role.guc + "W" : "-",
      role.yukseklik ? role.yukseklik + "m" : "-",
      puanHesapla(role) + "%",
      role.sehir || "-",
      role.ilce || "-",
      role.konum || "-",
    ];

    for (const deger of sutunlar) {
      const hucre = document.createElement("td");
      hucre.textContent = deger;
      satir.appendChild(hucre);
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
      if (callbacks?.onSil) {
        callbacks.onSil(i);
      }
    });
    islemTd.appendChild(silBtn);
    satir.appendChild(islemTd);

    tbody.appendChild(satir);
  }

  // Append empty channels
  if (bosKanallar && bosKanallar.length > 0) {
    for (let i = 0; i < bosKanallar.length; i++) {
      const bk = bosKanallar[i];
      const satir = document.createElement("tr");
      satir.className = "tr-bos-kanal";

      const siraTd = document.createElement("td");
      siraTd.className = "td-sira";
      siraTd.textContent = siraNo++;
      satir.appendChild(siraTd);

      const sutunlar = [
        bk.ad,
        bk.frekans,
        bk.frekans,
        bk.bant,
        bk.mod,
        "-",
        "-",
        "-",
        "-",
        "-",
        "Bos Kanal",
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

      basliklar.forEach((baslik) => {
        baslik.classList.remove("sort-asc", "sort-desc");
      });

      th.classList.add(siralamaYonu === "asc" ? "sort-asc" : "sort-desc");

      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });
}
