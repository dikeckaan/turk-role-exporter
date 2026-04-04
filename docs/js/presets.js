/**
 * presets.js
 * Save and load filter+option presets to localStorage.
 */

const STORAGE_KEY = "roleExporterPresets";
const MAX_PRESETS = 10;

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
  const preset = {
    ad,
    tarih: new Date().toISOString(),
    cihaz: typeof seciliCihaz === "function" ? seciliCihaz() : seciliCihaz,
    filtreler: filtreTopla(),
    opsiyonlar: opsiyonTopla(),
  };
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
  return getPresets().find(p => p.ad === ad) || null;
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
        onLoad(p);
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
