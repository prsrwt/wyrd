/**
 * The seed narrative, authored as a GraphModel. This is the same story the v3
 * HTML prototype tells — a trajectory that spawns a certification side branch,
 * drifts into a distraction (with the original line running on as a ghost),
 * then counter-merges back — but expressed declaratively so the renderer stays
 * data-driven. Phase 2 replaces this module with a DB-derived model of the
 * same shape.
 */

import { COLORS } from "./theme";
import type { Edge, GraphModel, GraphNode } from "./types";

const { magenta, gold, teal, drift, ghost } = COLORS;

const edges: Edge[] = [
  // —— main spine ——
  { kind: "spine", lane: "main", fromDay: 0, toDay: 14, style: { color: magenta, width: 3 } },
  // thickens after the certification milestone
  { kind: "spine", lane: "main", fromDay: 14, toDay: 18, style: { color: magenta, width: 4 } },
  // the ghost: the trajectory advancing without you while you drift
  { kind: "spine", lane: "main", fromDay: 18, toDay: 26, style: { color: ghost, width: 2.5, dashed: true } },
  // solidifies forward again after the counter-merge
  { kind: "spine", lane: "main", fromDay: 26, toDay: 33, style: { color: magenta, width: 4 } },

  // —— certification side branch ——
  { kind: "connector", fromLane: "main", fromDay: 6, toLane: "cert", toDay: 7, style: { color: teal, width: 2.5 } },
  { kind: "spine", lane: "cert", fromDay: 7, toDay: 13, style: { color: teal, width: 2.5 } },
  { kind: "connector", fromLane: "cert", fromDay: 13, toLane: "main", toDay: 14, style: { color: gold, width: 2.5 } },

  // —— drift branch —— (dashed while merely watched, solid once main is absorbed)
  { kind: "connector", fromLane: "main", fromDay: 14, toLane: "drift", toDay: 15, style: { color: drift, width: 2, dashed: true, opacity: 0.8 } },
  { kind: "spine", lane: "drift", fromDay: 15, toDay: 18, style: { color: drift, width: 2, dashed: true, opacity: 0.8 } },
  { kind: "connector", fromLane: "main", fromDay: 18, toLane: "drift", toDay: 19, style: { color: drift, width: 3.5 } },
  { kind: "spine", lane: "drift", fromDay: 19, toDay: 25, style: { color: drift, width: 3.5 } },

  // —— counter-merge back onto main ——
  { kind: "connector", fromLane: "drift", fromDay: 25, toLane: "main", toDay: 26, style: { color: magenta, width: 3 } },
];

/** Helper for the common daily-commit node. */
function commit(day: number, done: number, total: number, msg: string): GraphNode {
  return { day, lane: "main", kind: "commit", done, total, msg, color: magenta };
}

const mainNodes: GraphNode[] = [
  commit(0, 5, 5, "feat: trajectory forged"),
  commit(1, 5, 5, "feat: study block + run"),
  commit(2, 4, 5, "feat: good focus today"),
  commit(3, 3, 5, "fix: slept late, still moved"),
  commit(4, 5, 5, "feat: it finally clicked"),
  commit(5, 5, 5, "feat: steady day"),
  commit(6, 5, 5, "feat: enrolled in a course — branched"),
  commit(7, 4, 5, "feat: on track"),
  commit(8, 5, 5, "feat: solid 5/5"),
  commit(9, 2, 5, "fix: headache, low output"),
  commit(10, 5, 5, "feat: back on 5/5"),
  commit(11, 4, 5, "feat: steady"),
  commit(12, 5, 5, "feat: good rhythm"),
  commit(13, 5, 5, "feat: strong week closing"),
  { day: 14, lane: "main", kind: "merge", done: 4, total: 5, msg: "merge: course complete ✦", color: gold },
  commit(15, 3, 5, "fix: late night, distracted"),
  commit(16, 2, 5, "fix: distracted again"),
  commit(17, 2, 5, "chore: bare minimum"),
  commit(18, 1, 5, "fix: barely showed up"),
];

const certNodes: GraphNode[] = [
  { day: 7, lane: "cert", kind: "commit", done: 3, total: 3, msg: "feat: course — module 1", color: teal },
  { day: 9, lane: "cert", kind: "commit", done: 2, total: 3, msg: "feat: deep dive", color: teal },
  { day: 11, lane: "cert", kind: "commit", done: 3, total: 3, msg: "feat: hands-on module", color: teal },
  { day: 13, lane: "cert", kind: "commit", done: 3, total: 3, msg: "feat: passed practice exam", color: teal },
];

const driftNodes: GraphNode[] = [
  // branch-origin dot — the drift begins here (no tasks yet, so a plain dot)
  { day: 15, lane: "drift", kind: "commit", msg: "drift begins — Wyrd starts watching", color: drift },
  { day: 19, lane: "drift", kind: "commit", done: 2, total: 5, msg: "fix: whole evening lost to it", color: drift },
  { day: 20, lane: "drift", kind: "commit", done: 1, total: 5, msg: "fix: same again", color: drift },
  { day: 21, lane: "drift", kind: "commit", done: 2, total: 5, msg: "chore: one small thing done", color: drift },
  { day: 22, lane: "drift", kind: "commit", done: 1, total: 5, msg: "fix: late again", color: drift },
  { day: 23, lane: "drift", kind: "commit", done: 2, total: 5, msg: "docs: reading old commits. this graph hurts", color: drift },
  { day: 24, lane: "drift", kind: "commit", done: 2, total: 5, msg: "fix: trying to stop", color: drift },
  { day: 25, lane: "drift", kind: "commit", done: 3, total: 5, msg: "feat: small win this morning", color: drift },
];

// the original main, running on as hollow ghost nodes over the drift days
const ghostNodes: GraphNode[] = [19, 20, 21, 22, 23, 24, 25].map((day) => ({
  day,
  lane: "main" as const,
  kind: "ghost" as const,
  msg: "the you that kept going",
  color: ghost,
}));

const recoveredNodes: GraphNode[] = [
  { day: 26, lane: "main", kind: "counter", done: 4, total: 5, msg: "merge: counter-merge. back on trajectory", color: magenta },
  commit(27, 5, 5, "feat: steady again"),
  commit(28, 5, 5, "feat: closing the ghost gap"),
  commit(29, 3, 5, "fix: tired but showed up"),
  commit(30, 5, 5, "feat: good day"),
  commit(31, 5, 5, "feat: strong"),
  commit(32, 4, 5, "feat: mock review with a colleague"),
  { day: 33, lane: "main", kind: "commit", done: 5, total: 5, msg: "feat: still here", color: magenta, tip: true },
];

export const sampleGraph: GraphModel = {
  origin: { lane: "main", color: gold },
  edges,
  nodes: [...mainNodes, ...certNodes, ...driftNodes, ...ghostNodes, ...recoveredNodes],
  lastDay: 33,
};
