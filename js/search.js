import { setSearchQuery } from "./filters.js";

const searchInput = document.querySelector("#siteSearch");

export function initializeSearch() {
  searchInput?.addEventListener("input", () => {
    setSearchQuery(searchInput.value);
  });
}
