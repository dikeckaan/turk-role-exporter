/**
 * auth-modal.js
 * Password modal for protected channels (Air Band / Marine Band).
 */

import { state } from "./state.js";
import { sifreDogrula, airbandGetir, marineGetir } from "./api.js";
import { airbandUiKur } from "./airband-ui.js";
import { marineUiKur } from "./marine-ui.js";

export function sifreModaliGoster(hedefCheckboxId) {
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

export function sifreModaliKapat() {
  const modal = document.getElementById("sifre-modal");
  if (modal) modal.style.display = "none";
}

export async function sifreOnayla() {
  const modal = document.getElementById("sifre-modal");
  const input = document.getElementById("sifre-input");
  const hata = document.getElementById("sifre-hata");
  const password = input?.value;

  if (!password) { hata.textContent = "Sifre bos olamaz"; return; }

  try {
    state.authToken = await sifreDogrula(password);
    sessionStorage.setItem("authToken", state.authToken);

    const [ab, mb] = await Promise.all([
      airbandGetir(state.authToken),
      marineGetir(state.authToken),
    ]);
    state.airbandData = ab;
    state.marineData = mb;

    sifreModaliKapat();
    korunanlariGuncelle(true);
    if (state.airbandData) airbandUiKur();
    if (state.marineData) marineUiKur();

    const hedef = modal.dataset.hedef;
    if (hedef) {
      const cb = document.getElementById(hedef);
      if (cb) { cb.checked = true; }
    }
    document.dispatchEvent(new CustomEvent("filtre-degisti"));
  } catch (err) {
    hata.textContent = err.message || "Sifre hatasi";
    state.authToken = null;
    sessionStorage.removeItem("authToken");
  }
}

export function korunanlariGuncelle(unlocked) {
  const groups = [
    "opsiyon-airband-group",
    "opsiyon-marine-group",
    "opsiyon-pmr-group",
    "opsiyon-dpmr-group",
  ];
  for (const gid of groups) {
    const g = document.getElementById(gid);
    if (!g) continue;
    const overlay = g.querySelector(".protected-overlay");
    if (overlay) overlay.style.display = unlocked ? "none" : "";
  }
  // All four protected groups have a separate "unlocked" wrapper that replaces the overlay.
  for (const prefix of ["airband", "marine", "pmr", "dpmr"]) {
    const label = document.getElementById(`${prefix}-unlocked`);
    if (label) label.style.display = unlocked ? "" : "none";
  }
}
