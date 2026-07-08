"use client";

/**
 * App-wide smooth scrolling via Lenis. `root` makes Lenis drive the real window
 * scroll (no extra wrapper element), so `position: sticky` and framer-motion's
 * `useScroll` keep working — Lenis moves the document scroll position and emits
 * native scroll events that `useScroll` reads. `autoRaf` runs Lenis's own rAF
 * loop; we don't need to hand-drive it.
 *
 * Honors prefers-reduced-motion by disabling smoothing so the OS setting still
 * gives an instant, native scroll.
 */

import { ReactLenis } from "lenis/react";
import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getServerReducedMotion = () => false;

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore is the lint-clean, SSR-safe way to read a browser-only
  // value (the media query) without a setState-in-effect.
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        smoothWheel: !reduced,
        // touch devices keep native scroll — Lenis smoothing on touch feels laggy
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
