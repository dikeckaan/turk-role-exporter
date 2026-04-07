/**
 * csv.js
 * Generates CPS/CHIRP-compatible CSV files for amateur radio devices.
 * Exports raw row arrays for preview/editing, then joins for download.
 */

import { kanalAdiOlustur, txFrekansHesapla, isDijital } from "./utils.js";
import {
  fmIstasyonlariGetir,
  DIGITAL_SIMPLEX,
} from "./frekanslar.js";

function csvEscape(val) {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function boslukSatir(n) { return Array(n).fill(""); }

function validateFrekans(value, defaultVal, minRange, maxRange) {
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < minRange || parsed > maxRange) return defaultVal;
  return parsed;
}

// ─── PMR / dPMR ──────────────────────────────────────────────────────────────

const PMR_FREKANSLAR = [
  446.00625, 446.01875, 446.03125, 446.04375,
  446.05625, 446.06875, 446.08125, 446.09375,
  446.10625, 446.11875, 446.13125, 446.14375,
  446.15625, 446.16875, 446.18125, 446.19375,
];

const DPMR_FREKANSLAR = [
  446.103125, 446.109375, 446.115625, 446.121875,
  446.128125, 446.134375, 446.140625, 446.146875,
  446.153125, 446.159375, 446.165625, 446.171875,
  446.178125, 446.184375, 446.190625, 446.196875,
];

// ─── CHIRP row builder ──────────────────────────────────────────────────────

function chirpSatirlarUret(roleler, profil, opsiyonlar) {
  const rows = [];
  const n = profil.csvSutunlari.length;
  const d = profil.varsayilanDegerler;
  const maxAd = profil.maxKanalAdi || 10;
  const guc = profil.gucSeviyeleri[opsiyonlar.gucSeviyesi] || "5.0W";
  let loc = 1;

  for (const role of roleler) {
    const col = boslukSatir(n);
    const rxStr = String(role.frekans || "").replace(",", ".");
    const rx = parseFloat(rxStr);
    const txStr = role.txFrekansOverride || txFrekansHesapla(role, profil.shiftHesaplama);
    const tx = parseFloat(txStr);

    col[0] = String(loc++);
    col[1] = (role.kanalAdiOverride || kanalAdiOlustur(role, opsiyonlar.kanalAdiFormati)).slice(0, maxAd);
    col[2] = rx.toFixed(6);

    if (opsiyonlar.rxOnly) {
      col[3] = "off"; col[4] = "0.000000";
    } else if (!isNaN(rx) && !isNaN(tx)) {
      const diff = tx - rx;
      if (Math.abs(diff) < 0.0001) { col[3] = ""; col[4] = "0.000000"; }
      else if (diff < 0) { col[3] = "-"; col[4] = Math.abs(diff).toFixed(6); }
      else { col[3] = "+"; col[4] = diff.toFixed(6); }
    } else { col[3] = ""; col[4] = "0.000000"; }

    if (role.ton) { col[5] = "Tone"; col[6] = String(role.ton); col[7] = String(role.ton); }
    else { col[5] = ""; col[6] = "88.5"; col[7] = "88.5"; }

    col[8] = d.dtcsCode; col[9] = d.dtcsPolarity; col[10] = d.rxDtcsCode;
    col[11] = d.crossMode; col[12] = d.mode; col[13] = d.tStep;
    col[14] = opsiyonlar.rxOnly ? "S" : ""; col[15] = guc;
    rows.push(col);
  }

  // PMR
  if (opsiyonlar.pmrEkle) {
    for (let i = 0; i < PMR_FREKANSLAR.length; i++) {
      const col = boslukSatir(n);
      col[0] = String(loc++); col[1] = `PMR ${i + 1}`; col[2] = PMR_FREKANSLAR[i].toFixed(6);
      col[3] = opsiyonlar.pmrRxOnly ? "off" : ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
      col[8] = d.dtcsCode; col[9] = d.dtcsPolarity; col[10] = d.rxDtcsCode;
      col[11] = d.crossMode; col[12] = "FM"; col[13] = "12.50"; col[14] = opsiyonlar.pmrRxOnly ? "S" : ""; col[15] = guc;
      rows.push(col);
    }
  }

  // FM Broadcast
  if (opsiyonlar.fmRadyoEkle && opsiyonlar.fmSehirler?.length > 0) {
    for (const ist of fmIstasyonlariGetir(opsiyonlar.fmSehirler)) {
      const col = boslukSatir(n);
      col[0] = String(loc++); col[1] = ist.ad.slice(0, maxAd); col[2] = ist.frek.toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "FM"; col[13] = "12.50"; col[14] = ""; col[15] = "0.1W";
      rows.push(col);
    }
  }

  // Airband
  if (opsiyonlar.airbandEkle) {
    for (const ab of (opsiyonlar.airbandData || [])) {
      const col = boslukSatir(n);
      col[0] = String(loc++); col[1] = ab.ad.slice(0, maxAd); col[2] = ab.frek.toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "AM"; col[13] = "25.00"; col[14] = "S"; col[15] = "0.1W";
      rows.push(col);
    }
  }

  // Marine
  if (opsiyonlar.marineEkle) {
    for (const mb of (opsiyonlar.marineData || [])) {
      const col = boslukSatir(n);
      col[0] = String(loc++); col[1] = mb.ad.slice(0, maxAd); col[2] = mb.frek.toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "FM"; col[13] = "12.50"; col[14] = "S"; col[15] = "0.1W";
      rows.push(col);
    }
  }

  // Digital Simplex
  if (opsiyonlar.simplexEkle) {
    for (const sx of [...DIGITAL_SIMPLEX.uhf, ...DIGITAL_SIMPLEX.vhf]) {
      const col = boslukSatir(n);
      col[0] = String(loc++);
      const modK = sx.mod.replace("-", "").slice(0, 4);
      const band = parseFloat(sx.frek) > 200 ? "U" : "V";
      col[1] = `${modK} ${band}SX`.slice(0, maxAd); col[2] = parseFloat(sx.frek).toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "FM"; col[13] = "12.50"; col[14] = ""; col[15] = guc;
      rows.push(col);
    }
  }

  // Empty analog
  if (opsiyonlar.bosAnalogAdet > 0) {
    const f = validateFrekans(opsiyonlar.bosAnalogFrekans, 145.5, 130.0, 480.0).toFixed(6);
    for (let i = 0; i < opsiyonlar.bosAnalogAdet; i++) {
      const col = boslukSatir(n);
      col[0] = String(loc++); col[1] = `BOS A${i + 1}`; col[2] = f;
      col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
      col[8] = d.dtcsCode; col[9] = d.dtcsPolarity; col[10] = d.rxDtcsCode;
      col[11] = d.crossMode; col[12] = "FM"; col[13] = "12.50"; col[14] = ""; col[15] = guc;
      rows.push(col);
    }
  }

  // Empty digital
  if (opsiyonlar.bosDijitalAdet > 0) {
    const f = validateFrekans(opsiyonlar.bosDijitalFrekans, 438.5, 130.0, 480.0).toFixed(6);
    for (let i = 0; i < opsiyonlar.bosDijitalAdet; i++) {
      const col = boslukSatir(n);
      col[0] = String(loc++); col[1] = `BOS D${i + 1}`; col[2] = f;
      col[3] = ""; col[4] = "0.000000"; col[5] = ""; col[6] = "88.5"; col[7] = "88.5";
      col[8] = d.dtcsCode; col[9] = d.dtcsPolarity; col[10] = d.rxDtcsCode;
      col[11] = d.crossMode; col[12] = "FM"; col[13] = "12.50"; col[14] = ""; col[15] = guc;
      rows.push(col);
    }
  }

  return rows;
}

// ─── CPS row builder ─────────────────────────────────────────────────────────

function cpsSatirlarUret(roleler, profil, opsiyonlar) {
  const rows = [];
  const n = profil.csvSutunlari.length;
  const d = profil.varsayilanDegerler;
  const guc = profil.gucSeviyeleri[opsiyonlar.gucSeviyesi] || d.power;

  for (const role of roleler) {
    const col = Array(n).fill("0");
    col[0] = isDijital(role) ? "2" : "1";
    col[1] = role.kanalAdiOverride || kanalAdiOlustur(role, opsiyonlar.kanalAdiFormati);
    col[2] = String(role.frekans || "").replace(",", ".");
    col[3] = role.txFrekansOverride || txFrekansHesapla(role, profil.shiftHesaplama);
    col[4] = d.bandWidth; col[6] = d.squelch; col[9] = d.tot; col[11] = guc;
    col[14] = opsiyonlar.rxOnly ? "1" : "0"; col[25] = d.leaderMS;
    col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
    col[35] = "None"; col[36] = role.ton || "None";
    col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
    rows.push(col);
  }

  if (opsiyonlar.pmrEkle) {
    for (let i = 0; i < PMR_FREKANSLAR.length; i++) {
      const col = Array(n).fill("0");
      const f = PMR_FREKANSLAR[i].toFixed(5);
      col[0] = "1"; col[1] = `PMR ${i + 1}`; col[2] = f; col[3] = f;
      col[4] = d.bandWidth; col[6] = d.squelch; col[9] = d.tot; col[11] = guc;
      col[14] = opsiyonlar.pmrRxOnly ? "1" : "0"; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
      col[35] = "None"; col[36] = "None"; col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      rows.push(col);
    }
  }

  if (opsiyonlar.dpmrEkle) {
    for (let i = 0; i < DPMR_FREKANSLAR.length; i++) {
      const col = Array(n).fill("0");
      const f = DPMR_FREKANSLAR[i].toFixed(6);
      col[0] = "2"; col[1] = `dPMR ${i + 1}`; col[2] = f; col[3] = f;
      col[4] = d.bandWidth; col[6] = "1"; col[9] = d.tot; col[11] = guc;
      col[14] = opsiyonlar.dpmrRxOnly ? "1" : "0"; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
      col[35] = "None"; col[36] = "None"; col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      rows.push(col);
    }
  }

  if (opsiyonlar.bosAnalogAdet > 0) {
    const f = validateFrekans(opsiyonlar.bosAnalogFrekans, 145.5, 130.0, 480.0).toFixed(5);
    for (let i = 0; i < opsiyonlar.bosAnalogAdet; i++) {
      const col = Array(n).fill("0");
      col[0] = "1"; col[1] = `BOS A${i + 1}`; col[2] = f; col[3] = f;
      col[4] = d.bandWidth; col[6] = d.squelch; col[9] = d.tot; col[11] = guc; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
      col[35] = "None"; col[36] = "None"; col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      rows.push(col);
    }
  }

  if (opsiyonlar.bosDijitalAdet > 0) {
    const f = validateFrekans(opsiyonlar.bosDijitalFrekans, 438.5, 130.0, 480.0).toFixed(5);
    for (let i = 0; i < opsiyonlar.bosDijitalAdet; i++) {
      const col = Array(n).fill("0");
      col[0] = "2"; col[1] = `BOS D${i + 1}`; col[2] = f; col[3] = f;
      col[4] = d.bandWidth; col[6] = d.squelch; col[9] = d.tot; col[11] = guc; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
      col[35] = "None"; col[36] = "None"; col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      rows.push(col);
    }
  }

  return rows;
}

// ─── OpenGD77 row builder ────────────────────────────────────────────────────

function opengd77Satir(profil, loc, isim, rxNum, txNum, dijital, ton, rxOnly, gucLabel) {
  const n = profil.csvSutunlari.length;
  const d = profil.varsayilanDegerler;
  const col = Array(n).fill("");
  col[0] = String(loc);
  col[1] = isim;
  col[2] = dijital ? "Digital" : "Analogue";
  col[3] = "\t" + (isNaN(rxNum) ? "0.0000" : rxNum.toFixed(4));
  col[4] = "\t" + (isNaN(txNum) ? "0.0000" : txNum.toFixed(4));
  col[5] = dijital ? "" : d.bandwidth;
  col[6] = dijital ? d.colourCode : "";
  col[7] = dijital ? d.timeslot : "";
  col[8] = "";
  col[9] = d.tgList;
  col[10] = d.dmrId;
  col[11] = "Off";
  col[12] = "Off";
  col[13] = !dijital && ton ? String(ton) : "None";
  col[14] = !dijital && ton ? String(ton) : "None";
  col[15] = d.squelch;
  col[16] = gucLabel;
  col[17] = rxOnly ? "Yes" : "No";
  col[18] = "No";
  col[19] = "No";
  col[20] = "0";
  col[21] = "Off";
  col[22] = "No";
  col[23] = "No";
  col[24] = "None";
  col[25] = "0";
  col[26] = "0";
  col[27] = "No";
  return col;
}

function opengd77SatirlarUret(roleler, profil, opsiyonlar) {
  const rows = [];
  const maxAd = profil.maxKanalAdi || 16;
  const gucLabel = opsiyonlar.gucSeviyesi || "Master";
  let loc = 1;

  for (const role of roleler) {
    const rxStr = String(role.frekans || "").replace(",", ".");
    const rx = parseFloat(rxStr);
    const txStr = role.txFrekansOverride || txFrekansHesapla(role, profil.shiftHesaplama);
    const tx = parseFloat(txStr);
    const dijital = isDijital(role);
    const isim = (role.kanalAdiOverride || kanalAdiOlustur(role, opsiyonlar.kanalAdiFormati)).slice(0, maxAd);
    rows.push(opengd77Satir(profil, loc++, isim, rx, opsiyonlar.rxOnly ? rx : tx, dijital, role.ton, opsiyonlar.rxOnly, gucLabel));
  }

  // PMR
  if (opsiyonlar.pmrEkle) {
    for (let i = 0; i < PMR_FREKANSLAR.length; i++) {
      const f = PMR_FREKANSLAR[i];
      rows.push(opengd77Satir(profil, loc++, `PMR ${i + 1}`, f, f, false, null, opsiyonlar.pmrRxOnly, gucLabel));
    }
  }

  // Digital Simplex
  if (opsiyonlar.simplexEkle) {
    for (const sx of [...DIGITAL_SIMPLEX.uhf, ...DIGITAL_SIMPLEX.vhf]) {
      const f = parseFloat(sx.frek);
      const band = f > 200 ? "U" : "V";
      const modK = sx.mod.replace("-", "").slice(0, 4);
      rows.push(opengd77Satir(profil, loc++, `${modK} ${band}SX`.slice(0, maxAd), f, f, true, null, false, gucLabel));
    }
  }

  // Empty analog
  if (opsiyonlar.bosAnalogAdet > 0) {
    const f = validateFrekans(opsiyonlar.bosAnalogFrekans, 145.5, 130.0, 480.0);
    for (let i = 0; i < opsiyonlar.bosAnalogAdet; i++) {
      rows.push(opengd77Satir(profil, loc++, `BOS A${i + 1}`, f, f, false, null, false, gucLabel));
    }
  }

  // Empty digital
  if (opsiyonlar.bosDijitalAdet > 0) {
    const f = validateFrekans(opsiyonlar.bosDijitalFrekans, 438.5, 130.0, 480.0);
    for (let i = 0; i < opsiyonlar.bosDijitalAdet; i++) {
      rows.push(opengd77Satir(profil, loc++, `BOS D${i + 1}`, f, f, true, null, false, gucLabel));
    }
  }

  return rows;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Patches duplicate channel names by appending a short frequency hint.
 * e.g. two "34U KayisdagiTRAC" → "34U KayisdagTRAC" + "34U KayisdagTRC2"
 * Respects maxLen so the patched name doesn't exceed device limits.
 */
function duplicateIsimleriPatchle(satirlar, nameCol, freqCol, maxLen) {
  // Count occurrences of each name
  const sayac = {};
  for (const row of satirlar) {
    const name = row[nameCol];
    sayac[name] = (sayac[name] || 0) + 1;
  }

  // For duplicates, append frequency decimal part as suffix
  const gorulen = {};
  for (const row of satirlar) {
    const name = row[nameCol];
    if (sayac[name] <= 1) continue;

    // Build a short freq suffix: "439.2625" → ".26", "145.700" → ".70"
    const frek = String(row[freqCol]);
    const dotIdx = frek.indexOf(".");
    const decimal = dotIdx >= 0 ? frek.slice(dotIdx, dotIdx + 3) : "";

    // Ensure uniqueness: if same name+suffix already used, extend decimal
    let suffix = decimal;
    const key = name + suffix;
    if (gorulen[key]) {
      suffix = dotIdx >= 0 ? frek.slice(dotIdx, dotIdx + 5) : String(gorulen[key]);
    }
    gorulen[name + suffix] = (gorulen[name + suffix] || 0) + 1;

    // Trim the base name to fit suffix within maxLen
    const trimmedName = name.slice(0, maxLen - suffix.length);
    row[nameCol] = `${trimmedName}${suffix}`;
  }
}

/**
 * Generates CSV row arrays for preview/editing.
 * Returns { basliklar: string[], satirlar: string[][] }
 */
export function csvSatirlarUret(roleler, profil, opsiyonlar) {
  const basliklar = profil.csvSutunlari;
  let satirlar;
  if (profil.csvFormat === "chirp") satirlar = chirpSatirlarUret(roleler, profil, opsiyonlar);
  else if (profil.csvFormat === "opengd77") satirlar = opengd77SatirlarUret(roleler, profil, opsiyonlar);
  else satirlar = cpsSatirlarUret(roleler, profil, opsiyonlar);

  // Patch duplicate channel names with frequency hints
  const maxLen = profil.maxKanalAdi || (profil.csvFormat === "chirp" ? 10 : 16);
  const freqCol = profil.csvFormat === "opengd77" ? 3 : 2;
  duplicateIsimleriPatchle(satirlar, 1, freqCol, maxLen);

  return { basliklar, satirlar };
}

/**
 * Converts header + row arrays to a CSV string.
 */
export function csvStringOlustur(basliklar, satirlar) {
  const lines = [basliklar.join(",")];
  for (const row of satirlar) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

/**
 * Shortcut: generate CSV string directly from roles.
 */
export function csvOlustur(roleler, profil, opsiyonlar) {
  const { basliklar, satirlar } = csvSatirlarUret(roleler, profil, opsiyonlar);
  return csvStringOlustur(basliklar, satirlar);
}

/**
 * Converts header + row arrays to a JSON string.
 */
export function jsonOlustur(basliklar, satirlar) {
  return JSON.stringify(satirlar.map(row => {
    const obj = {};
    basliklar.forEach((h, i) => obj[h] = row[i] ?? "");
    return obj;
  }), null, 2);
}

/**
 * Triggers a browser download of the given content.
 */
export function jsonIndir(icerik, dosyaAdi) {
  const blob = new Blob([icerik], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of the given CSV content.
 */
export function csvIndir(icerik, dosyaAdi) {
  const blob = new Blob([icerik], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
