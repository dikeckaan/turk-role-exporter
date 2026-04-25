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

import { presetDeserialize } from "../docs/js/presets.js";

describe("preset v2 → v3 migration", () => {
  it("simplexEkle:true olan v2 preseti dijitalSimplexEkle ve tüm dijital kanallarla migrate eder", () => {
    const v2 = {
      version: 2,
      opsiyonlar: { simplexEkle: true, pmrEkle: false },
      airbandSecim: {},
      marineSecim:  {},
    };
    const out = presetDeserialize(v2);
    assert.equal(out.opsiyonlar.dijitalSimplexEkle, true);
    assert.equal(out.opsiyonlar.fmSimplexEkle, false);
    assert.equal(out.opsiyonlar.simplexEkle, undefined);
    assert.deepEqual(out.dijitalSimplexSecim.vhf, ["DV1", "DV2", "DV3", "DV4"]);
    assert.deepEqual(out.dijitalSimplexSecim.uhf, ["DU1", "DU2", "DU3", "DU4"]);
  });

  it("v3 preset'i olduğu gibi kalır", () => {
    const v3 = {
      version: 3,
      opsiyonlar: { dijitalSimplexEkle: false, fmSimplexEkle: true },
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
      dijitalSimplexSecim: { vhf: [], uhf: [] },
      airbandSecim: {}, marineSecim: {},
    };
    const out = presetDeserialize(v3);
    assert.equal(out.opsiyonlar.fmSimplexEkle, true);
    assert.deepEqual(out.fmSimplexSecim.vhf, ["V01"]);
  });
});
