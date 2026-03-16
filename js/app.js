import { roleleriGetir } from "./api.js";
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

let tumRoleler = [];
let filtrelenmisRoleler = [];
let seciliCihaz = "tyt-md-uv390-plus";

async function basla() {
  cihazSeciciDoldur();
  haritaBaslat();
  tabloBasliklariAyarla();
  dinleyicileriKur();

  try {
    const { data, fallback } = await roleleriGetir();
    tumRoleler = data;
    if (fallback) {
      bannerGoster(
        "warning",
        "API hatasi ile karsilasildi. Fallback surum kullanilmaktadir."
      );
    }
    sehirListesiDoldur();
    taBolgesiDoldur();
    uygula();
  } catch {
    bannerGoster(
      "error",
      "Sunucuya erisilemiyor. Lutfen internet baglantinizi kontrol edin."
    );
  }
}

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
    uygula();
  });
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
    modSelect.querySelectorAll("option").forEach((opt) => {
      if (opt.value === "hepsi" || opt.value === "dijital-oncelikli") return;
      const dijitalMod = opt.value.includes("dijital");
      const analogMod = opt.value.includes("analog");
      opt.disabled =
        (dijitalMod && !profil.modlar.includes("Dijital")) ||
        (analogMod && !profil.modlar.includes("Analog"));
    });
  }
}

function sehirListesiDoldur() {
  const container = document.getElementById("sehir-listesi");
  if (!container) return;
  const sehirler = benzersizSehirler(tumRoleler);

  while (container.firstChild) container.removeChild(container.firstChild);

  for (const s of sehirler) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.sehir = s;
    cb.checked = true;
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
  const ilceler = benzersizIlceler(tumRoleler, seciliSehirler);

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
  const bolgeler = benzersizTaBolgeleri(tumRoleler);

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

function uygula() {
  const profil = cihazProfili(seciliCihaz);
  if (!profil) return;

  const filtreler = filtreTopla();
  filtrelenmisRoleler = filtrele(tumRoleler, filtreler, profil);

  // Dijital oncelikli siralama
  if (filtreler.mod === "dijital-oncelikli") {
    filtrelenmisRoleler.sort((a, b) => {
      const da = a.digital === 1 || a.digital === 2 ? 0 : 1;
      const db = b.digital === 1 || b.digital === 2 ? 0 : 1;
      return da - db;
    });
  }

  const opsiyonlar = opsiyonTopla();

  tabloGuncelle(filtrelenmisRoleler, opsiyonlar.kanalAdiFormati, profil.shiftHesaplama);
  pinleriGuncelle(filtrelenmisRoleler);
  istatistikleriGuncelle();

  // maxKanal kontrolu
  const pmrSayisi =
    (opsiyonlar.pmrEkle ? 16 : 0) + (opsiyonlar.dpmrEkle ? 16 : 0);
  const toplamKanal = filtrelenmisRoleler.length + pmrSayisi;

  const indirBtn = document.getElementById("csv-indir-btn");
  const kanalSayisi = document.getElementById("kanal-sayisi");
  const maxUyari = document.getElementById("max-kanal-uyari");

  if (kanalSayisi) kanalSayisi.textContent = toplamKanal;

  if (toplamKanal > profil.maxKanal) {
    if (indirBtn) {
      indirBtn.classList.add("disabled");
      indirBtn.disabled = true;
    }
    if (maxUyari) {
      maxUyari.textContent = `Secili filtrelerle ${toplamKanal} kanal olusacak. ${profil.ad} maksimum ${profil.maxKanal} kanal destekler. Lutfen filtrelerinizi daraltin.`;
      maxUyari.style.display = "block";
    }
  } else {
    if (indirBtn) {
      indirBtn.classList.remove("disabled");
      indirBtn.disabled = false;
    }
    if (maxUyari) maxUyari.style.display = "none";
  }
}

function istatistikleriGuncelle() {
  const toplam = tumRoleler.length;
  const aktif = tumRoleler.filter((r) => r.durum === true).length;
  const pasif = toplam - aktif;
  const vhf = tumRoleler.filter((r) => r.bant === "VHF").length;
  const uhf = tumRoleler.filter((r) => r.bant === "UHF").length;
  const aprs = tumRoleler.filter((r) => r.bant === "APRS").length;
  const dijital = tumRoleler.filter(
    (r) => r.digital === 1 || r.digital === 2
  ).length;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("stat-toplam", toplam);
  set("stat-aktif", aktif);
  set("stat-pasif", pasif);
  set("stat-vhf", vhf);
  set("stat-uhf", uhf);
  set("stat-aprs", aprs);
  set("stat-dijital", dijital);
  set("stat-filtrelenmis", filtrelenmisRoleler.length);
}

function dinleyicileriKur() {
  document.addEventListener("filtre-degisti", () => uygula());

  const toggleIds = [
    "filtre-aktif",
    "filtre-ruhsat",
    "filtre-puan",
    "opsiyon-pmr",
    "opsiyon-dpmr",
    "opsiyon-rxonly",
  ];
  toggleIds.forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  ["mod-select", "guc-select", "kanal-format-select"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  document.querySelectorAll("input[data-bant]").forEach((cb) => {
    cb.addEventListener("change", () => {
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  });

  // Tablo arama
  document.getElementById("tablo-arama")?.addEventListener("input", () => {
    const profil = cihazProfili(seciliCihaz);
    const opsiyonlar = opsiyonTopla();
    tabloGuncelle(filtrelenmisRoleler, opsiyonlar.kanalAdiFormati, profil?.shiftHesaplama);
  });

  // Sehir arama
  document.getElementById("sehir-arama")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#sehir-listesi label").forEach((label) => {
      label.style.display = label.textContent.toLowerCase().includes(q)
        ? ""
        : "none";
    });
  });

  // Tumunu sec / temizle
  document
    .getElementById("sehir-tumunu-sec")
    ?.addEventListener("click", () => {
      document
        .querySelectorAll("input[data-sehir]")
        .forEach((cb) => (cb.checked = true));
      ilceListesiDoldur();
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });
  document.getElementById("sehir-temizle")?.addEventListener("click", () => {
    document
      .querySelectorAll("input[data-sehir]")
      .forEach((cb) => (cb.checked = false));
    ilceListesiDoldur();
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  });

  // CSV indir
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
  if (container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }
}

async function tekrarDene() {
  bannerGizle();
  try {
    const { data, fallback } = await roleleriGetir();
    tumRoleler = data;
    if (fallback) {
      bannerGoster(
        "warning",
        "API hatasi ile karsilasildi. Fallback surum kullanilmaktadir."
      );
    }
    sehirListesiDoldur();
    taBolgesiDoldur();
    uygula();
  } catch {
    bannerGoster(
      "error",
      "Sunucuya erisilemiyor. Lutfen internet baglantinizi kontrol edin."
    );
  }
}

document.addEventListener("DOMContentLoaded", basla);
