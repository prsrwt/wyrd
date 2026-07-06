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
import { useEffect, useState } from "react";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
