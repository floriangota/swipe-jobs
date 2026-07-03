"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils/cn";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Mobile-first bottom sheet. Drag the handle down (or past a velocity threshold),
 * tap the backdrop, or press Escape to dismiss. Built on Framer Motion.
 */
export function BottomSheet({ open, onOpenChange, title, children, className }: BottomSheetProps) {
  const hydrated = useHydrated();

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!hydrated) return null;

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onOpenChange(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            aria-hidden
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className={cn(
              "absolute inset-x-0 bottom-0 mx-auto max-h-[85svh] w-full max-w-lg overflow-y-auto",
              "rounded-t-2xl border border-b-0 border-border bg-popover p-6 pt-3 text-popover-foreground shadow-xl",
              className,
            )}
          >
            <div
              aria-hidden
              className="mx-auto mb-4 h-1.5 w-10 shrink-0 cursor-grab rounded-full bg-muted-foreground/30 active:cursor-grabbing"
            />
            {title && <h2 className="mb-2 text-lg font-semibold tracking-tight">{title}</h2>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
