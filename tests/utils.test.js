import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  temizleTurkce,
  normalizeTurkce,
  sehirPlaka,
  kanalAdiOlustur,
  txFrekansHesapla,
  puanHesapla,
} from "../docs/js/utils.js";

describe("temizleTurkce", () => {
  it("replaces Turkish chars with ASCII", () => {
    assert.equal(temizleTurkce("Çankırı"), "Cankiri");
    assert.equal(temizleTurkce("İstanbul"), "Istanbul");
    assert.equal(temizleTurkce("Şırnak"), "Sirnak");
    assert.equal(temizleTurkce("Düzce"), "Duzce");
    assert.equal(temizleTurkce("Ağrı"), "Agri");
    assert.equal(temizleTurkce("Muğla"), "Mugla");
    assert.equal(temizleTurkce("Eskişehir"), "Eskisehir");
  });

  it("strips non-alphanumeric chars", () => {
    assert.equal(temizleTurkce("test-value_123"), "testvalue123");
  });

  it("handles empty/null input", () => {
    assert.equal(temizleTurkce(""), "");
    assert.equal(temizleTurkce(null), "");
    assert.equal(temizleTurkce(undefined), "");
  });
});

describe("normalizeTurkce", () => {
  it("normalizes to lowercase ASCII", () => {
    assert.equal(normalizeTurkce("İstanbul"), "istanbul");
    assert.equal(normalizeTurkce("Şırnak"), "sirnak");
    assert.equal(normalizeTurkce("ÇANKIRI"), "cankiri");
    assert.equal(normalizeTurkce("Düzce"), "duzce");
    assert.equal(normalizeTurkce("Ağrı"), "agri");
  });

  it("keeps non-alpha chars (unlike temizleTurkce)", () => {
    assert.equal(normalizeTurkce("test-123"), "test-123");
  });

  it("handles empty input", () => {
    assert.equal(normalizeTurkce(""), "");
    assert.equal(normalizeTurkce(null), "");
  });
});

describe("sehirPlaka", () => {
  it("returns plaka code for known cities", () => {
    assert.equal(sehirPlaka("İstanbul"), "34");
    assert.equal(sehirPlaka("Ankara"), "06");
    assert.equal(sehirPlaka("İzmir"), "35");
    assert.equal(sehirPlaka("Çankırı"), "18");
  });

  it("falls back to first 3 chars for unknown cities", () => {
    assert.equal(sehirPlaka("BilinmeyenSehir"), "BIL");
  });
});

describe("kanalAdiOlustur", () => {
  const role = {
    sehir: "İstanbul",
    bant: "UHF",
    konum: "Camlica Tepesi",
    id: "test-1",
  };

  it("creates plaka-konum-bant format", () => {
    const name = kanalAdiOlustur(role, "plaka-konum-bant");
    assert.ok(name.startsWith("34"));
    assert.ok(name.length <= 15);
  });

  it("creates plaka-bant-konum-kisa format (max 10)", () => {
    const name = kanalAdiOlustur(role, "plaka-bant-konum-kisa");
    assert.ok(name.length <= 10);
    assert.ok(name.includes("U")); // UHF band letter
  });

  it("truncates long names", () => {
    const longRole = { ...role, konum: "Cok Uzun Bir Konum Ismi" };
    const name = kanalAdiOlustur(longRole, "plaka-konum-bant");
    assert.ok(name.length <= 15);
  });
});

describe("txFrekansHesapla", () => {
  it("returns formatted frequency for simplex", () => {
    const role = { frekans: "145.700", rxtx: "Rx" };
    const result = txFrekansHesapla(role, null);
    assert.equal(result, "145.70000");
  });

  it("calculates TX with shift", () => {
    const role = { frekans: "145.700", rxtx: "TxRx", bant: "VHF" };
    const shift = { VHF: -0.6, UHF: -7.6 };
    const result = txFrekansHesapla(role, shift);
    assert.equal(result, "145.10000");
  });

  it("handles comma decimal separator", () => {
    const role = { frekans: "145,700", rxtx: "Rx" };
    const result = txFrekansHesapla(role, null);
    assert.equal(result, "145.70000");
  });
});

describe("puanHesapla", () => {
  it("returns 100 for no votes", () => {
    assert.equal(puanHesapla({}), 100);
  });

  it("calculates percentage correctly", () => {
    assert.equal(puanHesapla({ thumbs_up: 3, thumbs_down: 1 }), 75);
    assert.equal(puanHesapla({ thumbs_up: 0, thumbs_down: 5 }), 0);
  });
});
