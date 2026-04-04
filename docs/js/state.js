/**
 * state.js
 * Centralized mutable state for the application.
 * All modules import and mutate this shared object.
 */

export const state = {
  amatortelsizcilikRoleler: [],
  taroleRoleler: [],
  birlesikRoleler: [],
  filtrelenmisRoleler: [],
  seciliCihaz: "quansheng-uv-k5-f4hwn",
  authToken: sessionStorage.getItem("authToken") || null,
  airbandData: null,
  marineData: null,

  duzenlenmisRoleler: [],
  csvBasliklar: [],
  csvSatirlar: [],

  amatortelsizcilikYuklendi: false,
  taroleYuklendi: false,
  amatortelsizcilikYuklenmeZamani: null,
  taroleYuklenmeZamani: null,
};

export const CACHE_SURESI_MS = 4 * 60 * 60 * 1000; // 4 saat
