/**
 * The top-of-screen brand row: the icon mark (rounded, no baked text) next
 * to an HTML "Wyrd" wordmark set in the app's own Cinzel font. Always the
 * first thing on screen — everything else follows it.
 */

import WyrdLogo from "@/components/WyrdLogo";

export default function WyrdBrandMark({ size = 64 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="overflow-hidden rounded-2xl shadow-[0_2px_8px_rgba(58,46,28,.25)]"
        style={{ width: size, height: size * 0.9 }}
      >
        <WyrdLogo showWordmark={false} className="h-full w-full" />
      </div>
      <span
        className="font-[family-name:var(--font-cinzel)] font-bold tracking-[0.06em] text-[var(--ink)]"
        style={{ fontSize: size * 0.42 }}
      >
        Wyrd
      </span>
    </div>
  );
}
