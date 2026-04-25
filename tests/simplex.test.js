import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { secilenSimplexFrekanslari } from "../docs/js/simplex-ui.js";
import { FM_SIMPLEX, DIJITAL_SIMPLEX } from "../docs/js/frekanslar.js";

describe("secilenSimplexFrekanslari", () => {
  it("seçimi olan bantları flat liste olarak döner", () => {
    const out = secilenSimplexFrekanslari(FM_SIMPLEX, { vhf: ["V01"], uhf: ["U01"] });
    assert.equal(out.length, 2);
    assert.equal(out[0].kanal, "V01");
    assert.equal(out[0].bolum, "vhf");
    assert.equal(out[1].kanal, "U01");
    assert.equal(out[1].bolum, "uhf");
  });

  it("boş seçimde boş liste döner", () => {
    const out = secilenSimplexFrekanslari(FM_SIMPLEX, { vhf: [], uhf: [] });
    assert.equal(out.length, 0);
  });

  it("dataset null ise boş liste döner", () => {
    assert.deepEqual(secilenSimplexFrekanslari(null, { vhf: ["V01"] }), []);
  });

  it("dijital dataset DMR mod ve param alanlarını korur", () => {
    const out = secilenSimplexFrekanslari(DIJITAL_SIMPLEX, { vhf: ["DV2"], uhf: [] });
    assert.equal(out.length, 1);
    assert.equal(out[0].mod, "DMR");
    assert.equal(out[0].param, "TG99 CC1 TS1");
  });

  it("var olmayan kanal seçimi sessizce yok sayılır", () => {
    const out = secilenSimplexFrekanslari(FM_SIMPLEX, { vhf: ["YOKBOYLE"], uhf: [] });
    assert.equal(out.length, 0);
  });
});
