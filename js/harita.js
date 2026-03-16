// harita.js - Leaflet map module for TA region polygons and repeater pins
// Leaflet (L) is loaded globally via CDN

// Module-level state
let map;
let pinKatmani;
let bolgeKatmanlari = {};
let seciliBolgeler = new Set(["TA1", "TA2", "TA3", "TA4", "TA5", "TA6", "TA7"]);

// TA region colors
const RENKLER = {
  TA1: "#e94560",
  TA2: "#f0a500",
  TA3: "#4ecca3",
  TA4: "#3282b8",
  TA5: "#bb86fc",
  TA6: "#03dac6",
  TA7: "#cf6679",
};

// Approximate TA region polygon coordinates [lat, lng]
const BOLGE_KOORDINATLARI = {
  TA1: [[42.1, 26.0], [42.1, 30.5], [40.0, 30.5], [39.5, 29.0], [39.6, 26.0]],
  TA2: [[41.5, 30.5], [41.8, 36.5], [38.5, 36.5], [38.5, 32.0], [39.5, 30.5]],
  TA3: [[41.0, 38.5], [41.5, 43.5], [39.0, 44.0], [39.0, 38.5]],
  TA4: [[39.5, 26.0], [39.5, 31.0], [37.0, 31.0], [36.5, 27.0], [37.0, 26.0]],
  TA5: [[38.5, 31.0], [38.5, 37.0], [36.0, 37.0], [36.0, 31.0]],
  TA6: [[42.1, 30.5], [42.1, 38.5], [41.0, 38.5], [40.5, 36.5], [41.5, 30.5]],
  TA7: [[39.0, 37.0], [39.5, 44.0], [37.0, 45.0], [36.5, 37.0]],
};

// Returns polygon style based on selection state
function _bolgeStili(bolgeAdi, secili) {
  return {
    color: RENKLER[bolgeAdi],
    fillColor: RENKLER[bolgeAdi],
    fillOpacity: secili ? 0.15 : 0.03,
    weight: secili ? 2 : 1,
  };
}

export function haritaBaslat() {
  // Create map centered on Turkey
  map = L.map("harita").setView([39.0, 35.0], 6);

  // Add OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Create pin layer group and add to map
  pinKatmani = L.layerGroup().addTo(map);

  // Create TA region polygons
  for (const [bolgeAdi, koordinatlar] of Object.entries(BOLGE_KOORDINATLARI)) {
    const secili = seciliBolgeler.has(bolgeAdi);
    const stil = _bolgeStili(bolgeAdi, secili);

    const polygon = L.polygon(koordinatlar, stil);

    // Permanent centered tooltip with TA name
    polygon.bindTooltip(bolgeAdi, {
      permanent: true,
      direction: "center",
      className: "bolge-tooltip",
    });

    // Click handler: toggle selection
    polygon.on("click", () => {
      if (seciliBolgeler.has(bolgeAdi)) {
        seciliBolgeler.delete(bolgeAdi);
      } else {
        seciliBolgeler.add(bolgeAdi);
      }

      const secimiVar = seciliBolgeler.has(bolgeAdi);

      // Update polygon style
      polygon.setStyle(_bolgeStili(bolgeAdi, secimiVar));

      // Sync checkbox
      const checkbox = document.querySelector(`input[data-bolge="${bolgeAdi}"]`);
      if (checkbox) {
        checkbox.checked = secimiVar;
      }

      // Dispatch custom event
      document.dispatchEvent(new CustomEvent("filtre-degisti"));
    });

    polygon.addTo(map);
    bolgeKatmanlari[bolgeAdi] = polygon;
  }
}

export function pinleriGuncelle(roleler) {
  // Clear existing pins
  pinKatmani.clearLayers();

  for (const rol of roleler) {
    // Skip roles without coordinates
    if (rol.lat == null || rol.lon == null) continue;

    // Determine color based on digital/analog
    const renk =
      rol.digital === 1 || rol.digital === 2 ? "#bb86fc" : "#4ecca3";

    // Create circle marker
    const marker = L.circleMarker([rol.lat, rol.lon], {
      radius: 6,
      fillColor: renk,
      color: "#ffffff",
      weight: 1,
      fillOpacity: 0.8,
    });

    // Build popup content
    const dijital = rol.digital === 1 || rol.digital === 2;
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

export function bolgeSeciminiSenkronla(secili) {
  // Update seciliBolgeler Set
  seciliBolgeler = new Set(secili);

  // Update each polygon style based on new selection
  for (const [bolgeAdi, polygon] of Object.entries(bolgeKatmanlari)) {
    const secimiVar = seciliBolgeler.has(bolgeAdi);
    polygon.setStyle(_bolgeStili(bolgeAdi, secimiVar));
  }
}

export function getSeciliBolgeler() {
  return [...seciliBolgeler];
}
