import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import {
  getBusinessTypes,
  getCategories,
  getLanguages,
} from "@/features/profiles/service/reference-data.service";
import { getOwnWorkerProfile } from "@/features/profiles/service/worker-profile.service";
import { getOwnEmployerProfile } from "@/features/profiles/service/employer-profile.service";
import { WorkerOnboardingWizard } from "@/features/profiles/components/worker-onboarding-wizard";
import { EmployerOnboardingWizard } from "@/features/profiles/components/employer-onboarding-wizard";
import { localizedName } from "@/features/profiles/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: `${t("editTitle")} · SwipeJobs` };
}

// Edit reuses the wizard, prefilled. saveWorkerProfile / saveEmployerProfile upsert.
export default async function ProfileEditPage() {
  const user = await requireUser();
  const locale = await getLocale();

  if (user.role === "worker") {
    const profile = await getOwnWorkerProfile(user.id);
    if (!profile) redirect("/onboarding");
    const [categories, languages] = await Promise.all([getCategories(), getLanguages()]);
    return (
      <WorkerOnboardingWizard
        initial={profile}
        categories={categories.map((c) => ({ value: c.id, label: localizedName(c, locale) }))}
        languages={languages.map((l) => ({ value: l.id, label: localizedName(l, locale) }))}
      />
    );
  }

  if (user.role === "employer") {
    const profile = await getOwnEmployerProfile(user.id);
    if (!profile) redirect("/onboarding");
    const businessTypes = await getBusinessTypes();
    return (
      <EmployerOnboardingWizard
        initial={profile}
        businessTypes={businessTypes.map((b) => ({ value: b.id, label: localizedName(b, locale) }))}
      />
    );
  }

  redirect("/");
}
