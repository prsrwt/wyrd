"use client";

import WyrdGraph from "@/components/WyrdGraph";
import Legend from "@/components/Legend";
import Onboarding from "@/components/Onboarding";
import CommitSheet from "@/components/CommitSheet";
import CollapsingHero from "@/components/CollapsingHero";
import { useWyrdStore } from "@/lib/store/useWyrdStore";
import { deriveGraph } from "@/lib/graph/deriveGraph";

export default function Home() {
  const { state } = useWyrdStore();

  if (!state.trajectory) {
    return <Onboarding />;
  }

  const model = deriveGraph({
    trajectory: state.trajectory,
    branches: state.branches,
    commits: state.commits,
  });

  const eyebrow = state.trajectory.title.toUpperCase();

  return (
    <main>
      <CollapsingHero eyebrow={eyebrow} trackVh={125}>
        <div className="mt-2 text-[15px] italic text-[var(--ink-soft)]">weave your wyrd</div>
      </CollapsingHero>

      <div className="mx-auto max-w-[520px] px-0 pt-[10px] pb-[160px]">
        <WyrdGraph model={model} />
      </div>

      <Legend />

      <footer className="px-5 pb-[30px] text-center text-[13px] italic text-[var(--ink-soft)]">
        stay true to yourself · stay true to keep an accurate history
      </footer>

      <CommitSheet />
    </main>
  );
}
