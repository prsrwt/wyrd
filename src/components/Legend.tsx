/**
 * The graph legend — one swatch per lane type. Server component; purely
 * presentational.
 */

import { COLORS } from "@/lib/graph/theme";

interface Item {
  label: string;
  color: string;
  dashed?: boolean;
}

const ITEMS: Item[] = [
  { label: "main", color: COLORS.magenta },
  { label: "branch", color: COLORS.teal },
  { label: "merge", color: COLORS.gold },
  { label: "drift", color: COLORS.drift },
  { label: "ghost", color: COLORS.ghost, dashed: true },
];

export default function Legend() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-wrap gap-[14px] px-5 pb-[18px] text-[12.5px] text-[var(--ink-soft)]">
      {ITEMS.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-[6px]">
          <svg width="18" height="8" aria-hidden>
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke={item.color}
              strokeWidth="3"
              strokeDasharray={item.dashed ? "5 4" : undefined}
            />
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  );
}
