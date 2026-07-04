# Tanino l'Aquiloniese. Il viaggio di Gaetano Iannece nei Balcani (1941-1945)

Atlante storico digitale e mappa interattiva del viaggio di Gaetano Iannece nei Balcani tra il 1941 e il 1945.

Il progetto nasce come complemento multimediale del libro **Tanino l'Aquiloniese**. L'applicazione permette di consultare le tappe del viaggio su mappa, filtrare i periodi cronologici, seguire automaticamente l'itinerario e predisporre ogni localita per l'inserimento progressivo di fotografie, mappe, documenti, testimonianze e riferimenti bibliografici.

L'app e completamente statica: non richiede backend, database, build, npm o linguaggi server. Funziona caricando la cartella su un normale server web statico o su GitHub Pages.

## Struttura delle cartelle

```text
/
├── index.html
├── style.css
├── script.js
├── localita.json
├── README.md
├── LICENSE
│
├── css/
├── js/
├── data/
├── icons/
├── images/
├── media/
│   ├── foto_storiche/
│   ├── foto_attuali/
│   ├── mappe/
│   ├── documenti/
│   └── testimonianze/
├── docs/
└── ...
```

I file effettivamente usati dalla pagina pubblicata sono:

- `index.html`
- `style.css`
- `script.js`
- `localita.json`
- `images/logo.svg`
- eventuali materiali collegati dentro `media/`

Le cartelle `css/`, `js/`, `data/`, `icons/`, `images/`, `media/` e `docs/` sono mantenute per archivio, sviluppo e futuri ampliamenti.

## Tecnologie utilizzate

- HTML5
- CSS3 responsive
- JavaScript vanilla
- Leaflet 1.9.4
- CartoDB Positron basemap
- OpenStreetMap contributors

## Aggiornare `localita.json`

Il file `localita.json` e la fonte dati principale dell'app.

Ogni record deve mantenere questi campi:

- `id`
- `periodo`
- `anno`
- `ordine cronologico`
- `nome storico`
- `nome attuale (se diverso)`
- `Stato attuale`
- `latitudine`
- `longitudine`
- `categoria dell'evento`
- `breve descrizione storica (3-5 righe)`

Campi opzionali per materiali archivistici:

- `foto_storiche`
- `foto_attuali`
- `mappe`
- `documenti`
- `testimonianze`
- `bibliografia`

I campi opzionali possono restare vuoti. Se non contengono dati, la relativa sezione non compare nella scheda della localita.

## Aggiungere una nuova localita

1. Aprire `localita.json`.
2. Duplicare un record esistente.
3. Assegnare un nuovo `id` univoco.
4. Aggiornare `ordine cronologico`.
5. Inserire nome storico, eventuale nome attuale, Stato, coordinate, periodo, categoria e descrizione.
6. Verificare che il JSON resti valido.
7. Ricaricare la pagina.

La mappa, l'elenco, la timeline, il menu rapido e la modalita "Segui il viaggio" si aggiornano automaticamente.

## Inserire fotografie, mappe e documenti

Inserire i file nella cartella corretta:

```text
media/foto_storiche/
media/foto_attuali/
media/mappe/
media/documenti/
media/testimonianze/
```

Poi collegarli nel record della localita in `localita.json`.

Esempio:

```json
"foto_storiche": [
  {
    "src": "media/foto_storiche/cattaro-1941.jpg",
    "titolo": "Cattaro nel 1941",
    "didascalia": "Veduta storica del porto di Cattaro."
  }
],
"documenti": [
  {
    "src": "media/documenti/documento-cattaro.pdf",
    "titolo": "Documento d'archivio"
  }
]
```

I percorsi devono essere relativi e usare `/` come separatore.

## Testimonianze e bibliografia

Esempio di testimonianza:

```json
"testimonianze": [
  {
    "titolo": "Memoria familiare",
    "testo": "Trascrizione della testimonianza.",
    "fonte": "Archivio familiare"
  }
]
```

Esempio di bibliografia:

```json
"bibliografia": [
  {
    "autore": "Nome autore",
    "titolo": "Titolo del volume",
    "anno": "2026",
    "url": "https://example.com"
  }
]
```

## Pubblicazione su GitHub Pages

1. Creare un repository GitHub.
2. Caricare tutti i file e le cartelle del progetto.
3. Verificare che `index.html` sia nella root del repository.
4. Aprire `Settings` del repository.
5. Entrare in `Pages`.
6. Scegliere il branch, ad esempio `main`.
7. Scegliere la cartella `/root`.
8. Salvare.

Non e richiesta alcuna compilazione.

## Dipendenze esterne

La pagina usa risorse CDN:

- Leaflet CSS e JS da `https://unpkg.com/leaflet@1.9.4/`
- CartoDB basemap tiles da `https://basemaps.cartocdn.com/`

Il file `localita.json` e tutti i materiali archivistici sono caricati con percorsi relativi, compatibili con GitHub Pages.

## Licenze

- **Leaflet**: BSD 2-Clause License.
- **OpenStreetMap contributors**: dati cartografici soggetti a Open Database License (ODbL).
- **CARTO basemap**: soggetta alle attribuzioni CARTO/OpenStreetMap.
- **Codice del progetto**: secondo la licenza indicata in `LICENSE`.

Fotografie, documenti, testimonianze, mappe storiche e testi aggiunti in `media/` devono essere pubblicati solo se si possiedono i diritti necessari o se la licenza ne consente l'uso online.

## Compatibilita

Il progetto funziona su browser moderni:

- Chrome
- Firefox
- Edge
- Safari
- browser mobile moderni

Per evitare restrizioni di sicurezza dei browser sul caricamento dei file JSON, usare un server web statico o GitHub Pages invece dell'apertura diretta con doppio click su `index.html`.
