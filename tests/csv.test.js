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

const cpsProfil = {
  csvFormat: "cps",
  csvSutunlari: [
    "Channel Mode", "Channel Name", "RX Frequency(MHz)", "TX Frequency(MHz)",
    "Band Width", "Scan List", "Squelch", "RX Ref Frequency", "TX Ref Frequency",
    "TOT[s]", "TOT Rekey Delay[s]", "Power", "Admit Criteria", "Auto Scan",
    "Rx Only", "Lone Worker", "VOX", "Allow Talkaround", "Send GPS Info",
    "Receive GPS Info", "Private Call Confirmed", "Emergency Alarm Ack",
    "Data Call Confirmed", "Allow Interrupt", "DCDM Switch", "Leader/MS",
    "Emergency System", "Contact Name", "Group List", "Color Code",
    "Repeater Slot", "In Call Criteria", "Privacy", "Privacy No.", "GPS System",
    "CTCSS/DCS Dec", "CTCSS/DCS Enc", "Rx Signaling System", "Tx Signaling System",
    "QT Reverse", "Non-QT/DQT Turn-off Freq", "Display PTT ID",
    "Reverse Burst/Turn-off Code", "Decode 1", "Decode 2", "Decode 3",
    "Decode 4", "Decode 5", "Decode 6", "Decode 7", "Decode 8",
  ],
  varsayilanDegerler: {
    bandWidth: "0", squelch: "3", tot: "4", power: "2",
    leaderMS: "1", contactName: "1", groupList: "1", colorCode: "1",
    nonQtDqt: "2", displayPtt: "1", reverseBurst: "1",
  },
  shiftHesaplama: { VHF: -0.6, UHF: -7.6 },
  gucSeviyeleri: { High: "2", Mid: "1", Low: "0" },
  maxKanalAdi: 16,
  bantlar: ["VHF", "UHF"],
  modlar: ["Analog", "Dijital"],
  maxKanal: 3000,
};

const opengd77Profil = {
  csvFormat: "opengd77",
  csvSutunlari: [
    "Channel Number", "Channel Name", "Channel Type", "Rx Frequency", "Tx Frequency",
    "Bandwidth (kHz)", "Colour Code", "Timeslot", "Contact", "TG List", "DMR ID",
    "TS1_TA_Tx", "TS2_TA_Tx ID", "RX Tone", "TX Tone", "Squelch", "Power",
    "Rx Only", "Zone Skip", "All Skip", "TOT", "VOX", "No Beep", "No Eco",
    "APRS", "Latitude", "Longitude", "Use Location",
  ],
  varsayilanDegerler: { bandwidth: "12.5", colourCode: "1", timeslot: "1", tgList: "None", dmrId: "None", squelch: "Disabled" },
  gucSeviyeleri: { Master: "Master" },
  maxKanalAdi: 16,
  bantlar: ["VHF", "UHF"], modlar: ["Analog", "Dijital"], maxKanal: 1023,
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

describe("CPS simplex satırları", () => {
  it("FM simplex Channel Mode=1 (analog) ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], cpsProfil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][0], "1");                // Channel Mode = Analog
    assert.equal(satirlar[0][2], "145.50000");        // RX 5 decimal
    assert.equal(satirlar[0][36], "None");            // CTCSS/DCS Enc
  });

  it("dijital simplex Channel Mode=2 (DMR) ile Color Code+TimeSlot yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV2"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], cpsProfil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][0], "2");                // Channel Mode = Digital
    assert.equal(satirlar[0][29], "1");               // Color Code from "TG99 CC1 TS1"
    assert.equal(satirlar[0][30], "1");               // Repeater Slot
  });
});

describe("OpenGD77 simplex satırları", () => {
  it("FM simplex Channel Type=Analogue ile yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      gucSeviyesi: "Master",
      fmSimplexEkle: true,
      fmSimplexSecim: { vhf: ["V01"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], opengd77Profil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][2], "Analogue");
  });

  it("dijital simplex Channel Type=Digital + Colour Code/Timeslot doğru yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      gucSeviyesi: "Master",
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV2"], uhf: [] },
    };
    const { satirlar } = csvSatirlarUret([], opengd77Profil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][2], "Digital");
    assert.equal(satirlar[0][6], "1");          // Colour Code
    assert.equal(satirlar[0][7], "1");          // Timeslot
  });

  it("OpenGD77'de NXDN simplex Analogue placeholder olarak yazılır (DMR değil)", () => {
    const opts = { ...defaultOpsiyonlar,
      gucSeviyesi: "Master",
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV3"], uhf: [] },  // NXDN
    };
    const { satirlar } = csvSatirlarUret([], opengd77Profil, opts);
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0][2], "Analogue");  // not Digital
  });

  it("OpenGD77'de C4FM ve D-STAR simplex Analogue olarak yazılır", () => {
    const opts = { ...defaultOpsiyonlar,
      gucSeviyesi: "Master",
      dijitalSimplexEkle: true,
      dijitalSimplexSecim: { vhf: ["DV1", "DV4"], uhf: [] },  // C4FM + D-STAR
    };
    const { satirlar } = csvSatirlarUret([], opengd77Profil, opts);
    assert.equal(satirlar.length, 2);
    assert.equal(satirlar[0][2], "Analogue");
    assert.equal(satirlar[1][2], "Analogue");
  });
});
