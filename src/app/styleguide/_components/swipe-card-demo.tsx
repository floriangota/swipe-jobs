"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { gradientFor } from "@/lib/gradients";

interface Job {
  role: string;
  business: string;
  pay: string;
  type: string;
  meta: string;
  initial: string;
  photoUrl?: string; // optional — a per-entity gradient stands in when absent
}

// Sample content for the design showcase (real listings arrive in M3, photos M4).
const jobs: Job[] = [
  {
    role: "Barista",
    business: "Café Ballkoni",
    pay: "€3.50–4.00/h",
    type: "Part-time",
    meta: "Ferizaj · Entry level",
    initial: "C",
  },
  {
    role: "Waiter",
    business: "Restaurant Amuza",
    pay: "€400–500/mo",
    type: "Full-time",
    meta: "Ferizaj · 1–3 years",
    initial: "A",
  },
  {
    role: "Warehouse",
    business: "Viva Fresh",
    pay: "€3.00/h",
    type: "Shift",
    meta: "Ferizaj · Entry level",
    initial: "V",
  },
];

export function SwipeCardDemo() {
  const t = useTranslations("Styleguide");

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[340px]">
        {/* Deck: two cards fanned behind the top one so it reads as a pile. */}
        <div className="absolute inset-0 translate-y-8 -rotate-[7deg] scale-[0.92]" aria-hidden>
          <CardFace job={jobs[2]!} />
        </div>
        <div className="absolute inset-0 translate-y-4 rotate-[4deg] scale-[0.96]" aria-hidden>
          <CardFace job={jobs[1]!} />
        </div>
        <motion.div
          whileHover={{ y: -6, rotate: -1 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative cursor-grab active:cursor-grabbing"
        >
          <CardFace job={jobs[0]!} />
        </motion.div>
      </div>

      {/* Action buttons (visual only — drag + matching is M5). */}
      <div className="mt-7 flex items-center justify-center gap-5">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={t("swipeNope")}
          className="flex size-14 items-center justify-center rounded-full border-2 border-destructive bg-card text-destructive shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-6">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={t("swipeLike")}
          className="flex size-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-7">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}

function CardFace({ job, className }: { job: Job; className?: string }) {
  const hasPhoto = Boolean(job.photoUrl);

  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-[1.75rem] shadow-xl ring-1 ring-black/5",
        className,
      )}
      style={hasPhoto ? undefined : { background: gradientFor(job.business) }}
    >
      {hasPhoto ? (
        // Real photos arrive in M4 (private Supabase Storage) and will use next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={job.photoUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="pointer-events-none absolute -right-16 -top-16 size-60 rounded-full bg-white/15 blur-2xl" aria-hidden />
      )}

      <div className="relative flex items-start justify-between p-4">
        <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {job.type}
        </span>
        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-neutral-900 shadow-sm">
          {job.pay}
        </span>
      </div>

      <div className="flex-1" />

      <div className="relative bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-6 pt-20 text-white">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-neutral-900 shadow">
            {job.initial}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-2xl leading-tight font-bold">{job.role}</h3>
            <p className="truncate text-sm text-white/85">{job.business}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/75">{job.meta}</p>
      </div>
    </div>
  );
}
