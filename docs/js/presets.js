/**
 * presets.js
 * Save and load filter+option presets to localStorage.
 */

import { state } from "./state.js";

const STORAGE_KEY = "roleExporterPresets";
const MAX_PRESETS = 10;
const PRESET_VERSION = 3;

/**
 * Serialize a preset-like object to JSON string with the current schema.
 * Missing fields default to safe empties so partial inputs are fine.
 */
export function presetSerialize(obj) {
  return JSON.stringify({
    version: PRESET_VERSION,
    airbandSecim: obj.airbandSecim || { iller: [], havalimanlari: {} },
    marineSecim:  obj.marineSecim  || { vhf: [], sar: [], sahil: [] },
    fmSimplexSecim:      obj.fmSimplexSecim      || { vhf: [], uhf: [] },
    dijitalSimplexSecim: obj.dijitalSimplexSecim || { vhf: [], uhf: [] },
    opsiyonlar: obj.opsiyonlar || {},
    filtreler:  obj.filtreler  || {},
    cihaz:      obj.cihaz || null,
    ad:         obj.ad || null,
    tarih:      obj.tarih || null,
  });
}

/**
 * Deserialize a preset JSON string (or object) into a normalized preset.
 * Tolerates v1 presets missing airband/marine fields — they default to empty.
 */
export function presetDeserialize(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const airband = parsed.airbandSecim || {};
  const marine  = parsed.marineSecim  || {};
  const fmSx    = parsed.fmSimplexSecim || {};
  const dijSx   = parsed.dijitalSimplexSecim || {};
  const opsiyonlar = { ...(parsed.opsiyonlar || {}) };

  // v2 → v3 migration: simplexEkle (boolean) → dijitalSimplexEkle (true) + tum dijital frekanslar secili
  if ((parsed.version || 0) < 3 && opsiyonlar.simplexEkle === true) {
    opsiyonlar.dijitalSimplexEkle = true;
    opsiyonlar.fmSimplexEkle = false;
    if (!Array.isArray(dijSx.vhf) || dijSx.vhf.length === 0) {
      dijSx.vhf = ["DV1", "DV2", "DV3", "DV4"];
    }
    if (!Array.isArray(dijSx.uhf) || dijSx.uhf.length === 0) {
      dijSx.uhf = ["DU1", "DU2", "DU3", "DU4"];
    }
  }
  delete opsiyonlar.simplexEkle;

  return {
    airbandSecim: {
      iller: Array.isArray(airband.iller) ? airband.iller : [],
      havalimanlari: (airband.havalimanlari && typeof airband.havalimanlari === "object")
        ? airband.havalimanlari : {},
    },
    marineSecim: {
      vhf:   Array.isArray(marine.vhf)   ? marine.vhf   : [],
      sar:   Array.isArray(marine.sar)   ? marine.sar   : [],
      sahil: Array.isArray(marine.sahil) ? marine.sahil : [],
    },
    fmSimplexSecim: {
      vhf: Array.isArray(fmSx.vhf) ? fmSx.vhf : [],
      uhf: Array.isArray(fmSx.uhf) ? fmSx.uhf : [],
    },
    dijitalSimplexSecim: {
      vhf: Array.isArray(dijSx.vhf) ? dijSx.vhf : [],
      uhf: Array.isArray(dijSx.uhf) ? dijSx.uhf : [],
    },
    opsiyonlar,
    filtreler:  parsed.filtreler  || {},
    cihaz:      parsed.cihaz || null,
    ad:         parsed.ad || null,
    tarih:      parsed.tarih || null,
  };
}

function getPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
}

export function presetKaydet(ad, filtreTopla, opsiyonTopla, seciliCihaz) {
  const presets = getPresets();
  const preset = JSON.parse(presetSerialize({
    ad,
    tarih: new Date().toISOString(),
    cihaz: typeof seciliCihaz === "function" ? seciliCihaz() : seciliCihaz,
    filtreler: filtreTopla(),
    opsiyonlar: opsiyonTopla(),
    airbandSecim: state.airbandSecim,
    marineSecim:  state.marineSecim,
    fmSimplexSecim:      state.fmSimplexSecim,
    dijitalSimplexSecim: state.dijitalSimplexSecim,
  }));
  // Replace existing with same name, or add new
  const idx = presets.findIndex(p => p.ad === ad);
  if (idx >= 0) presets[idx] = preset;
  else presets.unshift(preset);
  savePresets(presets);
  return presets;
}

export function presetSil(ad) {
  const presets = getPresets().filter(p => p.ad !== ad);
  savePresets(presets);
  return presets;
}

export function presetListesi() {
  return getPresets();
}

export function presetYukle(ad) {
  const p = getPresets().find(p => p.ad === ad);
  return p ? presetDeserialize(p) : null;
}

export function presetUiKur(containerEl, filtreTopla, opsiyonTopla, seciliCihaz, onLoad) {
  if (!containerEl) return;

  function render() {
    containerEl.replaceChildren();

    // Save button + name input
    const saveRow = document.createElement("div");
    saveRow.style.cssText = "display:flex;gap:8px;margin-bottom:8px;";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Preset adi...";
    nameInput.style.cssText = "flex:1;";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn-secondary btn-sm";
    saveBtn.textContent = "Kaydet";
    saveBtn.addEventListener("click", () => {
      const ad = nameInput.value.trim();
      if (!ad) return;
      presetKaydet(ad, filtreTopla, opsiyonTopla, seciliCihaz);
      nameInput.value = "";
      render();
    });
    saveRow.appendChild(nameInput);
    saveRow.appendChild(saveBtn);
    containerEl.appendChild(saveRow);

    // Preset list
    const presets = presetListesi();
    if (presets.length === 0) return;

    for (const p of presets) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 0;font-size:0.85rem;";

      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "btn-secondary btn-sm";
      loadBtn.textContent = p.ad;
      loadBtn.title = `Cihaz: ${p.cihaz} — ${new Date(p.tarih).toLocaleDateString("tr-TR")}`;
      loadBtn.addEventListener("click", () => {
        onLoad(presetDeserialize(p));
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-sil";
      delBtn.textContent = "×";
      delBtn.title = "Sil";
      delBtn.addEventListener("click", () => {
        presetSil(p.ad);
        render();
      });

      row.appendChild(loadBtn);
      row.appendChild(delBtn);
      containerEl.appendChild(row);
    }
  }

  render();
}
