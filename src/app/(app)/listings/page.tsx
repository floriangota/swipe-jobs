import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { getOwnEmployerProfile } from "@/features/profiles/service/employer-profile.service";
import { getCategories, getCities } from "@/features/profiles/service/reference-data.service";
import { getOwnListings } from "@/features/listings/service/listing.service";
import { MyListings, type DashboardListing } from "@/features/listings/components/my-listings";
import { ErrorState } from "@/components/ui/states";
import { localizedName } from "@/features/profiles/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Listings");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

export default async function ListingsPage() {
  const user = await requireRole("employer"); // viewable when unverified; posting is gated below
  const locale = await getLocale();
  const t = await getTranslations("Listings");
  const tCommon = await getTranslations("Common");

  const profile = await getOwnEmployerProfile(user.id);
  if (!profile) redirect("/onboarding");

  let dashboard: DashboardListing[];
  try {
    const [{ items }, categories, cities] = await Promise.all([
      getOwnListings(user.id),
      getCategories(),
      getCities(),
    ]);
    const categoryLabel = new Map(categories.map((c) => [c.id, localizedName(c, locale)]));
    const cityName = new Map(cities.map((c) => [c.id, c.name]));
    dashboard = items.map((it) => ({
      id: it.id,
      title: it.title,
      categoryLabel: categoryLabel.get(it.categoryId) ?? "",
      cityName: cityName.get(it.cityId) ?? "",
      jobType: it.jobType,
      requiredExperience: it.requiredExperience,
      payMin: it.payMin,
      payMax: it.payMax,
      payPeriod: it.payPeriod,
      status: it.status,
      interestedCount: it.interestedCount,
      matchedCount: it.matchedCount,
    }));
  } catch {
    return <ErrorState title={t("loadError")} description={tCommon("error")} />;
  }

  return (
    <MyListings businessName={profile.businessName} verified={user.emailVerified} listings={dashboard} />
  );
}
