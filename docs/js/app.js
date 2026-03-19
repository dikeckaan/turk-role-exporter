import { roleleriGetir, taroleRoleleriGetir, sifreDogrula, airbandGetir, marineGetir } from "./api.js";
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
  sehirSeciminiSenkronla,
} from "./harita.js";
import {
  ekKanalSayisi,
  kanalDagilimi,
  sehirdenFmKey,
} from "./frekanslar.js";
import { normalizeTurkce, isDijital } from "./utils.js";

// ─── State ────────────────────────────────────────────────
let amatortelsizcilikRoleler = [];
let taroleRoleler = [];
let birlesikRoleler = [];
let filtrelenmisRoleler = [];
let seciliCihaz = "quansheng-uv-k5-f4hwn";
let authToken = sessionStorage.getItem("authToken") || null;
let airbandData = null;
let marineData = null;

let amatortelsizcilikYuklendi = false;
let taroleYuklendi = false;
let amatortelsizcilikYuklenmeZamani = null;
let taroleYuklenmeZamani = null;
const CACHE_SURESI_MS = 4 * 60 * 60 * 1000; // 4 saat

// ─── Loading UI Helpers ───────────────────────────────────

function kalanCacheSuresi(yuklenmeZamani) {
  if (!yuklenmeZamani) return "";
  const kalan = CACHE_SURESI_MS - (Date.now() - yuklenmeZamani);
  if (kalan <= 0) return "yenilenecek";
  const saat = Math.floor(kalan / 3600000);
  const dk = Math.floor((kalan % 3600000) / 60000);
  const sn = Math.floor((kalan % 60000) / 1000);
  if (saat > 0) return `${saat}s ${dk}dk ${sn}sn sonra yenilenecek`;
  if (dk > 0) return `${dk}dk ${sn}sn sonra yenilenecek`;
  return `${sn}sn sonra yenilenecek`;
}

function cacheZamaniHesapla(cacheTime, age) {
  if (cacheTime) return new Date(cacheTime).getTime();
  if (age > 0) return Date.now() - age * 1000;
  return Date.now();
}

function cacheBilgisiGuncelle() {
  const elAmt = document.getElementById("cache-bilgi-amatortelsizcilik");
  const elTr = document.getElementById("cache-bilgi-tarole");
  if (elAmt && amatortelsizcilikYuklenmeZamani) {
    elAmt.textContent = `4 saatlik cache — ${kalanCacheSuresi(amatortelsizcilikYuklenmeZamani)}`;
  }
  if (elTr && taroleYuklenmeZamani) {
    elTr.textContent = `4 saatlik cache — ${kalanCacheSuresi(taroleYuklenmeZamani)}`;
  }
}

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
  await haritaBaslat();
  tabloBasliklariAyarla();
  dinleyicileriKur();

  // Update cache countdown every second (pause when tab hidden)
  let cacheInterval = setInterval(cacheBilgisiGuncelle, 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInterval(cacheInterval);
    } else {
      cacheBilgisiGuncelle();
      cacheInterval = setInterval(cacheBilgisiGuncelle, 1000);
    }
  });

  // Always load primary source
  await amatortelsizcilikYukle();

  // Restore auth session if token exists
  if (authToken) {
    try {
      const [ab, mb] = await Promise.all([
        airbandGetir(authToken),
        marineGetir(authToken),
      ]);
      airbandData = ab;
      marineData = mb;
      korunanlariGuncelle(true);
    } catch {
      authToken = null;
      sessionStorage.removeItem("authToken");
    }
  }

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
    const { data, fallback, cacheTime, age } = await roleleriGetir();
    amatortelsizcilikRoleler = data;
    amatortelsizcilikYuklendi = true;
    amatortelsizcilikYuklenmeZamani = cacheZamaniHesapla(cacheTime, age);


    const msg = fallback
      ? `✓ ${data.length} role (fallback)`
      : `✓ ${data.length} role yuklendi`;
    kaynakDurumGuncelle("amatortelsizcilik", "basarili", msg);
    cacheBilgisiGuncelle();

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
    const { data: taroleData, cacheTime, age } = await taroleRoleleriGetir();
    taroleRoleler = taroleData;
    taroleYuklendi = taroleRoleler.length > 0;

    if (taroleYuklendi) {
      taroleYuklenmeZamani = cacheZamaniHesapla(cacheTime, age);

      kaynakDurumGuncelle("tarole", "basarili", `✓ ${taroleRoleler.length} role yuklendi`);
      cacheBilgisiGuncelle();
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

// Official TRAC TA bölge assignments per city (default bölge)
const SEHIR_TABOLGE = {
  adana:"TA5",adiyaman:"TA8",afyon:"TA4",agri:"TA9",aksaray:"TA5",
  amasya:"TA6",ankara:"TA2",antalya:"TA4",ardahan:"TA9",artvin:"TA9",
  aydin:"TA4",balikesir:"TA3",bartin:"TA2",batman:"TA9",bayburt:"TA7",
  bilecik:"TA2",bingol:"TA8",bitlis:"TA9",bolu:"TA2",burdur:"TA4",
  bursa:"TA3",canakkale:"TA3",cankiri:"TA6",corum:"TA6",denizli:"TA4",
  diyarbakir:"TA8",duzce:"TA2",edirne:"TA1",elazig:"TA8",erzincan:"TA7",
  erzurum:"TA9",eskisehir:"TA2",gaziantep:"TA8",giresun:"TA7",
  gumushane:"TA7",hakkari:"TA9",hatay:"TA5",igdir:"TA9",isparta:"TA4",
  istanbul:"TA1",izmir:"TA3",kahramanmaras:"TA8",karabuk:"TA2",
  karaman:"TA5",kars:"TA9",kastamonu:"TA6",kayseri:"TA7",kilis:"TA8",
  kirikkale:"TA2",kirklareli:"TA1",kirsehir:"TA6",kocaeli:"TA2",
  konya:"TA5",kutahya:"TA4",malatya:"TA8",manisa:"TA3",mardin:"TA8",
  mersin:"TA5",mugla:"TA4",mus:"TA9",nevsehir:"TA5",nigde:"TA5",
  ordu:"TA7",osmaniye:"TA5",rize:"TA9",sakarya:"TA2",samsun:"TA6",
  sanliurfa:"TA8",siirt:"TA9",sinop:"TA6",sirnak:"TA8",sivas:"TA7",
  tekirdag:"TA1",tokat:"TA6",trabzon:"TA7",tunceli:"TA7",usak:"TA4",
  van:"TA9",yalova:"TA2",yozgat:"TA6",zonguldak:"TA2",
};

// Cities that officially span multiple TA regions
const COKLU_BOLGE = {
  istanbul: ["TA1", "TA2"],
  canakkale: ["TA1", "TA3"],
};

function dogruBolge(sehir, mevcutBolge) {
  const coklu = COKLU_BOLGE[sehir];
  if (coklu && coklu.includes(mevcutBolge)) return mevcutBolge;
  return SEHIR_TABOLGE[sehir] || mevcutBolge || "";
}

function kaynaklariMergeEt() {
  const sonuc = [];
  const gorulenFrekSehir = new Set();

  function ekle(role) {
    // Normalize sehir for Turkish char consistency
    const sehir = normalizeTurkce(role.sehir || role.city || "");

    // Fix tabolge from definitive mapping (respects multi-region cities)
    const duzeltilmisBolge = dogruBolge(sehir, role.tabolge);
    if (duzeltilmisBolge && role.tabolge !== duzeltilmisBolge) {
      role = Object.assign({}, role, { tabolge: duzeltilmisBolge });
    }
    if (sehir && role.sehir !== sehir) {
      role = Object.assign({}, role, { sehir });
    }

    const rawFrek = role.frekans || role.frequency || "";
    const frek = parseFloat(rawFrek) ? parseFloat(rawFrek).toFixed(5) : rawFrek;
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
  container.replaceChildren();
  for (const s of sehirler) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.sehir = s;
    // First load: all checked. Later: preserve state, new cities default checked
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

function ilceListesiDoldur() {
  const container = document.getElementById("ilce-listesi");
  if (!container) return;
  const seciliSehirler = getSeciliSehirler();
  const ilceler = benzersizIlceler(birlesikRoleler, seciliSehirler);
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

function taBolgesiDoldur() {
  const container = document.getElementById("ta-bolge-listesi");
  if (!container) return;
  const bolgeler = benzersizTaBolgeleri(birlesikRoleler);
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
    airbandData: airbandData,
    marineEkle: document.getElementById("opsiyon-marine")?.checked ?? false,
    marineData: marineData,
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
      const da = isDijital(a) ? 0 : 1;
      const db = isDijital(b) ? 0 : 1;
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
  set("stat-tarole", taroleRoleler.length);
  set("stat-filtrelenmis", filtrelenmisRoleler.length);
}

// ─── Password Modal ──────────────────────────────────────

function sifreModaliGoster(hedefCheckboxId) {
  const modal = document.getElementById("sifre-modal");
  const input = document.getElementById("sifre-input");
  const hata = document.getElementById("sifre-hata");
  if (!modal) return;

  hata.textContent = "";
  input.value = "";
  modal.style.display = "flex";
  input.focus();
  modal.dataset.hedef = hedefCheckboxId;
}

function sifreModaliKapat() {
  const modal = document.getElementById("sifre-modal");
  if (modal) modal.style.display = "none";
}

async function sifreOnayla() {
  const modal = document.getElementById("sifre-modal");
  const input = document.getElementById("sifre-input");
  const hata = document.getElementById("sifre-hata");
  const password = input?.value;

  if (!password) { hata.textContent = "Sifre bos olamaz"; return; }

  try {
    authToken = await sifreDogrula(password);
    sessionStorage.setItem("authToken", authToken);

    // Fetch both protected datasets
    const [ab, mb] = await Promise.all([
      airbandGetir(authToken),
      marineGetir(authToken),
    ]);
    airbandData = ab;
    marineData = mb;

    sifreModaliKapat();
    korunanlariGuncelle(true);

    // Enable the checkbox that triggered the modal
    const hedef = modal.dataset.hedef;
    if (hedef) {
      const cb = document.getElementById(hedef);
      if (cb) { cb.checked = true; }
    }
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  } catch (err) {
    hata.textContent = err.message || "Sifre hatasi";
    authToken = null;
    sessionStorage.removeItem("authToken");
  }
}

function korunanlariGuncelle(unlocked) {
  document.querySelectorAll(".protected-badge").forEach((el) => {
    if (unlocked) {
      el.textContent = "Acik";
      el.classList.add("protected-unlocked");
    } else {
      el.textContent = "Sifre";
      el.classList.remove("protected-unlocked");
    }
  });
}

// ─── Event Listeners ──────────────────────────────────────

function dinleyicileriKur() {
  document.addEventListener("filtre-degisti", () => uygula());

  [
    "filtre-aktif", "filtre-ruhsat", "filtre-puan",
    "opsiyon-pmr", "opsiyon-dpmr", "opsiyon-fmradyo",
    "opsiyon-simplex", "opsiyon-rxonly",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  // Password-gated Air Band / Marine Band
  ["opsiyon-airband", "opsiyon-marine"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", (e) => {
      if (e.target.checked && !authToken) {
        e.target.checked = false;
        sifreModaliGoster(id);
        return;
      }
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  // Modal buttons
  document.getElementById("sifre-modal-kapat")?.addEventListener("click", sifreModaliKapat);
  document.getElementById("sifre-iptal")?.addEventListener("click", sifreModaliKapat);
  document.getElementById("sifre-onayla")?.addEventListener("click", sifreOnayla);
  document.getElementById("sifre-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sifreOnayla();
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
  container.replaceChildren();
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
