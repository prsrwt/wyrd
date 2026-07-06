"use client";

/**
 * The daily commit ritual — a collapsed FAB that expands into a bottom
 * sheet. Committing writes to main and (if a side branch is active) to
 * that branch in the same click, mirroring the prototype's one-dialog,
 * one-or-two-commits behavior. Reopening today's already-submitted commit
 * edits it in place rather than creating a duplicate (proposal §5.1).
 *
 * The form's initial values come from today's existing commit, but that's
 * expressed as a `key`-triggered remount with lazy useState initializers
 * (see CommitSheetForm) rather than an effect that copies store state into
 * local state on every render — the latter is exactly the pattern React's
 * set-state-in-effect rule exists to catch.
 */

import { useState } from "react";
import { useWyrdStore } from "@/lib/store/useWyrdStore";
import { todayISO } from "@/lib/domain/dates";
import type { Branch, Commit } from "@/lib/domain/types";

export default function CommitSheet() {
  const { state, commit, startBranch, mergeBranch } = useWyrdStore();
  const [expanded, setExpanded] = useState(false);

  const mainBranch = state.branches.find((b) => b.kind === "main");
  const activeBranch = state.branches.find((b) => b.kind === "side" && b.status === "active");
  const today = todayISO();

  const todayMainCommit = mainBranch
    ? state.commits.find((c) => c.branchId === mainBranch.id && c.date === today)
    : undefined;
  const todayBranchCommit = activeBranch
    ? state.commits.find((c) => c.branchId === activeBranch.id && c.date === today)
    : undefined;

  if (!mainBranch) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Open today's commit"
        className="fixed right-5 bottom-5 z-[80] flex h-16 w-16 items-center justify-center rounded-full bg-[var(--magenta)] font-[family-name:var(--font-cinzel)] text-[13px] leading-tight text-[#FFF3EA] shadow-[0_6px_16px_rgba(58,46,28,.35)]"
      >
        {todayMainCommit ? (
          <span>
            {todayMainCommit.tasksCompleted}/{todayMainCommit.tasksTotal}
            <br />
            today
          </span>
        ) : (
          <span>＋<br />commit</span>
        )}
      </button>
    );
  }

  return (
    <CommitSheetForm
      // Remount with fresh initial state whenever "which commit we're
      // editing" changes — this is what replaces the effect.
      key={`${mainBranch.id}:${todayMainCommit?.id ?? "new"}:${activeBranch?.id ?? "none"}`}
      mainBranch={mainBranch}
      activeBranch={activeBranch}
      todayMainCommit={todayMainCommit}
      todayBranchCommit={todayBranchCommit}
      today={today}
      onCommit={commit}
      onStartBranch={startBranch}
      onMergeBranch={mergeBranch}
      onClose={() => setExpanded(false)}
    />
  );
}

interface CommitSheetFormProps {
  mainBranch: Branch;
  activeBranch: Branch | undefined;
  todayMainCommit: Commit | undefined;
  todayBranchCommit: Commit | undefined;
  today: string;
  onCommit: (branchId: string, date: string, taskStates: Record<string, boolean>, message: string) => void;
  onStartBranch: (name: string, taskLabels: string[]) => void;
  onMergeBranch: (branchId: string, message: string) => void;
  onClose: () => void;
}

function CommitSheetForm({
  mainBranch,
  activeBranch,
  todayMainCommit,
  todayBranchCommit,
  today,
  onCommit,
  onStartBranch,
  onMergeBranch,
  onClose,
}: CommitSheetFormProps) {
  const activeTasks = mainBranch.tasks.filter((t) => t.active);

  const [mainStates, setMainStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const t of activeTasks) initial[t.id] = todayMainCommit?.taskStates[t.id] ?? false;
    return initial;
  });
  const [mainMsg, setMainMsg] = useState(todayMainCommit?.message ?? "");
  const [branchChecked, setBranchChecked] = useState(
    () => !!activeBranch && activeBranch.tasks.some((t) => todayBranchCommit?.taskStates[t.id]),
  );
  const [branchMsg, setBranchMsg] = useState(todayBranchCommit?.message ?? "");

  const doneCount = activeTasks.filter((t) => mainStates[t.id]).length;

  function handleCommit() {
    onCommit(mainBranch.id, today, mainStates, mainMsg.trim() || "(no message)");
    if (activeBranch && (branchChecked || branchMsg.trim())) {
      const states: Record<string, boolean> = {};
      for (const t of activeBranch.tasks) states[t.id] = branchChecked;
      onCommit(
        activeBranch.id,
        today,
        states,
        branchMsg.trim() || (branchChecked ? "feat: branch progress" : "(no message)"),
      );
    }
    onClose();
  }

  function handleStartBranch() {
    const name = window.prompt("Name your new side branch:", "Side quest");
    if (!name) return;
    onStartBranch(name, ["Worked on it today"]);
  }

  function handleMerge() {
    if (!activeBranch) return;
    onMergeBranch(activeBranch.id, `merge: ${activeBranch.name} completed ✦`);
  }

  return (
    <div className="fixed right-5 bottom-5 z-[80] max-h-[76vh] w-[min(88vw,320px)] overflow-y-auto rounded-[14px] bg-[var(--paper-card)] p-4 text-[var(--ink)] shadow-[0_6px_16px_rgba(58,46,28,.35)]">
      <div className="mb-2.5 flex items-center justify-between font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.16em] text-[var(--ink-soft)]">
        TODAY
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-[18px] leading-none text-[var(--ink-soft)]"
        >
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-[9px]">
        {activeTasks.map((t) => (
          <label key={t.id} className="flex items-center gap-[9px] text-[15px]">
            <input
              type="checkbox"
              checked={mainStates[t.id] ?? false}
              onChange={(e) => setMainStates((prev) => ({ ...prev, [t.id]: e.target.checked }))}
              className="h-[18px] w-[18px] flex-none accent-[var(--magenta)]"
            />
            {t.label}
          </label>
        ))}
      </div>

      <textarea
        value={mainMsg}
        onChange={(e) => setMainMsg(e.target.value)}
        placeholder="feat: what actually happened today..."
        className="min-h-[56px] w-full resize-y rounded-md border border-[var(--parchment)] bg-[#FFFEF8] px-2.5 py-2 text-[14.5px] focus:outline-2 focus:outline-[var(--magenta)]"
      />

      <div className="mt-2.5 flex items-center justify-between gap-2.5">
        <span className="text-[12px] text-[var(--ink-soft)]">
          {doneCount}/{activeTasks.length} checked
        </span>
        <button
          type="button"
          onClick={handleCommit}
          className="rounded-md border-[1.5px] border-[var(--gold)] bg-[rgba(184,145,47,0.18)] px-[13px] py-[7px] text-[14px]"
        >
          Commit
        </button>
      </div>

      <hr className="my-3.5 border-t border-dashed border-[var(--parchment)]" />

      {activeBranch ? (
        <div>
          <div className="mb-2 font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.14em] text-[var(--teal)]">
            {activeBranch.name.toUpperCase()}
          </div>
          <label className="mb-2 flex items-center gap-[9px] text-[15px]">
            <input
              type="checkbox"
              checked={branchChecked}
              onChange={(e) => setBranchChecked(e.target.checked)}
              className="h-[18px] w-[18px] flex-none accent-[var(--teal)]"
            />
            Worked on it today
          </label>
          <textarea
            value={branchMsg}
            onChange={(e) => setBranchMsg(e.target.value)}
            placeholder="feat: branch progress..."
            className="min-h-[48px] w-full resize-y rounded-md border border-[var(--parchment)] bg-[#FFFEF8] px-2.5 py-2 text-[14.5px] focus:outline-2 focus:outline-[var(--teal)]"
          />
          <button
            type="button"
            onClick={handleMerge}
            className="mt-2.5 rounded-md border border-[var(--ink-soft)] px-[10px] py-[5px] text-[12.5px] text-[var(--ink-soft)]"
          >
            Merge branch ✦
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartBranch}
          className="rounded-md border border-[var(--ink-soft)] px-[10px] py-[5px] text-[12.5px] text-[var(--ink-soft)]"
        >
          + Start a side branch
        </button>
      )}
    </div>
  );
}
