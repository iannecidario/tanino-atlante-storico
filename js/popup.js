export function createPopupContent(props) {
  const image = props.fotografia
    ? `<img src="${props.fotografia}" alt="Fotografia di ${props.nome}">`
    : "<span>Fotografia da integrare</span>";

  return `
    <article class="site-popup">
      <div class="site-popup__media">${image}</div>
      <h3>${props.nome}</h3>
      <p>${props.periodoStorico}</p>
      <button class="link-button" type="button" data-open-site="${props.id}">Apri scheda</button>
    </article>
  `;
}
