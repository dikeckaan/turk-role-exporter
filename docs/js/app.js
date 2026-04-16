/**
 * app.js
 * Main orchestrator — wires modules together and runs the app.
 */

import { state } from "./state.js";
import { cacheBilgisiGuncelle } from "./loading.js";
import { bannerGizle, bannerRetryCallbackAta } from "./banner.js";
import {
  kaynakAktifMi,
  kaynaklariMergeEt,
  amatortelsizcilikYukle,
  taroleYukle,
  kaynakDegisti,
} from "./data-sources.js";
import { cihazSeciciDoldur } from "./device-ui.js";
import {
  sehirListesiDoldur,
  taBolgesiDoldur,
  ilceListesiDoldur,
  filtreTopla,
  opsiyonTopla,
  fmBilgiGuncelle,
  getSeciliSehirler,
} from "./filter-ui.js";
import {
  sifreModaliGoster,
  sifreModaliKapat,
  sifreOnayla,
  korunanlariGuncelle,
} from "./auth-modal.js";
import { csvImport } from "./csv-import.js";
import { cihazProfili } from "./cihazlar.js";
import { filtrele } from "./filtreler.js";
import { csvSatirlarUret, csvStringOlustur, csvIndir, jsonOlustur, jsonIndir } from "./csv.js";
import { csvTabloGuncelle } from "./tablo.js";
import { haritaBaslat, pinleriGuncelle, sehirSeciminiSenkronla } from "./harita.js";
import { isDijital, sehirPlaka } from "./utils.js";
import { airbandGetir, marineGetir } from "./api.js";
import { airbandUiKur } from "./airband-ui.js";
import { marineUiKur } from "./marine-ui.js";
import { pingIfFirstVisit, recordDownload, loadStats, renderStatsPanel } from "./stats.js";
import { themeBaslat } from "./theme.js";
import { presetUiKur } from "./presets.js";
import { undoUiKur, undoKaydet, undoTemizle } from "./undo.js";

// ─── Boot ─────────────────────────────────────────────────

async function basla() {
  themeBaslat();

  // Register service worker for offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  cihazSeciciDoldur(uygula);
  await haritaBaslat();
  dinleyicileriKur();

  // Initialize undo/redo UI
  undoUiKur(document.getElementById("undo-redo-container"), state, csvTabloYenile);

  // Initialize preset UI
  presetUiKur(
    document.getElementById("preset-container"),
    filtreTopla,
    opsiyonTopla,
    () => state.seciliCihaz,
    (preset) => {
      // Load device
      const cihazSelect = document.getElementById("cihaz-select");
      if (cihazSelect && preset.cihaz) {
        cihazSelect.value = preset.cihaz;
        cihazSelect.dispatchEvent(new Event("change"));
      }
      // Apply options that are simple checkbox/select values
      const opts = preset.opsiyonlar || {};
      const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
      setCheck("opsiyon-pmr", opts.pmrEkle);
      setCheck("opsiyon-dpmr", opts.dpmrEkle);
      setCheck("opsiyon-fmradyo", opts.fmRadyoEkle);
      setCheck("opsiyon-simplex", opts.simplexEkle);
      setCheck("opsiyon-rxonly", opts.rxOnly);
      const gucSelect = document.getElementById("guc-select");
      if (gucSelect && opts.gucSeviyesi) gucSelect.value = opts.gucSeviyesi;
      const formatSelect = document.getElementById("kanal-format-select");
      if (formatSelect && opts.kanalAdiFormati) formatSelect.value = opts.kanalAdiFormati;
      // Restore airband/marine selections from preset + rebuild UI
      if (preset.airbandSecim) {
        state.airbandSecim = preset.airbandSecim;
        if (state.airbandData) airbandUiKur();
      }
      if (preset.marineSecim) {
        state.marineSecim = preset.marineSecim;
        if (state.marineData) marineUiKur();
      }
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    }
  );

  bannerRetryCallbackAta(async () => {
    bannerGizle();
    state.amatortelsizcilikYuklendi = false;
    state.taroleYuklendi = false;
    await amatortelsizcilikYukle();
    kaynaklariMergeEt();
    sehirListesiDoldur();
    taBolgesiDoldur();
    uygula();
    if (kaynakAktifMi("tarole")) taroleYukle();
  });

  let cacheInterval = setInterval(cacheBilgisiGuncelle, 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInterval(cacheInterval);
    } else {
      cacheBilgisiGuncelle();
      cacheInterval = setInterval(cacheBilgisiGuncelle, 1000);
    }
  });

  await amatortelsizcilikYukle();
  kaynaklariMergeEt();
  sehirListesiDoldur();
  taBolgesiDoldur();
  uygula();

  if (state.authToken) {
    try {
      const [ab, mb] = await Promise.all([
        airbandGetir(state.authToken),
        marineGetir(state.authToken),
      ]);
      state.airbandData = ab;
      state.marineData = mb;
      korunanlariGuncelle(true);
      if (state.airbandData) airbandUiKur();
      if (state.marineData) marineUiKur();
    } catch {
      state.authToken = null;
      sessionStorage.removeItem("authToken");
    }
  }

  if (kaynakAktifMi("tarole")) {
    await taroleYukle();
    kaynaklariMergeEt();
    sehirListesiDoldur();
    taBolgesiDoldur();
    uygula();
  }

  // Anonymous visitor stats — best-effort, never blocks the UI.
  const { visitorNumber } = await pingIfFirstVisit();
  const aggregated = await loadStats();
  renderStatsPanel("ziyaretci-stats", aggregated, visitorNumber);
}

// ─── Debounce Helper ──────────────────────────────────────

let _uygulaTimer = null;
function uygulaDebounced() {
  clearTimeout(_uygulaTimer);
  _uygulaTimer = setTimeout(uygula, 150);
}

// ─── Main Apply ───────────────────────────────────────────

function formatUyarisiKontrol(profil, opsiyonlar) {
  const uyarilar = [];
  const dijitalDestekli = profil.modlar.includes("Dijital");

  if (!dijitalDestekli) {
    if (opsiyonlar.dpmrEkle) uyarilar.push("dPMR kanallari eklendi ama bu cihaz dijital modlari desteklemiyor.");
    if (opsiyonlar.simplexEkle) uyarilar.push("Dijital simplex kanallari eklendi ama bu cihaz dijital modlari desteklemiyor.");
    if (opsiyonlar.bosDijitalAdet > 0) uyarilar.push("Bos dijital kanal eklendi ama bu cihaz dijital modlari desteklemiyor.");
  }

  const ek = profil.ekOzellikler || {};
  if (opsiyonlar.airbandEkle && !ek.airBand) uyarilar.push("Air Band kanallari eklendi ama bu cihaz air band desteklemiyor.");
  if (opsiyonlar.marineEkle && !ek.marineBand) uyarilar.push("Marine Band kanallari eklendi ama bu cihaz marine band desteklemiyor.");
  if (opsiyonlar.fmRadyoEkle && !ek.fmRadyo) uyarilar.push("FM radyo kanallari eklendi ama bu cihaz FM radyo desteklemiyor.");

  const el = document.getElementById("format-uyari");
  if (!el) return;
  if (uyarilar.length > 0) {
    el.textContent = uyarilar.join(" ");
    el.style.display = "block";
  } else {
    el.style.display = "none";
  }
}

function uygula() {
  const profil = cihazProfili(state.seciliCihaz);
  if (!profil) return;

  const filtreler = filtreTopla();
  state.filtrelenmisRoleler = filtrele(state.birlesikRoleler, filtreler, profil);

  state.filtrelenmisRoleler.sort((a, b) => {
    const plakaA = sehirPlaka(a.sehir);
    const plakaB = sehirPlaka(b.sehir);
    if (plakaA !== plakaB) return plakaA.localeCompare(plakaB, undefined, { numeric: true });
    return parseFloat(a.frekans || 0) - parseFloat(b.frekans || 0);
  });

  if (filtreler.mod === "dijital-oncelikli") {
    state.filtrelenmisRoleler.sort((a, b) => {
      const da = isDijital(a) ? 0 : 1;
      const db = isDijital(b) ? 0 : 1;
      if (da !== db) return da - db;
      const plakaA = sehirPlaka(a.sehir);
      const plakaB = sehirPlaka(b.sehir);
      if (plakaA !== plakaB) return plakaA.localeCompare(plakaB, undefined, { numeric: true });
      return parseFloat(a.frekans || 0) - parseFloat(b.frekans || 0);
    });
  }

  state.duzenlenmisRoleler = [...state.filtrelenmisRoleler];

  const opsiyonlar = opsiyonTopla();
  fmBilgiGuncelle();
  formatUyarisiKontrol(profil, opsiyonlar);

  const csvData = csvSatirlarUret(state.duzenlenmisRoleler, profil, opsiyonlar);
  state.csvBasliklar = csvData.basliklar;
  state.csvSatirlar = csvData.satirlar;
  undoTemizle();

  csvTabloGuncelle(state.csvBasliklar, state.csvSatirlar, csvTabloCallbacks());
  pinleriGuncelle(state.filtrelenmisRoleler);
  istatistikleriGuncelle();
  kanalSayisiGuncelle(profil);
}

function csvTabloCallbacks() {
  return {
    onSil: (index) => {
      undoKaydet(state.csvSatirlar);
      state.csvSatirlar.splice(index, 1);
      for (let i = 0; i < state.csvSatirlar.length; i++) {
        state.csvSatirlar[i][0] = String(i + 1);
      }
      csvTabloYenile();
    },
    onHucreDegistir: (rowIndex, colIndex, value) => {
      if (state.csvSatirlar[rowIndex]) {
        undoKaydet(state.csvSatirlar);
        state.csvSatirlar[rowIndex][colIndex] = value;
      }
    },
  };
}

function csvTabloYenile() {
  csvTabloGuncelle(state.csvBasliklar, state.csvSatirlar, csvTabloCallbacks());
  const profil = cihazProfili(state.seciliCihaz);
  if (profil) {
    const kanalSayisiEl = document.getElementById("kanal-sayisi");
    if (kanalSayisiEl) kanalSayisiEl.textContent = state.csvSatirlar.length;

    const maxUyari = document.getElementById("max-kanal-uyari");
    const indirBtn = document.getElementById("csv-indir-btn");
    if (state.csvSatirlar.length > profil.maxKanal) {
      if (indirBtn) { indirBtn.classList.add("disabled"); indirBtn.disabled = true; }
      if (maxUyari) {
        maxUyari.textContent = `${profil.ad} max ${profil.maxKanal} kanal. Toplam ${state.csvSatirlar.length} — ${state.csvSatirlar.length - profil.maxKanal} fazla!`;
        maxUyari.style.display = "block";
      }
    } else {
      if (indirBtn) { indirBtn.classList.remove("disabled"); indirBtn.disabled = false; }
      if (maxUyari) { maxUyari.textContent = ""; maxUyari.style.display = "none"; }
    }
  }
}

function kanalSayisiGuncelle(profil) {
  const toplamKanal = state.csvSatirlar.length;
  const indirBtn = document.getElementById("csv-indir-btn");
  const kanalSayisiEl = document.getElementById("kanal-sayisi");
  const maxUyari = document.getElementById("max-kanal-uyari");

  if (kanalSayisiEl) kanalSayisiEl.textContent = toplamKanal;

  if (toplamKanal > profil.maxKanal) {
    if (indirBtn) { indirBtn.classList.add("disabled"); indirBtn.disabled = true; }
    if (maxUyari) {
      const fazla = toplamKanal - profil.maxKanal;
      maxUyari.textContent = "";
      const baslik = document.createElement("div");
      const b1 = document.createElement("strong");
      b1.textContent = profil.ad;
      baslik.appendChild(b1);
      baslik.appendChild(document.createTextNode(" max "));
      const b2 = document.createElement("strong");
      b2.textContent = profil.maxKanal;
      baslik.appendChild(b2);
      baslik.appendChild(document.createTextNode(" kanal. Toplam "));
      const b3 = document.createElement("strong");
      b3.textContent = toplamKanal;
      baslik.appendChild(b3);
      baslik.appendChild(document.createTextNode(" — "));
      const b4 = document.createElement("strong");
      b4.textContent = fazla;
      baslik.appendChild(b4);
      baslik.appendChild(document.createTextNode(" fazla! Filtrelerden kanal sayisini azaltin."));
      maxUyari.appendChild(baslik);
      maxUyari.style.display = "block";
    }
  } else {
    if (indirBtn) { indirBtn.classList.remove("disabled"); indirBtn.disabled = false; }
    if (maxUyari) { maxUyari.textContent = ""; maxUyari.style.display = "none"; }
  }
}

function istatistikleriGuncelle() {
  const veri = state.birlesikRoleler;
  let aktif = 0, vhf = 0, uhf = 0, aprs = 0, dijital = 0;
  for (const r of veri) {
    if (r.durum === true) aktif++;
    if (r.bant === "VHF") vhf++;
    else if (r.bant === "UHF") uhf++;
    else if (r.bant === "APRS") aprs++;
    if (isDijital(r)) dijital++;
  }
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("stat-toplam", veri.length);
  set("stat-aktif", aktif);
  set("stat-pasif", veri.length - aktif);
  set("stat-vhf", vhf);
  set("stat-uhf", uhf);
  set("stat-aprs", aprs);
  set("stat-dijital", dijital);
  set("stat-tarole", state.taroleRoleler.length);
  set("stat-filtrelenmis", state.filtrelenmisRoleler.length);
}

// ─── Event Listeners ──────────────────────────────────────

function dinleyicileriKur() {
  document.addEventListener("filtre-degisti", () => uygulaDebounced());
  document.addEventListener("airband-secim-degisti", () => uygulaDebounced());
  document.addEventListener("marine-secim-degisti", () => uygulaDebounced());

  [
    "filtre-aktif", "filtre-ruhsat", "filtre-puan",
    "opsiyon-pmr", "opsiyon-dpmr", "opsiyon-fmradyo",
    "opsiyon-simplex", "opsiyon-rxonly",
    "opsiyon-pmr-rxonly", "opsiyon-dpmr-rxonly",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  document.getElementById("opsiyon-pmr")?.addEventListener("change", (e) => {
    const label = document.getElementById("opsiyon-pmr-rxonly-label");
    if (label) label.style.display = e.target.checked ? "" : "none";
  });
  document.getElementById("opsiyon-dpmr")?.addEventListener("change", (e) => {
    const label = document.getElementById("opsiyon-dpmr-rxonly-label");
    if (label) label.style.display = e.target.checked ? "" : "none";
  });

  ["bos-analog-adet", "bos-analog-frekans", "bos-dijital-adet", "bos-dijital-frekans"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  ["opsiyon-airband", "opsiyon-marine", "opsiyon-pmr", "opsiyon-dpmr"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", (e) => {
      if (e.target.checked && !state.authToken) {
        e.target.checked = false;
        sifreModaliGoster(id);
        return;
      }
      if (id === "opsiyon-airband") {
        const p = document.getElementById("airband-panel");
        if (p) p.style.display = e.target.checked ? "" : "none";
      }
      if (id === "opsiyon-marine") {
        const p = document.getElementById("marine-panel");
        if (p) p.style.display = e.target.checked ? "" : "none";
      }
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  document.getElementById("airband-overlay")?.addEventListener("click", () => {
    sifreModaliGoster("opsiyon-airband");
  });
  document.getElementById("marine-overlay")?.addEventListener("click", () => {
    sifreModaliGoster("opsiyon-marine");
  });
  document.getElementById("pmr-overlay")?.addEventListener("click", () => {
    sifreModaliGoster("opsiyon-pmr");
  });
  document.getElementById("dpmr-overlay")?.addEventListener("click", () => {
    sifreModaliGoster("opsiyon-dpmr");
  });

  document.getElementById("sifre-modal-kapat")?.addEventListener("click", sifreModaliKapat);
  document.getElementById("sifre-iptal")?.addEventListener("click", sifreModaliKapat);
  document.getElementById("sifre-onayla")?.addEventListener("click", sifreOnayla);
  document.getElementById("sifre-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sifreOnayla();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") sifreModaliKapat();
  });

  ["kaynak-amatortelsizcilik", "kaynak-tarole"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      kaynakDegisti(uygula, sehirListesiDoldur, taBolgesiDoldur);
    });
  });

  ["mod-select", "guc-select", "kanal-format-select"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  document.querySelectorAll("input[data-bant]").forEach((cb) => {
    cb.addEventListener("change", () => document.dispatchEvent(new CustomEvent("filtre-degisti")));
  });

  document.getElementById("tablo-arama")?.addEventListener("input", () => {
    csvTabloYenile();
  });

  document.getElementById("sehir-arama")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#sehir-listesi label").forEach((label) => {
      label.style.display = label.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });

  document.getElementById("sehir-tumunu-sec")?.addEventListener("click", () => {
    document.querySelectorAll("input[data-sehir]").forEach((cb) => (cb.checked = true));
    ilceListesiDoldur();
    sehirSeciminiSenkronla(getSeciliSehirler());
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  });

  document.getElementById("sehir-temizle")?.addEventListener("click", () => {
    document.querySelectorAll("input[data-sehir]").forEach((cb) => (cb.checked = false));
    ilceListesiDoldur();
    sehirSeciminiSenkronla(getSeciliSehirler());
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  });

  document.getElementById("csv-indir-btn")?.addEventListener("click", () => {
    if (state.csvBasliklar.length === 0 || state.csvSatirlar.length === 0) return;
    const opsiyonlar = opsiyonTopla();
    const format = document.getElementById("export-format")?.value || "csv";

    if (format === "json") {
      const json = jsonOlustur(state.csvBasliklar, state.csvSatirlar);
      let dosyaAdi = opsiyonlar.dosyaAdi.replace(/\.csv$/i, "") + ".json";
      jsonIndir(json, dosyaAdi);
    } else {
      const csv = csvStringOlustur(state.csvBasliklar, state.csvSatirlar);
      let dosyaAdi = opsiyonlar.dosyaAdi;
      if (!dosyaAdi.endsWith(".csv")) dosyaAdi += ".csv";
      csvIndir(csv, dosyaAdi);
    }
    recordDownload(state.seciliCihaz);
  });

  document.getElementById("csv-import-input")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    csvImport(file, csvTabloYenile);
    e.target.value = "";
  });
}

document.addEventListener("DOMContentLoaded", basla);
