import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTelsizcilikRow,
  normalizeFrekansComma,
  normalizeTurkish,
} from "../worker/scrapers.js";

describe("normalizeFrekansComma", () => {
  it("turns Turkish comma-fraction into dotted 4-decimal MHz", () => {
    assert.equal(normalizeFrekansComma("145.737,5"), "145.7375");
  });
  it("keeps plain dotted values", () => {
    assert.equal(normalizeFrekansComma("439.375"), "439.3750");
  });
  it("rejects out-of-range or junk", () => {
    assert.equal(normalizeFrekansComma(""), null);
    assert.equal(normalizeFrekansComma("abc"), null);
    assert.equal(normalizeFrekansComma("10"), null);     // below 50 MHz
    assert.equal(normalizeFrekansComma("9999"), null);   // above 1000 MHz
  });
});

describe("normalizeTurkish", () => {
  it("lowercases and strips Turkish diacritics", () => {
    assert.equal(normalizeTurkish("İSTANBUL"), "istanbul");
    assert.equal(normalizeTurkish("ŞANLIURFA"), "sanliurfa");
    assert.equal(normalizeTurkish("ÇANAKKALE"), "canakkale");
  });
});

describe("normalizeTelsizcilikRow", () => {
  it("maps an analog VHF row with CTCSS tone and coords", () => {
    const row = {
      region: "TA1",
      city_district: "İSTANBUL / BÜYÜKADA",
      band: "VHF",
      rx: "145.737,5",
      tx: "145.137,5",
      ton: "110.9 RX/TX",
      is_active: true,
      latitude: 40.85149,
      longitude: 29.11812,
      notes: "AKRAD",
    };
    const rec = normalizeTelsizcilikRow(row);
    assert.equal(rec.kaynak, "telsizcilik");
    assert.equal(rec.tabolge, "TA1");
    assert.equal(rec.sehir, "istanbul");
    assert.equal(rec.bant, "VHF");
    assert.equal(rec.digital, 0);
    assert.equal(rec.frekans, "145.7375");
    assert.equal(rec.txFrekans, "145.1375");
    assert.equal(rec.ton, "110.9");
    assert.equal(rec.durum, true);
    assert.equal(rec.konum, "BÜYÜKADA (AKRAD)");
    assert.equal(rec.lat, 40.85149);
    assert.equal(rec.lon, 29.11812);
    assert.equal(rec.timeSlot, undefined);
  });

  it("maps an analog UHF row without coords", () => {
    const row = {
      region: "TA3",
      city_district: "İZMİR",
      band: "UHF",
      rx: "438.450",
      tx: "431.050",
      ton: "88.5",
      is_active: true,
      latitude: null,
      longitude: null,
    };
    const rec = normalizeTelsizcilikRow(row);
    assert.equal(rec.bant, "UHF");
    assert.equal(rec.digital, 0);
    assert.equal(rec.ton, "88.5");
    assert.equal(rec.sehir, "izmir");
    assert.equal(rec.konum, "İZMİR"); // no ilce → fall back to city
    assert.equal("lat" in rec, false);
    assert.equal("lon" in rec, false);
  });

  it("maps a DMR row: infers UHF from rx, sets digital=1 and TS1+TS2", () => {
    const row = {
      region: "TA2",
      city_district: "KOCAELİ",
      band: "DİJİTAL",
      rx: "439.375",
      tx: "431.775",
      ton: "TS 1 / TS 2 (CC:1) ID:286341 (TİME SLOT)",
      is_active: true,
      latitude: 40.78871,
      longitude: 29.76600,
      notes: "ANARAD",
    };
    const rec = normalizeTelsizcilikRow(row);
    assert.equal(rec.bant, "UHF");
    assert.equal(rec.digital, 1);
    assert.equal(rec.timeSlot, "TS1+TS2");
    assert.equal(rec.dijitalMod, "DMR");
    assert.equal(rec.ton, null);
    assert.equal(rec.konum, "ANARAD"); // no ilce, notes used
  });

  it("respects is_active=false as durum=false", () => {
    const row = {
      region: "TA5",
      city_district: "ADANA",
      band: "VHF",
      rx: "145.600",
      tx: "145.000",
      ton: "",
      is_active: false,
    };
    const rec = normalizeTelsizcilikRow(row);
    assert.equal(rec.durum, false);
    assert.equal(rec.ton, null);
  });

  it("returns null when RX is missing or junk", () => {
    assert.equal(normalizeTelsizcilikRow({ rx: "", band: "VHF" }), null);
    assert.equal(normalizeTelsizcilikRow({ rx: "abc", band: "VHF" }), null);
  });
});
