import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { getOwnEmployerProfile } from "@/features/profiles/service/employer-profile.service";
import { getCategories } from "@/features/profiles/service/reference-data.service";
import { getListing } from "@/features/listings/service/listing.service";
import { ListingForm } from "@/features/listings/components/listing-form";
import { localizedName } from "@/features/profiles/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Listings");
  return { title: `${t("editMetaTitle")} · SwipeJobs` };
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("employer");
  if (!user.emailVerified) redirect("/verify-email"); // editing is verification-gated (M3 decision)

  const profile = await getOwnEmployerProfile(user.id);
  if (!profile) redirect("/onboarding");

  const { id } = await params;
  const listing = await getListing(user.id, id); // owner-scoped: not-yours → null
  if (!listing) notFound();

  const locale = await getLocale();
  const categories = await getCategories();
  return (
    <ListingForm
      initial={listing}
      categories={categories.map((c) => ({ value: c.id, label: localizedName(c, locale) }))}
    />
  );
}
