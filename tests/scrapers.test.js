import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIRBAND_FALLBACK, MARINE_FALLBACK } from "../worker/fallback-data.js";

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
