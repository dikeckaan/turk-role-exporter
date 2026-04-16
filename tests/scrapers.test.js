import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AIRBAND_FALLBACK, MARINE_FALLBACK } from "../worker/fallback-data.js";
import { parseMarineHtml } from "../worker/scrapers.js";

describe("fallback data shape", () => {
  it("airband has iller with havalimanlari and frekanslar", () => {
    assert.equal(AIRBAND_FALLBACK.kaynak, "fallback");
    assert.ok(Array.isArray(AIRBAND_FALLBACK.iller));
    assert.ok(AIRBAND_FALLBACK.iller.length > 0);
    const il = AIRBAND_FALLBACK.iller[0];
    assert.ok(il.il);
    assert.ok(Array.isArray(il.havalimanlari));
    assert.ok(il.havalimanlari.length > 0);
    const hav = il.havalimanlari[0];
    assert.ok(hav.ad);
    assert.ok(hav.icao);
    assert.ok(Array.isArray(hav.frekanslar));
    assert.ok(hav.frekanslar.length > 0);
    const f = hav.frekanslar[0];
    assert.ok(f.tur);
    assert.ok(f.frek);
  });

  it("marine has 3 bolumler with expected ids and non-empty frekanslar", () => {
    assert.equal(MARINE_FALLBACK.kaynak, "fallback");
    const ids = MARINE_FALLBACK.bolumler.map((b) => b.id);
    assert.deepEqual(ids, ["vhf", "sar", "sahil"]);
    for (const b of MARINE_FALLBACK.bolumler) {
      assert.ok(b.ad);
      assert.ok(b.frekanslar.length > 0);
      for (const f of b.frekanslar) {
        assert.ok(f.kanal);
        assert.ok(f.frek);
      }
    }
  });
});

describe("parseMarineHtml (ta1dx VHF Marine Band)", () => {
  const html = readFileSync(new URL("./fixtures/ta1dx-bandmarine.html", import.meta.url), "utf8");

  it("extracts at least 20 VHF channels with CHxx kanal and 15x.yyy frek", () => {
    const result = parseMarineHtml(html);
    assert.equal(result.bolumler.length, 1);
    const vhf = result.bolumler[0];
    assert.equal(vhf.id, "vhf");
    assert.ok(vhf.frekanslar.length >= 20);
    for (const f of vhf.frekanslar) {
      assert.match(f.kanal, /^CH\d+$/);
      const n = parseFloat(f.frek);
      assert.ok(n >= 155 && n <= 163, `freq ${f.frek} out of VHF marine range`);
    }
  });

  it("includes CH16 (distress) when parsed", () => {
    const result = parseMarineHtml(html);
    const vhf = result.bolumler[0];
    const ch16 = vhf.frekanslar.find((f) => f.kanal === "CH16");
    assert.ok(ch16, "CH16 missing from parsed output");
    assert.equal(ch16.frek, "156.800");
  });

  it("merges sar+sahil bolumler from fallback when provided", () => {
    const result = parseMarineHtml(html, MARINE_FALLBACK);
    const ids = result.bolumler.map((b) => b.id);
    assert.deepEqual(ids, ["vhf", "sar", "sahil"]);
    // vhf should be live (from parse), sar/sahil copied from fallback
    const sar = result.bolumler.find((b) => b.id === "sar");
    assert.deepEqual(sar.frekanslar, MARINE_FALLBACK.bolumler.find((b) => b.id === "sar").frekanslar);
  });

  it("throws on HTML with no marine frequencies", () => {
    assert.throws(() => parseMarineHtml("<html><body>no data</body></html>"));
  });
});
