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
    "CrossMode", "Mode", "TStep", "Skip", "Power", "Comment",
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
  fmSimplexEkle: false,
  fmSimplexSecim: { vhf: [], uhf: [] },
  dijitalSimplexEkle: false,
  dijitalSimplexSecim: { vhf: [], uhf: [] },
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
    assert.equal(basliklar.length, 17);
    for (const row of satirlar) {
      assert.equal(row.length, 17);
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
      { iller: ["Istanbul"], havalimanlari: { LTBA: ["ATIS"] } });
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

describe("CHIRP simplex satırları", () => {
  it("FM simplex açıkken seçili kanallar Mode=FM ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: ["U01"] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    assert.equal(satirlar.length, 2);
    const v01 = satirlar.find(r => parseFloat(r[2]) === 145.5);
    assert.ok(v01, "V01 satırı bulunamadı");
    assert.equal(v01[12], "FM");          // Mode
    assert.equal(v01[6], "");             // rToneFreq boş
    assert.equal(v01[5], "");             // Tone field boş
  });

  it("USB modu olan SSB Calling kanalı Mode=USB ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["VSB"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    const sb = satirlar.find(r => parseFloat(r[2]) === 144.3);
    assert.equal(sb[12], "USB");
  });

  it("dijital simplex analog cihazda Duplex=off (RX-only) yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV2"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    const dmr = satirlar.find(r => parseFloat(r[2]) === 144.55);
    assert.ok(dmr);
    assert.equal(dmr[3], "off");                 // Duplex
    assert.equal(dmr[12], "FM");                  // Mode (analog cihaz)
    assert.equal(dmr[14], "S");                   // Skip
    if (chirpProfil.csvSutunlari.includes("Comment")) {
      const cmt = chirpProfil.csvSutunlari.indexOf("Comment");
      assert.match(dmr[cmt], /DMR/);
      assert.match(dmr[cmt], /TG99/);
    }
  });

  it("hiçbir simplex açık değilse simplex satırı eklenmez", () => {
    const { satirlar } = csvSatirlarUret([], chirpProfil, defaultOpsiyonlar);
    assert.equal(satirlar.length, 0);
  });

  it("FM Comment kolonuna ad yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    const v01 = satirlar.find(r => parseFloat(r[2]) === 145.5);
    assert.equal(v01[16], "VHF Calling");
  });

  it("FM ve dijital aynı anda açıldığında her ikisi de yazılır, FM önce", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV2"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], chirpProfil, opts);
    assert.equal(satirlar.length, 2);
    // FM önce gelmeli (Location 1), dijital sonra (Location 2)
    assert.equal(parseFloat(satirlar[0][2]), 145.5);
    assert.equal(parseFloat(satirlar[1][2]), 144.55);
    assert.ok(parseInt(satirlar[0][0]) < parseInt(satirlar[1][0]));
  });
});
