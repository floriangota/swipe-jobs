import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { hasProfile } from "@/features/profiles/service/profile-status.service";
import {
  getBusinessTypes,
  getCategories,
  getLanguages,
} from "@/features/profiles/service/reference-data.service";
import { WorkerOnboardingWizard } from "@/features/profiles/components/worker-onboarding-wizard";
import { EmployerOnboardingWizard } from "@/features/profiles/components/employer-onboarding-wizard";
import { localizedName } from "@/features/profiles/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await hasProfile(user)) redirect("/profile");
  const locale = await getLocale();

  if (user.role === "worker") {
    const [categories, languages] = await Promise.all([getCategories(), getLanguages()]);
    return (
      <WorkerOnboardingWizard
        categories={categories.map((c) => ({ value: c.id, label: localizedName(c, locale) }))}
        languages={languages.map((l) => ({ value: l.id, label: localizedName(l, locale) }))}
      />
    );
  }

  if (user.role === "employer") {
    const businessTypes = await getBusinessTypes();
    return (
      <EmployerOnboardingWizard
        businessTypes={businessTypes.map((b) => ({ value: b.id, label: localizedName(b, locale) }))}
      />
    );
  }

  redirect("/");
}
