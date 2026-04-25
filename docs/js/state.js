/**
 * state.js
 * Centralized mutable state for the application.
 * All modules import and mutate this shared object.
 */

export const state = {
  amatortelsizcilikRoleler: [],
  taroleRoleler: [],
  telsizcilikRoleler: [],
  birlesikRoleler: [],
  filtrelenmisRoleler: [],
  seciliCihaz: "quansheng-uv-k5-f4hwn",
  authToken: sessionStorage.getItem("authToken") || null,
  airbandData: null,
  marineData: null,
  airbandSecim: { iller: [], havalimanlari: {} },
  marineSecim: { vhf: [], sar: [], sahil: [] },
  fmSimplexSecim:      { vhf: ["V01", "VSB"], uhf: ["U01", "USB"] },
  dijitalSimplexSecim: { vhf: [], uhf: [] },

  duzenlenmisRoleler: [],
  csvBasliklar: [],
  csvSatirlar: [],

  amatortelsizcilikYuklendi: false,
  taroleYuklendi: false,
  telsizcilikYuklendi: false,
  amatortelsizcilikYuklenmeZamani: null,
  taroleYuklenmeZamani: null,
  telsizcilikYuklenmeZamani: null,
};

export const CACHE_SURESI_MS = 4 * 60 * 60 * 1000; // 4 saat
