const pine = (x: number, y: number, s = 1, color = "#446748") =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${color}" d="M16 0h8v8h8v8h8v8h-8v8h16v8H32v8h24v8H0v-8h16v-8H8v-8h16v-8H8v-8h8z"/><path fill="#75825a" d="M24 56h8v16h-8z"/></g>`;
export const landscape = `<svg class="landscape" viewBox="0 0 480 232" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
<path fill="#dce7ad" d="M0 0h480v232H0z"/>
<path fill="#f6edb0" d="M352 24h48v8h8v40h-8v8h-48v-8h-8V32h8z"/>
<path fill="#c1d298" d="M0 120h24v-16h24V88h24V72h32v16h24v16h24v16h40V96h24V80h32v16h24v16h24v16h32V96h24V80h24V64h32v16h24v16h24v16h40v120H0z"/>
<path fill="#9eb981" d="M0 160h32v-16h32v-16h32v-16h32v16h32v16h48v16h32v-16h32v-16h40v16h32v16h48v-16h32v-16h32v-16h24v16h20v104H0z"/>
<path fill="#7e9c66" d="M0 192h56v-8h64v8h72v-16h80v8h96v-8h56v16h56v40H0z"/>
${pine(18, 93, 1.2, "#56774e")}${pine(76, 132, 0.8, "#678751")}${pine(385, 88, 1.4)}${pine(443, 144, 0.7, "#56774e")}
<path fill="#527447" d="M0 216h72v-8h56v8h112v-8h128v8h112v16H0z"/>
<path fill="#e4d496" d="M242 216h40v8h24v8h-96v-8h32z"/>
<g transform="translate(174 66)"><path fill="#26432e" d="M16 0h112v8h8v128h-8v8H16v-8H8V8h8z"/><path fill="#4e6a41" d="M16 8h112v120H16z"/><path fill="#bed18c" d="M24 16h96v32H24zm0 40h96v32H24zm0 40h96v24H24z"/><path fill="#789959" d="M32 24h48v16H32zm0 40h48v16H32zm0 40h48v8H32z"/><path fill="#e8d78a" d="M96 24h16v8H96zm0 40h16v8H96z"/><path fill="#26432e" d="M32 136h16v8H32zm64 0h16v8H96z"/><path fill="#95bd65" d="M24 4h96v4H24z"/></g>
<path fill="#d5e59c" d="M146 120h8v8h8v8h-8v8h-8v-8h-8v-8h8zm198 30h8v8h8v8h-8v8h-8v-8h-8v-8h8z"/>
<path fill="#e6df9b" d="M24 216h8v8h-8zm112-8h8v8h-8zm192 8h8v8h-8zm80-8h8v8h-8z"/>
<path fill="#fff7cb" d="M132 28h8v8h-8zm156-4h8v8h-8zm152 52h8v8h-8z"/>
</svg>`;
export const paths: Record<string, string> = {
  server: "M3 2h10v5H3zM3 9h10v5H3zM5 4h4M11 4h1M5 11h4M11 11h1",
  search: "M2 2h7v7H2zM9 9h2v2h2v2h2",
  sun: "M5 5h6v6H5zM7 0h2v3H7zM7 13h2v3H7zM0 7h3v2H0zM13 7h3v2h-3z",
  moon: "M7 1H3v3H1v8h3v3h8v-2h3V9h-5V6H7z",
  arrow: "M2 7h10M8 3l4 4-4 4",
  down: "M3 5h2v2h2v2h2V7h2V5h2M8 1v8M2 13h12",
  up: "M3 7h2V5h2V3h2v2h2v2h2M8 3v10M2 15h12",
  book: "M1 2h5l2 2 2-2h5v11h-5l-2 2-2-2H1zM8 4v11",
  grid: "M2 2h4v4H2zM10 2h4v4h-4zM2 10h4v4H2zM10 10h4v4h-4z",
  list: "M2 3h2M6 3h8M2 8h2M6 8h8M2 13h2M6 13h8",
  close: "M3 3l10 10M13 3L3 13",
  chevron: "M5 3l5 5-5 5",
  globe:
    "M4 1h8v2h2v2h1v6h-1v2h-2v2H4v-2H2v-2H1V5h1V3h2zM1 8h14M6 1v14M10 1v14",
  github: "M5 1h6v2h3v3h1v5h-3v4H9v-4H7v4H4v-3H1V8h2v2h2V9H3V4h2z",
  refresh: "M13 6V2l-2 2H5V3H3v2H1v6h2v2h8v-2h2M13 2h-4",
  sort: "M2 3h12M2 8h8M2 13h4",
  spark: "M6 0h4v6h6v4h-6v6H6v-6H0V6h6z",
};
export const icon = (key: string, cls = "") =>
  `<svg class="icon ${cls}" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true"><path d="${paths[key] || paths.server}"/></svg>`;
