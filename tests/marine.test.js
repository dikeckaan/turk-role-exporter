import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MARINE_FALLBACK } from "../worker/fallback-data.js";
import { secilenMarineFrekanslari } from "../docs/js/marine-ui.js";

describe("secilenMarineFrekanslari", () => {
  it("returns empty when no channels selected", () => {
    assert.deepEqual(
      secilenMarineFrekanslari(MARINE_FALLBACK, { vhf: [], sar: [], sahil: [] }),
      [],
    );
  });

  it("returns only selected channels within each bolum", () => {
    const result = secilenMarineFrekanslari(MARINE_FALLBACK,
      { vhf: ["CH16", "CH70"], sar: [], sahil: [] });
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((r) => r.kanal).sort(), ["CH16", "CH70"]);
  });

  it("picks across multiple bolumler", () => {
    const result = secilenMarineFrekanslari(MARINE_FALLBACK,
      { vhf: ["CH16"], sar: ["SAR-1"], sahil: [] });
    assert.equal(result.length, 2);
  });

  it("returned items have required fields", () => {
    const result = secilenMarineFrekanslari(MARINE_FALLBACK,
      { vhf: ["CH16"], sar: [], sahil: [] });
    assert.ok(result.length > 0);
    for (const r of result) {
      assert.ok(r.kanal);
      assert.ok(r.frek);
      assert.ok(r.ad);
      assert.ok(r.bolum);
    }
  });

  it("tolerates missing dataset gracefully", () => {
    assert.deepEqual(secilenMarineFrekanslari(null, { vhf: [], sar: [], sahil: [] }), []);
    assert.deepEqual(secilenMarineFrekanslari({ bolumler: null }, { vhf: [], sar: [], sahil: [] }), []);
  });
});
