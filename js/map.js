const initialView = {
  center: [40.84, 14.75],
  zoom: 8
};

const markerColors = {
  "Parco archeologico": "#A4342A",
  "Museo": "#20334D",
  "Area archeologica": "#7D6B34"
};

let map;
let clusterLayer;
let allFeatures = [];

export async function initializeMap() {
  if (map) {
    map.invalidateSize();
    return;
  }

  map = L.map("map", {
    center: initialView.center,
    zoom: initialView.zoom,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.control.scale({ imperial: false }).addTo(map);
  addResetControl();

  clusterLayer = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 46
  });

  map.addLayer(clusterLayer);

  const response = await fetch("data/campania.geojson");
  const data = await response.json();
  allFeatures = data.features || [];
  renderMarkers(allFeatures);
}

export function resetInitialView() {
  if (!map) return;
  map.setView(initialView.center, initialView.zoom, { animate: true });
}

export function renderMarkers(features) {
  if (!clusterLayer) return;
  clusterLayer.clearLayers();

  features.forEach((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    const marker = L.marker([lat, lng], {
      icon: createSiteIcon(props.tipologia)
    });
    marker.bindPopup(createPopupContent(props));
    marker.on("popupopen", () => {
      const button = document.querySelector(`[data-open-site="${props.id}"]`);
      button?.addEventListener("click", () => openSidebar(feature));
    });
    marker.on("click", () => openSidebar(feature));
    clusterLayer.addLayer(marker);
  });
}

export function getAllFeatures() {
  return [...allFeatures];
}

function createSiteIcon(type) {
  const color = markerColors[type] || markerColors["Area archeologica"];
  return L.divIcon({
    className: "",
    html: `<span class="site-marker" style="--marker-color: ${color}" aria-hidden="true"></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
}

function addResetControl() {
  const ResetControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const button = L.DomUtil.create("button", "leaflet-control-custom");
      button.type = "button";
      button.title = "Ritorna alla vista iniziale";
      button.setAttribute("aria-label", "Ritorna alla vista iniziale");
      button.textContent = "⌂";
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, "click", resetInitialView);
      return button;
    }
  });

  map.addControl(new ResetControl());
}
import { createPopupContent } from "./popup.js";
import { openSidebar } from "./sidebar.js";
