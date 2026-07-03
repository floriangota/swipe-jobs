"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { PhotoUpload } from "@/features/photos/components/photo-upload";
import type { EmployerProfileView } from "../types";

interface Props {
  profile: EmployerProfileView;
  logoUrl: string | null;
  businessTypeLabel: string | null;
}

export function EmployerProfileCard({ profile, logoUrl, businessTypeLabel }: Props) {
  const t = useTranslations("Profile");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <PhotoUpload
            type="employer_logo"
            currentUrl={logoUrl}
            seed={profile.id}
            initial={profile.businessName.charAt(0).toUpperCase()}
          />
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
