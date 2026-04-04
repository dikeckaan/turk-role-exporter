import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filtrele, benzersizSehirler, benzersizTaBolgeleri } from "../docs/js/filtreler.js";

const mockRoleler = [
  { sehir: "istanbul", bant: "VHF", durum: true, tabolge: "TA1", ruhsat: true, digital: 0, ilce: "Kadikoy" },
  { sehir: "ankara", bant: "UHF", durum: true, tabolge: "TA2", ruhsat: false, digital: 1, ilce: "Cankaya" },
  { sehir: "izmir", bant: "VHF", durum: false, tabolge: "TA3", ruhsat: true, digital: 0, ilce: "Konak" },
  { sehir: "istanbul", bant: "UHF", durum: true, tabolge: "TA1", ruhsat: true, digital: 2, ilce: "Besiktas" },
];

const minProfil = { bantlar: ["VHF", "UHF"], modlar: ["Analog", "Dijital"] };

describe("benzersizSehirler", () => {
  it("returns unique sorted city names", () => {
    const sehirler = benzersizSehirler(mockRoleler);
    assert.deepEqual(sehirler, ["ankara", "istanbul", "izmir"]);
  });
});

describe("benzersizTaBolgeleri", () => {
  it("returns unique sorted TA regions", () => {
    const bolgeler = benzersizTaBolgeleri(mockRoleler);
    assert.deepEqual(bolgeler, ["TA1", "TA2", "TA3"]);
  });
});

describe("filtrele", () => {
  it("filters by aktif status", () => {
    const filtreler = {
      sadeceAktif: true,
      sadeceRuhsatli: false,
      bantlar: ["VHF", "UHF"],
      mod: "hepsi",
      taBolgeleri: ["TA1", "TA2", "TA3"],
      sehirler: ["istanbul", "ankara", "izmir"],
      ilceler: ["Kadikoy", "Cankaya", "Konak", "Besiktas"],
      dusukPuanGizle: false,
    };
    const sonuc = filtrele(mockRoleler, filtreler, minProfil);
    assert.equal(sonuc.length, 3); // izmir is pasif
  });

  it("filters by band", () => {
    const filtreler = {
      sadeceAktif: false,
      sadeceRuhsatli: false,
      bantlar: ["VHF"],
      mod: "hepsi",
      taBolgeleri: ["TA1", "TA2", "TA3"],
      sehirler: ["istanbul", "ankara", "izmir"],
      ilceler: ["Kadikoy", "Cankaya", "Konak", "Besiktas"],
      dusukPuanGizle: false,
    };
    const sonuc = filtrele(mockRoleler, filtreler, minProfil);
    assert.equal(sonuc.length, 2); // istanbul VHF + izmir VHF
  });

  it("filters by city", () => {
    const filtreler = {
      sadeceAktif: false,
      sadeceRuhsatli: false,
      bantlar: ["VHF", "UHF"],
      mod: "hepsi",
      taBolgeleri: ["TA1", "TA2", "TA3"],
      sehirler: ["istanbul"],
      ilceler: ["Kadikoy", "Besiktas"],
      dusukPuanGizle: false,
    };
    const sonuc = filtrele(mockRoleler, filtreler, minProfil);
    assert.equal(sonuc.length, 2);
  });

  it("filters by ruhsat", () => {
    const filtreler = {
      sadeceAktif: false,
      sadeceRuhsatli: true,
      bantlar: ["VHF", "UHF"],
      mod: "hepsi",
      taBolgeleri: ["TA1", "TA2", "TA3"],
      sehirler: ["istanbul", "ankara", "izmir"],
      ilceler: ["Kadikoy", "Cankaya", "Konak", "Besiktas"],
      dusukPuanGizle: false,
    };
    const sonuc = filtrele(mockRoleler, filtreler, minProfil);
    assert.equal(sonuc.length, 3); // ankara has no ruhsat
  });
});
