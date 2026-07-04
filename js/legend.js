const legend = document.querySelector("#legend");
const toggle = document.querySelector("#legendToggle");
const mobileLegendQuery = window.matchMedia("(max-width: 720px)");

export function initializeLegend() {
  syncLegendMode();

  toggle?.addEventListener("click", () => {
    if (mobileLegendQuery.matches) {
      const isOpen = legend?.classList.toggle("is-open") || false;
      toggle.setAttribute("aria-expanded", String(isOpen));
      return;
    }

    const isCollapsed = legend?.classList.toggle("is-collapsed") || false;
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
  });

  if (typeof mobileLegendQuery.addEventListener === "function") {
    mobileLegendQuery.addEventListener("change", syncLegendMode);
  } else {
    mobileLegendQuery.addListener(syncLegendMode);
  }
}

function syncLegendMode() {
  if (!legend || !toggle) return;

  if (mobileLegendQuery.matches) {
    legend.classList.remove("is-collapsed", "is-open");
    toggle.setAttribute("aria-expanded", "false");
    return;
  }

  legend.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", String(!legend.classList.contains("is-collapsed")));
}
