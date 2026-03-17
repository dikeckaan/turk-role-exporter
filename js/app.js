import { roleleriGetir, taroleRoleleriGetir } from "./api.js";
import { cihazListesi, cihazProfili } from "./cihazlar.js";
import {
  filtrele,
  benzersizSehirler,
  benzersizIlceler,
  benzersizTaBolgeleri,
} from "./filtreler.js";
import { csvOlustur, csvIndir } from "./csv.js";
import { tabloGuncelle, tabloBasliklariAyarla } from "./tablo.js";
import {
  haritaBaslat,
  pinleriGuncelle,
  bolgeSeciminiSenkronla,
} from "./harita.js";
import {
  ekKanalSayisi,
  kanalDagilimi,
  sehirdenFmKey,
} from "./frekanslar.js";

// ─── State ────────────────────────────────────────────────
let amatortelsizcilikRoleler = [];
let taroleRoleler = [];
let birlesikRoleler = [];
let filtrelenmisRoleler = [];
let seciliCihaz = "quansheng-uv-k5-f4hwn";

let amatortelsizcilikYuklendi = false;
let taroleYuklendi = false;

// ─── Loading UI Helpers ───────────────────────────────────

function kaynakDurumGuncelle(kaynak, durum, mesaj) {
  const durumEl = document.getElementById(`kaynak-${kaynak}-durum`);
  const progressEl = document.getElementById(`kaynak-${kaynak}-progress`);
  const fillEl = progressEl?.querySelector(".progress-fill");

  if (durumEl) {
    durumEl.textContent = mesaj || "";
    durumEl.className = "kaynak-durum";
    if (durum === "yukleniyor") durumEl.classList.add("yukleniyor");
    else if (durum === "basarili") durumEl.classList.add("basarili");
    else if (durum === "hata") durumEl.classList.add("hata");
  }

  if (progressEl && fillEl) {
    if (durum === "yukleniyor") {
      progressEl.style.display = "";
      fillEl.classList.add("indeterminate");
      fillEl.style.width = "";
    } else if (durum === "basarili") {
      fillEl.classList.remove("indeterminate");
      fillEl.style.width = "100%";
      setTimeout(() => { progressEl.style.display = "none"; }, 2000);
    } else if (durum === "hata") {
      fillEl.classList.remove("indeterminate");
      fillEl.style.width = "0%";
      progressEl.style.display = "none";
    } else {
      progressEl.style.display = "none";
      fillEl.classList.remove("indeterminate");
      fillEl.style.width = "0%";
    }
  }
}

// ─── Boot ─────────────────────────────────────────────────

async function basla() {
  cihazSeciciDoldur();
  haritaBaslat();
  tabloBasliklariAyarla();
  dinleyicileriKur();

  // Always load primary source
  await amatortelsizcilikYukle();

  // If ta-role toggle is on at start, load it too
  if (kaynakAktifMi("tarole")) {
    taroleYukle();
  }
}

// ─── Data Source Management ─────────────────────────────────

function kaynakAktifMi(kaynak) {
  if (kaynak === "amatortelsizcilik") {
    return document.getElementById("kaynak-amatortelsizcilik")?.checked ?? true;
  }
  if (kaynak === "tarole") {
    return document.getElementById("kaynak-tarole")?.checked ?? false;
  }
  return false;
}

async function amatortelsizcilikYukle() {
  kaynakDurumGuncelle("amatortelsizcilik", "yukleniyor", "Yukleniyor...");
  try {
    const { data, fallback } = await roleleriGetir();
    amatortelsizcilikRoleler = data;
    amatortelsizcilikYuklendi = true;

    const msg = fallback
      ? `✓ ${data.length} role (fallback)`
      : `✓ ${data.length} role yuklendi`;
    kaynakDurumGuncelle("amatortelsizcilik", "basarili", msg);

    if (fallback) {
      bannerGoster("warning", "API hatasi — fallback surum kullaniliyor.");
    }

    kaynaklariMergeEt();
    sehirListesiDoldur();
    taBolgesiDoldur();
    uygula();
  } catch {
    kaynakDurumGuncelle("amatortelsizcilik", "hata", "✕ Baglanti hatasi");
    bannerGoster("error", "Sunucuya erisilemiyor.");
  }
}

async function taroleYukle() {
  kaynakDurumGuncelle("tarole", "yukleniyor", "Yukleniyor... (bu islem yavas olabilir)");
  try {
    taroleRoleler = await taroleRoleleriGetir();
    taroleYuklendi = taroleRoleler.length > 0;

    if (taroleYuklendi) {
      kaynakDurumGuncelle("tarole", "basarili", `✓ ${taroleRoleler.length} role yuklendi`);
      kaynaklariMergeEt();
      sehirListesiDoldur();
      taBolgesiDoldur();
      uygula();
    } else {
      kaynakDurumGuncelle("tarole", "hata", "✕ Veri bulunamadi");
    }
  } catch {
    kaynakDurumGuncelle("tarole", "hata", "✕ Baglanti hatasi");
  }
}

function kaynaklariMergeEt() {
  const sonuc = [];
  const gorulenFrekSehir = new Set();

  function ekle(role) {
    const frek = role.frekans || role.frequency || "";
    const sehir = (role.sehir || role.city || "").toLowerCase();
    const key = frek + "_" + sehir;
    if (gorulenFrekSehir.has(key)) return;
    gorulenFrekSehir.add(key);
    sonuc.push(role);
  }

  // amatortelsizcilik first — naming priority
  if (kaynakAktifMi("amatortelsizcilik")) {
    for (const r of amatortelsizcilikRoleler) ekle(r);
  }

  // tarole second — only adds entries not already in amatortelsizcilik
  if (kaynakAktifMi("tarole")) {
    for (const r of taroleRoleler) ekle(r);
  }

  birlesikRoleler = sonuc;
  istatistikleriGuncelle();
}

async function kaynakDegisti() {
  bannerGizle();

  if (kaynakAktifMi("amatortelsizcilik") && !amatortelsizcilikYuklendi) {
    await amatortelsizcilikYukle();
    return;
  }

  if (!kaynakAktifMi("amatortelsizcilik")) {
    kaynakDurumGuncelle("amatortelsizcilik", "kapali", "");
  } else if (amatortelsizcilikYuklendi) {
    kaynakDurumGuncelle("amatortelsizcilik", "basarili", `✓ ${amatortelsizcilikRoleler.length} role`);
  }

  if (kaynakAktifMi("tarole")) {
    if (!taroleYuklendi) {
      taroleYukle(); // async — will merge+uygula when done
    } else {
      kaynakDurumGuncelle("tarole", "basarili", `✓ ${taroleRoleler.length} role`);
    }
  } else {
    kaynakDurumGuncelle("tarole", "kapali", "");
  }

  kaynaklariMergeEt();
  sehirListesiDoldur();
  taBolgesiDoldur();
  uygula();
}

// ─── FM Auto-detect from city filter ───────────────────────

function fmSehirleriBelirle() {
  const seciliSehirler = getSeciliSehirler();
  const fmKeys = new Set();
  for (const sehir of seciliSehirler) {
    const key = sehirdenFmKey(sehir);
    if (key) fmKeys.add(key);
  }
  return [...fmKeys];
}

function fmBilgiGuncelle() {
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

// ─── Device Setup ─────────────────────────────────────────

function cihazSeciciDoldur() {
  const select = document.getElementById("cihaz-select");
  if (!select) return;
  for (const c of cihazListesi()) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.ad;
    select.appendChild(opt);
  }
  select.value = seciliCihaz;
  select.addEventListener("change", (e) => {
    seciliCihaz = e.target.value;
    cihazFiltreleriGuncelle();
    cihazBilgiGuncelle();
    gucSeciciGuncelle();
    cihazOpsiyonlariGuncelle();
    uygula();
  });
  cihazFiltreleriGuncelle();
  cihazBilgiGuncelle();
  gucSeciciGuncelle();
  cihazOpsiyonlariGuncelle();
}

function cihazFiltreleriGuncelle() {
  const profil = cihazProfili(seciliCihaz);
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

function cihazBilgiGuncelle() {
  const profil = cihazProfili(seciliCihaz);
  const card = document.getElementById("cihaz-bilgi");
  if (!card || !profil) { if (card) card.style.display = "none"; return; }

  card.style.display = "block";

  const adEl = document.getElementById("cihaz-bilgi-ad");
  if (adEl) adEl.textContent = profil.ad;

  const formatEl = document.getElementById("cihaz-bilgi-format");
  if (formatEl) {
    formatEl.textContent = profil.csvFormat === "chirp" ? "CHIRP" : "CPS";
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

function gucSeciciGuncelle() {
  const profil = cihazProfili(seciliCihaz);
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

function cihazOpsiyonlariGuncelle() {
  const profil = cihazProfili(seciliCihaz);
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
  goster("opsiyon-simplex-group", true); // always visible
}

// ─── Filter Lists ─────────────────────────────────────────

function sehirListesiDoldur() {
  const container = document.getElementById("sehir-listesi");
  if (!container) return;
  const eskiCheckboxlar = [...document.querySelectorAll("input[data-sehir]")];
  const oncekiSecili = new Set(eskiCheckboxlar.filter((cb) => cb.checked).map((cb) => cb.dataset.sehir));
  const oncekiTumu = new Set(eskiCheckboxlar.map((cb) => cb.dataset.sehir));
  const sehirler = benzersizSehirler(birlesikRoleler);
  while (container.firstChild) container.removeChild(container.firstChild);
  for (const s of sehirler) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.sehir = s;
    // First load: all checked. Later: preserve state, new cities default checked
    cb.checked = oncekiTumu.size === 0 || oncekiSecili.has(s) || !oncekiTumu.has(s);
    cb.addEventListener("change", () => {
      ilceListesiDoldur();
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + s));
    container.appendChild(label);
  }
  ilceListesiDoldur();
}

function ilceListesiDoldur() {
  const container = document.getElementById("ilce-listesi");
  if (!container) return;
  const seciliSehirler = getSeciliSehirler();
  const ilceler = benzersizIlceler(birlesikRoleler, seciliSehirler);
  while (container.firstChild) container.removeChild(container.firstChild);
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

function taBolgesiDoldur() {
  const container = document.getElementById("ta-bolge-listesi");
  if (!container) return;
  const bolgeler = benzersizTaBolgeleri(birlesikRoleler);
  while (container.firstChild) container.removeChild(container.firstChild);
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

// ─── Getters ──────────────────────────────────────────────

function getSeciliSehirler() {
  return [...document.querySelectorAll("input[data-sehir]:checked")].map(
    (cb) => cb.dataset.sehir
  );
}

function getSeciliIlceler() {
  return [...document.querySelectorAll("input[data-ilce]:checked")].map(
    (cb) => cb.dataset.ilce
  );
}

function getSeciliTaBolgeleri() {
  return [...document.querySelectorAll("input[data-bolge]:checked")].map(
    (cb) => cb.dataset.bolge
  );
}

function getSeciliBantlar() {
  return [...document.querySelectorAll("input[data-bant]:checked")].map(
    (cb) => cb.dataset.bant
  );
}

// ─── Option Collection ────────────────────────────────────

function filtreTopla() {
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

function opsiyonTopla() {
  return {
    pmrEkle: document.getElementById("opsiyon-pmr")?.checked ?? false,
    dpmrEkle: document.getElementById("opsiyon-dpmr")?.checked ?? false,
    fmRadyoEkle: document.getElementById("opsiyon-fmradyo")?.checked ?? false,
    fmSehirler: fmSehirleriBelirle(),
    airbandEkle: document.getElementById("opsiyon-airband")?.checked ?? false,
    marineEkle: document.getElementById("opsiyon-marine")?.checked ?? false,
    simplexEkle: document.getElementById("opsiyon-simplex")?.checked ?? false,
    rxOnly: document.getElementById("opsiyon-rxonly")?.checked ?? true,
    gucSeviyesi: document.getElementById("guc-select")?.value || "High",
    kanalAdiFormati:
      document.getElementById("kanal-format-select")?.value ||
      "plaka-konum-bant",
    dosyaAdi:
      document.getElementById("dosya-adi")?.value ||
      "roleler_programlama.csv",
  };
}

// ─── Main Apply ───────────────────────────────────────────

function uygula() {
  const profil = cihazProfili(seciliCihaz);
  if (!profil) return;

  const filtreler = filtreTopla();
  filtrelenmisRoleler = filtrele(birlesikRoleler, filtreler, profil);

  if (filtreler.mod === "dijital-oncelikli") {
    filtrelenmisRoleler.sort((a, b) => {
      const da = a.digital === 1 || a.digital === 2 ? 0 : 1;
      const db = b.digital === 1 || b.digital === 2 ? 0 : 1;
      return da - db;
    });
  }

  const opsiyonlar = opsiyonTopla();
  fmBilgiGuncelle();

  tabloGuncelle(filtrelenmisRoleler, opsiyonlar.kanalAdiFormati, profil.shiftHesaplama);
  pinleriGuncelle(filtrelenmisRoleler);
  istatistikleriGuncelle();

  // Channel limit check
  const ekSayisi = ekKanalSayisi(opsiyonlar);
  const toplamKanal = filtrelenmisRoleler.length + ekSayisi;

  const indirBtn = document.getElementById("csv-indir-btn");
  const kanalSayisiEl = document.getElementById("kanal-sayisi");
  const maxUyari = document.getElementById("max-kanal-uyari");

  if (kanalSayisiEl) kanalSayisiEl.textContent = toplamKanal;

  if (toplamKanal > profil.maxKanal) {
    if (indirBtn) { indirBtn.classList.add("disabled"); indirBtn.disabled = true; }
    if (maxUyari) {
      const fazla = toplamKanal - profil.maxKanal;
      const dagilim = kanalDagilimi(filtrelenmisRoleler.length, opsiyonlar);
      let html = `<strong>${profil.ad}</strong> max <strong>${profil.maxKanal}</strong> kanal. `;
      html += `Toplam <strong>${toplamKanal}</strong> — <strong>${fazla}</strong> fazla!`;
      html += `<div class="kanal-dagilimi"><div class="kanal-dagilimi-baslik">Kanal Dagilimi:</div>`;
      for (const item of dagilim) {
        html += `<div class="kanal-dagilimi-satir">`;
        html += `<span class="kanal-ad">${item.ad}${item.zorunlu ? "" : " ✕"}</span>`;
        html += `<span class="kanal-sayi">${item.sayi}</span></div>`;
      }
      html += `<div class="kanal-dagilimi-toplam"><span>Toplam</span>`;
      html += `<span>${toplamKanal} / ${profil.maxKanal}</span></div></div>`;
      maxUyari.innerHTML = html;
      maxUyari.style.display = "block";
    }
  } else {
    if (indirBtn) { indirBtn.classList.remove("disabled"); indirBtn.disabled = false; }
    if (maxUyari) { maxUyari.innerHTML = ""; maxUyari.style.display = "none"; }
  }
}

function istatistikleriGuncelle() {
  const veri = birlesikRoleler;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("stat-toplam", veri.length);
  set("stat-aktif", veri.filter((r) => r.durum === true).length);
  set("stat-pasif", veri.filter((r) => r.durum !== true).length);
  set("stat-vhf", veri.filter((r) => r.bant === "VHF").length);
  set("stat-uhf", veri.filter((r) => r.bant === "UHF").length);
  set("stat-aprs", veri.filter((r) => r.bant === "APRS").length);
  set("stat-dijital", veri.filter((r) => r.digital === 1 || r.digital === 2).length);
  set("stat-tarole", taroleRoleler.length);
  set("stat-filtrelenmis", filtrelenmisRoleler.length);
}

// ─── Event Listeners ──────────────────────────────────────

function dinleyicileriKur() {
  document.addEventListener("filtre-degisti", () => uygula());

  [
    "filtre-aktif", "filtre-ruhsat", "filtre-puan",
    "opsiyon-pmr", "opsiyon-dpmr", "opsiyon-fmradyo",
    "opsiyon-airband", "opsiyon-marine", "opsiyon-simplex", "opsiyon-rxonly",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  // Data source toggles
  ["kaynak-amatortelsizcilik", "kaynak-tarole"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => kaynakDegisti());
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
    const profil = cihazProfili(seciliCihaz);
    const opsiyonlar = opsiyonTopla();
    tabloGuncelle(filtrelenmisRoleler, opsiyonlar.kanalAdiFormati, profil?.shiftHesaplama);
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
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  });

  document.getElementById("sehir-temizle")?.addEventListener("click", () => {
    document.querySelectorAll("input[data-sehir]").forEach((cb) => (cb.checked = false));
    ilceListesiDoldur();
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  });

  document.getElementById("csv-indir-btn")?.addEventListener("click", () => {
    const profil = cihazProfili(seciliCihaz);
    if (!profil) return;
    const opsiyonlar = opsiyonTopla();
    const csv = csvOlustur(filtrelenmisRoleler, profil, opsiyonlar);
    let dosyaAdi = opsiyonlar.dosyaAdi;
    if (!dosyaAdi.endsWith(".csv")) dosyaAdi += ".csv";
    csvIndir(csv, dosyaAdi);
  });
}

// ─── Banner ───────────────────────────────────────────────

function bannerGoster(tip, mesaj) {
  const container = document.getElementById("banner-container");
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
  const banner = document.createElement("div");
  banner.className = "banner banner-" + tip;
  const span = document.createElement("span");
  span.textContent = mesaj;
  banner.appendChild(span);
  const btn = document.createElement("button");
  btn.className = "btn-secondary";
  btn.textContent = "Tekrar Dene";
  btn.addEventListener("click", tekrarDene);
  banner.appendChild(btn);
  container.appendChild(banner);
}

function bannerGizle() {
  const container = document.getElementById("banner-container");
  if (container) while (container.firstChild) container.removeChild(container.firstChild);
}

async function tekrarDene() {
  bannerGizle();
  amatortelsizcilikYuklendi = false;
  taroleYuklendi = false;
  await amatortelsizcilikYukle();
  if (kaynakAktifMi("tarole")) taroleYukle();
}

document.addEventListener("DOMContentLoaded", basla);
