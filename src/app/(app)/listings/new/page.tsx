import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { getOwnEmployerProfile } from "@/features/profiles/service/employer-profile.service";
import { getCategories } from "@/features/profiles/service/reference-data.service";
import { ListingForm } from "@/features/listings/components/listing-form";
import { localizedName } from "@/features/profiles/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Listings");
  return { title: `${t("newMetaTitle")} · SwipeJobs` };
}

export default async function NewListingPage() {
  const user = await requireRole("employer");
  if (!user.emailVerified) redirect("/verify-email"); // posting is verification-gated (M3 decision)

  const profile = await getOwnEmployerProfile(user.id);
  if (!profile) redirect("/onboarding");

  const locale = await getLocale();
  const categories = await getCategories();
  return (
    <ListingForm categories={categories.map((c) => ({ value: c.id, label: localizedName(c, locale) }))} />
  );
}
