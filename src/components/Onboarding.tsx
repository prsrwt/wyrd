"use client";

/**
 * First-run screen — "declare a trajectory" (proposal §2.1). Creates the
 * trajectory and its main branch in one step; everything after this reads
 * from the store, never from this form again.
 */

import { useState } from "react";
import { useWyrdStore } from "@/lib/store/useWyrdStore";
import CollapsingHero from "@/components/CollapsingHero";

const DEFAULT_TASKS = [""];

export default function Onboarding() {
  const { declareTrajectory } = useWyrdStore();
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [taskLabels, setTaskLabels] = useState<string[]>(DEFAULT_TASKS);

  function updateTask(index: number, value: string) {
    setTaskLabels((prev) => prev.map((t, i) => (i === index ? value : t)));
  }
  function addTask() {
    setTaskLabels((prev) => [...prev, ""]);
  }
  function removeTask(index: number) {
    setTaskLabels((prev) => prev.filter((_, i) => i !== index));
  }

  const cleanLabels = taskLabels.map((t) => t.trim()).filter(Boolean);
  const canSubmit = title.trim().length > 0 && cleanLabels.length > 0;

  function submit() {
    if (!canSubmit) return;
    declareTrajectory(title.trim(), why.trim(), cleanLabels);
  }

  const inputClass =
    "w-full rounded-md border border-[var(--parchment)] bg-[var(--paper-card)] px-3 py-2 text-[15px] text-[var(--ink)] focus:outline-2 focus:outline-[var(--magenta)]";

  return (
    <main className="pb-6">
      <CollapsingHero eyebrow="WEAVE YOUR WYRD" maxWidth="480px" trackVh={130}>
        <p className="mt-2 text-[15px] italic text-[var(--ink-soft)]">
          Your life gets a repository. Name where you&apos;re headed — this becomes
          main, the line everything else is measured against.
        </p>
      </CollapsingHero>

      {/* min-h-screen so that when the hero pin releases, this section's top
          aligns to the viewport top and the form sits right under the header
          (a short form would otherwise bottom-anchor with a big gap above it).
          pt clears the fixed header. */}
      <div className="mx-auto min-h-screen max-w-[480px] px-5 pt-[104px]">
        <div className="mb-4 font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.32em] text-[var(--ink-soft)]">
          NAME YOUR PATH
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-[13px] font-semibold">Trajectory</span>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Learn to code → land a junior dev role"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-[13px] font-semibold">Why (optional)</span>
          <textarea
            className={`${inputClass} min-h-[52px] resize-y`}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="the reason this matters, for your future self"
          />
        </label>

        <div className="mb-2 text-[13px] font-semibold">Daily tasks</div>
        <div className="mb-2 flex flex-col gap-1.5">
          {taskLabels.map((label, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                value={label}
                onChange={(e) => updateTask(i, e.target.value)}
                placeholder="e.g. Study block"
              />
              <button
                type="button"
                onClick={() => removeTask(i)}
                aria-label={`Remove task ${i + 1}`}
                className="rounded-md border border-[var(--ink-soft)] px-3 text-[var(--ink-soft)]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addTask}
          className="mb-4 rounded-md border border-[var(--ink-soft)] px-3 py-1.5 text-[13px] text-[var(--ink-soft)]"
        >
          + add task
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-md border-2 border-[var(--gold)] bg-[rgba(184,145,47,0.18)] py-3 text-[16px] font-semibold text-[var(--ink)] disabled:opacity-40"
        >
          Forge trajectory ⚔
        </button>
      </div>
    </main>
  );
}
