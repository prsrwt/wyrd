"use client";

/**
 * The React-facing surface of the store. useSyncExternalStore keeps this
 * SSR-safe without an effect: every component gets the server-empty snapshot
 * on the first (server + hydration) render, then React swaps in the real
 * client snapshot immediately after — no Context, no Provider needed, since
 * the store already lives outside React in wyrdStore.ts.
 */

import { useSyncExternalStore } from "react";
import {
  commitToBranch,
  declareTrajectory,
  getServerSnapshot,
  getSnapshot,
  mergeBranch,
  startBranch,
  subscribe,
} from "./wyrdStore";
import type { WyrdState } from "@/lib/domain/types";

interface WyrdStoreApi {
  state: WyrdState;
  declareTrajectory: (title: string, why: string, taskLabels: string[]) => void;
  commit: (branchId: string, date: string, taskStates: Record<string, boolean>, message: string) => void;
  startBranch: (name: string, taskLabels: string[]) => void;
  mergeBranch: (branchId: string, message: string) => void;
}

export function useWyrdStore(): WyrdStoreApi {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    state,
    declareTrajectory,
    commit: commitToBranch,
    startBranch,
    mergeBranch,
  };
}
