"use client";

/**
 * Registers the app-shell service worker — production only. A cache-first
 * SW in `next dev` is actively harmful: it caches an HTML shell pinned to
 * one build's chunk hashes, and every Fast Refresh recompile invalidates
 * those hashes, so the SW keeps re-serving a page that references files
 * which no longer exist — an infinite reload loop. In dev we instead
 * actively unregister any stale SW/caches a previous build may have left
 * behind in the browser.
 *
 * Not currently mounted in layout.tsx: a SW registered during earlier
 * testing got stuck fighting the dev server hard enough that unregistering
 * it from inside this same component was itself unreliable (the stale SW
 * was serving cached JS that predates this fix). Re-mount once a manual
 * chrome://serviceworker-internals purge confirms the browser is clean and
 * the core loop has been verified stable without it.
 */

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a nice-to-have, not load-bearing — ignore failures.
      });
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const r of registrations) r.unregister();
    });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);
  return null;
}
