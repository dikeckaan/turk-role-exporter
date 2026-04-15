import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { csvSatirlarUret, csvStringOlustur, jsonOlustur } from "../docs/js/csv.js";
import { secilenAirbandFrekanslari } from "../docs/js/airband-ui.js";
import { secilenMarineFrekanslari } from "../docs/js/marine-ui.js";
import { AIRBAND_FALLBACK, MARINE_FALLBACK } from "../worker/fallback-data.js";

// Minimal CHIRP profile for testing
const chirpProfil = {
  csvFormat: "chirp",
  csvSutunlari: [
    "Location", "Name", "Frequency", "Duplex", "Offset", "Tone",
    "rToneFreq", "cToneFreq", "DtcsCode", "DtcsPolarity", "RxDtcsCode",
    "CrossMode", "Mode", "TStep", "Skip", "Power",
  ],
  varsayilanDegerler: {
    dtcsCode: "023", dtcsPolarity: "NN", rxDtcsCode: "023",
    crossMode: "Tone->Tone", mode: "FM", tStep: "5.00",
  },
  gucSeviyeleri: { High: "5.0W", Low: "1.0W" },
  maxKanalAdi: 10,
  bantlar: ["VHF", "UHF"],
  modlar: ["Analog"],
  maxKanal: 200,
  shiftHesaplama: { VHF: -0.6, UHF: -7.6 },
};

const mockRoleler = [
  {
    sehir: "istanbul",
    bant: "UHF",
    frekans: "439.200",
    konum: "Camlica",
    rxtx: "TxRx",
    ton: "88.5",
    durum: true,
    id: "test-1",
  },
  {
    sehir: "ankara",
    bant: "VHF",
    frekans: "145.600",
    konum: "Ankara",
    rxtx: "TxRx",
    ton: "77.0",
    durum: true,
    id: "test-2",
  },
];

const defaultOpsiyonlar = {
  pmrEkle: false,
  pmrRxOnly: false,
  dpmrEkle: false,
  dpmrRxOnly: false,
  fmRadyoEkle: false,
  fmSehirler: [],
  airbandEkle: false,
  airbandSecili: [],
  marineEkle: false,
  marineSecili: [],
  simplexEkle: false,
  rxOnly: true,
  gucSeviyesi: "High",
  kanalAdiFormati: "plaka-konum-bant",
  dosyaAdi: "test.csv",
  bosAnalogAdet: 0,
  bosAnalogFrekans: "145.500",
  bosDijitalAdet: 0,
  bosDijitalFrekans: "438.500",
};

describe("csvSatirlarUret", () => {
  it("generates correct number of rows", () => {
    const { satirlar } = csvSatirlarUret(mockRoleler, chirpProfil, defaultOpsiyonlar);
    assert.equal(satirlar.length, 2);
  });

  it("generates correct column count per row", () => {
    const { basliklar, satirlar } = csvSatirlarUret(mockRoleler, chirpProfil, defaultOpsiyonlar);
    assert.equal(basliklar.length, 16);
    for (const row of satirlar) {
      assert.equal(row.length, 16);
    }
  });

  it("includes PMR channels when enabled", () => {
    const ops = { ...defaultOpsiyonlar, pmrEkle: true };
    const { satirlar } = csvSatirlarUret(mockRoleler, chirpProfil, ops);
    assert.equal(satirlar.length, 2 + 16); // 2 roles + 16 PMR
  });

  it("includes empty analog channels", () => {
    const ops = { ...defaultOpsiyonlar, bosAnalogAdet: 5 };
    const { satirlar } = csvSatirlarUret(mockRoleler, chirpProfil, ops);
    assert.equal(satirlar.length, 2 + 5);
  });
});

describe("csvStringOlustur", () => {
  it("generates valid CSV string", () => {
    const basliklar = ["A", "B", "C"];
    const satirlar = [["1", "2", "3"], ["4", "5", "6"]];
    const csv = csvStringOlustur(basliklar, satirlar);
    const lines = csv.split("\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0], "A,B,C");
    assert.equal(lines[1], "1,2,3");
  });

  it("escapes commas in values", () => {
    const csv = csvStringOlustur(["A"], [["hello, world"]]);
    assert.ok(csv.includes('"hello, world"'));
  });
});

describe("csv with airband selection", () => {
  it("produces AM rows only for selected airport+type combos", () => {
    const airbandSecili = secilenAirbandFrekanslari(AIRBAND_FALLBACK,
      { iller: ["Istanbul"], havalimanlari: { LTFM: ["ATIS"] } });
    const { satirlar } = csvSatirlarUret([], chirpProfil,
      { ...defaultOpsiyonlar, airbandEkle: true, airbandSecili, marineEkle: false });
    assert.ok(satirlar.length > 0);
    // All airband rows should be AM mode (col index 12)
    for (const r of satirlar) assert.equal(r[12], "AM");
  });

  it("produces no rows when airband selection empty", () => {
    const { satirlar } = csvSatirlarUret([], chirpProfil,
      { ...defaultOpsiyonlar, airbandEkle: true, airbandSecili: [], marineEkle: false });
    assert.equal(satirlar.length, 0);
  });
});

describe("csv with marine selection", () => {
  it("produces FM rows only for selected marine channels", () => {
    const marineSecili = secilenMarineFrekanslari(MARINE_FALLBACK,
      { vhf: ["CH16", "CH70"], sar: [], sahil: [] });
    const { satirlar } = csvSatirlarUret([], chirpProfil,
      { ...defaultOpsiyonlar, airbandEkle: false, marineEkle: true, marineSecili });
    assert.equal(satirlar.length, 2);
    for (const r of satirlar) assert.equal(r[12], "FM");
  });

  it("produces no rows when marine selection empty", () => {
    const { satirlar } = csvSatirlarUret([], chirpProfil,
      { ...defaultOpsiyonlar, airbandEkle: false, marineEkle: true, marineSecili: [] });
    assert.equal(satirlar.length, 0);
  });
});

describe("jsonOlustur", () => {
  it("generates valid JSON array", () => {
    const basliklar = ["Name", "Freq"];
    const satirlar = [["Test", "145.5"], ["PMR 1", "446.0"]];
    const json = jsonOlustur(basliklar, satirlar);
    const parsed = JSON.parse(json);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].Name, "Test");
    assert.equal(parsed[1].Freq, "446.0");
  });
});
