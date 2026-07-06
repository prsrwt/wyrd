"use client";

/**
 * Scrollytelling hero with parallax depth (Apple / atmos.leeroy.ca feel),
 * powered by Lenis (smooth scroll) + react-spring (scroll-linked animation).
 *
 * A tall scroll "track" wraps a sticky stage that PINS to the viewport. While
 * the track scrolls past, the stage stays put and scroll position choreographs
 * several depth layers moving at DIFFERENT rates:
 *   - a slow background glow that drifts down (far away),
 *   - the logo + wordmark that scales down and rises into the header slot,
 *   - support text (eyebrow + tagline) that floats up FASTER and fades early,
 *   - a scroll cue that fades immediately.
 * When the track ends the stage releases and page content scrolls up.
 *
 * Only `transform` and `opacity` are animated (compositor-only, no per-frame
 * reflow). We drive every layer from react-spring's `scrollY` (document scroll
 * in px) rather than framer-motion's `useTransform`: in this Next/Turbopack
 * stack the framer opacity MotionValues settled at wrong, non-monotonic values
 * while `scrollY` stayed exact. Progress is derived from `scrollY / pinPx`,
 * where `pinPx` is how many pixels the pin lasts (measured, resize-aware).
 *
 * Relies on `overflow-x: clip` (not `hidden`) on body so the body isn't a
 * scroll container that would break the sticky pin.
 */

import { useRef, useEffect } from "react";
import { useScroll, animated } from "@react-spring/web";
import WyrdLogo from "@/components/WyrdLogo";

interface CollapsingHeroProps {
  eyebrow: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Height of the scroll track in vh; the pin lasts (trackVh - 100)vh of scroll. */
  trackVh?: number;
}

/** Clamped linear map: `p` over [inMin,inMax] -> [outMin,outMax]. */
function mapClamped(p: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const t = Math.min(1, Math.max(0, (p - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

export default function CollapsingHero({
  eyebrow,
  children,
  maxWidth = "520px",
  trackVh = 170,
}: CollapsingHeroProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // How many px of scroll the pin spans (track height minus one viewport).
  // Kept in a ref so the interpolation closures always read the live value
  // without re-creating springs.
  const pinPx = useRef(1);

  useEffect(() => {
    const measure = () => {
      const h = trackRef.current?.offsetHeight ?? 0;
      pinPx.current = Math.max(1, h - window.innerHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [trackVh]);

  // A gentle spring on the scroll value gives the parallax its trailing, weighty
  // feel on top of Lenis, without lagging so far it feels disconnected.
  const { scrollY } = useScroll({ config: { tension: 320, friction: 44 } });

  const progress = (y: number) => Math.min(1, Math.max(0, y / pinPx.current));

  // Layer 1 — logo + wordmark: shrink and rise into the header, fade last.
  const logoTransform = scrollY.to((y) => {
    const p = progress(y);
    return `translateY(${mapClamped(p, 0, 0.5, 0, -150)}px) scale(${mapClamped(p, 0, 0.5, 1, 0.5)})`;
  });
  const logoOpacity = scrollY.to((y) => mapClamped(progress(y), 0.42, 0.58, 1, 0));

  // Layer 2 — support text: lifts gently (nearer camera) and fades out FAST, so
  // it's gone before the rising logo would reach it (no overlap).
  const supportTransform = scrollY.to((y) => `translateY(${mapClamped(progress(y), 0, 0.3, 0, -70)}px)`);
  const supportOpacity = scrollY.to((y) => mapClamped(progress(y), 0.04, 0.22, 1, 0));

  // Layer 0 — background glow: far away, drifts DOWN slowly and dims.
  const glowTransform = scrollY.to((y) => {
    const p = progress(y);
    return `translateY(${mapClamped(p, 0, 1, 0, 120)}px) scale(${mapClamped(p, 0, 1, 1, 1.35)})`;
  });
  const glowOpacity = scrollY.to((y) => mapClamped(progress(y), 0, 0.7, 0.6, 0));

  // Scroll cue — fades immediately, drifts down as it goes.
  const cueTransform = scrollY.to((y) => `translateY(${mapClamped(progress(y), 0, 0.14, 0, 24)}px)`);
  const cueOpacity = scrollY.to((y) => mapClamped(progress(y), 0, 0.12, 1, 0));

  // Compact header — rises in AFTER the hero has fully faded (no double wordmark).
  const barOpacity = scrollY.to((y) => mapClamped(progress(y), 0.6, 0.78, 0, 1));
  const barTransform = scrollY.to((y) => `translateY(${mapClamped(progress(y), 0.6, 0.78, -12, 0)}px)`);
  const barPointer = scrollY.to((y) => (progress(y) > 0.68 ? "auto" : "none"));

  return (
    <>
      <div ref={trackRef} className="relative" style={{ height: `${trackVh}vh` }}>
        <div className="parchment-surface sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-5">
          {/* Layer 0 — background glow */}
          <animated.div
            aria-hidden
            style={{ transform: glowTransform, opacity: glowOpacity }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(194,24,91,0.10) 0%, rgba(184,145,47,0.08) 40%, transparent 70%)",
              }}
            />
          </animated.div>

          {/* Layer 1 — logo + wordmark */}
          <animated.div
            className="relative mx-auto w-full"
            style={{ maxWidth, opacity: logoOpacity, transform: logoTransform, transformOrigin: "center top" }}
          >
            <div className="flex items-center justify-center gap-5">
              <div
                className="overflow-hidden rounded-2xl shadow-[0_2px_8px_rgba(58,46,28,.25)]"
                style={{ width: 168, height: 168 * 0.9 }}
              >
                <WyrdLogo showWordmark={false} className="h-full w-full" />
              </div>
              <span
                className="font-[family-name:var(--font-cinzel)] font-bold leading-none tracking-[0.06em] text-[var(--ink)]"
                style={{ fontSize: 168 * 0.48 }}
              >
                Wyrd
              </span>
            </div>
          </animated.div>

          {/* Layer 2 — support text */}
          <animated.div
            className="relative mx-auto w-full text-center"
            style={{ maxWidth, opacity: supportOpacity, transform: supportTransform }}
          >
            <div className="mt-6 font-[family-name:var(--font-cinzel)] text-[12px] tracking-[0.32em] text-[var(--ink-soft)]">
              {eyebrow}
            </div>
            {children}
          </animated.div>

          {/* Scroll cue */}
          <animated.div
            style={{ opacity: cueOpacity, transform: cueTransform }}
            className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-1 text-[var(--ink-soft)]"
          >
            <span className="font-[family-name:var(--font-cinzel)] text-[10px] tracking-[0.28em]">SCROLL</span>
            <span className="wyrd-bob text-[18px] leading-none" aria-hidden>
              ↓
            </span>
          </animated.div>
        </div>
      </div>

      {/* Compact header */}
      <animated.div
        style={{ opacity: barOpacity, transform: barTransform, pointerEvents: barPointer }}
        className="parchment-surface fixed inset-x-0 top-0 z-20 shadow-[0_10px_30px_-12px_rgba(58,46,28,0.18)]"
      >
        <div className="mx-auto flex items-center gap-3.5 px-5 py-3" style={{ maxWidth }}>
          <div className="h-12 w-12 overflow-hidden rounded-xl">
            <WyrdLogo showWordmark={false} className="h-full w-full" />
          </div>
          <span className="font-[family-name:var(--font-cinzel)] text-[19px] font-bold tracking-[0.06em] text-[var(--ink)]">
            Wyrd
          </span>
          <span className="truncate font-[family-name:var(--font-cinzel)] text-[11px] tracking-[0.22em] text-[var(--ink-soft)]">
            {eyebrow}
          </span>
        </div>
      </animated.div>
    </>
  );
}
