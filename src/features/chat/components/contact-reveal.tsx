"use client";

import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { MatchDetailView } from "../types";

/**
 * The contact card — the user-facing face of the golden-rule reveal. Every value
 * here comes exclusively from GET /matches/:id (the match_detail DB function), which
 * only yields rows to the two match parties. Nothing else in the app ever renders
 * a counterpart's phone/email.
 */
export function ContactReveal({
  open,
  onOpenChange,
  detail,
  onReportListing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: MatchDetailView;
  onReportListing?: () => void;
}) {
  const t = useTranslations("Chat");
  const tReport = useTranslations("Report");
  const hasContact = detail.contactPhone != null || detail.contactEmail != null;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t("contactTitle")}>
      <p className="text-sm text-muted-foreground">{t("contactUnlocked")}</p>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-semibold">{detail.counterpartName}</p>
          <p className="text-sm text-muted-foreground">{detail.listingTitle}</p>
        </div>

        {hasContact ? (
          <ul className="space-y-2">
            {detail.contactPhone && (
              <li>
                <a
                  href={`tel:${detail.contactPhone}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden>
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 2Z" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-xs text-muted-foreground">{t("phone")}</span>
                    <span className="block font-medium">{detail.contactPhone}</span>
                  </span>
                </a>
              </li>
            )}
            {detail.contactEmail && (
              <li>
                <a
                  href={`mailto:${detail.contactEmail}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-10 6L2 7" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{t("email")}</span>
                    <span className="block truncate font-medium">{detail.contactEmail}</span>
                  </span>
                </a>
              </li>
            )}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("noContact")}
          </p>
        )}
      </div>

      {onReportListing && (
        <button
          type="button"
          onClick={onReportListing}
          className="mt-4 text-sm font-medium text-destructive underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {tReport("reportListing")}
        </button>
      )}
    </BottomSheet>
  );
}
