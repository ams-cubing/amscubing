/** Neutral gray used when a label has no color selected. */
export const DEFAULT_LABEL_COLOR = "#94a3b8";

/** Trello-style palette: 6 rows × 5 columns. */
export const LABEL_COLORS = [
  "#216e4e",
  "#4bce97",
  "#7ee2b8",
  "#baf3db",
  "#dffcf0",
  "#5b7f24",
  "#94c748",
  "#b3df72",
  "#d3f1a7",
  "#edfcc6",
  "#974f0c",
  "#f5a623",
  "#fea362",
  "#fec195",
  "#ffe2bd",
  "#5d1f1a",
  "#cf1322",
  "#f87168",
  "#fea191",
  "#ffd5d2",
  "#5e4db2",
  "#8270db",
  "#9f8fef",
  "#c1b6f2",
  "#dfd8fd",
  "#0055cc",
  "#579dff",
  "#85b8ff",
  "#b3d4ff",
  "#cce0ff",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];
