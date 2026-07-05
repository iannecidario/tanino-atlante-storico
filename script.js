const DATA_URL = "localita.json";

const PERIODS = [
  "Aprile 1941 – Settembre 1943",
  "Settembre – Dicembre 1943",
  "1944",
  "Inverno – Primavera 1945",
  "Primavera – Estate 1945"
];

const STATE_COLORS = {
  Italia: "#9b3d2e",
  Montenegro: "#256d7b",
  Albania: "#b33d46",
  Kosovo: "#2f72b8",
  "Macedonia del Nord": "#b5842f",
  Serbia: "#6b5ba8",
  Bulgaria: "#3f8f60",
  Grecia: "#2d5f9a",
  "Non identificata": "#7a746b"
};

const elements = {
  list: document.querySelector("#locationList"),
  search: document.querySelector("#locationSearch"),
  summary: document.querySelector("#resultSummary"),
  periodLayers: document.querySelector("#periodLayers"),
  legend: document.querySelector("#stateLegend"),
  fitRoute: document.querySelector("#fitRouteButton"),
  toggleSidebar: document.querySelector("#toggleSidebarButton"),
  follow: document.querySelector("#followJourneyButton"),
  pause: document.querySelector("#pauseJourneyButton"),
  stop: document.querySelector("#stopJourneyButton"),
  previous: document.querySelector("#previousStopButton"),
  next: document.querySelector("#nextStopButton"),
  mobilePrevious: document.querySelector("#mobilePreviousStopButton"),
  mobileNext: document.querySelector("#mobileNextStopButton"),
  quickJump: document.querySelector("#quickJumpSelect"),
  timeline: document.querySelector("#journeyTimeline"),
  message: document.querySelector("#journeyMessage"),
  statusPeriod: document.querySelector("#statusPeriod"),
  statusYear: document.querySelector("#statusYear"),
  statusStep: document.querySelector("#statusStep"),
  statusState: document.querySelector("#statusState"),
  lightbox: null
};

const state = {
  locations: [],
  markersById: new Map(),
  activePeriods: new Set(PERIODS),
  periodGroups: new Map(),
  searchQuery: "",
  currentIndex: 0,
  timelineOrder: 35,
  followTimer: null,
  isFollowing: false,
  isPaused: false,
  lightboxItems: [],
  lightboxIndex: 0
};

let map;
let routeLayer;
let traveledRouteLayer;
let routeBounds;
let routeSequence = [];

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  map = createMap();

  try {
    // localita.json is the only data source for the application.
    state.locations = await loadLocations();
    state.timelineOrder = state.locations.length;
    elements.timeline.max = String(state.locations.length);
    elements.timeline.value = String(state.timelineOrder);
    renderPeriodControls();
    renderStateLegend();
    renderQuickJumpOptions();
    createLightbox();
    renderMapLayers();
    renderLocationList();
    fitRouteToVisibleData();
    updateJourneyStatus();
    bindEvents();
  } catch (error) {
    showDataError(error);
  }
}

function createMap() {
  const leafletMap = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(leafletMap);

  L.control.scale({ imperial: false }).addTo(leafletMap);
  leafletMap.setView([42.3, 19.2], 6);
  return leafletMap;
}

async function loadLocations() {
  const data = await readJsonData(DATA_URL);
  return data
    .slice()
    .sort((a, b) => a["ordine cronologico"] - b["ordine cronologico"])
    .map(normalizeLocation);
}

async function readJsonData(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (fetchError) {
    return readJsonDataWithXhr(url, fetchError);
  }
}

function readJsonDataWithXhr(url, originalError) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.overrideMimeType("application/json");
    request.open("GET", url, true);

    request.onload = () => {
      if (request.status !== 0 && (request.status < 200 || request.status >= 300)) {
        reject(originalError);
        return;
      }

      try {
        resolve(JSON.parse(request.responseText));
      } catch (parseError) {
        reject(parseError);
      }
    };

    request.onerror = () => reject(originalError);
    request.send();
  });
}

function normalizeLocation(item) {
  const hasCoordinates = Number.isFinite(item.latitudine) && Number.isFinite(item.longitudine);

  return {
    ...item,
    hasCoordinates,
    stateName: item["Stato attuale"] || "Non identificata",
    currentName: item["nome attuale (se diverso)"] || item["nome storico"],
    foto_storiche: normalizeArchiveList(item.foto_storiche),
    foto_attuali: normalizeArchiveList(item.foto_attuali),
    mappe: normalizeArchiveList(item.mappe),
    documenti: normalizeArchiveList(item.documenti),
    testimonianze: normalizeArchiveList(item.testimonianze),
    bibliografia: normalizeArchiveList(item.bibliografia)
  };
}

function normalizeArchiveList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function renderMapLayers() {
  clearMapLayers();
  state.markersById.clear();
  state.periodGroups.clear();

  const visibleLocations = getSearchMatches();
  const routeLocations = getSearchMatches({ ignoreTimeline: true })
    .filter((location) => state.activePeriods.has(location.periodo));
  const displayPositions = calculateDisplayPositions(visibleLocations);
  const routeDisplayPositions = calculateDisplayPositions(routeLocations);

  // Each period is handled as an independent layer group.
  PERIODS.forEach((period) => {
    const group = L.layerGroup();
    state.periodGroups.set(period, group);

    if (state.activePeriods.has(period)) {
      group.addTo(map);
    }
  });

  visibleLocations.forEach((location) => {
    if (!location.hasCoordinates) return;

    const marker = L.marker(displayPositions.get(location.id), {
      icon: createMarkerIcon(location),
      title: location["nome storico"]
    }).bindPopup(createPopup(location));

    marker.on("click", () => highlightListItem(location.id));
    marker.on("popupopen", () => {
      highlightListItem(location.id);
      centerPopupInView();
    });
    state.markersById.set(location.id, marker);
    state.periodGroups.get(location.periodo)?.addLayer(marker);
  });

  drawChronologicalRoute(routeLocations, routeDisplayPositions);
  updateLayerVisibility();
  highlightListItem(state.locations[state.currentIndex]?.id);
}

function clearMapLayers() {
  state.periodGroups.forEach((group) => {
    map.removeLayer(group);
    group.clearLayers();
  });

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  routeBounds = null;

  if (traveledRouteLayer) {
    map.removeLayer(traveledRouteLayer);
    traveledRouteLayer = null;
  }
}

function calculateDisplayPositions(locations) {
  const grouped = new Map();
  const positions = new Map();

  locations.forEach((location) => {
    if (!location.hasCoordinates) return;
    const key = `${location.latitudine.toFixed(5)},${location.longitudine.toFixed(5)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(location);
  });

  grouped.forEach((items) => {
    if (items.length === 1) {
      positions.set(items[0].id, [items[0].latitudine, items[0].longitudine]);
      return;
    }

    // Repeated stops share exact coordinates; a small visual offset keeps every marker clickable.
    const radius = 0.025;
    items.forEach((location, index) => {
      const angle = (Math.PI * 2 * index) / items.length;
      positions.set(location.id, [
        location.latitudine + Math.sin(angle) * radius,
        location.longitudine + Math.cos(angle) * radius
      ]);
    });
  });

  return positions;
}

function drawChronologicalRoute(locations, displayPositions) {
  // The route is split by active chronological period, so disabled layers remove their lines too.
  const boundsPoints = [];
  routeSequence = [];
  routeLayer = L.layerGroup().addTo(map);

  PERIODS.forEach((period) => {
    const periodLocations = locations
      .filter((location) => location.periodo === period && location.hasCoordinates)
      .map((location) => ({
        location,
        point: displayPositions.get(location.id)
      }));
    const routePoints = buildRoutePoints(periodLocations);

    boundsPoints.push(...routePoints);
    if (routePoints.length < 2) return;

    L.polyline(routePoints, {
      color: "#836d4f",
      weight: 3,
      opacity: 0.38,
      lineJoin: "round"
    }).addTo(routeLayer);
  });

  if (boundsPoints.length >= 2) {
    routeBounds = L.latLngBounds(boundsPoints);
  }
  updateTraveledRoute();
}

function buildRoutePoints(geolocatedLocations) {
  const routePoints = [];

  geolocatedLocations.forEach(({ location, point }, index) => {
    const previous = geolocatedLocations[index - 1]?.location;

    if (previous?.id === "loc-032" && location.id === "loc-033") {
      const seaPoints = [
        [40.35, 22.76],
        [39.95, 22.70],
        [39.55, 22.86],
        [39.20, 23.38],
        [39.05, 23.85],
        [38.65, 24.18],
        [38.20, 24.28],
        [37.72, 24.08],
        [37.15, 23.85],
        [36.62, 23.58],
        [36.08, 22.65],
        [35.95, 21.10],
        [36.18, 18.50],
        [36.45, 16.20],
        [36.65, 14.80],
        [36.70, 13.80],
        [37.05, 12.60],
        [37.65, 12.20],
        [38.35, 12.80],
        [39.30, 13.10],
        [40.25, 13.50],
        [40.62, 13.72],
        [40.73, 14.05],
        [40.79, 14.18]
      ];
      routePoints.push(...seaPoints);
      seaPoints.forEach((seaPoint) => {
        routeSequence.push({
          type: "waypoint",
          afterOrder: previous["ordine cronologico"],
          beforeOrder: location["ordine cronologico"],
          period: location.periodo,
          point: seaPoint
        });
      });
    }

    routePoints.push(point);
    routeSequence.push({
      type: "location",
      id: location.id,
      order: location["ordine cronologico"],
      period: location.periodo,
      point
    });
  });

  return routePoints;
}

function updateTraveledRoute() {
  if (traveledRouteLayer) {
    map.removeLayer(traveledRouteLayer);
    traveledRouteLayer = null;
  }

  traveledRouteLayer = L.layerGroup().addTo(map);

  PERIODS.forEach((period) => {
    const traveledPoints = routeSequence
      .filter((item) => {
        if (item.period !== period) return false;
        if (item.type === "location") return item.order <= state.timelineOrder;
        return item.beforeOrder <= state.timelineOrder;
      })
      .map((item) => item.point);

    if (traveledPoints.length < 2) return;

    L.polyline(traveledPoints, {
      color: "#6f3f2b",
      weight: 5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(traveledRouteLayer);
  });
}

function createMarkerIcon(location) {
  const color = getStateColor(location.stateName);

  return L.divIcon({
    className: "",
    html: `<span class="route-marker" style="--state-color: ${color}" aria-hidden="true">${location["ordine cronologico"]}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

function createPopup(location) {
  const currentName = location["nome attuale (se diverso)"];
  const archiveSections = [
    renderMediaGallery("Fotografie storiche", location.foto_storiche, "image"),
    renderMediaGallery("Fotografie attuali", location.foto_attuali, "image"),
    renderMediaGallery("Mappe storiche", location.mappe, "map"),
    renderDocumentLinks(location.documenti),
    renderTextSection("Testimonianze", location.testimonianze),
    renderBibliography(location.bibliografia)
  ].filter(Boolean).join("");

  return `
    <article class="popup-card">
      <h3>${escapeHtml(location["nome storico"])}</h3>
      ${currentName ? `<p class="popup-card__current">${escapeHtml(currentName)}</p>` : ""}
      <dl>
        <dt>Stato</dt>
        <dd>${escapeHtml(location.stateName)}</dd>
        <dt>Periodo</dt>
        <dd>${escapeHtml(location.periodo)}</dd>
        <dt>Categoria</dt>
        <dd>${escapeHtml(location["categoria dell'evento"])}</dd>
      </dl>
      <section class="archive-section">
        <h4>Nota storica</h4>
        <p>${escapeHtml(location["breve descrizione storica (3-5 righe)"])}</p>
      </section>
      ${archiveSections}
    </article>
  `;
}

function renderMediaGallery(title, items, type) {
  if (!items.length) return "";

  const cards = items.map((item) => {
    const entry = normalizeMediaEntry(item);
    if (!entry.src) return "";
    const label = entry.title || entry.caption || title;
    return `
      <button class="archive-media" type="button" data-lightbox-src="${escapeHtml(entry.src)}" data-lightbox-title="${escapeHtml(label)}">
        <img src="${escapeHtml(entry.src)}" alt="${escapeHtml(entry.alt || label)}" loading="lazy">
        ${entry.caption ? `<span>${escapeHtml(entry.caption)}</span>` : ""}
      </button>
    `;
  }).filter(Boolean).join("");

  if (!cards) return "";

  return `
    <section class="archive-section">
      <h4>${escapeHtml(title)}</h4>
      <div class="archive-gallery archive-gallery--${type}">${cards}</div>
    </section>
  `;
}

function renderDocumentLinks(items) {
  if (!items.length) return "";

  const links = items.map((item) => {
    const entry = normalizeMediaEntry(item);
    if (!entry.src) return "";
    const label = entry.title || filenameFromPath(entry.src);
    return `
      <a class="archive-document" href="${escapeHtml(entry.src)}" target="_blank" rel="noopener">
        <span aria-hidden="true">PDF</span>
        <strong>${escapeHtml(label)}</strong>
        ${entry.caption ? `<small>${escapeHtml(entry.caption)}</small>` : ""}
      </a>
    `;
  }).filter(Boolean).join("");

  if (!links) return "";

  return `
    <section class="archive-section">
      <h4>Documenti</h4>
      <div class="archive-documents">${links}</div>
    </section>
  `;
}

function renderTextSection(title, items) {
  if (!items.length) return "";

  const entries = items.map((item) => {
    const entry = typeof item === "string" ? { testo: item } : item;
    return `
      <blockquote class="archive-quote">
        ${entry.titolo || entry.title ? `<strong>${escapeHtml(entry.titolo || entry.title)}</strong>` : ""}
        <p>${escapeHtml(entry.testo || entry.text || entry.citazione || entry.quote || "")}</p>
        ${entry.fonte || entry.source ? `<cite>${escapeHtml(entry.fonte || entry.source)}</cite>` : ""}
      </blockquote>
    `;
  }).join("");

  return `
    <section class="archive-section">
      <h4>${escapeHtml(title)}</h4>
      ${entries}
    </section>
  `;
}

function renderBibliography(items) {
  if (!items.length) return "";

  const entries = items.map((item) => {
    const entry = typeof item === "string" ? { titolo: item } : item;
    const label = [entry.autore || entry.author, entry.titolo || entry.title, entry.anno || entry.year]
      .filter(Boolean)
      .join(", ");
    const text = label || entry.url || "";
    return `<li>${entry.url ? `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>` : escapeHtml(text)}</li>`;
  }).join("");

  return `
    <section class="archive-section">
      <h4>Bibliografia</h4>
      <ul class="archive-bibliography">${entries}</ul>
    </section>
  `;
}

function normalizeMediaEntry(item) {
  if (typeof item === "string") {
    return {
      src: item,
      title: filenameFromPath(item),
      caption: "",
      alt: filenameFromPath(item)
    };
  }

  return {
    src: item.src || item.url || item.file || item.path || "",
    title: item.titolo || item.title || "",
    caption: item.didascalia || item.caption || item.descrizione || item.description || "",
    alt: item.alt || item.titolo || item.title || item.didascalia || item.caption || ""
  };
}

function filenameFromPath(path) {
  return String(path || "").split("/").pop() || "Documento";
}

function renderPeriodControls() {
  elements.periodLayers.innerHTML = PERIODS.map((period) => {
    const count = state.locations.filter((location) => location.periodo === period).length;
    return `
      <label class="period-toggle">
        <input type="checkbox" value="${escapeHtml(period)}" checked>
        <span><strong>${escapeHtml(period)}</strong><br>${count} tappe</span>
      </label>
    `;
  }).join("");
}

function renderStateLegend() {
  const states = [...new Set(state.locations.map((location) => location.stateName))].sort();

  elements.legend.innerHTML = states.map((stateName) => `
    <span class="state-legend__item">
      <i class="swatch" style="--state-color: ${getStateColor(stateName)}"></i>
      ${escapeHtml(stateName)}
    </span>
  `).join("");
}

function renderQuickJumpOptions() {
  elements.quickJump.innerHTML = `
    <option value="">Seleziona una località</option>
    ${state.locations.map((location) => `
      <option value="${escapeHtml(location.id)}">
        ${location["ordine cronologico"]}. ${escapeHtml(location["nome storico"])}
      </option>
    `).join("")}
  `;
}

function renderLocationList() {
  const matches = getSearchMatches();

  elements.list.innerHTML = matches.map((location) => {
    const hiddenByPeriod = !state.activePeriods.has(location.periodo);
    const currentName = location["nome attuale (se diverso)"];
    const status = `${location.anno} · ${location.periodo}`;

    return `
      <li>
        <button class="location-card${hiddenByPeriod ? " is-muted" : ""}" type="button" data-location-id="${escapeHtml(location.id)}">
          <span class="location-card__top">
            <span class="location-number">${location["ordine cronologico"]}</span>
            <span class="location-card__title">
              <strong>${escapeHtml(location["nome storico"])}</strong>
              ${currentName ? `<span class="location-current-name">${escapeHtml(currentName)}</span>` : ""}
            </span>
          </span>
          <small>${escapeHtml(status)}</small>
          <mark>${escapeHtml(location.stateName)}</mark>
        </button>
      </li>
    `;
  }).join("");

  const geocoded = matches.filter((location) => location.hasCoordinates).length;
  elements.summary.textContent = `${matches.length} tappe trovate, ${geocoded} geolocalizzate.`;
}

function showDataError(error) {
  elements.summary.textContent = "Dati non caricati.";
  elements.periodLayers.innerHTML = "";
  elements.legend.innerHTML = "";
  elements.list.innerHTML = `
    <li class="data-error">
      <strong>Impossibile leggere localita.json</strong>
      <span>Se hai aperto index.html con doppio click, il browser potrebbe bloccare il file dati locale. Pubblica il progetto su GitHub Pages o aprilo da un server web statico.</span>
      <code>localita.json</code>
    </li>
  `;
  console.error("Errore caricamento localita.json:", error);
}

function bindEvents() {
  if (window.matchMedia("(max-width: 760px)").matches) {
    document.body.classList.add("sidebar-collapsed");
    elements.toggleSidebar.setAttribute("aria-expanded", "false");
  }

  elements.search.addEventListener("input", () => {
    state.searchQuery = normalizeText(elements.search.value);
    renderMapLayers();
    renderLocationList();
  });

  elements.periodLayers.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[type='checkbox']");
    if (!checkbox) return;

    if (checkbox.checked) {
      state.activePeriods.add(checkbox.value);
    } else {
      state.activePeriods.delete(checkbox.value);
    }

    renderMapLayers();
    renderLocationList();
  });

  elements.list.addEventListener("click", (event) => {
    const card = event.target.closest("[data-location-id]");
    if (!card) return;
    selectLocationById(card.dataset.locationId);
  });

  elements.fitRoute.addEventListener("click", fitRouteToVisibleData);

  elements.toggleSidebar.addEventListener("click", () => {
    const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
    elements.toggleSidebar.setAttribute("aria-expanded", String(!isCollapsed));
    setTimeout(() => map.invalidateSize(), 220);
  });

  elements.previous.addEventListener("click", () => moveStep(-1));
  elements.next.addEventListener("click", () => moveStep(1));
  elements.mobilePrevious.addEventListener("click", () => moveStep(-1));
  elements.mobileNext.addEventListener("click", () => moveStep(1));
  elements.follow.addEventListener("click", startJourney);
  elements.pause.addEventListener("click", toggleJourneyPause);
  elements.stop.addEventListener("click", stopJourney);

  elements.quickJump.addEventListener("change", () => {
    if (!elements.quickJump.value) return;
    stopJourney(false);
    clearSearchFilter();
    selectLocationById(elements.quickJump.value);
    elements.quickJump.value = "";
  });

  elements.timeline.addEventListener("input", () => {
    stopJourney(false);
    state.timelineOrder = Number(elements.timeline.value);
    state.currentIndex = Math.max(0, state.timelineOrder - 1);
    renderMapLayers();
    renderLocationList();
    updateJourneyStatus();
    focusLocation(state.locations[state.currentIndex]?.id, { closeMobile: false });
  });

  document.addEventListener("click", (event) => {
    const mediaButton = event.target.closest("[data-lightbox-src]");
    if (mediaButton) {
      openLightbox(mediaButton.dataset.lightboxSrc, mediaButton.dataset.lightboxTitle);
      return;
    }

    const lightboxAction = event.target.closest("[data-lightbox-action]");
    if (!lightboxAction) return;

    const action = lightboxAction.dataset.lightboxAction;
    if (action === "close") closeLightbox();
    if (action === "previous") navigateLightbox(-1);
    if (action === "next") navigateLightbox(1);
  });

  document.addEventListener("keydown", (event) => {
    if (!elements.lightbox || elements.lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") navigateLightbox(-1);
    if (event.key === "ArrowRight") navigateLightbox(1);
  });
}

function createLightbox() {
  const lightbox = document.createElement("div");
  lightbox.className = "media-lightbox";
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="media-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Anteprima immagine">
      <button class="media-lightbox__close" type="button" data-lightbox-action="close" aria-label="Chiudi anteprima">×</button>
      <button class="media-lightbox__nav media-lightbox__nav--prev" type="button" data-lightbox-action="previous" aria-label="Immagine precedente">‹</button>
      <figure>
        <img alt="">
        <figcaption></figcaption>
      </figure>
      <button class="media-lightbox__nav media-lightbox__nav--next" type="button" data-lightbox-action="next" aria-label="Immagine successiva">›</button>
    </div>
  `;
  document.body.append(lightbox);
  elements.lightbox = lightbox;
}

function openLightbox(src, title) {
  const buttons = [...document.querySelectorAll("[data-lightbox-src]")];
  state.lightboxItems = buttons.map((button) => ({
    src: button.dataset.lightboxSrc,
    title: button.dataset.lightboxTitle || ""
  }));
  state.lightboxIndex = Math.max(0, state.lightboxItems.findIndex((item) => item.src === src));
  updateLightbox(src, title);
  elements.lightbox.hidden = false;
}

function navigateLightbox(direction) {
  if (!state.lightboxItems.length) return;
  state.lightboxIndex = (state.lightboxIndex + direction + state.lightboxItems.length) % state.lightboxItems.length;
  const item = state.lightboxItems[state.lightboxIndex];
  updateLightbox(item.src, item.title);
}

function updateLightbox(src, title) {
  const image = elements.lightbox.querySelector("img");
  const caption = elements.lightbox.querySelector("figcaption");
  image.src = src;
  image.alt = title || "Materiale archivistico";
  caption.textContent = title || "";
}

function closeLightbox() {
  elements.lightbox.hidden = true;
}

function selectLocationById(id, options = {}) {
  const index = state.locations.findIndex((location) => location.id === id);
  if (index === -1) return;
  selectLocation(index, options);
}

function selectLocation(index, options = {}) {
  const location = state.locations[index];
  if (!location) return;

  state.currentIndex = index;
  state.timelineOrder = Math.max(state.timelineOrder, location["ordine cronologico"]);
  elements.timeline.value = String(state.timelineOrder);

  renderMapLayers();
  renderLocationList();
  updateJourneyStatus();
  focusLocation(location.id, options);
}

function moveStep(direction) {
  stopJourney(false);
  clearSearchFilter();
  const nextIndex = Math.min(
    Math.max(state.currentIndex + direction, 0),
    state.locations.length - 1
  );
  selectLocation(nextIndex);
}

function startJourney() {
  clearJourneyTimer();
  clearSearchFilter();
  hideJourneyMessage();
  state.isFollowing = true;
  state.isPaused = false;
  state.timelineOrder = 1;
  state.currentIndex = 0;
  elements.timeline.value = "1";
  updateJourneyControls();
  selectLocation(0, { closeMobile: true });
  scheduleJourneyStep();
}

function toggleJourneyPause() {
  if (!state.isFollowing) return;

  if (state.isPaused) {
    state.isPaused = false;
    updateJourneyControls();
    scheduleJourneyStep();
    return;
  }

  state.isPaused = true;
  clearJourneyTimer();
  updateJourneyControls();
}

function stopJourney(showMessage = true) {
  if (!state.isFollowing && !state.isPaused) return;
  clearJourneyTimer();
  state.isFollowing = false;
  state.isPaused = false;
  updateJourneyControls();
  if (showMessage) showJourneyMessage("Navigazione del viaggio interrotta.");
}

function scheduleJourneyStep() {
  clearJourneyTimer();
  if (!state.isFollowing || state.isPaused) return;
  state.followTimer = window.setTimeout(() => {
    if (state.currentIndex >= state.locations.length - 1) {
      finishJourney();
      return;
    }

    selectLocation(state.currentIndex + 1, { closeMobile: true });
    scheduleJourneyStep();
  }, 3600);
}

function finishJourney() {
  clearJourneyTimer();
  state.isFollowing = false;
  state.isPaused = false;
  updateJourneyControls();
  showJourneyMessage("Il viaggio si conclude con il ritorno ad Aquilonia, 11 luglio 1945.");
}

function clearJourneyTimer() {
  if (!state.followTimer) return;
  window.clearTimeout(state.followTimer);
  state.followTimer = null;
}

function clearSearchFilter() {
  if (!state.searchQuery && !elements.search.value) return;
  state.searchQuery = "";
  elements.search.value = "";
}

function updateJourneyControls() {
  elements.follow.disabled = state.isFollowing && !state.isPaused;
  elements.pause.disabled = !state.isFollowing;
  elements.stop.disabled = !state.isFollowing && !state.isPaused;
  elements.pause.textContent = state.isPaused ? "Riprendi" : "Pausa";
}

function updateJourneyStatus() {
  const location = state.locations[state.currentIndex] || state.locations[0];
  if (!location) return;

  elements.statusPeriod.textContent = location.periodo;
  elements.statusYear.textContent = location.anno;
  elements.statusStep.textContent = `${location["ordine cronologico"]}/${state.locations.length}`;
  elements.statusState.textContent = location.stateName;
  elements.previous.disabled = state.currentIndex === 0;
  elements.next.disabled = state.currentIndex === state.locations.length - 1;
}

function showJourneyMessage(text) {
  elements.message.textContent = text;
  elements.message.hidden = false;
  window.setTimeout(hideJourneyMessage, 5200);
}

function hideJourneyMessage() {
  elements.message.hidden = true;
}

function updateLayerVisibility() {
  state.periodGroups.forEach((group, period) => {
    const shouldShow = state.activePeriods.has(period);
    if (shouldShow && !map.hasLayer(group)) group.addTo(map);
    if (!shouldShow && map.hasLayer(group)) map.removeLayer(group);
  });
}

function focusLocation(id, options = {}) {
  const { closeMobile = true } = options;
  const location = state.locations.find((item) => item.id === id);
  if (!location) return;

  // Selecting a stop from a hidden period re-enables that period before centering the map.
  if (!state.activePeriods.has(location.periodo)) {
    state.activePeriods.add(location.periodo);
    const checkbox = [...elements.periodLayers.querySelectorAll("input[type='checkbox']")]
      .find((input) => input.value === location.periodo);
    if (checkbox) checkbox.checked = true;
    renderMapLayers();
    renderLocationList();
  }

  const marker = state.markersById.get(id);
  if (!marker) {
    highlightListItem(id);
    showJourneyMessage("Località non geolocalizzata con certezza: resta documentata nell'elenco cronologico.");
    return;
  }

  if (closeMobile && window.matchMedia("(max-width: 760px)").matches) {
    document.body.classList.add("sidebar-collapsed");
    elements.toggleSidebar.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      map.invalidateSize();
      openAndCenterMarker(marker);
    }, 220);
    return;
  }

  openAndCenterMarker(marker);
  highlightListItem(id);
}

function openAndCenterMarker(marker) {
  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 9), { animate: true });
  window.setTimeout(() => {
    marker.openPopup();
  }, 220);
}

function centerPopupInView() {
  window.setTimeout(() => {
    const popup = document.querySelector(".leaflet-popup");
    const container = map.getContainer();
    if (!popup || !container) return;

    const popupRect = popup.getBoundingClientRect();
    const mapRect = container.getBoundingClientRect();
    const popupCenterX = popupRect.left + popupRect.width / 2;
    const popupCenterY = popupRect.top + popupRect.height / 2;
    const mapCenterX = mapRect.left + mapRect.width / 2;
    const mapCenterY = mapRect.top + mapRect.height / 2;

    map.panBy([mapCenterX - popupCenterX, popupCenterY - mapCenterY], {
      animate: true,
      duration: 0.25
    });
  }, 80);
}

function fitRouteToVisibleData() {
  const points = getSearchMatches()
    .filter((location) => location.hasCoordinates)
    .map((location) => [location.latitudine, location.longitudine]);

  if (!points.length) return;

  const bounds = routeBounds && routeBounds.isValid()
    ? routeBounds
    : L.latLngBounds(points);

  map.fitBounds(bounds, {
    padding: [34, 34],
    maxZoom: 7
  });
}

function highlightListItem(id) {
  document.querySelectorAll(".location-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.locationId === id);
  });

  state.markersById.forEach((marker, markerId) => {
    const markerElement = marker.getElement()?.querySelector(".route-marker");
    markerElement?.classList.toggle("is-current-marker", markerId === id);
  });
}

function getSearchMatches(options = {}) {
  const reachedLocations = options.ignoreTimeline
    ? state.locations
    : state.locations.filter((location) => {
      return location["ordine cronologico"] <= state.timelineOrder;
    });

  if (!state.searchQuery) return reachedLocations;

  return reachedLocations.filter((location) => {
    const haystack = normalizeText([
      location["nome storico"],
      location.currentName,
      location.stateName,
      location.periodo,
      location["categoria dell'evento"]
    ].join(" "));

    return haystack.includes(state.searchQuery);
  });
}

function getStateColor(stateName) {
  return STATE_COLORS[stateName] || STATE_COLORS["Non identificata"];
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
