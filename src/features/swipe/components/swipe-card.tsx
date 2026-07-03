"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

export interface SwipeCardHandle {
  fling: (dir: "left" | "right") => void;
}

const OFFSET_THRESHOLD = 110; // px dragged to commit
const VELOCITY_THRESHOLD = 500; // px/s to fling

interface Props {
  onCommit: (dir: "left" | "right") => void;
  likeLabel: string;
  nopeLabel: string;
  children: React.ReactNode;
}

/**
 * A draggable swipe card: drag horizontally, tilt with the drag, show the like/nope
 * stamps, and on release past a distance OR velocity threshold, fling off-screen and
 * commit; otherwise spring back. Exposes an imperative `fling` so the on-screen buttons
 * (and keyboard users) trigger the exact same motion.
 */
export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { onCommit, likeLabel, nopeLabel, children },
  ref,
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const likeOpacity = useTransform(x, [24, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-24, -130], [0, 1]);
  const [leaving, setLeaving] = useState(false);

  const fling = useCallback(
    (dir: "left" | "right") => {
      if (leaving) return;
      setLeaving(true);
      animate(x, dir === "right" ? 680 : -680, {
        type: "spring",
        stiffness: 240,
        damping: 32,
        onComplete: () => onCommit(dir),
      });
    },
    [leaving, x, onCommit],
  );

  useImperativeHandle(ref, () => ({ fling }), [fling]);

  return (
    <motion.div
      style={{ x, rotate }}
      drag={leaving ? false : "x"}
      dragElastic={0.55}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_event, info) => {
        const { offset, velocity } = info;
        // A velocity fling must AGREE with the drag direction — otherwise an end-of-drag
        // recoil (an opposite-sign velocity spike) could fling the card the wrong way and
        // commit an irreversible swipe/match.
        if (offset.x > OFFSET_THRESHOLD || (velocity.x > VELOCITY_THRESHOLD && offset.x > 0)) {
          fling("right");
        } else if (offset.x < -OFFSET_THRESHOLD || (velocity.x < -VELOCITY_THRESHOLD && offset.x < 0)) {
          fling("left");
        } else {
          animate(x, 0, { type: "spring", stiffness: 320, damping: 26 });
        }
      }}
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
    >
      {children}
      <motion.div
        aria-hidden
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute top-8 left-6 -rotate-12 rounded-xl border-4 border-success px-4 py-1.5 text-3xl font-black tracking-wider text-success uppercase"
      >
        {likeLabel}
      </motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: nopeOpacity }}
        className="pointer-events-none absolute top-8 right-6 rotate-12 rounded-xl border-4 border-destructive px-4 py-1.5 text-3xl font-black tracking-wider text-destructive uppercase"
      >
        {nopeLabel}
      </motion.div>
    </motion.div>
  );
});
