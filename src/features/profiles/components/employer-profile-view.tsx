"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { gradientFor } from "@/lib/gradients";
import { cn } from "@/lib/utils/cn";
import type { EmployerProfileView } from "../types";

interface Props {
  profile: EmployerProfileView;
  businessTypeLabel: string | null;
}

export function EmployerProfileCard({ profile, businessTypeLabel }: Props) {
  const t = useTranslations("Profile");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-sm"
            style={{ background: gradientFor(profile.id) }}
            aria-hidden
          >
            {profile.businessName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{profile.businessName}</h1>
            {businessTypeLabel && (
              <p className="text-sm text-muted-foreground">{businessTypeLabel}</p>
            )}
          </div>
        </div>
        <Link href="/profile/edit" className={cn(buttonVariants({ intent: "outline", size: "sm" }))}>
          {t("edit")}
        </Link>
      </div>

      {profile.description && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("about")}
          </h2>
          <p className="text-sm whitespace-pre-line">{profile.description}</p>
        </section>
      )}

      {(profile.contactPhone || profile.contactEmail) && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("contact")}
          </h2>
          <div className="space-y-1 text-sm">
            {profile.contactPhone && <p>{profile.contactPhone}</p>}
            {profile.contactEmail && <p>{profile.contactEmail}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
