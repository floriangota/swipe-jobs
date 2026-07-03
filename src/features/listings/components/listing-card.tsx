"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { gradientFor } from "@/lib/gradients";
import { formatEur } from "@/lib/utils/money";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingCardView } from "../types";

function payLabel(listing: ListingCardView, periodSuffix: string): string {
  const min = formatEur(listing.payMin);
  const range = listing.payMax != null ? `${min}–${formatEur(listing.payMax)}` : min;
  return `${range}${periodSuffix}`;
}

/**
 * The premium listing card workers will swipe (drag physics + the match moment
 * land in M5). Photo-less by design in M3 — a deterministic brand gradient stands
 * in until M4 adds moderated photos.
 */
export function ListingCard({
  listing,
  className,
}: {
  listing: ListingCardView;
  className?: string;
}) {
  const t = useTranslations("Listings");
  const initial = listing.businessName.charAt(0).toUpperCase();

  return (
    <article
      className={cn(
        "relative flex aspect-[3/4] w-full max-w-[340px] flex-col overflow-hidden rounded-[1.75rem] text-white shadow-xl ring-1 ring-black/5",
        className,
      )}
      style={{ background: gradientFor(listing.businessName) }}
    >
      {/* Soft light + oversized monogram watermark for depth. */}
      <div
        className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-white/15 blur-3xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-3 -bottom-6 text-[11rem] leading-none font-black text-white/10 select-none"
        aria-hidden
      >
        {initial}
      </span>

      {/* Top row: job type + pay */}
      <div className="relative flex items-start justify-between gap-2 p-4">
        <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          {t(`jobType.${listing.jobType}`)}
        </span>
        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-neutral-900 shadow-sm">
          {payLabel(listing, t(`payPeriodShort.${listing.payPeriod}`))}
        </span>
      </div>

      <div className="flex-1" />

      {/* Bottom: frosted-glass info panel */}
      <div className="relative m-3 rounded-[1.35rem] border border-white/15 bg-black/25 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-neutral-900 shadow">
            {initial}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-2xl leading-tight font-bold">{listing.title}</h3>
            <p className="truncate text-sm text-white/85">{listing.businessName}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill>{listing.cityName}</Pill>
          <Pill>{t(`experience.${listing.requiredExperience}`)}</Pill>
        </div>
      </div>
    </article>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
      {children}
    </span>
  );
}

/** Loading placeholder matching the card's footprint. */
export function ListingCardSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn("aspect-[3/4] w-full max-w-[340px] rounded-[1.75rem]", className)}
    />
  );
}
