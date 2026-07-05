/**
 * Pure layout math. Turns the abstract graph model (lanes + day indices) into
 * concrete SVG primitives — coordinates and path strings. No React, no DOM:
 * everything here is a deterministic function of the model, which makes it
 * trivially unit-testable and keeps the renderer dumb.
 */

import { GEOMETRY, LANES, type LaneId } from "./theme";
import type { Edge, GraphModel } from "./types";

/** Vertical pixel position of a given day index. */
export function dayY(day: number): number {
  return GEOMETRY.originOffset + day * GEOMETRY.dayHeight;
}

/** Horizontal pixel position of a lane. */
export function laneX(lane: LaneId): number {
  return LANES[lane];
}

/**
 * Vertical S-bezier between two points — control points sit at the vertical
 * midpoint so forks and merges ease horizontally without kinking.
 */
export function sBezier(x1: number, y1: number, x2: number, y2: number): string {
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

export interface RenderedEdge {
  d: string;
  color: string;
  width: number;
  dash?: string;
  opacity: number;
}

/** Resolve one model edge into a drawable path. */
export function renderEdge(edge: Edge): RenderedEdge {
  const { style } = edge;
  const base = {
    color: style.color,
    width: style.width,
    dash: style.dashed ? "5 4" : undefined,
    opacity: style.opacity ?? 1,
  };

  if (edge.kind === "spine") {
    const x = laneX(edge.lane);
    return { ...base, d: `M ${x} ${dayY(edge.fromDay)} L ${x} ${dayY(edge.toDay)}` };
  }

  return {
    ...base,
    d: sBezier(
      laneX(edge.fromLane),
      dayY(edge.fromDay),
      laneX(edge.toLane),
      dayY(edge.toDay),
    ),
  };
}

/** Total SVG height needed to show every day plus bottom breathing room. */
export function svgHeight(model: GraphModel): number {
  return dayY(model.lastDay) + 40;
}
