const toggleFiltersButton = document.querySelector("#toggleFilters");
const controls = document.querySelector("#controls");
const mobileControlsQuery = window.matchMedia("(max-width: 720px)");

export function initializeMobileControls() {
  toggleFiltersButton?.addEventListener("click", () => {
    const isOpen = controls?.classList.toggle("is-open") || false;
    toggleFiltersButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      controls?.classList.remove("is-open");
      toggleFiltersButton?.setAttribute("aria-expanded", "false");
    }
  });
}

export function closeMobileControls() {
  if (!mobileControlsQuery.matches) return;

  controls?.classList.remove("is-open");
  toggleFiltersButton?.setAttribute("aria-expanded", "false");
}
