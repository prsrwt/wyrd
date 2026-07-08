"use client";

/**
 * First-run screen — "declare a trajectory" (proposal §2.1). Creates the
 * trajectory and its main branch in one step; everything after this reads
 * from the store, never from this form again.
 *
 * Design: the form is the FIRST COMMIT, drawn in the graph's own language. Each
 * field is a node, and the line down the left is not a pre-drawn spine — it is
 * WOVEN from the fields' own branches. As you scroll, each field's colored
 * branch bows in from the side (a slack, curved thread) and STRAIGHTENS,
 * joining the one above it, until all of them pull taut into a single straight
 * multi-coloured line. Scrolling back up loosens them again — the whole entrance
 * is scroll-scrubbed and driven imperatively (no per-frame React re-render).
 * Inputs are the frosted "airy capsules" of the story tooltips.
 *
 * On Forge, the form swipes up and fades while a genesis panel rises through it:
 * the origin node of the new main line draws itself in with the trajectory's
 * title — the start of their story — then `declareTrajectory` hands off to the
 * real graph.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { useWyrdStore } from "@/lib/store/useWyrdStore";
import CollapsingHero from "@/components/CollapsingHero";
import WyrdStory from "@/components/WyrdStory";

const DEFAULT_TASKS = [""];

// How long the swipe-up + genesis reveal plays before we commit and let the
// real graph take over. Kept in sync with the CSS animation timings.
const FORGE_MS = 1180;

// —— line geometry (px, in the left gutter reserved by RAIL) ——
const RAIL = 48; // left padding each field reserves for the line + branch art
const NODE_X = 30; // x of the line / node centres
const AMP = 26; // how far a slack (curved) branch bows out to the left
const LEAD = 26; // length of the origin's lead-in stub above the first node
const NODE_DY = 22; // node centre offset below a row's top (aligns with its label)

// —— scroll-scrub choreography (all in normalized progress g ∈ [0,1]) ——
const STAG = 0.16; // progress offset between consecutive branches
const SPREAD = 0.52; // how much progress one branch takes to fully straighten
// Px reserved above `wrap` (the fields) once fully formed: the fixed
// compact header's own height (~80px) plus the "NAME YOUR PATH" heading
// block that sits in normal flow just above the fields. `g`'s own end
// point (where `top` bottoms out) must land here, not at some fraction of
// vh — vh-relative values shrink below this on short viewports, letting
// the fully-formed form (and its heading) scroll up underneath the header.
const HEADER_CLEARANCE = 164;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * The line piece leading INTO a node. Endpoints stay pinned on the line (at the
 * nodes) so the pieces are always joined; only the middle bows out to the left
 * by `amp`, and `amp → 0` as the branch straightens. A slack curved thread being
 * pulled taut.
 */
function segPath(y0: number, y1: number, p: number): string {
  const amp = (1 - p) * AMP;
  const dy = y1 - y0;
  return `M ${NODE_X} ${y0} C ${NODE_X - amp} ${y0 + dy * 0.33}, ${NODE_X - amp * 0.62} ${y0 + dy * 0.66}, ${NODE_X} ${y1}`;
}

/** Smooth a set of waypoints into one cubic path (Catmull-Rom → bezier). */
function smoothPath(pts: number[][]): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// —— the falling thread: a strand that drifts down through the empty gap above
// the form (side to side, like a leaf off a tree), circles once as it's about
// to land, then — rather than fading out for a separate element to fade in —
// IS the origin's own branch: the exact same path just pulls itself taut into
// a short straight stub, once it's down. One continuous thread, no crossfade.
const FALL_W = 150; // how far it drifts sideways into the open space
const FALL_H = 560; // fall distance above the origin — short enough to stay
// mostly visible/in-front rather than needing a long blank runway to hide in

// Waypoints for the swirly, falling shape (y: 0 at the top → FALL_H at the
// node). The last few points curl into a small loop right before landing.
const FALL_PTS: [number, number][] = [
  [NODE_X + 6, 0],
  [NODE_X + FALL_W * 0.55, FALL_H * 0.14],
  [NODE_X + FALL_W * 0.95, FALL_H * 0.3],
  [NODE_X + FALL_W * 0.4, FALL_H * 0.47],
  [NODE_X + FALL_W * 0.8, FALL_H * 0.62],
  [NODE_X + FALL_W * 0.25, FALL_H * 0.76],
  [NODE_X + FALL_W * 0.55, FALL_H * 0.88],
  [NODE_X + 36, FALL_H * 0.95],
  [NODE_X - 6, FALL_H * 0.985],
  [NODE_X, FALL_H],
];
// The same points, collapsed onto the short straight lead-in stub above the
// origin node — matched index-for-index with FALL_PTS so morphing between the
// two (lerping each pair) reads as the swirl being pulled taut, not a jump cut.
const N_FALL = FALL_PTS.length;
const STRAIGHT_PTS: [number, number][] = FALL_PTS.map((_, i) => [
  NODE_X,
  FALL_H - LEAD + (i / (N_FALL - 1)) * LEAD,
]);
const FALL_D = smoothPath(FALL_PTS);

type NodeKind = "origin" | "soft" | "commit" | "milestone";

/** Each node's identity on the line — drives its marker + branch colour. */
const NODES: { kind: NodeKind; accent: string }[] = [
  { kind: "origin", accent: "var(--magenta)" },
  { kind: "soft", accent: "var(--ink-soft)" },
  { kind: "commit", accent: "var(--teal)" },
  { kind: "milestone", accent: "var(--gold)" },
];

export default function Onboarding() {
  const { declareTrajectory } = useWyrdStore();
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [taskLabels, setTaskLabels] = useState<string[]>(DEFAULT_TASKS);
  const [forging, setForging] = useState(false);
  // Measured node Ys (for the SVG structure) + refs the scroll driver mutates.
  const [geom, setGeom] = useState<{ ys: number[]; h: number }>({ ys: [], h: 0 });
  const geomRef = useRef<number[]>([]);
  const reducedRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const segRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<(SVGGElement | null)[]>([]);
  const fieldRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fallRef = useRef<SVGPathElement | null>(null);
  const fallTipRef = useRef<SVGCircleElement | null>(null);
  const fallLenRef = useRef<number | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const forgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scrub the whole entrance to the form's scroll position, written straight to
  // the DOM (no per-frame re-render). Two overlapping progresses off the same
  // measurement: `f` falls the thread through the gap as the form approaches
  // from below, then `g` straightens the woven line as it rises into view.
  // Reduced motion pins both to 1 (everything present, never scrubbed).
  const apply = () => {
    try {
      applyUnsafe();
    } catch (err) {
      // A thrown error here would otherwise silently abort the rest of this
      // call — freezing whatever had already been written to the DOM (e.g. a
      // field's opacity updated, the thread's shape not yet) until the next
      // scroll event papers over it. Surface it instead of eating it quietly.
      console.error("Onboarding entrance apply() failed:", err);
    }
  };

  const applyUnsafe = () => {
    const wrap = wrapRef.current;
    const ys = geomRef.current;
    if (!wrap || !ys.length) return;
    const vh = window.innerHeight || 1;
    const top = reducedRef.current ? -vh : wrap.getBoundingClientRect().top;
    // f falls the thread while the form's origin crosses the lower-to-middle
    // viewport (visible in-frame); g then straightens the line as it rises into
    // the reading band. Each window's span (in vh of scroll) sets its pace —
    // widened here so the whole sequence reads as a deliberate, unhurried
    // scroll rather than snapping through in a small scroll movement.
    const f = clamp((vh * 1.6 - top) / (vh * 1.6 - vh * 0.6));
    const g = clamp((vh * 0.6 - top) / (vh * 0.6 - HEADER_CLEARANCE));

    // The falling thread draws down + circles as it falls (f), a bead riding
    // its tip; once landed, `g0` (the origin's own straighten progress — same
    // formula as index 0 below) morphs its OWN points toward the short straight
    // stub, so it stays as ONE continuous element becoming the origin branch —
    // never fades out for a separate piece to fade in.
    const fall = fallRef.current;
    const g0 = smooth(clamp(g / SPREAD));
    if (fall) {
      const sf = smooth(f);
      fall.style.strokeDashoffset = String(1 - sf);
      fall.style.opacity = String(clamp(f * 3));
      // Always recompute from the two fixed point-sets (no cached/skip branch —
      // that comparison was one more thing that could silently go stale). At
      // g0=0 this reproduces FALL_PTS exactly; at g0=1, STRAIGHT_PTS exactly.
      const morphed = FALL_PTS.map(([x, y], i) => {
        const target = STRAIGHT_PTS[i] ?? [x, y];
        return [x + (target[0] - x) * g0, y + (target[1] - y) * g0];
      });
      fall.setAttribute("d", smoothPath(morphed));
      // The tip bead (and the expensive getPointAtLength it needs) only matters
      // while actually falling — skip it entirely once landing/straightening
      // has begun, both because it's no longer meaningful and because the path
      // is changing shape every frame at that point (recomputing length then
      // would be wasted work on top of wasted work).
      const tip = fallTipRef.current;
      if (tip) {
        if (g0 < 0.001 && f > 0.03 && f < 0.985) {
          if (fallLenRef.current == null) fallLenRef.current = fall.getTotalLength();
          const pt = fall.getPointAtLength(fallLenRef.current * sf);
          tip.setAttribute("cx", String(pt.x));
          tip.setAttribute("cy", String(pt.y));
          tip.style.opacity = "1";
        } else {
          tip.style.opacity = "0";
        }
      }
    }

    let pLast = 0;
    for (let i = 0; i < NODES.length; i++) {
      const p = i === 0 ? g0 : smooth(clamp((g - i * STAG) / SPREAD));
      if (i === NODES.length - 1) pLast = p;
      // Index 0's own segment is the falling thread itself (merged above) —
      // it has no separate seg path to draw.
      const seg = i > 0 ? segRefs.current[i] : null;
      if (seg && ys[i] != null) {
        const y1 = ys[i];
        const y0 = ys[i - 1];
        seg.setAttribute("d", segPath(y0, y1, p));
        seg.style.opacity = String(clamp(p * 1.7));
      }
      const pop = smooth(clamp((p - 0.28) / 0.55));
      const node = nodeRefs.current[i];
      if (node) {
        node.style.opacity = String(pop);
        node.style.transform = `translateX(${(1 - pop) * -16}px) scale(${0.4 + 0.6 * pop})`;
      }
      const fp = smooth(clamp((p - 0.5) / 0.5));
      const field = fieldRefs.current[i];
      if (field) {
        field.style.opacity = String(fp);
        field.style.transform = `translateX(${(1 - fp) * -18}px)`;
      }
    }

    // The heading rides the same progress as the last field (the whole form
    // reads as "finished weaving itself, then naming itself") — scrubbed
    // continuously like everything else here, so it fades back out again if
    // the reader scrolls back up.
    const heading = headingRef.current;
    if (heading) {
      heading.style.opacity = String(pLast);
      heading.style.transform = `translateY(${(1 - pLast) * 12}px)`;
    }
  };

  useEffect(() => () => {
    if (forgeTimer.current) clearTimeout(forgeTimer.current);
  }, []);

  // Measure node positions (row top + label offset) and the wrapper height, so
  // the line lands exactly on the labels. Re-runs on any layout change (task
  // added/removed, textarea resized). Drives once so first paint is correct.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    reducedRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const measure = () => {
      const base = wrap.getBoundingClientRect().top;
      const ys = rowRefs.current.map((el) =>
        el ? el.getBoundingClientRect().top - base + NODE_DY : 0,
      );
      geomRef.current = ys;
      setGeom({ ys, h: wrap.offsetHeight });

      // Cap the page's total scroll length to EXACTLY the point where `g`
      // reaches 1 — no more, no less. Too little (the natural, un-trimmed
      // page) and `g` (the last field, and the heading's reveal riding its
      // tail) permanently freezes short of done, because the page runs out
      // of scroll room first. Too much (e.g. the slack `min-h-screen` above
      // adds when the form is short) and there's extra scroll AFTER the form
      // has fully formed — which just scrolls the now-finished form further
      // up, in on top of the fixed header, for no reason.
      // `marginTop` rather than `height` because the correction can go
      // either way: positive to add missing runway, NEGATIVE to trim away
      // excess slack the browser already gave this page (a `height` can't
      // go negative, but pulling a following sibling up with a negative
      // margin achieves the same reduction in total document height).
      const spacer = spacerRef.current;
      if (spacer) {
        spacer.style.marginTop = "0px";
        const vh = window.innerHeight || 1;
        const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
        const neededDocHeight = wrapTop + vh - HEADER_CLEARANCE;
        const naturalDocHeight = document.documentElement.scrollHeight;
        spacer.style.marginTop = `${neededDocHeight - naturalDocHeight}px`;
      }

      apply();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskLabels.length]);

  // Safety net: re-sync every imperative style/attribute right after ANY React
  // commit (no dependency array — this runs after every render), not just the
  // ones we explicitly trigger it from. A `<path d={FALL_D} .../>` or
  // `style={{opacity: 0}}` prop declared in JSX is exactly what we're also
  // mutating imperatively via refs above; if some unrelated re-render ever won
  // that race, this re-applies the correct scroll-driven values on the very
  // next commit instead of leaving the entrance visibly stuck between states.
  useLayoutEffect(() => {
    apply();
  });

  // Scrub the entrance to the scroll position. `apply` reads only refs, so this
  // closure never goes stale.
  //
  // Driven straight off Lenis's own scroll event (`useLenis`, from `lenis/react`)
  // rather than react-spring's `useScroll`. `apply()` never reads the eased
  // scroll value react-spring would hand it — it re-derives progress from a
  // live `getBoundingClientRect()` every call — so the spring was pure
  // overhead here: a second, independently-polling rAF loop (react-spring's
  // internal scroduler) layered on top of Lenis's own rAF loop, woken by
  // react-spring re-`api.start()`-ing a spring every frame and only relaying
  // "did the spring notice movement" back to us. That's a second clock that
  // can drift from Lenis's, and its own rest-detection can stop calling us
  // slightly before or after Lenis considers itself settled. WyrdStory and
  // CollapsingHero don't have this asymmetry — they consume the eased spring
  // value directly, so react-spring's own notion of "settled" is exactly the
  // state they render. `useLenis` instead fires this callback from the same
  // single scroll event Lenis itself uses internally, so there's no second
  // loop left to fall out of step with the first.
  useLenis(() => apply());

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

  function commit() {
    declareTrajectory(title.trim(), why.trim(), cleanLabels);
  }

  function submit() {
    if (!canSubmit || forging) return;
    if (reducedRef.current) {
      commit();
      return;
    }
    setForging(true);
    forgeTimer.current = setTimeout(commit, FORGE_MS);
  }

  return (
    <main className="pb-6">
      <CollapsingHero eyebrow="WEAVE YOUR WYRD" maxWidth="480px" trackVh={108}>
        <p className="mt-2 text-[15px] italic text-[var(--ink-soft)]">
          Scroll to see how a life takes shape — one honest day at a time.
        </p>
      </CollapsingHero>

      {/* Scrollytelling explainer — overlaps the hero by 100svh so the graph
          can draw underneath the fading logo (atmos-style handoff at ~scrollY
          31 mobile / ~72 desktop) instead of appearing a viewport later. */}
      <WyrdStory />

      {/* min-h-screen so that when the hero pin releases, this section's top
          aligns to the viewport top and the form sits right under the header.
          pt clears the fixed header. `relative` anchors the genesis overlay.
          (A negative-margin overlap into WyrdStory's tail was tried here to
          shrink the gap, but it let the whole fall+straighten sequence finish
          hidden behind the story before reveal — the animation needs to play
          out in front of the reader, not behind the pinned frame, so the
          shrinking is instead done by shortening the fall itself, below.) */}
      <div className="relative mx-auto min-h-screen max-w-[480px] px-5 pt-[104px]">
        {/* —— the form (the first commit, being drafted) —— */}
        <div className={forging ? "wyrd-forge-exit" : undefined}>
          {/* Arrives last, in plain document flow (not sticky) — scroll-scrubbed
              in `apply()` off the same `pLast` progress as the last field, so
              the heading fades in/out continuously with the weave instead of
              latching on once and staying. */}
          <div ref={headingRef} style={{ opacity: 0, transform: "translateY(12px)" }}>
            <div className="mb-1 font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.32em] text-[var(--ink-soft)]">
              NAME YOUR PATH
            </div>
            <p className="mb-7 text-[14px] italic text-[var(--ink-soft)]">
              This becomes <span className="not-italic font-semibold">main</span> — the
              line everything else is measured against.
            </p>
          </div>

          {/* wrapRef spans the threaded rows; the SVG line is measured against it */}
          <div ref={wrapRef} className="relative">
            {/* the falling thread: drifts down through the gap, circles once as
                it's about to land, then pulls itself taut into the origin's own
                branch — one continuous path, never crossfades to a separate
                element. Sits behind everything (zIndex -1), passing behind the
                heading text. */}
            {geom.ys.length > 0 && (
              <svg
                width={NODE_X + FALL_W + 30}
                height={FALL_H}
                viewBox={`0 0 ${NODE_X + FALL_W + 30} ${FALL_H}`}
                className="pointer-events-none absolute left-0"
                style={{ top: geom.ys[0] - FALL_H, zIndex: -1 }}
                aria-hidden
              >
                <path
                  ref={fallRef}
                  d={FALL_D}
                  fill="none"
                  stroke="var(--magenta)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  pathLength={1}
                  style={{ strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 }}
                />
                <circle ref={fallTipRef} r={3.5} fill="var(--magenta)" style={{ opacity: 0 }} />
              </svg>
            )}

            {/* the woven line: one colored branch leading into each node, plus a
                lead-in stub above the origin. All start slack (bowed left) and
                straighten with scroll until they join into one taut line. */}
            {geom.ys.length > 0 && (
              <svg
                width={RAIL}
                height={geom.h}
                viewBox={`0 0 ${RAIL} ${geom.h}`}
                className="pointer-events-none absolute left-0 top-0"
                aria-hidden
              >
                {NODES.map((n, i) => (
                  <path
                    key={`seg${i}`}
                    ref={(el) => {
                      segRefs.current[i] = el;
                    }}
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    style={{ stroke: n.accent, opacity: 0 }}
                  />
                ))}
                {NODES.map((n, i) => (
                  <g key={`node${i}`} transform={`translate(${NODE_X} ${geom.ys[i]})`}>
                    <g
                      ref={(el) => {
                        nodeRefs.current[i] = el;
                      }}
                      style={{ opacity: 0, transformBox: "fill-box" }}
                    >
                      <Marker kind={n.kind} accent={n.accent} />
                    </g>
                  </g>
                ))}
              </svg>
            )}

            <Row rowRefs={rowRefs} fieldRefs={fieldRefs} index={0}>
              <label className="block">
                <FieldLabel accent="var(--magenta)">Trajectory</FieldLabel>
                <input
                  className="wyrd-field w-full px-4 py-2.5 text-[15px]"
                  style={{ ["--ring" as string]: "var(--magenta)" }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Learn to code → land a junior dev role"
                />
              </label>
            </Row>

            <Row rowRefs={rowRefs} fieldRefs={fieldRefs} index={1}>
              <label className="block">
                <FieldLabel accent="var(--ink-soft)">
                  Why <span className="font-normal opacity-70">(optional)</span>
                </FieldLabel>
                <textarea
                  className="wyrd-field min-h-[56px] w-full resize-y px-4 py-2.5 text-[15px]"
                  style={{ ["--ring" as string]: "var(--ink-soft)" }}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="the reason this matters, for your future self"
                />
              </label>
            </Row>

            <Row rowRefs={rowRefs} fieldRefs={fieldRefs} index={2}>
              <FieldLabel accent="var(--teal)">Daily tasks</FieldLabel>
              <div className="flex flex-col gap-2">
                {taskLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="wyrd-field w-full flex-1 px-4 py-2.5 text-[15px]"
                      style={{ ["--ring" as string]: "var(--teal)" }}
                      value={label}
                      onChange={(e) => updateTask(i, e.target.value)}
                      placeholder="e.g. Study block"
                    />
                    {taskLabels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(i)}
                        aria-label={`Remove task ${i + 1}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] leading-none text-[var(--ink-soft)] transition-colors hover:bg-[rgba(201,59,71,0.12)] hover:text-[var(--drift)]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addTask}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-dashed border-[rgba(44,122,114,0.5)] px-3.5 py-1.5 text-[13px] text-[var(--teal)] transition-colors hover:bg-[rgba(44,122,114,0.08)]"
              >
                <span className="text-[15px] leading-none">+</span> add task
              </button>
            </Row>

            <Row rowRefs={rowRefs} fieldRefs={fieldRefs} index={3} last>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="group w-full rounded-2xl border border-[rgba(184,145,47,0.55)] bg-[rgba(184,145,47,0.14)] py-3.5 text-[16px] font-semibold text-[var(--ink)] shadow-[0_10px_30px_-18px_rgba(58,46,28,0.6)] backdrop-blur-sm transition-all hover:enabled:-translate-y-px hover:enabled:bg-[rgba(184,145,47,0.22)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Forge trajectory{" "}
                <span className="inline-block text-[var(--gold)] transition-transform group-hover:rotate-90">
                  ✦
                </span>
              </button>
              <p className="mt-2.5 text-center text-[12px] italic text-[var(--ink-soft)]">
                Day one is drawn the moment you commit.
              </p>
            </Row>
          </div>
        </div>

        {/* —— genesis: the first node of the new main line drawing itself in —— */}
        {forging && <Genesis title={title.trim()} />}
      </div>

      {/* Caps the page's total scroll length to exactly where the form
          finishes forming — see the sizing comment in the measure() effect
          above. Zero-margin until measured. */}
      <div ref={spacerRef} aria-hidden style={{ marginTop: 0 }} />
    </main>
  );
}

/** A threaded field: reserves the left gutter for the line art and exposes its
 *  content wrapper to the scroll driver (which fades + slides it in). */
function Row({
  rowRefs,
  fieldRefs,
  index,
  last = false,
  children,
}: {
  rowRefs: React.RefObject<(HTMLDivElement | null)[]>;
  fieldRefs: React.RefObject<(HTMLDivElement | null)[]>;
  index: number;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={(el) => {
        rowRefs.current[index] = el;
      }}
      className={last ? "pb-1 pl-12" : "pb-6 pl-12"}
    >
      <div
        ref={(el) => {
          fieldRefs.current[index] = el;
        }}
        style={{ opacity: 0 }}
      >
        {children}
      </div>
    </div>
  );
}

/** One node marker, centred at (0,0) — mirrors the shapes the real graph draws. */
function Marker({ kind, accent }: { kind: NodeKind; accent: string }) {
  if (kind === "milestone") {
    return (
      <>
        <rect x={-8} y={-8} width={16} height={16} rx={2} fill={accent} opacity={0.14} transform="rotate(45)" />
        <rect x={-4.5} y={-4.5} width={9} height={9} rx={1.5} fill={accent} transform="rotate(45)" />
      </>
    );
  }
  if (kind === "soft") {
    return <circle r={4.5} fill="var(--parchment)" stroke={accent} strokeWidth={1.6} />;
  }
  // origin + commit: filled dot with a soft accent halo
  return (
    <>
      <circle r={8} fill={accent} opacity={0.14} />
      <circle r={4.5} fill={accent} stroke="var(--paper-card)" strokeWidth={1.2} />
    </>
  );
}

/** Field label — a small accent tick + serif label, tying it to its node. */
function FieldLabel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <span className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
      <span aria-hidden className="h-px w-3" style={{ background: accent }} />
      {children}
    </span>
  );
}

/**
 * The genesis reveal — a short vertical stub of the new main line drawing
 * itself in beneath a glowing magenta origin node, captioned with the user's
 * trajectory title. Purely presentational; the store commit fires on a timer
 * in the parent.
 */
function Genesis({ title }: { title: string }) {
  const H = 118;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[104px] flex flex-col items-center px-5">
      <div className="wyrd-genesis flex flex-col items-center text-center">
        <div className="mb-5 font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.32em] text-[var(--ink-soft)]">
          THE REPOSITORY
        </div>
        <svg width="40" height={H} viewBox={`0 0 40 ${H}`} aria-hidden>
          {/* the main line drawing down from the origin node */}
          <line
            x1="20"
            y1="20"
            x2="20"
            y2={H}
            stroke="var(--magenta)"
            strokeWidth="2"
            strokeLinecap="round"
            className="wyrd-genesis-line"
            style={{ ["--len" as string]: String(H - 20) }}
          />
          {/* soft glow behind the origin node */}
          <circle cx="20" cy="20" r="10" fill="var(--magenta)" className="wyrd-genesis-glow" />
          {/* the origin node itself */}
          <circle
            cx="20"
            cy="20"
            r="6"
            fill="var(--magenta)"
            stroke="var(--paper-card)"
            strokeWidth="1.5"
            className="wyrd-genesis-node"
          />
        </svg>
        <div className="mt-5 max-w-[300px] font-[family-name:var(--font-cinzel)] text-[19px] font-bold leading-tight text-[var(--ink)]">
          {title}
        </div>
        <div className="mt-2 inline-block rounded-full bg-[rgba(194,24,91,0.12)] px-3 py-[3px] font-[family-name:var(--font-cinzel)] text-[9px] tracking-[0.16em] text-[var(--magenta)]">
          DAY 1 · MAIN · BEGUN
        </div>
      </div>
    </div>
  );
}
