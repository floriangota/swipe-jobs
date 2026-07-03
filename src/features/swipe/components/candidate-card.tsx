"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { gradientFor } from "@/lib/gradients";
import type { CandidateCardView } from "../types";

/**
 * A candidate (a worker who right-swiped the listing) as seen by the employer. GOLDEN
 * RULE: shows only first name + last initial — never the surname/phone/email. Photo is a
 * deterministic gradient (cross-user photos are a fast-follow).
 */
export function CandidateCard({
  candidate,
  className,
}: {
  candidate: CandidateCardView;
  className?: string;
}) {
  const t = useTranslations("Listings"); // experience labels
  const initial = candidate.firstName.charAt(0).toUpperCase();

  return (
    <article
      className={cn(
        "relative flex aspect-[3/4] w-full max-w-[340px] flex-col overflow-hidden rounded-[1.75rem] text-white shadow-xl ring-1 ring-black/5",
        className,
      )}
      style={{ background: gradientFor(candidate.workerProfileId) }}
    >
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

      <div className="flex-1" />

      <div className="relative m-3 rounded-[1.35rem] border border-white/15 bg-black/25 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-neutral-900 shadow">
            {initial}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-2xl leading-tight font-bold">
              {candidate.firstName} {candidate.lastInitial}.
            </h3>
            <p className="truncate text-sm text-white/85">
              {t(`experience.${candidate.experienceLevel}`)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
