/**
 * The domain model — trajectories, branches, commits — matching the schema
 * sketched in the proposal (§4.1). This is the source of truth Phase 2 reads
 * and writes; the graph model (src/lib/graph) is always *derived* from it,
 * never edited directly.
 */

export interface Task {
  id: string;
  label: string;
  active: boolean;
}

export type TrajectoryStatus = "active" | "forked" | "archived";

export interface Trajectory {
  id: string;
  title: string;
  why: string;
  status: TrajectoryStatus;
  startedAt: string; // ISO date, YYYY-MM-DD
  endedAt: string | null;
}

export type BranchKind = "main" | "side" | "drift";
export type BranchStatus = "active" | "merged" | "dangling" | "archived" | "ghost";

export interface Branch {
  id: string;
  trajectoryId: string;
  parentBranchId: string | null;
  name: string;
  kind: BranchKind;
  mergeCondition: string | null;
  status: BranchStatus;
  tasks: Task[];
  createdAt: string; // ISO date
  mergedAt: string | null; // ISO date
}

export type CommitKind = "normal" | "merge" | "counter_merge" | "fork" | "miss";

export interface Commit {
  id: string;
  branchId: string;
  date: string; // ISO date, YYYY-MM-DD — one commit per (branch, date)
  message: string;
  tasksCompleted: number;
  tasksTotal: number;
  taskStates: Record<string, boolean>;
  kind: CommitKind;
  createdAt: string; // ISO timestamp
}

export interface WyrdState {
  trajectory: Trajectory | null;
  branches: Branch[];
  commits: Commit[];
}

export const EMPTY_STATE: WyrdState = { trajectory: null, branches: [], commits: [] };
