/**
 * Wyrd visual language — the "parchment & steel" palette and the geometry
 * constants that drive the graph layout. Kept in one place so the renderer,
 * the layout math, and any future heatmap share a single source of truth.
 */

export const COLORS = {
  parchment: "#EDE0C4",
  paperCard: "#FFFBEE",
  ink: "#3A2E1C",
  inkSoft: "#7A6A4A",
  magenta: "#C2185B", // main trajectory
  gold: "#B8912F", // merges / milestones
  teal: "#2C7A72", // active side branch
  drift: "#C93B47", // drift branch
  ghost: "rgba(194,24,91,0.32)", // the line-without-you
} as const;

/** Vertical rhythm of the graph: one day = one row. */
export const GEOMETRY = {
  dayHeight: 52,
  originOffset: 60, // y of day 0
  nodeRadius: 6.5,
  ghostNodeRadius: 5.5,
  width: 340,
} as const;

/** Named vertical lanes and their x positions. */
export const LANES = {
  drift: 64,
  main: 168,
  side: 272,
} as const;

export type LaneId = keyof typeof LANES;

/** Convert a hex color + alpha into an rgba() string (for completion fills). */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
