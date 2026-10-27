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
