import { puanHesapla, kanalAdiOlustur, txFrekansHesapla, isDijital } from "./utils.js";

let siralamaAlani = null;
let siralamaYonu = "asc";

export function tabloGuncelle(roleler, kanalAdiFormati, shiftHesaplama) {
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

  for (const role of filtrelenmis) {
    const satir = document.createElement("tr");

    const sutunlar = [
      kanalAdiOlustur(role, kanalAdiFormati),
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

    tbody.appendChild(satir);
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
