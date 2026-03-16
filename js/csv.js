/**
 * csv.js
 * Generates CPS-compatible CSV files for amateur radio devices.
 */

import { kanalAdiOlustur, txFrekansHesapla } from "./utils.js";

/**
 * Escapes a CSV field value by wrapping in double-quotes when necessary.
 * Internal double-quotes are doubled per RFC 4180.
 *
 * @param {string} val
 * @returns {string}
 */
function csvEscape(val) {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Builds a 50-element row array pre-filled with "0".
 *
 * @returns {string[]}
 */
function boslukSatir(sutunSayisi) {
  return Array(sutunSayisi).fill("0");
}

/**
 * Generates a CPS-compatible CSV string from repeater roles.
 *
 * @param {object[]} roleler   - Array of repeater role objects.
 * @param {object}   profil    - Device profile (csvSutunlari, shiftHesaplama, gucSeviyeleri).
 * @param {object}   opsiyonlar - Export options (kanalAdiFormati, gucSeviyesi, rxOnly, pmrEkle, dpmrEkle).
 * @returns {string}
 */
export function csvOlustur(roleler, profil, opsiyonlar) {
  const satirlar = [];
  const sutunSayisi = profil.csvSutunlari.length;
  const d = profil.varsayilanDegerler;
  const gucDegeri = profil.gucSeviyeleri[opsiyonlar.gucSeviyesi] || d.power;

  // Header row
  satirlar.push(profil.csvSutunlari.join(","));

  // One row per role
  for (const role of roleler) {
    const col = boslukSatir(sutunSayisi);

    // col[0] - Channel Mode: digital (role.digital === 1 or 2) -> "2", else "1"
    col[0] = (role.digital === 1 || role.digital === 2) ? "2" : "1";

    // col[1] - Channel Name
    col[1] = kanalAdiOlustur(role, opsiyonlar.kanalAdiFormati);

    // col[2] - RX Frequency
    col[2] = String(role.frekans || "").replace(",", ".");

    // col[3] - TX Frequency
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

  // Analog PMR channels
  if (opsiyonlar.pmrEkle) {
    const pmrFrekanslar = [
      446.00625, 446.01875, 446.03125, 446.04375,
      446.05625, 446.06875, 446.08125, 446.09375,
      446.10625, 446.11875, 446.13125, 446.14375,
      446.15625, 446.16875, 446.18125, 446.19375,
    ];

    for (let i = 0; i < pmrFrekanslar.length; i++) {
      const col = boslukSatir(sutunSayisi);
      const frek = pmrFrekanslar[i].toFixed(5);

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

  // Digital PMR channels
  if (opsiyonlar.dpmrEkle) {
    const dpmrFrekanslar = [
      446.103125, 446.109375, 446.115625, 446.121875,
      446.128125, 446.134375, 446.140625, 446.146875,
      446.153125, 446.159375, 446.165625, 446.171875,
      446.178125, 446.184375, 446.190625, 446.196875,
    ];

    for (let i = 0; i < dpmrFrekanslar.length; i++) {
      const col = boslukSatir(sutunSayisi);
      const frek = dpmrFrekanslar[i].toFixed(6);

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

/**
 * Triggers a browser download of the given CSV content.
 *
 * @param {string} icerik    - CSV string content.
 * @param {string} dosyaAdi  - Filename for the downloaded file.
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
