import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIRBAND_FALLBACK } from "../worker/fallback-data.js";
import { secilenAirbandFrekanslari } from "../docs/js/airband-ui.js";
import { presetSerialize, presetDeserialize } from "../docs/js/presets.js";

describe("secilenAirbandFrekanslari", () => {
  it("returns empty when no iller selected", () => {
    assert.deepEqual(
      secilenAirbandFrekanslari(AIRBAND_FALLBACK, { iller: [], havalimanlari: {} }),
      [],
    );
  });

  it("filters by selected il and airport types", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTBA: ["ATIS", "Ground"] } };
    const result = secilenAirbandFrekanslari(AIRBAND_FALLBACK, secim);
    assert.ok(result.length > 0);
    for (const f of result) {
      assert.equal(f.icao, "LTBA");
      assert.ok(["ATIS", "Ground"].includes(f.tur));
    }
  });

  it("skips airports with no turler selected", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTBA: [] } };
    assert.deepEqual(secilenAirbandFrekanslari(AIRBAND_FALLBACK, secim), []);
  });

  it("returned items have required fields", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTBA: ["ATIS"] } };
    const result = secilenAirbandFrekanslari(AIRBAND_FALLBACK, secim);
    assert.ok(result.length > 0);
    for (const f of result) {
      assert.ok(f.icao);
      assert.ok(f.tur);
      assert.ok(f.frek);
      assert.ok(f.ad);
    }
  });
});

describe("secilenAirbandFrekanslari dedup", () => {
  it("deduplicates by icao+tur+frek across duplicate il entries", () => {
    const dup = {
      kaynak: "fallback",
      iller: [
        { il: "A", havalimanlari: [{ ad: "X", icao: "LTXX", frekanslar: [{tur:"Tower", frek:"118.1"}] }] },
        { il: "B", havalimanlari: [{ ad: "X", icao: "LTXX", frekanslar: [{tur:"Tower", frek:"118.1"}] }] },
      ],
    };
    const result = secilenAirbandFrekanslari(dup,
      { iller: ["A", "B"], havalimanlari: { LTXX: ["Tower"] } });
    assert.equal(result.length, 1);
  });
});

describe("preset airband/marine roundtrip", () => {
  it("preserves airbandSecim and marineSecim", () => {
    const original = {
      airbandSecim: { iller: ["Istanbul"], havalimanlari: { LTFM: ["ATIS"] } },
      marineSecim:  { vhf: ["CH16"], sar: [], sahil: [] },
    };
    const back = presetDeserialize(presetSerialize(original));
    assert.deepEqual(back.airbandSecim, original.airbandSecim);
    assert.deepEqual(back.marineSecim,  original.marineSecim);
  });

  it("deserialize tolerates missing new fields (v1 preset)", () => {
    const v1 = JSON.stringify({ version: 1, opsiyonlar: {} });
    const back = presetDeserialize(v1);
    assert.deepEqual(back.airbandSecim, { iller: [], havalimanlari: {} });
    assert.deepEqual(back.marineSecim,  { vhf: [], sar: [], sahil: [] });
  });

  it("deserialize accepts object input in addition to string", () => {
    const back = presetDeserialize({ version: 2, airbandSecim: { iller: ["X"], havalimanlari: {} } });
    assert.deepEqual(back.airbandSecim, { iller: ["X"], havalimanlari: {} });
  });

  it("serialize writes version 3", () => {
    const serialized = presetSerialize({});
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.version, 3);
  });
});
