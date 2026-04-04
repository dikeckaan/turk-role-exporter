/**
 * data-sources.js
 * Data source loading, merging, and TA bölge mapping.
 */

import { state } from "./state.js";
import { roleleriGetir, taroleRoleleriGetir } from "./api.js";
import { normalizeTurkce } from "./utils.js";
import { kaynakDurumGuncelle, cacheZamaniHesapla, cacheBilgisiGuncelle } from "./loading.js";
import { bannerGoster, bannerGizle } from "./banner.js";

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

export function kaynakAktifMi(kaynak) {
  if (kaynak === "amatortelsizcilik") {
    return document.getElementById("kaynak-amatortelsizcilik")?.checked ?? true;
  }
  if (kaynak === "tarole") {
    return document.getElementById("kaynak-tarole")?.checked ?? false;
  }
  return false;
}

export function kaynaklariMergeEt() {
  const sonuc = [];
  const gorulenFrekSehir = new Set();

  function ekle(role) {
    const sehir = normalizeTurkce(role.sehir || role.city || "");

    const duzeltilmisBolge = dogruBolge(sehir, role.tabolge);
    if (duzeltilmisBolge && role.tabolge !== duzeltilmisBolge) {
      role = Object.assign({}, role, { tabolge: duzeltilmisBolge });
    }
    if (sehir && role.sehir !== sehir) {
      role = Object.assign({}, role, { sehir });
    }

    const rawFrek = role.frekans || role.frequency || "";
    const parsed = parseFloat(rawFrek);
    const frek = !isNaN(parsed) ? parsed.toFixed(4) : rawFrek;
    const konum = normalizeTurkce(role.konum || "");
    const key = frek + "_" + sehir + "_" + konum;
    if (gorulenFrekSehir.has(key)) return;
    gorulenFrekSehir.add(key);
    sonuc.push(role);
  }

  if (kaynakAktifMi("amatortelsizcilik")) {
    for (const r of state.amatortelsizcilikRoleler) ekle(r);
  }
  if (kaynakAktifMi("tarole")) {
    for (const r of state.taroleRoleler) ekle(r);
  }

  state.birlesikRoleler = sonuc;
}

export async function amatortelsizcilikYukle() {
  kaynakDurumGuncelle("amatortelsizcilik", "yukleniyor", "Yukleniyor...");
  try {
    const { data, fallback, cacheTime, age } = await roleleriGetir();
    state.amatortelsizcilikRoleler = data;
    state.amatortelsizcilikYuklendi = true;
    state.amatortelsizcilikYuklenmeZamani = cacheZamaniHesapla(cacheTime, age);

    const msg = fallback
      ? `✓ ${data.length} role (fallback)`
      : `✓ ${data.length} role yuklendi`;
    kaynakDurumGuncelle("amatortelsizcilik", "basarili", msg);
    cacheBilgisiGuncelle();

    if (fallback) {
      bannerGoster("warning", "API hatasi — fallback surum kullaniliyor.");
    }
    return true;
  } catch {
    kaynakDurumGuncelle("amatortelsizcilik", "hata", "✕ Baglanti hatasi");
    bannerGoster("error", "Sunucuya erisilemiyor.");
    return false;
  }
}

export async function taroleYukle() {
  kaynakDurumGuncelle("tarole", "yukleniyor", "Yukleniyor... (bu islem yavas olabilir)");
  try {
    const { data: taroleData, cacheTime, age } = await taroleRoleleriGetir();
    state.taroleRoleler = taroleData;
    state.taroleYuklendi = state.taroleRoleler.length > 0;

    if (state.taroleYuklendi) {
      state.taroleYuklenmeZamani = cacheZamaniHesapla(cacheTime, age);
      kaynakDurumGuncelle("tarole", "basarili", `✓ ${state.taroleRoleler.length} role yuklendi`);
      cacheBilgisiGuncelle();
      return true;
    } else {
      kaynakDurumGuncelle("tarole", "hata", "✕ Veri bulunamadi");
      return false;
    }
  } catch {
    kaynakDurumGuncelle("tarole", "hata", "✕ Baglanti hatasi");
    return false;
  }
}

export async function kaynakDegisti(uygulaFn, sehirListeFn, taBolgeFn) {
  bannerGizle();

  if (kaynakAktifMi("amatortelsizcilik") && !state.amatortelsizcilikYuklendi) {
    await amatortelsizcilikYukle();
    kaynaklariMergeEt();
    sehirListeFn();
    taBolgeFn();
    uygulaFn();
    return;
  }

  if (!kaynakAktifMi("amatortelsizcilik")) {
    kaynakDurumGuncelle("amatortelsizcilik", "kapali", "");
  } else if (state.amatortelsizcilikYuklendi) {
    kaynakDurumGuncelle("amatortelsizcilik", "basarili", `✓ ${state.amatortelsizcilikRoleler.length} role`);
  }

  if (kaynakAktifMi("tarole")) {
    if (!state.taroleYuklendi) {
      taroleYukle().then((ok) => {
        if (ok) {
          kaynaklariMergeEt();
          sehirListeFn();
          taBolgeFn();
          uygulaFn();
        }
      });
    } else {
      kaynakDurumGuncelle("tarole", "basarili", `✓ ${state.taroleRoleler.length} role`);
    }
  } else {
    kaynakDurumGuncelle("tarole", "kapali", "");
  }

  kaynaklariMergeEt();
  sehirListeFn();
  taBolgeFn();
  uygulaFn();
}
