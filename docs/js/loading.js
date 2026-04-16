/**
 * loading.js
 * Cache countdown and data source loading UI helpers.
 */

import { state, CACHE_SURESI_MS } from "./state.js";

export function kalanCacheSuresi(yuklenmeZamani) {
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

export function cacheZamaniHesapla(cacheTime, age) {
  if (cacheTime) return new Date(cacheTime).getTime();
  if (age > 0) return Date.now() - age * 1000;
  return Date.now();
}

export function cacheBilgisiGuncelle() {
  const elAmt = document.getElementById("cache-bilgi-amatortelsizcilik");
  const elTc = document.getElementById("cache-bilgi-telsizcilik");
  const elTr = document.getElementById("cache-bilgi-tarole");
  if (elAmt && state.amatortelsizcilikYuklenmeZamani) {
    elAmt.textContent = `4 saatlik cache — ${kalanCacheSuresi(state.amatortelsizcilikYuklenmeZamani)}`;
  }
  if (elTc && state.telsizcilikYuklenmeZamani) {
    elTc.textContent = `4 saatlik cache — ${kalanCacheSuresi(state.telsizcilikYuklenmeZamani)}`;
  }
  if (elTr && state.taroleYuklenmeZamani) {
    elTr.textContent = `4 saatlik cache — ${kalanCacheSuresi(state.taroleYuklenmeZamani)}`;
  }
}

export function kaynakDurumGuncelle(kaynak, durum, mesaj) {
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
