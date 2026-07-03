"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// Deterministic-ish decorative hearts (no Math.random — SSR-safe, and fine here).
const HEARTS = [
  { left: "12%", delay: 0, size: 22, dur: 2.6 },
  { left: "26%", delay: 0.4, size: 14, dur: 3.1 },
  { left: "44%", delay: 0.15, size: 28, dur: 2.9 },
  { left: "63%", delay: 0.55, size: 16, dur: 3.3 },
  { left: "78%", delay: 0.28, size: 24, dur: 2.7 },
  { left: "89%", delay: 0.05, size: 12, dur: 3.0 },
];

/** The flagship "It's a match!" moment — a full-screen celebration over a warm scrim. */
export function MatchMoment({
  open,
  name,
  onClose,
}: {
  open: boolean;
  name: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("Match");
  const closeRef = useRef<HTMLButtonElement>(null);

  // While open, behave as a real modal: lock body scroll, move focus in, keep focus
  // trapped on the single control, close on Escape, and restore focus on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        event.preventDefault(); // one interactive control — keep focus on it
        closeRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t("title")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center"
          style={{ background: "linear-gradient(160deg, oklch(0.6 0.22 12), oklch(0.5 0.19 330))" }}
        >
          {/* Floating hearts */}
          {HEARTS.map((h, i) => (
            <motion.svg
              key={i}
              aria-hidden
              viewBox="0 0 24 24"
              fill="currentColor"
              className="pointer-events-none absolute text-white/25"
              style={{ left: h.left, bottom: -40, width: h.size, height: h.size }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -700, opacity: [0, 0.9, 0] }}
              transition={{ duration: h.dur, delay: h.delay, repeat: Infinity, ease: "easeOut" }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </motion.svg>
          ))}

          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
            className="relative"
          >
            <h2 className="text-5xl font-black tracking-tight text-white text-balance drop-shadow-sm sm:text-6xl">
              {t("title")}
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative mt-4 max-w-sm text-lg text-white/90"
          >
            {name ? t("body", { name }) : t("bodyGeneric")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative mt-2 max-w-xs text-sm text-white/70"
          >
            {t("chatSoon")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative mt-8"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={cn(buttonVariants({ intent: "secondary", size: "lg" }))}
            >
              {t("keepSwiping")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
