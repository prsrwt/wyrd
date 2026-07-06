/**
 * The actual store — a plain external store (not React state) so it can be
 * read via useSyncExternalStore. That hook is the React-sanctioned way to
 * bridge an external, possibly-server-absent source (here: localStorage)
 * without the hydration-mismatch dance or a setState-in-effect anti-pattern:
 * getServerSnapshot() matches what the server rendered, then React swaps in
 * the real client snapshot right after hydration commits.
 */

import { newId } from "@/lib/domain/id";
import { todayISO } from "@/lib/domain/dates";
import { EMPTY_STATE, type Branch, type Commit, type Task, type WyrdState } from "@/lib/domain/types";

const STORAGE_KEY = "wyrd:v1";

type Listener = () => void;

let state: WyrdState = EMPTY_STATE;
const listeners = new Set<Listener>();

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadFromStorage(): WyrdState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return JSON.parse(raw) as WyrdState;
  } catch {
    return EMPTY_STATE;
  }
}
// Runs once when this module is first evaluated in the browser — before any
// component reads it — so getSnapshot() is already correct on first client render.
state = loadFromStorage();

function commitState(next: WyrdState) {
  state = next;
  persist();
  for (const l of listeners) l();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): WyrdState {
  return state;
}

export function getServerSnapshot(): WyrdState {
  return EMPTY_STATE;
}

function makeTasks(labels: string[]): Task[] {
  return labels.map((label) => ({ id: newId(), label, active: true }));
}

export function declareTrajectory(title: string, why: string, taskLabels: string[]): void {
  const trajectoryId = newId();
  const mainBranchId = newId();
  const started = todayISO();
  const mainBranch: Branch = {
    id: mainBranchId,
    trajectoryId,
    parentBranchId: null,
    name: title,
    kind: "main",
    mergeCondition: null,
    status: "active",
    tasks: makeTasks(taskLabels),
    createdAt: started,
    mergedAt: null,
  };
  commitState({
    trajectory: { id: trajectoryId, title, why, status: "active", startedAt: started, endedAt: null },
    branches: [mainBranch],
    commits: [],
  });
}

export function commitToBranch(
  branchId: string,
  date: string,
  taskStates: Record<string, boolean>,
  message: string,
): void {
  const branch = state.branches.find((b) => b.id === branchId);
  if (!branch) return;
  const tasksTotal = branch.tasks.filter((t) => t.active).length;
  const tasksCompleted = Object.values(taskStates).filter(Boolean).length;
  const existing = state.commits.find((c) => c.branchId === branchId && c.date === date);
  const commit: Commit = {
    id: existing?.id ?? newId(),
    branchId,
    date,
    message,
    tasksCompleted,
    tasksTotal,
    taskStates,
    kind: existing?.kind ?? "normal",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const commits = existing
    ? state.commits.map((c) => (c.id === existing.id ? commit : c))
    : [...state.commits, commit];
  commitState({ ...state, commits });
}

export function startBranch(name: string, taskLabels: string[]): void {
  if (!state.trajectory) return;
  const mainBranch = state.branches.find((b) => b.kind === "main");
  if (!mainBranch) return;
  const alreadyActive = state.branches.some((b) => b.kind === "side" && b.status === "active");
  if (alreadyActive) return;
  const branch: Branch = {
    id: newId(),
    trajectoryId: state.trajectory.id,
    parentBranchId: mainBranch.id,
    name,
    kind: "side",
    mergeCondition: null,
    status: "active",
    tasks: makeTasks(taskLabels),
    createdAt: todayISO(),
    mergedAt: null,
  };
  commitState({ ...state, branches: [...state.branches, branch] });
}

export function mergeBranch(branchId: string, message: string): void {
  const mainBranch = state.branches.find((b) => b.kind === "main");
  if (!mainBranch) return;
  const mergedAt = todayISO();
  const branches = state.branches.map((b) =>
    b.id === branchId ? { ...b, status: "merged" as const, mergedAt } : b,
  );
  const mergeCommit: Commit = {
    id: newId(),
    branchId: mainBranch.id,
    date: mergedAt,
    message,
    tasksCompleted: 0,
    tasksTotal: 0,
    taskStates: {},
    kind: "merge",
    createdAt: new Date().toISOString(),
  };
  commitState({ ...state, branches, commits: [...state.commits, mergeCommit] });
}
