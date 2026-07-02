"use client";

import { useEffect } from "react";

/**
 * Registers the minimal service worker so the app is installable (PWA).
 * Production-only: a live SW in dev caches aggressively and breaks HMR.
 * No offline caching in M0 — that's deferred (Serwist) to Phase 2.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Registration failures are non-fatal; the app still works online.
      });
  }, []);

  return null;
}
