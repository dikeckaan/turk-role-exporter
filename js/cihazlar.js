export const CIHAZ_PROFILLERI = {
  "quansheng-uv-k5-f4hwn": {
    ad: "Quansheng UV-K5 (F4HWN v4.3)",
    aciklama: "Custom firmware | Analog | FM/AM/USB | 18MHz-1.3GHz RX",
    bantlar: ["VHF", "UHF"],
    modlar: ["Analog"],
    maxKanal: 200,
    csvFormat: "chirp",
    csvSutunlari: [
      "Location", "Name", "Frequency", "Duplex", "Offset", "Tone",
      "rToneFreq", "cToneFreq", "DtcsCode", "DtcsPolarity", "RxDtcsCode",
      "CrossMode", "Mode", "TStep", "Skip", "Power", "Comment",
      "URCALL", "RPT1CALL", "RPT2CALL", "DVCODE",
    ],
    varsayilanDegerler: {
      tStep: "12.50",
      dtcsCode: "023",
      dtcsPolarity: "NN",
      rxDtcsCode: "023",
      crossMode: "Tone->Tone",
      mode: "FM",
    },
    shiftHesaplama: { VHF: -0.600, UHF: -7.600 },
    gucSeviyeleri: {
      High: "5.0W",
      Mid: "2.0W",
      Low5: "1.0W",
      Low4: "0.5W",
      Low3: "0.3W",
      Low2: "0.2W",
      Low1: "0.1W",
    },
    ekOzellikler: {
      fmRadyo: true,
      airBand: true,
      bandscope: true,
      ssbDemod: true,
      marineBand: true,
      genisRX: "18MHz - 1.3GHz",
      txBant: "VHF (136-174) / UHF (400-470)",
    },
  },
  "tyt-md-uv390-plus": {
    ad: "TYT MD-UV390 Plus",
    aciklama: "DMR Dijital + Analog | VHF/UHF",
    bantlar: ["VHF", "UHF"],
    modlar: ["Analog", "Dijital"],
    maxKanal: 3000,
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
    shiftHesaplama: { VHF: -0.600, UHF: -7.600 },
    gucSeviyeleri: { High: "2", Mid: "1", Low: "0" },
  },
};

export function cihazListesi() {
  return Object.entries(CIHAZ_PROFILLERI).map(([id, profil]) => ({ id, ad: profil.ad }));
}

export function cihazProfili(id) {
  return CIHAZ_PROFILLERI[id] ?? null;
}
