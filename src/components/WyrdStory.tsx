"use client";

/**
 * WyrdStory — the atmos-style scrollytelling section that sits between the hero
 * and the onboarding form. A single centered trajectory line "draws itself in"
 * as you scroll; a glowing needle (the "plane") flies down it at screen centre
 * while the camera follows the frontier; commit/branch captions extend from the
 * sides — the same information the app's graph tooltip shows — and fade as each
 * point scrolls past. Branches (a certification side-quest, a drift, the ghost)
 * fork off exactly as they do in the real graph.
 *
 * It reuses the real domain artefacts so the story is the app, not a mock:
 *   - `sampleGraph` (the seed narrative) for every edge and node,
 *   - the graph theme + layout math (`laneX`, `dayY`, `renderEdge`) for geometry.
 *
 * Mechanics: react-spring's `useScroll` gives a smoothed document scrollY; we
 * map it to a fractional `frontier` day over this section's own pin range, then
 * derive the camera translate, a reveal clip, and each caption's opacity from
 * that one number (same one-source-of-truth approach as CollapsingHero, which
 * avoids the framer useTransform inconsistency).
 */

import { useEffect, useRef, useState } from "react";
import { useScroll } from "@react-spring/web";
import { sampleGraph } from "@/lib/graph/sampleGraph";
import { COLORS, GEOMETRY, LANES } from "@/lib/graph/theme";
import { dayY, laneX, renderEdge } from "@/lib/graph/layout";
import type { GraphNode } from "@/lib/graph/types";

const LAST = sampleGraph.lastDay;
const MAIN_X = LANES.main;
const { magenta, gold, teal, drift, ink, inkSoft, paperCard } = COLORS;

interface Beat {
  day: number;
  lane: keyof typeof LANES;
  side: "left" | "right";
  chapter: string;
  meta: string;
  title: string;
  body: string;
  accent: string;
}

/** The seven story beats, anchored to real days in the sample trajectory. */
const BEATS: Beat[] = [
  {
    day: 0, lane: "main", side: "left", chapter: "THE REPOSITORY", meta: "DAY 1 · 5/5 TASKS",
    title: "Your life gets a repository",
    body: "Name where you're headed — this becomes main, the line everything else is measured against. Each node is one honest day; its fill is how much you did.",
    accent: magenta,
  },
  {
    day: 6, lane: "side", side: "right", chapter: "BRANCHES", meta: "DAY 7 · BRANCHED",
    title: "Branch for the side-quests",
    body: "A bounded detour — a course, a certification — forks off as its own line with its own tasks, and merges back when its goal is met.",
    accent: teal,
  },
  {
    day: 14, lane: "main", side: "right", chapter: "MERGE", meta: "DAY 15 · MERGE ✦",
    title: "Merge what you finish",
    body: "The branch rejoins main as a gold milestone. The trajectory renders stronger after everything you complete.",
    accent: gold,
  },
  {
    day: 15, lane: "drift", side: "left", chapter: "DRIFT", meta: "DAY 16 · DRIFT BEGINS",
    title: "The signature mechanic",
    body: "A recurring distraction becomes a named branch. Name it yourself — or, after fair warning, Wyrd names it for you and main is absorbed into it.",
    accent: drift,
  },
  {
    day: 22, lane: "main", side: "right", chapter: "THE GHOST", meta: "DAY 23 · GHOST",
    title: "The ghost is the product",
    body: "Your original line runs on beside you — dashed, hollow, advancing every day. Where you would have been. The single most motivating pixel on screen.",
    accent: inkSoft,
  },
  {
    day: 26, lane: "main", side: "left", chapter: "RECOVERY", meta: "DAY 27 · COUNTER-MERGE",
    title: "You drifted — and recovered",
    body: "A counter-merge brings you back. The dark loop stays in history forever — proof you fell and climbed back out. History is a record, not a report card.",
    accent: magenta,
  },
  {
    day: 33, lane: "main", side: "right", chapter: "YOUR TURN", meta: "DAY 34 · STILL HERE",
    title: "Written by showing up",
    body: "Months of a life, narrated from nothing but honestly committing, day after day. That autobiography starts with one line — declare yours below.",
    accent: magenta,
  },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * Opacity for a caption given the current frontier day. Fades in ~1.5 days
 * before the node reaches centre, holds while it scrolls up, fades out by ~8.5
 * days past — wide enough that consecutive beats overlap slightly (no blank
 * stretches). Sides are assigned so no two simultaneously-visible cards share a
 * side.
 */
function beatOpacity(frontier: number, day: number): number {
  const d = frontier - day;
  if (d < -1.5) return 0;
  if (d < 0) return clamp((d + 1.5) / 1.5);
  if (d < 6) return 1;
  if (d < 8.5) return clamp(1 - (d - 6) / 2.5);
  return 0;
}

export default function WyrdStory({ trackVh = 470 }: { trackVh?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [frontier, setFrontier] = useState(0);
  const [vp, setVp] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // react-spring smoothed document scroll -> fractional frontier day. The reveal
  // starts PRE px BEFORE the section pins, so the trajectory is already drawing
  // itself in as the section slides up into view — no empty gap after the hero.
  useScroll({
    config: { tension: 260, friction: 42 },
    onChange: ({ value }) => {
      const el = trackRef.current;
      if (!el) return;
      const vh = window.innerHeight;
      const PRE = vh * 0.7;
      const len = Math.max(1, el.offsetHeight - vh);
      const rel = ((value.scrollY as number) - (el.offsetTop - PRE)) / (len + PRE);
      setFrontier(clamp(rel) * LAST);
    },
  });

  const isNarrow = vp.w < 760;
  const cx = vp.w / 2 - MAIN_X;
  // Anchor the drawing frontier lower on desktop so the trajectory fills more of
  // the screen (less empty space below); higher on mobile so the single caption
  // card has clear room beneath the graph.
  const anchorY = vp.h * (isNarrow ? 0.4 : 0.64);
  const cameraY = anchorY - dayY(frontier);
  // reveal a touch beyond the frontier so a node is fully drawn as we reach it
  const revealH = dayY(frontier) + GEOMETRY.nodeRadius + 3;

  // screen position of a (lane, day)
  const sx = (lane: keyof typeof LANES) => cx + laneX(lane);
  const syOf = (day: number) => cameraY + dayY(day);

  const CARD_W = isNarrow ? Math.min(360, vp.w - 32) : 300;
  const GAP = 78;

  // On narrow screens side cards can't fit without overlapping each other, so we
  // show only the single most-relevant beat as a bottom tooltip.
  let activeBeat: Beat | null = null;
  let activeOp = 0;
  if (isNarrow) {
    for (const b of BEATS) {
      const o = beatOpacity(frontier, b.day);
      if (o > activeOp) {
        activeOp = o;
        activeBeat = b;
      }
    }
  }

  return (
    <section ref={trackRef} className="relative" style={{ height: `${trackVh}vh` }}>
      <div className="parchment-surface sticky top-0 h-[100svh] overflow-hidden">
        {/* —— the graph, camera-followed and revealed —— */}
        <svg
          width={vp.w}
          height={vp.h}
          viewBox={`0 0 ${vp.w} ${vp.h}`}
          className="absolute inset-0"
          aria-hidden
        >
          <defs>
            <clipPath id="wyrd-story-reveal">
              <rect x={-4000} y={0} width={8000} height={revealH} />
            </clipPath>
          </defs>

          {/* camera group: everything in graph coords, translated to follow the frontier */}
          <g transform={`translate(${cx}, ${cameraY})`}>
            <g clipPath="url(#wyrd-story-reveal)">
              {sampleGraph.edges.map((edge, i) => {
                const r = renderEdge(edge);
                return (
                  <path
                    key={`e${i}`}
                    d={r.d}
                    fill="none"
                    stroke={r.color}
                    strokeWidth={r.width}
                    strokeDasharray={r.dash}
                    opacity={r.opacity}
                  />
                );
              })}
              {sampleGraph.nodes.map((node, i) => (
                <StoryNode key={`n${i}`} node={node} />
              ))}
            </g>
          </g>

          {/* screen-space overlay: caption connectors from each node to its card */}
          <g>
            {!isNarrow &&
              BEATS.map((b, i) => {
                const op = beatOpacity(frontier, b.day);
                if (op <= 0.01) return null;
                const nx = sx(b.lane);
                const ny = syOf(b.day);
                const endX = b.side === "left" ? nx - GAP : nx + GAP;
                return (
                  <g key={`c${i}`} opacity={op}>
                    <line x1={nx} y1={ny} x2={endX} y2={ny} stroke={b.accent} strokeWidth={1.25} />
                    <circle cx={nx} cy={ny} r={3.5} fill="none" stroke={b.accent} strokeWidth={1.5} />
                    <circle cx={endX} cy={ny} r={2.5} fill={b.accent} />
                  </g>
                );
              })}
          </g>
        </svg>

        {/* —— captions (HTML for crisp type) —— */}
        {isNarrow
          ? activeBeat && (
              <div
                className="pointer-events-none absolute left-1/2"
                style={{
                  bottom: 32,
                  width: CARD_W,
                  transform: `translateX(-50%) translateY(${(1 - activeOp) * 16}px)`,
                  opacity: activeOp,
                }}
              >
                <CaptionCard beat={activeBeat} align="center" />
              </div>
            )
          : BEATS.map((b, i) => {
              const op = beatOpacity(frontier, b.day);
              if (op <= 0.01) return null;
              const ny = syOf(b.day);
              const slide = (1 - op) * (b.side === "left" ? -28 : 28);
              return (
                <div
                  key={`b${i}`}
                  className="pointer-events-none absolute"
                  style={{
                    left: b.side === "left" ? sx(b.lane) - GAP - CARD_W : sx(b.lane) + GAP,
                    top: ny,
                    width: CARD_W,
                    transform: `translateY(-50%) translateX(${slide}px)`,
                    opacity: op,
                  }}
                >
                  <CaptionCard beat={b} align={b.side === "left" ? "right" : "left"} />
                </div>
              );
            })}
      </div>
    </section>
  );
}

/** The tooltip card body — chapter/meta eyebrow, title, and description. */
function CaptionCard({ beat, align }: { beat: Beat; align: "left" | "right" | "center" }) {
  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        background: paperCard,
        borderColor: beat.accent,
        boxShadow: "0 6px 22px -10px rgba(58,46,28,0.4)",
        textAlign: align,
      }}
    >
      <div
        className="font-[family-name:var(--font-cinzel)]"
        style={{ fontSize: 10, letterSpacing: "0.22em", color: beat.accent }}
      >
        {beat.chapter} · {beat.meta}
      </div>
      <div
        className="mt-1 font-[family-name:var(--font-cinzel)] font-bold"
        style={{ fontSize: 18, color: ink, lineHeight: 1.2 }}
      >
        {beat.title}
      </div>
      <p className="mt-1.5" style={{ fontSize: 13.5, lineHeight: 1.4, color: inkSoft }}>
        {beat.body}
      </p>
    </div>
  );
}

/** One graph node in the story (dots / merge diamonds / hollow ghosts). */
function StoryNode({ node }: { node: GraphNode }) {
  const x = laneX(node.lane);
  const y = dayY(node.day);
  const hasTasks = node.total != null;
  const ratio = hasTasks ? (node.done ?? 0) / (node.total ?? 1) : 0;

  if (node.kind === "ghost") {
    return (
      <circle
        cx={x}
        cy={y}
        r={GEOMETRY.ghostNodeRadius}
        fill="none"
        stroke={node.color}
        strokeWidth={1.8}
        strokeDasharray="3 3"
      />
    );
  }
  if (node.kind === "merge" || node.kind === "counter") {
    return (
      <rect
        x={x - 6}
        y={y - 6}
        width={12}
        height={12}
        fill={node.kind === "counter" ? magenta : gold}
        stroke={ink}
        strokeWidth={1}
        transform={`rotate(45 ${x} ${y})`}
      />
    );
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={GEOMETRY.nodeRadius}
      fill={node.color}
      fillOpacity={hasTasks ? 0.2 + 0.8 * ratio : 1}
      stroke={node.color}
      strokeWidth={1.8}
    />
  );
}
