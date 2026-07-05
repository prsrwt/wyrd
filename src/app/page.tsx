import WyrdGraph from "@/components/WyrdGraph";
import Legend from "@/components/Legend";
import { sampleGraph } from "@/lib/graph/sampleGraph";

export default function Home() {
  return (
    <main>
      <header className="mx-auto max-w-[520px] px-5 pt-[22px] pb-2">
        <div className="font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.32em] text-[var(--ink-soft)]">
          PROTOTYPE · PHASE 1 — THE GRAPH
        </div>
        <h1 className="mt-[6px] mb-[2px] font-[family-name:var(--font-cinzel)] text-[clamp(24px,6vw,34px)] font-bold tracking-[0.04em]">
          ⚔ Wyrd
        </h1>
        <div className="text-[15px] italic text-[var(--ink-soft)]">weave your wyrd</div>
      </header>

      <div className="mx-auto max-w-[520px] px-0 pt-[10px] pb-[80px]">
        <WyrdGraph model={sampleGraph} />
      </div>

      <Legend />

      <footer className="px-5 pb-[30px] text-center text-[13px] italic text-[var(--ink-soft)]">
        stay true to yourself · stay true to keep an accurate history
      </footer>
    </main>
  );
}
