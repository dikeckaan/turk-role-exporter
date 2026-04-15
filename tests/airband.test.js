import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIRBAND_FALLBACK } from "../worker/fallback-data.js";
import { secilenAirbandFrekanslari } from "../docs/js/airband-ui.js";

describe("secilenAirbandFrekanslari", () => {
  it("returns empty when no iller selected", () => {
    assert.deepEqual(
      secilenAirbandFrekanslari(AIRBAND_FALLBACK, { iller: [], havalimanlari: {} }),
      [],
    );
  });

  it("filters by selected il and airport types", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTFM: ["ATIS", "Tower"] } };
    const result = secilenAirbandFrekanslari(AIRBAND_FALLBACK, secim);
    assert.ok(result.length > 0);
    for (const f of result) {
      assert.equal(f.icao, "LTFM");
      assert.ok(["ATIS", "Tower"].includes(f.tur));
    }
  });

  it("skips airports with no turler selected", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTFM: [] } };
    assert.deepEqual(secilenAirbandFrekanslari(AIRBAND_FALLBACK, secim), []);
  });

  it("returned items have required fields", () => {
    const secim = { iller: ["Istanbul"], havalimanlari: { LTFM: ["ATIS"] } };
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
