import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { getListing } from "@/features/listings/service/listing.service";
import { getListingCandidates, listingAccess } from "@/features/swipe/service/candidate.service";
import { DeckProvider } from "@/features/swipe/store";
import { CandidateDeck } from "@/features/swipe/components/candidate-deck";
import { ErrorState } from "@/components/ui/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Candidates");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

export default async function CandidatesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("employer");
  const { id } = await params;

  const access = await listingAccess(user.id, id);
  if (access === "not_found") notFound();
  if (access === "forbidden") redirect("/listings");

  const t = await getTranslations("Candidates");
  const tCommon = await getTranslations("Common");
  const listing = await getListing(user.id, id);

  let page: Awaited<ReturnType<typeof getListingCandidates>>;
  try {
    page = await getListingCandidates(id);
  } catch {
    return <ErrorState title={t("loadError")} description={tCommon("error")} />;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/listings"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {t("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t("title")}</h1>
        {listing && <p className="text-sm text-muted-foreground">{listing.title}</p>}
      </div>

      <DeckProvider items={page.candidates} cursor={page.nextCursor}>
        <CandidateDeck listingId={id} />
      </DeckProvider>
    </div>
  );
}
