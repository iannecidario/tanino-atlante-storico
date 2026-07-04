const sidebar = document.querySelector("#siteSidebar");
const content = document.querySelector("#siteSidebarContent");

export function openSidebar(feature) {
  if (!sidebar || !content) return;

  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const image = props.fotografia
    ? `<img src="${props.fotografia}" alt="Fotografia di ${props.nome}">`
    : "<span>Fotografia ufficiale non inclusa nel repository</span>";
  const sources = props.fonti
    .map((source) => `<a href="${source}" target="_blank" rel="noopener">${new URL(source).hostname}</a>`)
    .join(", ");

  content.innerHTML = `
    <div class="sidebar-media">${image}</div>
    <p class="eyebrow">${props.tipologia}</p>
    <h2>${props.nome}</h2>
    <p><strong>${props.descrizioneBreve}</strong></p>
    <p>${props.descrizioneEstesa}</p>
    <ul class="meta-list">
      <li><strong>Cronologia</strong><span>${props.periodoStorico}</span></li>
      <li><strong>Provincia</strong><span>${props.provincia}</span></li>
      <li><strong>Comune</strong><span>${props.comune}</span></li>
      <li><strong>Coordinate</strong><span>${props.coordinate}</span></li>
      <li><strong>Ente gestore</strong><span>${props.enteGestore}</span></li>
      <li><strong>Riconoscimento UNESCO</strong><span>${props.unesco ? "Si" : "No"}</span></li>
      <li><strong>Fonti istituzionali</strong><span>${sources}</span></li>
    </ul>
    <div class="sidebar-actions">
      <a class="link-button" href="${props.linkUfficiale}" target="_blank" rel="noopener">Apri sito ufficiale</a>
      <a class="secondary-button" href="${mapsUrl}" target="_blank" rel="noopener">Apri Google Maps</a>
      <button class="secondary-button" type="button" data-close-sidebar>Chiudi</button>
    </div>
  `;

  content.querySelector("[data-close-sidebar]")?.addEventListener("click", closeSidebar);
  sidebar.classList.add("is-open");
  sidebar.setAttribute("aria-hidden", "false");
}

export function closeSidebar() {
  sidebar?.classList.remove("is-open");
  sidebar?.setAttribute("aria-hidden", "true");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
  }
});
