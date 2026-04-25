/**
 * device-ui.js
 * Device selector, info card, power selector, and device-specific option visibility.
 */

import { state } from "./state.js";
import { cihazListesi, cihazProfili } from "./cihazlar.js";

export function cihazSeciciDoldur(onChangeFn) {
  const select = document.getElementById("cihaz-select");
  if (!select) return;
  for (const c of cihazListesi()) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.ad;
    select.appendChild(opt);
  }
  select.value = state.seciliCihaz;
  select.addEventListener("change", (e) => {
    state.seciliCihaz = e.target.value;
    cihazFiltreleriGuncelle();
    cihazBilgiGuncelle();
    gucSeciciGuncelle();
    cihazOpsiyonlariGuncelle();
    onChangeFn();
  });
  cihazFiltreleriGuncelle();
  cihazBilgiGuncelle();
  gucSeciciGuncelle();
  cihazOpsiyonlariGuncelle();
}

export function cihazFiltreleriGuncelle() {
  const profil = cihazProfili(state.seciliCihaz);
  if (!profil) return;

  document.querySelectorAll("input[data-bant]").forEach((cb) => {
    const destekli = profil.bantlar.includes(cb.dataset.bant);
    cb.disabled = !destekli;
    if (!destekli) cb.checked = false;
  });

  const modSelect = document.getElementById("mod-select");
  if (modSelect) {
    const dijitalDestekli = profil.modlar.includes("Dijital");
    modSelect.querySelectorAll("option").forEach((opt) => {
      if (opt.value === "hepsi") return;
      if (opt.value === "dijital-oncelikli" || opt.value === "sadece-dijital") {
        opt.disabled = !dijitalDestekli;
      } else if (opt.value === "sadece-analog") {
        opt.disabled = !profil.modlar.includes("Analog");
      }
    });
    if (!dijitalDestekli && (modSelect.value === "sadece-dijital" || modSelect.value === "dijital-oncelikli")) {
      modSelect.value = "hepsi";
    }
  }
}

export function cihazBilgiGuncelle() {
  const profil = cihazProfili(state.seciliCihaz);
  const card = document.getElementById("cihaz-bilgi");
  if (!card || !profil) { if (card) card.style.display = "none"; return; }

  card.style.display = "block";

  const adEl = document.getElementById("cihaz-bilgi-ad");
  if (adEl) adEl.textContent = profil.ad;

  const formatEl = document.getElementById("cihaz-bilgi-format");
  if (formatEl) {
    formatEl.textContent = profil.csvFormat === "chirp" ? "CHIRP"
      : profil.csvFormat === "opengd77" ? "OpenGD77"
      : "CPS";
    formatEl.className = "device-info-format format-" + profil.csvFormat;
  }

  const aciklamaEl = document.getElementById("cihaz-bilgi-aciklama");
  if (aciklamaEl) aciklamaEl.textContent = profil.aciklama || "";

  const ozelliklerEl = document.getElementById("cihaz-bilgi-ozellikler");
  if (ozelliklerEl) {
    while (ozelliklerEl.firstChild) ozelliklerEl.removeChild(ozelliklerEl.firstChild);
    const specs = [];
    specs.push({ label: "Max Kanal", value: String(profil.maxKanal) });
    specs.push({ label: "Bantlar", value: profil.bantlar.join(", ") });
    specs.push({ label: "Modlar", value: profil.modlar.join(", ") });
    const ek = profil.ekOzellikler;
    if (ek) {
      if (ek.genisRX) specs.push({ label: "RX Aralik", value: ek.genisRX });
      if (ek.txBant) specs.push({ label: "TX Aralik", value: ek.txBant });
      if (ek.fmRadyo) specs.push({ label: "FM Radyo", value: "Var" });
      if (ek.airBand) specs.push({ label: "Air Band", value: "Var" });
      if (ek.marineBand) specs.push({ label: "Marine Band", value: "Var" });
      if (ek.bandscope) specs.push({ label: "Bandscope", value: "Var" });
      if (ek.ssbDemod) specs.push({ label: "SSB Demod", value: "Var" });
    }
    for (const s of specs) {
      const tag = document.createElement("div");
      tag.className = "device-spec-tag";
      const labelSpan = document.createElement("span");
      labelSpan.className = "spec-label";
      labelSpan.textContent = s.label;
      const valueSpan = document.createElement("span");
      valueSpan.className = "spec-value";
      valueSpan.textContent = s.value;
      tag.appendChild(labelSpan);
      tag.appendChild(valueSpan);
      ozelliklerEl.appendChild(tag);
    }
  }
}

export function gucSeciciGuncelle() {
  const profil = cihazProfili(state.seciliCihaz);
  const select = document.getElementById("guc-select");
  if (!select || !profil) return;
  const oncekiDeger = select.value;
  while (select.firstChild) select.removeChild(select.firstChild);
  for (const key of Object.keys(profil.gucSeviyeleri)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = key + " (" + profil.gucSeviyeleri[key] + ")";
    select.appendChild(opt);
  }
  if ([...select.options].some((o) => o.value === oncekiDeger)) {
    select.value = oncekiDeger;
  }
}

export function cihazOpsiyonlariGuncelle() {
  const profil = cihazProfili(state.seciliCihaz);
  if (!profil) return;

  const dijitalVar = profil.modlar.includes("Dijital");
  const ek = profil.ekOzellikler || {};

  const goster = (id, kosul) => {
    const el = document.getElementById(id);
    if (el) el.style.display = kosul ? "" : "none";
  };

  goster("opsiyon-dpmr-group", dijitalVar);
  goster("opsiyon-fmradyo-group", ek.fmRadyo);
  goster("opsiyon-airband-group", ek.airBand);
  goster("opsiyon-marine-group", ek.marineBand);
  goster("opsiyon-fm-simplex-group", true);
  goster("opsiyon-dijital-simplex-group", true);
  goster("bos-dijital-satir", dijitalVar);

  const formatSelect = document.getElementById("kanal-format-select");
  if (formatSelect) {
    formatSelect.value = profil.varsayilanKanalFormati || "plaka-konum-bant";
  }
}
