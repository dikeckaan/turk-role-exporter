/**
 * filter-ui.js
 * City, district, and TA region filter list population + getter helpers.
 */

import { state } from "./state.js";
import { benzersizSehirler, benzersizIlceler, benzersizTaBolgeleri } from "./filtreler.js";
import { bolgeSeciminiSenkronla, sehirSeciminiSenkronla } from "./harita.js";
import { sehirdenFmKey } from "./frekanslar.js";
import { secilenAirbandFrekanslari } from "./airband-ui.js";
import { secilenMarineFrekanslari } from "./marine-ui.js";

export function getSeciliSehirler() {
  return [...document.querySelectorAll("input[data-sehir]:checked")].map(
    (cb) => cb.dataset.sehir
  );
}

export function getSeciliIlceler() {
  return [...document.querySelectorAll("input[data-ilce]:checked")].map(
    (cb) => cb.dataset.ilce
  );
}

export function getSeciliTaBolgeleri() {
  return [...document.querySelectorAll("input[data-bolge]:checked")].map(
    (cb) => cb.dataset.bolge
  );
}

export function getSeciliBantlar() {
  return [...document.querySelectorAll("input[data-bant]:checked")].map(
    (cb) => cb.dataset.bant
  );
}

export function sehirListesiDoldur() {
  const container = document.getElementById("sehir-listesi");
  if (!container) return;
  const eskiCheckboxlar = [...document.querySelectorAll("input[data-sehir]")];
  const oncekiSecili = new Set(eskiCheckboxlar.filter((cb) => cb.checked).map((cb) => cb.dataset.sehir));
  const oncekiTumu = new Set(eskiCheckboxlar.map((cb) => cb.dataset.sehir));
  const sehirler = benzersizSehirler(state.birlesikRoleler);
  container.replaceChildren();
  for (const s of sehirler) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.sehir = s;
    cb.checked = oncekiTumu.size === 0 || oncekiSecili.has(s) || !oncekiTumu.has(s);
    cb.addEventListener("change", () => {
      ilceListesiDoldur();
      sehirSeciminiSenkronla(getSeciliSehirler());
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + s));
    container.appendChild(label);
  }
  ilceListesiDoldur();
}

export function ilceListesiDoldur() {
  const container = document.getElementById("ilce-listesi");
  if (!container) return;
  const seciliSehirler = getSeciliSehirler();
  const ilceler = benzersizIlceler(state.birlesikRoleler, seciliSehirler);
  container.replaceChildren();
  for (const i of ilceler) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.ilce = i;
    cb.checked = true;
    cb.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + i));
    container.appendChild(label);
  }
}

export function taBolgesiDoldur() {
  const container = document.getElementById("ta-bolge-listesi");
  if (!container) return;
  const bolgeler = benzersizTaBolgeleri(state.birlesikRoleler);
  container.replaceChildren();
  for (const b of bolgeler) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.bolge = b;
    cb.checked = true;
    cb.addEventListener("change", () => {
      const secili = getSeciliTaBolgeleri();
      bolgeSeciminiSenkronla(secili);
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + b));
    container.appendChild(label);
  }
}

export function fmSehirleriBelirle() {
  const seciliSehirler = getSeciliSehirler();
  const fmKeys = new Set();
  for (const sehir of seciliSehirler) {
    const key = sehirdenFmKey(sehir);
    if (key) fmKeys.add(key);
  }
  return [...fmKeys];
}

export function fmBilgiGuncelle() {
  const bilgiEl = document.getElementById("fm-sehir-bilgi");
  if (!bilgiEl) return;
  const fmCheckbox = document.getElementById("opsiyon-fmradyo");
  if (!fmCheckbox?.checked) { bilgiEl.textContent = ""; return; }
  const fmSehirler = fmSehirleriBelirle();
  if (fmSehirler.length === 0) {
    bilgiEl.textContent = "Secili sehirlerde FM verisi bulunamadi.";
  } else {
    bilgiEl.textContent = `FM: ${fmSehirler.join(", ")} (otomatik)`;
  }
}

export function filtreTopla() {
  return {
    sadeceAktif: document.getElementById("filtre-aktif")?.checked ?? true,
    sadeceRuhsatli: document.getElementById("filtre-ruhsat")?.checked ?? false,
    bantlar: getSeciliBantlar(),
    mod: document.getElementById("mod-select")?.value || "hepsi",
    taBolgeleri: getSeciliTaBolgeleri(),
    sehirler: getSeciliSehirler(),
    ilceler: getSeciliIlceler(),
    dusukPuanGizle: document.getElementById("filtre-puan")?.checked ?? false,
  };
}

export function opsiyonTopla() {
  return {
    pmrEkle: document.getElementById("opsiyon-pmr")?.checked ?? false,
    pmrRxOnly: document.getElementById("opsiyon-pmr-rxonly")?.checked ?? false,
    dpmrEkle: document.getElementById("opsiyon-dpmr")?.checked ?? false,
    dpmrRxOnly: document.getElementById("opsiyon-dpmr-rxonly")?.checked ?? false,
    fmRadyoEkle: document.getElementById("opsiyon-fmradyo")?.checked ?? false,
    fmSehirler: fmSehirleriBelirle(),
    airbandEkle: document.getElementById("opsiyon-airband")?.checked ?? false,
    airbandSecili: secilenAirbandFrekanslari(state.airbandData, state.airbandSecim),
    marineEkle: document.getElementById("opsiyon-marine")?.checked ?? false,
    marineSecili: secilenMarineFrekanslari(state.marineData, state.marineSecim),
    fmSimplexEkle: document.getElementById("opsiyon-fm-simplex")?.checked ?? false,
    fmSimplexSecim: state.fmSimplexSecim,
    dijitalSimplexEkle: document.getElementById("opsiyon-dijital-simplex")?.checked ?? false,
    dijitalSimplexSecim: state.dijitalSimplexSecim,
    rxOnly: document.getElementById("opsiyon-rxonly")?.checked ?? true,
    gucSeviyesi: document.getElementById("guc-select")?.value || "High",
    kanalAdiFormati:
      document.getElementById("kanal-format-select")?.value ||
      "plaka-konum-bant",
    dosyaAdi:
      document.getElementById("dosya-adi")?.value ||
      "roleler_programlama.csv",
    bosAnalogAdet: parseInt(document.getElementById("bos-analog-adet")?.value) || 0,
    bosAnalogFrekans: document.getElementById("bos-analog-frekans")?.value || "145.500",
    bosDijitalAdet: parseInt(document.getElementById("bos-dijital-adet")?.value) || 0,
    bosDijitalFrekans: document.getElementById("bos-dijital-frekans")?.value || "438.500",
  };
}
