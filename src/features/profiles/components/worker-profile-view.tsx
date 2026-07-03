"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { gradientFor } from "@/lib/gradients";
import { cn } from "@/lib/utils/cn";
import { VisibilityToggle } from "./visibility-toggle";
import type { WorkerProfileView } from "../types";

interface Props {
  profile: WorkerProfileView;
  categoryLabels: Record<string, string>;
  languageLabels: Record<string, string>;
}

export function WorkerProfileCard({ profile, categoryLabels, languageLabels }: Props) {
  const t = useTranslations("Profile");
  const to = useTranslations("Onboarding");

  const categories = profile.categoryIds
    .map((id) => categoryLabels[id])
    .filter((x): x is string => Boolean(x));
  const languages = profile.languageIds
    .map((id) => languageLabels[id])
    .filter((x): x is string => Boolean(x));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-sm"
            style={{ background: gradientFor(profile.id) }}
            aria-hidden
          >
            {profile.firstName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {to(`experience.${profile.experienceLevel}`)}
            </p>
          </div>
        </div>
        <Link href="/profile/edit" className={cn(buttonVariants({ intent: "outline", size: "sm" }))}>
          {t("edit")}
        </Link>
      </div>

      <VisibilityToggle initial={profile.isVisible} />

      <Section title={t("categories")}>
        <Tags items={categories} />
      </Section>
      <Section title={t("languages")}>
        <Tags items={languages} />
      </Section>
      <Section title={t("availability")}>
        <Tags items={profile.availabilities.map((a) => to(`availability.${a}`))} />
      </Section>
      {profile.bio && (
        <Section title={t("bio")}>
          <p className="text-sm whitespace-pre-line">{profile.bio}</p>
        </Section>
      )}
      {profile.phone && (
        <Section title={t("contact")}>
          <p className="text-sm">{profile.phone}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Tags({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-sm font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
