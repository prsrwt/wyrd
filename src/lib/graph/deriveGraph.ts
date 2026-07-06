/**
 * Turns real domain state (trajectory + branches + commits) into the same
 * GraphModel shape the renderer already knows how to draw. This is the seam
 * sampleGraph.ts left open — the renderer never changes, only what feeds it.
 *
 * Deliberately out of scope for this pass (later phases per the roadmap):
 *  - ghost forks / 15-day archive for missed days (Phase 3)
 *  - AI drift branches (Phase 4)
 * A missed day today just leaves a gap in the spine with no commit node.
 */

import { dayIndexFor, todayISO } from "@/lib/domain/dates";
import type { Branch, Commit, Trajectory } from "@/lib/domain/types";
import { COLORS } from "./theme";
import type { Edge, GraphModel, GraphNode, NodeKind } from "./types";

export interface DeriveInput {
  trajectory: Trajectory;
  branches: Branch[];
  commits: Commit[];
}

function nodeKindFor(commitKind: Commit["kind"]): NodeKind {
  if (commitKind === "merge") return "merge";
  if (commitKind === "counter_merge") return "counter";
  return "commit";
}

export function deriveGraph({ trajectory, branches, commits }: DeriveInput): GraphModel {
  const dayOf = (dateISO: string) => dayIndexFor(dateISO, trajectory.startedAt);

  const mainBranch = branches.find((b) => b.kind === "main");
  if (!mainBranch) {
    return { origin: { lane: "main", color: COLORS.gold }, edges: [], nodes: [], lastDay: 0 };
  }

  const mainCommits = commits
    .filter((c) => c.branchId === mainBranch.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayDay = dayOf(todayISO());
  const lastCommitDay = mainCommits.length ? dayOf(mainCommits[mainCommits.length - 1].date) : 0;
  const lastDay = Math.max(todayDay, lastCommitDay, 0);

  const edges: Edge[] = [
    { kind: "spine", lane: "main", fromDay: 0, toDay: lastDay, style: { color: COLORS.magenta, width: 3 } },
  ];
  const nodes: GraphNode[] = [];

  for (const c of mainCommits) {
    const kind = nodeKindFor(c.kind);
    nodes.push({
      day: dayOf(c.date),
      lane: "main",
      kind,
      msg: c.message,
      done: c.tasksTotal ? c.tasksCompleted : undefined,
      total: c.tasksTotal || undefined,
      color: kind === "merge" ? COLORS.gold : COLORS.magenta,
    });
  }

  // The most recent main commit is the current tip — gets the pulsing halo.
  const latestMainNode = nodes.reduce<GraphNode | null>(
    (latest, n) => (!latest || n.day > latest.day ? n : latest),
    null,
  );
  if (latestMainNode) latestMainNode.tip = true;

  for (const branch of branches.filter((b) => b.kind === "side")) {
    const branchCommits = commits
      .filter((c) => c.branchId === branch.id)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    const originDay = dayOf(branch.createdAt);
    edges.push({
      kind: "connector",
      fromLane: "main",
      fromDay: originDay,
      toLane: "side",
      toDay: originDay,
      style: { color: COLORS.teal, width: 2.5 },
    });
    // Branch-origin marker — no task total, so it renders as a plain dot.
    nodes.push({ day: originDay, lane: "side", kind: "commit", msg: `branch started — ${branch.name}`, color: COLORS.teal });

    let prevDay = originDay;
    for (const c of branchCommits) {
      const d = dayOf(c.date);
      edges.push({ kind: "spine", lane: "side", fromDay: prevDay, toDay: d, style: { color: COLORS.teal, width: 2.5 } });
      nodes.push({
        day: d,
        lane: "side",
        kind: "commit",
        done: c.tasksCompleted,
        total: c.tasksTotal,
        msg: c.message,
        color: COLORS.teal,
      });
      prevDay = d;
    }

    if (branch.status === "merged" && branch.mergedAt) {
      edges.push({
        kind: "connector",
        fromLane: "side",
        fromDay: prevDay,
        toLane: "main",
        toDay: dayOf(branch.mergedAt),
        style: { color: COLORS.gold, width: 2.5 },
      });
    }
  }

  return { origin: { lane: "main", color: COLORS.gold }, edges, nodes, lastDay };
}
