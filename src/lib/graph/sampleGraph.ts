/**
 * The seed narrative, authored as a GraphModel. This is the same story the v3
 * HTML prototype tells — a trajectory that spawns a certification side branch,
 * drifts into a distraction (with the original line running on as a ghost),
 * then counter-merges back — but expressed declaratively so the renderer stays
 * data-driven. Phase 2 replaces this module with a DB-derived model of the
 * same shape.
 *
 * The timeline is deliberately spread out (one story beat every ~9 days) so the
 * scrollytelling section (`WyrdStory`) can float a caption for each beat without
 * two ever being on screen — and overlapping — at once. The beat anchors live
 * at days 0 / 9 / 18 / 27 / 36 / 45 / 54; every anchor lands on a real node of
 * its lane below, since the story's connector attaches to that exact node.
 */

import { COLORS } from "./theme";
import type { Edge, GraphModel, GraphNode } from "./types";

const { magenta, gold, teal, drift, ghost } = COLORS;

const edges: Edge[] = [
  // —— main spine ——
  { kind: "spine", lane: "main", fromDay: 0, toDay: 18, style: { color: magenta, width: 3 } },
  // thickens through the certification milestone
  { kind: "spine", lane: "main", fromDay: 18, toDay: 20, style: { color: magenta, width: 4 } },
  // the ghost: the trajectory advancing without you while you drift
  { kind: "spine", lane: "main", fromDay: 20, toDay: 45, style: { color: ghost, width: 2.5, dashed: true } },
  // solidifies forward again after the counter-merge
  { kind: "spine", lane: "main", fromDay: 45, toDay: 54, style: { color: magenta, width: 4 } },

  // —— certification side branch ——
  { kind: "connector", fromLane: "main", fromDay: 8, toLane: "side", toDay: 9, style: { color: teal, width: 2.5 } },
  { kind: "spine", lane: "side", fromDay: 9, toDay: 17, style: { color: teal, width: 2.5 } },
  { kind: "connector", fromLane: "side", fromDay: 17, toLane: "main", toDay: 18, style: { color: gold, width: 2.5 } },

  // —— drift branch —— (dashed while merely watched, solid once main is absorbed)
  { kind: "connector", fromLane: "main", fromDay: 20, toLane: "drift", toDay: 21, style: { color: drift, width: 2, dashed: true, opacity: 0.8 } },
  { kind: "spine", lane: "drift", fromDay: 21, toDay: 27, style: { color: drift, width: 2, dashed: true, opacity: 0.8 } },
  { kind: "connector", fromLane: "main", fromDay: 26, toLane: "drift", toDay: 27, style: { color: drift, width: 3.5 } },
  { kind: "spine", lane: "drift", fromDay: 27, toDay: 43, style: { color: drift, width: 3.5 } },

  // —— counter-merge back onto main ——
  { kind: "connector", fromLane: "drift", fromDay: 43, toLane: "main", toDay: 45, style: { color: magenta, width: 3 } },
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
  commit(6, 4, 5, "feat: on track"),
  commit(7, 5, 5, "feat: solid day"),
  commit(8, 5, 5, "feat: enrolled in a course — branched"),
  commit(9, 4, 5, "feat: holding rhythm"),
  commit(10, 2, 5, "fix: headache, low output"),
  commit(11, 5, 5, "feat: back on 5/5"),
  commit(12, 4, 5, "feat: steady"),
  commit(13, 5, 5, "feat: good rhythm"),
  commit(14, 5, 5, "feat: strong midweek"),
  commit(15, 4, 5, "feat: on track"),
  commit(16, 5, 5, "feat: strong week closing"),
  commit(17, 5, 5, "feat: final push before the merge"),
  { day: 18, lane: "main", kind: "merge", done: 4, total: 5, msg: "merge: course complete ✦", color: gold },
  commit(19, 5, 5, "feat: trajectory renders stronger"),
];

const certNodes: GraphNode[] = [
  { day: 9, lane: "side", kind: "commit", done: 3, total: 3, msg: "feat: course — module 1", color: teal },
  { day: 11, lane: "side", kind: "commit", done: 2, total: 3, msg: "feat: deep dive", color: teal },
  { day: 13, lane: "side", kind: "commit", done: 3, total: 3, msg: "feat: hands-on module", color: teal },
  { day: 15, lane: "side", kind: "commit", done: 3, total: 3, msg: "feat: passed practice exam", color: teal },
  { day: 17, lane: "side", kind: "commit", done: 3, total: 3, msg: "feat: final module — ready to merge", color: teal },
];

const driftNodes: GraphNode[] = [
  // branch-origin dot — the drift begins here (no tasks yet, so a plain dot)
  { day: 21, lane: "drift", kind: "commit", msg: "drift begins — Wyrd starts watching", color: drift },
  { day: 23, lane: "drift", kind: "commit", done: 2, total: 5, msg: "fix: whole evening lost to it", color: drift },
  { day: 25, lane: "drift", kind: "commit", done: 1, total: 5, msg: "fix: same again", color: drift },
  // the naming/absorb beat — dashed watch turns into a solid, named branch
  { day: 27, lane: "drift", kind: "commit", done: 1, total: 5, msg: "chore: Wyrd named it — main absorbed", color: drift },
  { day: 29, lane: "drift", kind: "commit", done: 2, total: 5, msg: "fix: late again", color: drift },
  { day: 31, lane: "drift", kind: "commit", done: 2, total: 5, msg: "docs: reading old commits. this graph hurts", color: drift },
  { day: 33, lane: "drift", kind: "commit", done: 1, total: 5, msg: "fix: another lost day", color: drift },
  { day: 35, lane: "drift", kind: "commit", done: 2, total: 5, msg: "fix: trying to stop", color: drift },
  { day: 37, lane: "drift", kind: "commit", done: 2, total: 5, msg: "chore: one small thing done", color: drift },
  { day: 39, lane: "drift", kind: "commit", done: 3, total: 5, msg: "feat: small win this morning", color: drift },
  { day: 41, lane: "drift", kind: "commit", done: 3, total: 5, msg: "feat: two good hours", color: drift },
  { day: 43, lane: "drift", kind: "commit", done: 4, total: 5, msg: "feat: clawing back", color: drift },
];

// the original main, running on as hollow ghost nodes over the drift days
const ghostNodes: GraphNode[] = [22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44].map((day) => ({
  day,
  lane: "main" as const,
  kind: "ghost" as const,
  msg: "the you that kept going",
  color: ghost,
}));

const recoveredNodes: GraphNode[] = [
  { day: 45, lane: "main", kind: "counter", done: 4, total: 5, msg: "merge: counter-merge. back on trajectory", color: magenta },
  commit(46, 5, 5, "feat: steady again"),
  commit(47, 5, 5, "feat: closing the ghost gap"),
  commit(48, 3, 5, "fix: tired but showed up"),
  commit(49, 5, 5, "feat: good day"),
  commit(50, 5, 5, "feat: strong"),
  commit(51, 4, 5, "feat: mock review with a colleague"),
  commit(52, 5, 5, "feat: momentum back"),
  commit(53, 5, 5, "feat: nearly caught up"),
  { day: 54, lane: "main", kind: "commit", done: 5, total: 5, msg: "feat: still here", color: magenta, tip: true },
];

export const sampleGraph: GraphModel = {
  origin: { lane: "main", color: gold },
  edges,
  nodes: [...mainNodes, ...certNodes, ...driftNodes, ...ghostNodes, ...recoveredNodes],
  lastDay: 54,
};
