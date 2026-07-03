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
import { getOwnApprovedPhotoUrl } from "@/features/photos/service/photo.service";
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
    const [categories, languages, photoUrl] = await Promise.all([
      getCategories(),
      getLanguages(),
      profile.photoId ? getOwnApprovedPhotoUrl(profile.photoId) : Promise.resolve(null),
    ]);
    return (
      <WorkerProfileCard
        profile={profile}
        photoUrl={photoUrl}
        categoryLabels={Object.fromEntries(categories.map((c) => [c.id, localizedName(c, locale)]))}
        languageLabels={Object.fromEntries(languages.map((l) => [l.id, localizedName(l, locale)]))}
      />
    );
  }

  if (user.role === "employer") {
    const profile = await getOwnEmployerProfile(user.id);
    if (!profile) redirect("/onboarding");
    const [businessTypes, logoUrl] = await Promise.all([
      getBusinessTypes(),
      profile.logoId ? getOwnApprovedPhotoUrl(profile.logoId) : Promise.resolve(null),
    ]);
    const bt = businessTypes.find((b) => b.id === profile.businessTypeId);
    return (
      <EmployerProfileCard
        profile={profile}
        logoUrl={logoUrl}
        businessTypeLabel={bt ? localizedName(bt, locale) : null}
      />
    );
  }

  redirect("/");
}
