"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils/cn";
import { formatEur } from "@/lib/utils/money";
import { updateListingStatus } from "../listing.actions";
import type { ExperienceLevel, JobType, ListingStatus, PayPeriod } from "../types";

export interface DashboardListing {
  id: string;
  title: string;
  categoryLabel: string;
  cityName: string;
  jobType: JobType;
  requiredExperience: ExperienceLevel;
  payMin: number;
  payMax: number | null;
  payPeriod: PayPeriod;
  status: ListingStatus;
  interestedCount: number;
  matchedCount: number;
}

export function MyListings({
  businessName,
  verified,
  listings,
}: {
  businessName: string;
  verified: boolean;
  listings: DashboardListing[];
}) {
  const t = useTranslations("Listings");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboardTitle")}</h1>
          <p className="truncate text-sm text-muted-foreground">{businessName}</p>
        </div>
        {verified && (
          <Link
            href="/listings/new"
            className={cn(buttonVariants({ intent: "primary", size: "sm" }))}
          >
            {t("new")}
          </Link>
        )}
      </div>

      {!verified && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="font-medium">{t("verifyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("verifyBody")}</p>
          <Link
            href="/verify-email"
            className={cn(buttonVariants({ intent: "primary", size: "sm" }), "mt-3")}
          >
            {t("verifyCta")}
          </Link>
        </div>
      )}

      {listings.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyBody")}
          action={
            verified ? (
              <Link
                href="/listings/new"
                className={cn(buttonVariants({ intent: "primary", size: "sm" }))}
              >
                {t("createFirst")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingRow listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListingRow({ listing }: { listing: DashboardListing }) {
  const t = useTranslations("Listings");
  const [status, setStatus] = useState<ListingStatus>(listing.status);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  function changeStatus(next: ListingStatus) {
    setError(undefined);
    const prev = status;
    setStatus(next); // optimistic
    start(async () => {
      const res = await updateListingStatus(listing.id, next);
      if (!res.ok) {
        setStatus(prev); // revert on failure
        setError(t("statusActionError"));
      }
    });
  }

  const pay =
    listing.payMax != null
      ? `${formatEur(listing.payMin)}–${formatEur(listing.payMax)}`
      : formatEur(listing.payMin);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">{listing.title}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {listing.categoryLabel} · {t(`jobType.${listing.jobType}`)}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold">
          {pay}
          <span className="text-muted-foreground">{t(`payPeriodShort.${listing.payPeriod}`)}</span>
        </span>
      </div>

      {/* Placeholder engagement counts — real numbers arrive with matching in M5. */}
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{listing.interestedCount}</span>{" "}
          {t("interested")}
        </span>
        <span>
          <span className="font-semibold text-foreground">{listing.matchedCount}</span>{" "}
          {t("matched")}
        </span>
      </div>

      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/listings/${listing.id}/candidates`}
          className={cn(buttonVariants({ intent: "outline", size: "sm" }))}
        >
          {t("candidates")}
        </Link>
        <Link
          href={`/listings/${listing.id}/edit`}
          className={cn(buttonVariants({ intent: "outline", size: "sm" }))}
        >
          {t("edit")}
        </Link>
        {status === "active" && (
          <Button intent="secondary" size="sm" onClick={() => changeStatus("paused")} disabled={pending}>
            {t("pause")}
          </Button>
        )}
        {status === "paused" && (
          <Button intent="secondary" size="sm" onClick={() => changeStatus("active")} disabled={pending}>
            {t("resume")}
          </Button>
        )}
        {status === "closed" && (
          <Button intent="secondary" size="sm" onClick={() => changeStatus("active")} disabled={pending}>
            {t("reopen")}
          </Button>
        )}
        {status !== "closed" && (
          <Button intent="ghost" size="sm" onClick={() => changeStatus("closed")} disabled={pending}>
            {t("close")}
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ListingStatus }) {
  const t = useTranslations("Listings");
  const styles: Record<ListingStatus, string> = {
    active: "bg-success/15 text-success",
    paused: "bg-warning/15 text-warning",
    closed: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      {t(`status.${status}`)}
    </span>
  );
}
