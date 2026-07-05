/**
 * The declarative graph model. A Wyrd graph is expressed as a set of typed
 * edges (spines and connectors) plus nodes — never as imperative draw calls.
 * The renderer walks this model; the layout layer turns (lane, day) into
 * (x, y). In v1 the model is hand-authored sample data; in Phase 2 the same
 * shape is produced from commit/branch rows in the database.
 */

import type { LaneId } from "./theme";

/** Stroke appearance for a single edge. */
export interface EdgeStyle {
  color: string;
  width: number;
  dashed?: boolean;
  /** 0–1; defaults to 1 when omitted. */
  opacity?: number;
}

/** A vertical run along one lane, from `fromDay` to `toDay` (inclusive of both). */
export interface SpineEdge {
  kind: "spine";
  lane: LaneId;
  fromDay: number;
  toDay: number;
  style: EdgeStyle;
}

/** A curve between two lanes (a fork or a merge), drawn as an S-bezier. */
export interface ConnectorEdge {
  kind: "connector";
  fromLane: LaneId;
  fromDay: number;
  toLane: LaneId;
  toDay: number;
  style: EdgeStyle;
}

export type Edge = SpineEdge | ConnectorEdge;

export type NodeKind =
  | "commit" // ordinary daily commit; fill opacity encodes completion ratio
  | "merge" // gold diamond — a side branch merged into main
  | "counter" // magenta diamond — a counter-merge back onto main
  | "ghost"; // hollow dashed node — the trajectory continuing without you

/** A single point on the graph. */
export interface GraphNode {
  day: number;
  lane: LaneId;
  kind: NodeKind;
  msg: string;
  /** Tasks completed / total. Omitted for merge/ghost nodes that carry no ratio. */
  done?: number;
  total?: number;
  color: string;
  /** The current tip — renders a pulsing halo. At most one per graph. */
  tip?: boolean;
}

/** The origin marker (sword crossguard) sits above day 0 on a lane. */
export interface Origin {
  lane: LaneId;
  color: string;
}

export interface GraphModel {
  origin: Origin;
  edges: Edge[];
  nodes: GraphNode[];
  /** Highest day index present — drives the SVG height. */
  lastDay: number;
}
