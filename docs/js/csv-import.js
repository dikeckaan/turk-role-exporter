/**
 * csv-import.js
 * CSV file import and parsing logic.
 */

import { state } from "./state.js";
import { cihazProfili } from "./cihazlar.js";

export function csvImport(file, csvTabloYenileFn) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      importBilgiGoster("error", "CSV dosyasi bos veya okunamadi.");
      return;
    }

    const parseRow = (line) => {
      const fields = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = false;
          } else current += ch;
        } else {
          if (ch === '"') inQuotes = true;
          else if (ch === ",") { fields.push(current); current = ""; }
          else current += ch;
        }
      }
      fields.push(current);
      return fields;
    };

    const importHeader = parseRow(lines[0]);
    const importRows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseRow(lines[i]);
      if (vals.length >= 2) importRows.push(vals);
    }

    if (importRows.length === 0) {
      importBilgiGoster("error", "CSV'de veri satiri bulunamadi.");
      return;
    }

    const profil = cihazProfili(state.seciliCihaz);
    const currentHeaders = profil?.csvSutunlari || [];
    const importHeaderSet = new Set(importHeader);
    const headersMatch = currentHeaders.length === importHeader.length &&
      currentHeaders.every(h => importHeaderSet.has(h));

    if (headersMatch) {
      const colMap = new Map();
      for (let i = 0; i < importHeader.length; i++) {
        colMap.set(importHeader[i], i);
      }
      const startLoc = state.csvSatirlar.length + 1;
      for (let i = 0; i < importRows.length; i++) {
        const newRow = Array(currentHeaders.length).fill("");
        for (let ci = 0; ci < currentHeaders.length; ci++) {
          const srcIdx = colMap.get(currentHeaders[ci]);
          if (srcIdx !== undefined && srcIdx < importRows[i].length) {
            newRow[ci] = importRows[i][srcIdx];
          }
        }
        newRow[0] = String(startLoc + i);
        state.csvSatirlar.push(newRow);
      }
      importBilgiGoster("success", `${importRows.length} kanal eklendi (ayni format).`);
    } else {
      const colMap = new Map();
      for (let i = 0; i < importHeader.length; i++) {
        colMap.set(importHeader[i], i);
      }

      const startLoc = state.csvSatirlar.length + 1;
      let added = 0;
      for (const importRow of importRows) {
        const newRow = Array(currentHeaders.length).fill("");
        for (let ci = 0; ci < currentHeaders.length; ci++) {
          const srcIdx = colMap.get(currentHeaders[ci]);
          if (srcIdx !== undefined && srcIdx < importRow.length) {
            newRow[ci] = importRow[srcIdx];
          }
        }
        newRow[0] = String(startLoc + added);
        const hasFreq = newRow.some((v) => { const n = parseFloat(v); return n > 100 && n < 600; });
        if (hasFreq || newRow[1]) {
          state.csvSatirlar.push(newRow);
          added++;
        }
      }
      importBilgiGoster("success", `${added} kanal eklendi (farkli format — sutunlar eslesti).`);
    }

    csvTabloYenileFn();
  };
  reader.readAsText(file);
}

function importBilgiGoster(tip, mesaj) {
  const el = document.getElementById("import-bilgi");
  if (!el) return;
  el.textContent = mesaj;
  el.className = "import-bilgi import-" + tip;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 5000);
}
