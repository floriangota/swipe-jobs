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
import { WorkerProfileCard } from "@/features/profiles/components/worker-profile-view";
import { EmployerProfileCard } from "@/features/profiles/components/employer-profile-view";
import { localizedName } from "@/features/profiles/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const locale = await getLocale();

  if (user.role === "worker") {
    const profile = await getOwnWorkerProfile(user.id);
    if (!profile) redirect("/onboarding");
    const [categories, languages] = await Promise.all([getCategories(), getLanguages()]);
    return (
      <WorkerProfileCard
        profile={profile}
        categoryLabels={Object.fromEntries(categories.map((c) => [c.id, localizedName(c, locale)]))}
        languageLabels={Object.fromEntries(languages.map((l) => [l.id, localizedName(l, locale)]))}
      />
    );
  }

  if (user.role === "employer") {
    const profile = await getOwnEmployerProfile(user.id);
    if (!profile) redirect("/onboarding");
    const businessTypes = await getBusinessTypes();
    const bt = businessTypes.find((b) => b.id === profile.businessTypeId);
    return (
      <EmployerProfileCard profile={profile} businessTypeLabel={bt ? localizedName(bt, locale) : null} />
    );
  }

  redirect("/");
}
