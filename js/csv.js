/**
 * csv.js
 * Generates CPS/CHIRP-compatible CSV files for amateur radio devices.
 * Supports: repeater channels, PMR, dPMR, FM broadcast, airband, marine,
 *           DMR talk groups, and digital simplex channels.
 */

import { kanalAdiOlustur, txFrekansHesapla } from "./utils.js";
import {
  fmIstasyonlariGetir,
  AIRBAND_FREKANSLARI,
  MARINE_FREKANSLARI,
  DIGITAL_SIMPLEX,
} from "./frekanslar.js";

/**
 * Escapes a CSV field value by wrapping in double-quotes when necessary.
 * Internal double-quotes are doubled per RFC 4180.
 */
function csvEscape(val) {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Builds an array pre-filled with empty strings. */
function boslukSatir(sutunSayisi) {
  return Array(sutunSayisi).fill("");
}

// ─── PMR Frequency Lists ─────────────────────────────────────────────────────

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

// ─── CHIRP CSV Generator ─────────────────────────────────────────────────────

function chirpCsvOlustur(roleler, profil, opsiyonlar) {
  const satirlar = [];
  const sutunSayisi = profil.csvSutunlari.length;
  const d = profil.varsayilanDegerler;
  const gucDegeri = profil.gucSeviyeleri[opsiyonlar.gucSeviyesi] || "5.0W";

  satirlar.push(profil.csvSutunlari.join(","));

  let location = 1;

  // ── Repeater channels ──
  for (const role of roleler) {
    const col = boslukSatir(sutunSayisi);

    const rxStr = String(role.frekans || "").replace(",", ".");
    const rx = parseFloat(rxStr);
    const txStr = txFrekansHesapla(role, profil.shiftHesaplama);
    const tx = parseFloat(txStr);

    col[0] = String(location++);
    col[1] = kanalAdiOlustur(role, opsiyonlar.kanalAdiFormati).slice(0, 10);
    col[2] = rx.toFixed(6);

    if (!isNaN(rx) && !isNaN(tx)) {
      const diff = tx - rx;
      if (Math.abs(diff) < 0.0001) {
        col[3] = "";
        col[4] = "0.000000";
      } else if (diff < 0) {
        col[3] = "-";
        col[4] = Math.abs(diff).toFixed(6);
      } else {
        col[3] = "+";
        col[4] = diff.toFixed(6);
      }
    } else {
      col[3] = "";
      col[4] = "0.000000";
    }

    if (role.ton) {
      col[5] = "Tone";
      col[6] = String(role.ton);
      col[7] = String(role.ton);
    } else {
      col[5] = "";
      col[6] = "88.5";
      col[7] = "88.5";
    }

    col[8] = d.dtcsCode;
    col[9] = d.dtcsPolarity;
    col[10] = d.rxDtcsCode;
    col[11] = d.crossMode;
    col[12] = d.mode;
    col[13] = d.tStep;
    col[14] = opsiyonlar.rxOnly ? "S" : "";
    col[15] = gucDegeri;

    satirlar.push(col.map(csvEscape).join(","));
  }

  // ── PMR channels ──
  if (opsiyonlar.pmrEkle) {
    for (let i = 0; i < PMR_FREKANSLAR.length; i++) {
      const col = boslukSatir(sutunSayisi);
      col[0] = String(location++);
      col[1] = `PMR ${i + 1}`;
      col[2] = PMR_FREKANSLAR[i].toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = "";
      col[6] = "88.5"; col[7] = "88.5";
      col[8] = d.dtcsCode; col[9] = d.dtcsPolarity; col[10] = d.rxDtcsCode;
      col[11] = d.crossMode; col[12] = "FM"; col[13] = "12.50";
      col[14] = ""; col[15] = gucDegeri;
      satirlar.push(col.map(csvEscape).join(","));
    }
  }

  // ── FM Broadcast channels (city-based) ──
  if (opsiyonlar.fmRadyoEkle && opsiyonlar.fmSehirler?.length > 0) {
    const fmList = fmIstasyonlariGetir(opsiyonlar.fmSehirler);
    for (const ist of fmList) {
      const col = boslukSatir(sutunSayisi);
      col[0] = String(location++);
      col[1] = ist.ad.slice(0, 10);
      col[2] = ist.frek.toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = "";
      col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "FM"; col[13] = "12.50";
      col[14] = ""; col[15] = "0.1W";
      satirlar.push(col.map(csvEscape).join(","));
    }
  }

  // ── Airband channels ──
  if (opsiyonlar.airbandEkle) {
    for (const ab of AIRBAND_FREKANSLARI) {
      const col = boslukSatir(sutunSayisi);
      col[0] = String(location++);
      col[1] = ab.ad.slice(0, 10);
      col[2] = ab.frek.toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = "";
      col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "AM"; col[13] = "25.00";
      col[14] = "S"; col[15] = "0.1W";
      satirlar.push(col.map(csvEscape).join(","));
    }
  }

  // ── Marine band channels ──
  if (opsiyonlar.marineEkle) {
    for (const mb of MARINE_FREKANSLARI) {
      const col = boslukSatir(sutunSayisi);
      col[0] = String(location++);
      col[1] = mb.ad.slice(0, 10);
      col[2] = mb.frek.toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = "";
      col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "FM"; col[13] = "12.50";
      col[14] = "S"; col[15] = "0.1W";
      satirlar.push(col.map(csvEscape).join(","));
    }
  }

  // ── Digital Simplex channels ──
  if (opsiyonlar.simplexEkle) {
    const allSimplex = [...DIGITAL_SIMPLEX.uhf, ...DIGITAL_SIMPLEX.vhf];
    for (const sx of allSimplex) {
      const col = boslukSatir(sutunSayisi);
      col[0] = String(location++);
      const modKisa = sx.mod.replace("-", "").slice(0, 4);
      const band = parseFloat(sx.frek) > 200 ? "U" : "V";
      col[1] = `${modKisa} ${band}SX`.slice(0, 10);
      col[2] = parseFloat(sx.frek).toFixed(6);
      col[3] = ""; col[4] = "0.000000"; col[5] = "";
      col[6] = "88.5"; col[7] = "88.5";
      col[8] = "023"; col[9] = "NN"; col[10] = "023";
      col[11] = "Tone->Tone"; col[12] = "FM"; col[13] = "12.50";
      col[14] = ""; col[15] = gucDegeri;
      satirlar.push(col.map(csvEscape).join(","));
    }
  }

  return satirlar.join("\n");
}

// ─── CPS CSV Generator ──────────────────────────────────────────────────────

function cpsCsvOlustur(roleler, profil, opsiyonlar) {
  const satirlar = [];
  const sutunSayisi = profil.csvSutunlari.length;
  const d = profil.varsayilanDegerler;
  const gucDegeri = profil.gucSeviyeleri[opsiyonlar.gucSeviyesi] || d.power;

  satirlar.push(profil.csvSutunlari.join(","));

  // ── Repeater channels ──
  for (const role of roleler) {
    const col = Array(sutunSayisi).fill("0");

    col[0] = (role.digital === 1 || role.digital === 2) ? "2" : "1";
    col[1] = kanalAdiOlustur(role, opsiyonlar.kanalAdiFormati);
    col[2] = String(role.frekans || "").replace(",", ".");
    col[3] = txFrekansHesapla(role, profil.shiftHesaplama);

    col[4] = d.bandWidth;
    col[6] = d.squelch;
    col[9] = d.tot;
    col[11] = gucDegeri;
    col[14] = opsiyonlar.rxOnly ? "1" : "0";
    col[25] = d.leaderMS;
    col[27] = d.contactName;
    col[28] = d.groupList;
    col[29] = d.colorCode;
    col[35] = "None";
    col[36] = role.ton || "None";
    col[40] = d.nonQtDqt;
    col[41] = d.displayPtt;
    col[42] = d.reverseBurst;

    satirlar.push(col.map(csvEscape).join(","));
  }

  // ── PMR channels ──
  if (opsiyonlar.pmrEkle) {
    for (let i = 0; i < PMR_FREKANSLAR.length; i++) {
      const col = Array(sutunSayisi).fill("0");
      const frek = PMR_FREKANSLAR[i].toFixed(5);
      col[0] = "1"; col[1] = `PMR ${i + 1}`;
      col[2] = frek; col[3] = frek;
      col[4] = d.bandWidth; col[6] = d.squelch; col[9] = d.tot;
      col[11] = gucDegeri; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
      col[35] = "None"; col[36] = "None";
      col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      satirlar.push(col.map(csvEscape).join(","));
    }
  }

  // ── dPMR channels ──
  if (opsiyonlar.dpmrEkle) {
    for (let i = 0; i < DPMR_FREKANSLAR.length; i++) {
      const col = Array(sutunSayisi).fill("0");
      const frek = DPMR_FREKANSLAR[i].toFixed(6);
      col[0] = "2"; col[1] = `dPMR ${i + 1}`;
      col[2] = frek; col[3] = frek;
      col[4] = d.bandWidth; col[6] = "1"; col[9] = d.tot;
      col[11] = gucDegeri; col[25] = d.leaderMS;
      col[27] = d.contactName; col[28] = d.groupList; col[29] = d.colorCode;
      col[35] = "None"; col[36] = "None";
      col[40] = d.nonQtDqt; col[41] = d.displayPtt; col[42] = d.reverseBurst;
      satirlar.push(col.map(csvEscape).join(","));
    }
  }

  return satirlar.join("\n");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Routes CSV generation to the correct format handler based on device profile.
 */
export function csvOlustur(roleler, profil, opsiyonlar) {
  if (profil.csvFormat === "chirp") {
    return chirpCsvOlustur(roleler, profil, opsiyonlar);
  }
  return cpsCsvOlustur(roleler, profil, opsiyonlar);
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
