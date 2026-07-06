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
 * map it to a fractional `frontier` day over this section's pin range only —
 * starting at the handoff scroll position (~scrollY 31 mobile / ~72 desktop),
 * when the hero pin releases and this stage pins. The section overlaps the hero
 * by 100svh so that handoff is early, not a viewport later (~scrollY 331).
 * Graph + captions stay hidden until handoff, then fade in over ~48px. Header
 * clearance uses 31%/36% of viewport height (safeTop), not scrollY pixels.
 */

import { useEffect, useRef, useState } from "react";
import { useScroll } from "@react-spring/web";
import { sampleGraph } from "@/lib/graph/sampleGraph";
import { COLORS, GEOMETRY, LANES, hexToRgba } from "@/lib/graph/theme";
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

/**
 * The seven story beats, anchored to real days in the sample trajectory. Each
 * beat's (lane, day) must land on an actual node in `sampleGraph` — the
 * connector line/dot is drawn at that exact coordinate, so a (lane, day) with
 * no node there renders as a floating, disconnected line. E.g. the main->side
 * connector edge starts at day 6, but the side lane's own first node is day
 * 7 — the BRANCHES beat below uses 7, not the tempting-but-nodeless 6.
 */
const BEATS: Beat[] = [
  {
    day: 0, lane: "main", side: "left", chapter: "THE REPOSITORY", meta: "DAY 1 · 5/5 TASKS",
    title: "Your life gets a repository",
    body: "Name where you're headed — this becomes main, the line everything else is measured against. Each node is one honest day; its fill is how much you did.",
    accent: magenta,
  },
  {
    day: 7, lane: "side", side: "right", chapter: "BRANCHES", meta: "DAY 7 · BRANCHED",
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
 * before the node reaches centre, holds while it scrolls up, fades out by ~7
 * days past — enough overlap that consecutive beats don't leave blank stretches,
 * but past beats don't linger as unreadable ghosts. Sides are assigned so no
 * two simultaneously-visible cards share a side.
 */
function beatOpacity(frontier: number, day: number): number {
  const d = frontier - day;
  if (d < -1.5) return 0;
  if (d < 0) return clamp((d + 1.5) / 1.5);
  if (d < 5) return 1;
  if (d < 7) return clamp(1 - (d - 5) / 2);
  return 0;
}

export default function WyrdStory({ trackVh = 470 }: { trackVh?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [frontier, setFrontier] = useState(0);
  const [storyReveal, setStoryReveal] = useState(0);
  // Whether the pin is still the active view. `frontier` clamps at LAST once
  // you scroll past the section and never goes back down, so it can't tell us
  // this on its own. Needed because the mobile caption below uses `fixed`
  // positioning (see its comment) — unlike an `absolute` child, a `fixed` one
  // does NOT scroll away with its section, so without this gate the final
  // beat's card would stay glued to the viewport forever, overlapping the form.
  const [pinActive, setPinActive] = useState(true);
  const [vp, setVp] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // react-spring smoothed document scroll -> fractional frontier day.
  //
  // offsetTop ≈ hero pin length because of `-mt-[100svh]`. Frontier waits for
  // that handoff scroll position (the hero has released and this stage pins)
  // so day-by-day progression starts from a clean zero.
  //
  // storyReveal (opacity) does NOT wait for the same point, though: the hero's
  // own logo/support text finish fading out at ~0.58 of ITS pin — i.e. at
  // ~0.58 * handoff, since handoff === the hero's pin length here — which is
  // well BEFORE this stage's exact handoff. Gating the fade-in at handoff too
  // left a blank stretch (confirmed by screenshot: hero gone by scrollY ~39,
  // story still invisible until scrollY ~68 on a mobile-height viewport) where
  // neither the hero nor the graph was visible. Starting the ramp earlier
  // closes that gap so the two cross-fade instead of leaving a hole.
  useScroll({
    config: { tension: 260, friction: 42 },
    onChange: ({ value }) => {
      const el = trackRef.current;
      if (!el) return;
      const vh = window.innerHeight;
      const y = value.scrollY as number;
      const handoff = el.offsetTop;
      const pinLen = Math.max(1, el.offsetHeight - vh);
      const pastHandoff = Math.max(0, y - handoff);
      setFrontier(clamp(pastHandoff / pinLen) * LAST);
      setPinActive(y <= handoff + pinLen);

      const revealStart = handoff * 0.55;
      const revealSpan = Math.max(1, handoff + 48 - revealStart);
      setStoryReveal(clamp((y - revealStart) / revealSpan));
    },
  });

  const isNarrow = vp.w < 760;
  const cx = vp.w / 2 - MAIN_X;

  // Header clearance band — fraction of viewport height, NOT a scrollY pixel
  // trigger. Desktop needs more room because the compact header runs logo +
  // eyebrow on one line; mobile's stacked header needs less.
  const SAFE_TOP_FRAC = isNarrow ? 0.31 : 0.36;
  const safeTop = vp.h * SAFE_TOP_FRAC;
  const bottomMargin = 40;
  const availTop = safeTop;
  const availBottom = Math.max(availTop + 160, vp.h - bottomMargin);
  const availH = availBottom - availTop;

  // Anchor the currently-drawing frontier at the vertical centre of that
  // available band — dynamic, so it re-centres automatically at any viewport
  // size instead of leaving a fixed, screen-size-dependent gap.
  const anchorY = availTop + availH / 2;
  const cameraY = anchorY - dayY(frontier);
  // reveal a touch beyond the frontier so a node is fully drawn as we reach it
  const revealH = dayY(frontier) + GEOMETRY.nodeRadius + 3;

  // screen position of a (lane, day)
  const sx = (lane: keyof typeof LANES) => cx + laneX(lane);
  const syOf = (day: number) => cameraY + dayY(day);
  // Clamp any HTML caption's vertical centre into the safe band, so a card
  // never slides up under the header or down past the viewport edge while its
  // node is still fading in/out at the trailing edge of visibility.
  const clampCaptionY = (y: number) => Math.min(Math.max(y, availTop + 90), availBottom - 90);

  const CARD_W = isNarrow ? Math.min(300, vp.w - 40) : 248;
  const GAP = 78;

  // On narrow screens side cards can't fit without overlapping each other, so we
  // show only the single most-relevant beat, floating near its node.
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

  // Where that single card floats — right next to its own node, like desktop,
  // instead of docked to a fixed spot at the bottom. Picks above/below based on
  // which half of the safe band the node currently sits in, so the card is
  // never asked to overflow past the header or the bottom edge.
  const MOBILE_GAP = 52;
  let activeNodeX = 0;
  let activeNodeY = 0;
  let activePlaceBelow = true;
  if (isNarrow && activeBeat) {
    activeNodeX = sx(activeBeat.lane);
    activeNodeY = Math.min(Math.max(syOf(activeBeat.day), availTop + 12), availBottom - 12);
    activePlaceBelow = activeNodeY <= anchorY;
  }
  const activeAnchorY = activePlaceBelow ? activeNodeY + MOBILE_GAP : activeNodeY - MOBILE_GAP;
  // Where the connector meets the card edge: offset to one side of centre so the
  // connector can curve OUT of the node instead of running straight down the
  // branch spine (which it overlapped before). Route away from the drift lane
  // (which sits left of main) — left for drift beats, right for everything else.
  const activeDir = activeBeat?.lane === "drift" ? -1 : 1;
  const activeAttachX = vp.w / 2 + activeDir * Math.min(CARD_W * 0.3, vp.w / 2 - 28);

  return (
    <section
      ref={trackRef}
      className="relative z-[1] -mt-[100svh]"
      style={{ height: `${trackVh}vh` }}
    >
      <div className="parchment-surface sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0" style={{ opacity: storyReveal }}>
        {/* —— the graph, camera-followed and revealed —— */}
        <svg
          width={vp.w}
          height={vp.h}
          viewBox={`0 0 ${vp.w} ${vp.h}`}
          className="absolute inset-0"
          aria-hidden
          style={{
            // The graph is transparent under the (fixed, transparent) header and
            // fades in right at the safe-zone boundary — same safeTop value that
            // drives the layout, so the fade and the clamp always agree.
            WebkitMaskImage: `linear-gradient(to bottom, transparent 0, transparent ${Math.max(0, safeTop - 48)}px, #000 ${safeTop}px)`,
            maskImage: `linear-gradient(to bottom, transparent 0, transparent ${Math.max(0, safeTop - 48)}px, #000 ${safeTop}px)`,
          }}
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

          {/* screen-space overlay: caption connectors from each node to its card.
              Desktop draws one per simultaneously-visible beat, sideways into a
              floating card. Mobile only ever shows one active beat (no room for
              side-by-side cards on a narrow screen), so instead it gets a single
              connector running DOWN from that beat's real node to the fixed
              bottom card — same "the tooltip extends from the branch" language,
              just vertical instead of horizontal. */}
          <g>
            {!isNarrow &&
              BEATS.map((b, i) => {
                const op = beatOpacity(frontier, b.day);
                if (op <= 0.01) return null;
                const nx = sx(b.lane);
                // The connector still points at the node's true position, but the
                // card end clamps into the safe band — see the matching clamp on
                // the HTML card below.
                const nodeY = syOf(b.day);
                const cardY = clampCaptionY(nodeY);
                const endX = b.side === "left" ? nx - GAP : nx + GAP;
                return (
                  <g key={`c${i}`} opacity={op}>
                    <line x1={nx} y1={nodeY} x2={endX} y2={cardY} stroke={b.accent} strokeWidth={1.25} />
                    <circle cx={nx} cy={nodeY} r={3.5} fill="none" stroke={b.accent} strokeWidth={1.5} />
                    <circle cx={endX} cy={cardY} r={2.5} fill={b.accent} />
                  </g>
                );
              })}
            {isNarrow && activeBeat && (
              <g opacity={activeOp}>
                <path
                  // S-curve out of the node to an off-centre point on the card
                  // edge — same easing as the graph's own fork/merge connectors,
                  // so it reads as native and never lies on the branch spine.
                  d={`M ${activeNodeX} ${activeNodeY} C ${activeNodeX} ${(activeNodeY + activeAnchorY) / 2}, ${activeAttachX} ${(activeNodeY + activeAnchorY) / 2}, ${activeAttachX} ${activeAnchorY}`}
                  fill="none"
                  stroke={activeBeat.accent}
                  strokeWidth={1.25}
                />
                <circle cx={activeNodeX} cy={activeNodeY} r={3.5} fill="none" stroke={activeBeat.accent} strokeWidth={1.5} />
                <circle cx={activeAttachX} cy={activeAnchorY} r={2.5} fill={activeBeat.accent} />
              </g>
            )}
          </g>
        </svg>

        {/* —— captions (HTML for crisp type) —— */}
        {isNarrow
          ? pinActive && activeBeat && (
              // `absolute` + `top`/`bottom`, floating right next to the node —
              // same language as desktop's side cards, just picking above/below
              // instead of left/right since a narrow screen has no room to
              // spare sideways. `top` (not `bottom`) is what makes this safe
              // even in the brief pre-stick window right at the hero handoff:
              // an unstuck sticky container's natural top sits at most a few
              // tens of px off from its final pinned position, and `top`
              // reflects that directly — `bottom` would instead multiply the
              // error by the ~100svh container height, which is what pushed
              // the old bottom-anchored version hundreds of px off-screen.
              <div
                className="pointer-events-none absolute left-1/2"
                style={
                  activePlaceBelow
                    ? {
                        top: activeAnchorY,
                        width: CARD_W,
                        transform: `translateX(-50%) translateY(${(1 - activeOp) * 16}px)`,
                        opacity: activeOp,
                      }
                    : {
                        bottom: vp.h - activeAnchorY,
                        width: CARD_W,
                        transform: `translateX(-50%) translateY(${(1 - activeOp) * -16}px)`,
                        opacity: activeOp,
                      }
                }
              >
                <CaptionCard beat={activeBeat} align="center" />
              </div>
            )
          : BEATS.map((b, i) => {
              const op = beatOpacity(frontier, b.day);
              if (op <= 0.01) return null;
              const top = clampCaptionY(syOf(b.day));
              const slide = (1 - op) * (b.side === "left" ? -28 : 28);
              return (
                <div
                  key={`b${i}`}
                  className="pointer-events-none absolute"
                  style={{
                    left: b.side === "left" ? sx(b.lane) - GAP - CARD_W : sx(b.lane) + GAP,
                    top,
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
      </div>

    </section>
  );
}

/**
 * The tooltip body — a soft, airy "frosted lozenge" (atmos-style) rather than a
 * hard bordered card: translucent parchment with a backdrop blur so the graph
 * line reads faintly through it, a hair-thin accent inset ring instead of a
 * solid border, and a small oval pill badge for the chapter/meta line.
 */
function CaptionCard({ beat, align }: { beat: Beat; align: "left" | "right" | "center" }) {
  return (
    <div
      className="rounded-[26px] px-5 py-3.5 backdrop-blur-md"
      style={{
        background: hexToRgba(paperCard, 0.62),
        boxShadow: `0 12px 32px -16px rgba(58,46,28,0.5), inset 0 0 0 1px ${hexToRgba(beat.accent, 0.28)}`,
        textAlign: align,
      }}
    >
      {/* Only the meta (day + kind) goes in the oval pill — short enough to stay
          one line. The chapter would make it wrap; the title already carries
          that framing. */}
      <span
        className="inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] font-[family-name:var(--font-cinzel)]"
        style={{
          fontSize: 9,
          letterSpacing: "0.16em",
          color: beat.accent,
          background: hexToRgba(beat.accent, 0.12),
        }}
      >
        {beat.meta}
      </span>
      <div
        className="mt-2 font-[family-name:var(--font-cinzel)] font-bold"
        style={{ fontSize: 15, color: ink, lineHeight: 1.15 }}
      >
        {beat.title}
      </div>
      <p className="mt-1.5" style={{ fontSize: 12, lineHeight: 1.42, color: inkSoft }}>
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
