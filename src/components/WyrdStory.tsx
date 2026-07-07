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
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * Opacity for a caption given the current frontier day. Fades in ~1.5 days
 * before the node reaches centre, holds while it scrolls up, fades out by ~7
 * days past — enough overlap that consecutive beats don't leave blank stretches,
 * but past beats don't linger as unreadable ghosts. On desktop, sides are
 * assigned so simultaneously-visible cards rarely share one; on mobile the one
 * tight pair that does (merge/drift) is de-collided by the stacking pass.
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
  // Merge is the only card the connector meets on its BOTTOM edge, so it's the
  // only one whose real height must be known exactly — otherwise the tail lands
  // in empty space below a card that renders shorter than the estimate.
  const mergeCardRef = useRef<HTMLDivElement>(null);
  const [mergeCardH, setMergeCardH] = useState(190);
  const [frontier, setFrontier] = useState(0);
  const [storyReveal, setStoryReveal] = useState(0);
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

  // Mobile cards are narrower than the viewport on purpose: the leftover width
  // is the "open space" the card gets parked over (see the placement block).
  const CARD_W = isNarrow ? Math.min(264, vp.w - 88) : 248;
  const GAP = 78;

  // —— mobile caption geometry ————————————————————————————————————————————
  // Base geometry for one beat's card + connector. The card sits BELOW its node
  // and tracks it (top = node + gap), clamped into the safe band so it never
  // rides under the header or off the bottom — and there is NO above/below
  // switch, so nothing teleports mid-fade. Pure function of the beat, so we can
  // lay out EVERY visible beat (each on its own beatOpacity), like desktop.
  const MOBILE_GAP = 64; // node↔card gap; also the connector's reach, so it has room to draw
  const MOBILE_EDGE = 16; // screen-edge margin the parked card keeps
  const CARD_H = 210; // estimated card height (below-cards attach at their exact top edge)
  const mobileGeom = (b: Beat) => {
    const nodeX = sx(b.lane);
    const nodeY = clamp(syOf(b.day), availTop + 12, availBottom - 12);
    // Merge is the exception. Its node sits on the central main spine, so a card
    // parked there gets the spine running straight through it. Instead it moves
    // to the LEFT — into the slot the branches caption has just vacated (they're
    // never on screen together) — and sits ABOVE its node, so the spine clears
    // the card and the connector drops from the card's BOTTOM down to the node.
    // Every other beat parks on its open side (drift left → card right, etc.)
    // and floats just below its node.
    const isMerge = b.chapter === "MERGE";
    // Merge attaches on its bottom edge, so it uses its MEASURED height; the
    // others attach on their exact top edge, where the estimate is irrelevant.
    const h = isMerge ? mergeCardH : CARD_H;
    const cardBottomLimit = vp.h - h - MOBILE_EDGE;
    const cardOnLeft = isMerge
      ? true
      : b.lane === "drift"
        ? false
        : b.lane === "side"
          ? true
          : b.side === "left";
    const cardLeft = cardOnLeft ? MOBILE_EDGE : vp.w - MOBILE_EDGE - CARD_W;
    const cardTop = isMerge
      ? clamp(nodeY - MOBILE_GAP - h, availTop + MOBILE_EDGE, cardBottomLimit)
      : clamp(nodeY + MOBILE_GAP, availTop + MOBILE_EDGE, cardBottomLimit);
    const cardBottom = cardTop + h;
    // Where the connector meets the card. For side-parked cards it's the
    // vertical edge facing the node (inset past the corner radius), so the
    // S-curve sweeps in from the side. For merge it's a point on the BOTTOM
    // edge, offset to the LEFT of the node — the card is wide enough to cover
    // the node's column, so a straight drop would lie on the spine; offsetting
    // left makes the tail sweep down-right into the diamond, clear of it.
    const attachX = isMerge
      ? clamp(nodeX - 40, cardLeft + 22, cardLeft + CARD_W - 22)
      : cardOnLeft
        ? cardLeft + CARD_W - 22
        : cardLeft + 22;
    return { nodeX, nodeY, cardLeft, cardOnLeft, cardTop, cardBottom, attachX, above: isMerge };
  };

  // Every visible beat gets a card on mobile (like desktop). Placements are
  // authored so nothing overlaps: merge floats above-left, its tight neighbour
  // drift below-right (opposite sides), and every other consecutive pair is a
  // full card-height or more apart. The connector attaches to whichever
  // horizontal edge of the card faces the node — bottom when the card sits above
  // it (merge), top when below (everyone else).
  const mobileCards = isNarrow
    ? BEATS.map((b) => ({ b, g: mobileGeom(b), op: beatOpacity(frontier, b.day) }))
        .filter((x) => x.op > 0.01)
        .map((x) => {
          const top = x.g.cardTop;
          const bottom = x.g.cardBottom;
          const attachY = x.g.nodeY <= top ? top : x.g.nodeY >= bottom ? bottom : x.g.nodeY;
          return { ...x, top, attachY };
        })
    : [];

  // Measure the merge card's real height whenever it appears or its width
  // changes, so its bottom edge (and the connector that meets it) are exact.
  const mergeShown = mobileCards.some((x) => x.b.chapter === "MERGE");
  useEffect(() => {
    if (mergeCardRef.current) setMergeCardH(mergeCardRef.current.offsetHeight);
  }, [mergeShown, CARD_W, isNarrow]);

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
              side-by-side cards on a narrow screen), and its card is parked over
              the empty side of the canvas — so the connector S-curves out of the
              node, across the open space, into that card's near edge. */}
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
            {isNarrow &&
              mobileCards.map(({ b, op, g, attachY }) => {
                // One connector per visible beat, each on its OWN beatOpacity —
                // so consecutive beats cross-fade their connectors (matching the
                // desktop side) instead of a single connector snapping between
                // nodes. It lands on the card's FINAL (de-collided) edge.
                //
                // The connector GROWS out of its node and RETRACTS back into it
                // as the beat fades in/out — like the graph drawing itself in.
                // The card end travels from the node (p=0) to the card edge
                // (p=1), so a departing connector shrinks away into its branch
                // instead of lingering as a stray line. p eases the raw opacity
                // so the reach accelerates out and settles in.
                const p = smoothstep(op);
                const endX = g.nodeX + (g.attachX - g.nodeX) * p;
                const endY = g.nodeY + (attachY - g.nodeY) * p;
                const midY = (g.nodeY + endY) / 2;
                // Side-parked cards leave the node VERTICALLY then sweep to the
                // side (graph's fork/merge easing). Merge's card sits above and
                // over the spine, so its tail instead leaves the node
                // HORIZONTALLY — off the spine at once — then rises to the card.
                const d = g.above
                  ? `M ${g.nodeX} ${g.nodeY} C ${endX} ${g.nodeY}, ${endX} ${midY}, ${endX} ${endY}`
                  : `M ${g.nodeX} ${g.nodeY} C ${g.nodeX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
                return (
                  <g key={`mc${b.day}`} opacity={op}>
                    <path
                      d={d}
                      fill="none"
                      stroke={b.accent}
                      strokeWidth={1.25}
                    />
                    <circle cx={g.nodeX} cy={g.nodeY} r={3.5} fill="none" stroke={b.accent} strokeWidth={1.5} />
                    <circle cx={endX} cy={endY} r={2.5} fill={b.accent} />
                  </g>
                );
              })}
          </g>
        </svg>

        {/* —— captions (HTML for crisp type) —— */}
        {isNarrow
          ? mobileCards.map(({ b, op, g, top }) => (
              // One card per visible beat, parked to its open side and floating
              // just below its node (de-collided top). `top` (never `bottom`) is
              // what makes this safe even in the brief pre-stick window at the
              // hero handoff: an unstuck sticky container's natural top sits at
              // most a few tens of px off its final pinned position, and `top`
              // reflects that directly — `bottom` would multiply the error by the
              // ~100svh container height, pushing it hundreds of px off-screen.
              <div
                key={`mcard${b.day}`}
                ref={b.chapter === "MERGE" ? mergeCardRef : undefined}
                className="pointer-events-none absolute"
                style={{
                  left: g.cardLeft,
                  top,
                  width: CARD_W,
                  transform: `translateY(${(1 - op) * 16}px)`,
                  opacity: op,
                }}
              >
                {/* text hugs the node side, like the desktop side cards do */}
                <CaptionCard beat={b} align={g.cardOnLeft ? "right" : "left"} />
              </div>
            ))
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
