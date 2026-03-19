// harita.js - Leaflet map with real Turkey province boundaries
// Leaflet (L) is loaded globally via CDN

import { isDijital, normalizeTurkce } from "./utils.js";

let map;
let pinKatmani;
let geoJsonKatmani;
let seciliBolgeler = new Set(["TA1", "TA2", "TA3", "TA4", "TA5", "TA6", "TA7", "TA8", "TA9"]);
let seciliSehirler = new Set();
let ilKatmanlari = {}; // key (normalized city name) → layer
let roleSayilari = {}; // key → repeater count
let _syncFromMap = false; // prevent sync loops
let clickingLayer = null; // tracks layer currently being clicked (replaces monkey-patch)

// TA region colors
const RENKLER = {
  TA1: "#e94560",
  TA2: "#f0a500",
  TA3: "#4ecca3",
  TA4: "#3282b8",
  TA5: "#bb86fc",
  TA6: "#03dac6",
  TA7: "#cf6679",
  TA8: "#ff7043",
  TA9: "#7c4dff",
};

function _ilStili(tabolge, secili) {
  const renk = RENKLER[tabolge] || "#666";
  return {
    color: secili ? renk : "rgba(255,255,255,0.2)",
    fillColor: renk,
    fillOpacity: secili ? 0.35 : 0.08,
    weight: secili ? 2 : 0.5,
  };
}

function _highlightStili(tabolge) {
  const renk = RENKLER[tabolge] || "#666";
  return {
    color: "#fff",
    fillColor: renk,
    fillOpacity: 0.5,
    weight: 2.5,
  };
}

export async function haritaBaslat() {
  map = L.map("harita", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([39.0, 35.5], 6);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    subdomains: "abcd",
  }).addTo(map);

  pinKatmani = L.layerGroup().addTo(map);

  // Ensure pins always render above province polygons
  map.createPane("pinPane");
  map.getPane("pinPane").style.zIndex = 650;

  // Load GeoJSON
  try {
    const resp = await fetch("data/turkey-provinces.json");
    const geojson = await resp.json();

    geoJsonKatmani = L.geoJSON(geojson, {
      style: (feature) => {
        // Initially all selected
        return _ilStili(feature.properties.tabolge, true);
      },
      onEachFeature: (feature, layer) => {
        const key = feature.properties.key;
        const tabolge = feature.properties.tabolge;
        ilKatmanlari[key] = layer;

        // Hover tooltip
        layer.bindTooltip("", {
          sticky: true,
          direction: "top",
          className: "il-tooltip",
          offset: [0, -10],
        });

        // Hover effects
        layer.on("mouseover", () => {
          const count = roleSayilari[key] || 0;
          layer.setTooltipContent(
            `<strong>${feature.properties.name}</strong> (${tabolge})<br>${count} röle`
          );
          if (clickingLayer !== layer) {
            layer.setStyle(_highlightStili(tabolge));
            layer.bringToFront();
          }
        });

        layer.on("mouseout", () => {
          if (clickingLayer !== layer) {
            const secili = seciliSehirler.has(key);
            layer.setStyle(_ilStili(tabolge, secili));
          }
        });

        // Click → toggle city
        layer.on("click", () => {
          clickingLayer = layer;
          if (seciliSehirler.has(key)) {
            seciliSehirler.delete(key);
          } else {
            seciliSehirler.add(key);
          }
          const secili = seciliSehirler.has(key);
          layer.setStyle(_ilStili(tabolge, secili));

          // Sync city checkbox in filter panel (flag prevents re-sync back)
          _syncFromMap = true;
          const cb = document.querySelector(`input[data-sehir="${key}"]`);
          if (cb && cb.checked !== secili) {
            cb.checked = secili;
          }
          document.dispatchEvent(new CustomEvent("filtre-degisti"));
          _syncFromMap = false;
          setTimeout(() => { clickingLayer = null; }, 100);
        });
      },
    }).addTo(map);

    // Fit to Turkey bounds
    map.fitBounds(geoJsonKatmani.getBounds(), { padding: [10, 10] });

    // Initialize all cities as selected
    for (const key of Object.keys(ilKatmanlari)) {
      seciliSehirler.add(key);
    }
  } catch (e) {
    console.error("GeoJSON yüklenemedi:", e);
  }
}

export function pinleriGuncelle(roleler) {
  pinKatmani.clearLayers();

  // Count repeaters per city for tooltip
  roleSayilari = {};
  for (const rol of roleler) {
    const key = normalizeTurkce(rol.sehir);
    if (key) roleSayilari[key] = (roleSayilari[key] || 0) + 1;
  }

  for (const rol of roleler) {
    if (rol.lat == null || rol.lon == null) continue;

    const dijital = isDijital(rol);
    const renk = dijital ? "#bb86fc" : "#4ecca3";

    const marker = L.circleMarker([rol.lat, rol.lon], {
      radius: 6,
      fillColor: renk,
      color: "#ffffff",
      weight: 1,
      fillOpacity: 0.8,
      pane: "pinPane",
    });
    const up = rol.thumbs_up || 0;
    const total = up + (rol.thumbs_down || 0);
    const popupDiv = document.createElement("div");
    const lines = [
      { tag: "strong", text: rol.konum || "Bilinmeyen" },
      { text: `${rol.sehir || ""}${rol.ilce ? " / " + rol.ilce : ""}` },
      { text: `Frekans: ${rol.frekans || "-"} MHz` },
      { text: `Bant: ${rol.bant || "-"}` },
      { text: `Mod: ${dijital ? "Dijital" : "Analog"}` },
      { text: `Guc: ${rol.guc ? rol.guc + "W" : "-"}` },
      { text: `Yukseklik: ${rol.yukseklik ? rol.yukseklik + "m" : "-"}` },
      { text: `Puan: ${up}/${total}` },
    ];
    lines.forEach((line, i) => {
      const el = document.createElement(line.tag || "span");
      el.textContent = line.text;
      popupDiv.appendChild(el);
      if (i < lines.length - 1) popupDiv.appendChild(document.createElement("br"));
    });

    marker.bindPopup(popupDiv);
    marker.addTo(pinKatmani);
  }
}

// Called from filter panel TA bölge checkboxes
export function bolgeSeciminiSenkronla(secili) {
  seciliBolgeler = new Set(secili);

  // Update each province style and sync city checkboxes
  for (const [key, layer] of Object.entries(ilKatmanlari)) {
    const tabolge = layer.feature.properties.tabolge;
    const bolgeSecili = seciliBolgeler.has(tabolge);

    if (bolgeSecili) {
      seciliSehirler.add(key);
    } else {
      seciliSehirler.delete(key);
    }
    layer.setStyle(_ilStili(tabolge, bolgeSecili));

    // Sync city checkbox
    const cb = document.querySelector(`input[data-sehir="${key}"]`);
    if (cb) cb.checked = bolgeSecili;
  }
}

// Called from filter panel city checkboxes → update map highlights
export function sehirSeciminiSenkronla(seciliSehirListesi) {
  // Skip if this change originated from map click (prevent loop)
  if (_syncFromMap) return;

  seciliSehirler = new Set(seciliSehirListesi);

  for (const [key, layer] of Object.entries(ilKatmanlari)) {
    const tabolge = layer.feature.properties.tabolge;
    const secili = seciliSehirler.has(key);
    layer.setStyle(_ilStili(tabolge, secili));
  }
}

