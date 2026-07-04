import { getAllFeatures, renderMarkers } from "./map.js";
import { closeMobileControls } from "./ui.js";

const controls = {
  province: document.querySelector("#provinceFilter"),
  type: document.querySelector("#typeFilter"),
  municipality: document.querySelector("#municipalityFilter"),
  unesco: document.querySelector("#unescoFilter"),
  park: document.querySelector("#parkFilter"),
  museum: document.querySelector("#museumFilter"),
  area: document.querySelector("#areaFilter"),
  timeline: document.querySelector("#timeline"),
  count: document.querySelector("#resultCount")
};

const state = {
  search: "",
  province: "",
  type: "",
  municipality: "",
  unesco: false,
  park: false,
  museum: false,
  area: false
  ,
  period: ""
};

export function initializeFilters() {
  const features = getAllFeatures();
  populateSelect(controls.province, uniqueValues(features, "provincia"));
  populateSelect(controls.type, uniqueValues(features, "tipologia"));
  populateSelect(controls.municipality, uniqueValues(features, "comune"));

  Object.entries(controls).forEach(([key, control]) => {
    if (!control || key === "count" || key === "timeline") return;
    control.addEventListener("change", () => {
      state[key] = control.type === "checkbox" ? control.checked : control.value;
      applyCurrentFilters();
      closeMobileControls();
    });
  });

  controls.timeline?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-period]");
    if (!button) return;
    state.period = button.dataset.period;
    controls.timeline.querySelectorAll("button").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    applyCurrentFilters();
    closeMobileControls();
  });

  applyCurrentFilters();
}

export function setSearchQuery(query) {
  state.search = normalize(query);
  applyCurrentFilters();
}

export function applyCurrentFilters() {
  const allFeatures = getAllFeatures();
  const visibleFeatures = allFeatures.filter(matchesState);
  renderMarkers(visibleFeatures);
  updateResultCount(visibleFeatures.length, allFeatures.length);
}

function matchesState(feature) {
  const props = feature.properties;
  const textMatch = !state.search || normalize(searchableText(props)).includes(state.search);
  const provinceMatch = !state.province || props.provincia === state.province;
  const typeMatch = !state.type || props.tipologia === state.type;
  const municipalityMatch = !state.municipality || props.comune === state.municipality;
  const unescoMatch = !state.unesco || props.unesco;
  const parkMatch = !state.park || props.parcoArcheologico;
  const museumMatch = !state.museum || props.museo;
  const areaMatch = !state.area || props.areaArcheologica;
  const periodMatch = !state.period || props.periodoStorico === state.period;

  return textMatch && provinceMatch && typeMatch && municipalityMatch && unescoMatch && parkMatch && museumMatch && areaMatch && periodMatch;
}

function searchableText(props) {
  return [
    props.nome,
    props.comune,
    props.provincia,
    props.descrizioneBreve,
    props.descrizioneEstesa,
    props.tipologia,
    props.periodoStorico,
    ...(props.paroleChiave || [])
  ].join(" ");
}

function uniqueValues(features, propertyName) {
  return [...new Set(features.map((feature) => feature.properties[propertyName]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

function populateSelect(select, values) {
  if (!select) return;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function updateResultCount(visible, total) {
  if (!controls.count) return;
  controls.count.textContent = visible === total
    ? `Tutti i siti visibili (${total})`
    : `${visible} siti su ${total}`;
}
