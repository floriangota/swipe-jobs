import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { getOwnWorkerProfile } from "@/features/profiles/service/worker-profile.service";
import { getWorkerFeed } from "@/features/swipe/service/feed.service";
import { DeckProvider } from "@/features/swipe/store";
import { SwipeDeck } from "@/features/swipe/components/swipe-deck";
import { ErrorState } from "@/components/ui/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Feed");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

// Workers may browse/swipe before verifying (soft-gate blocks being-shown/matching, not browsing).
export default async function FeedPage() {
  const user = await requireRole("worker");
  const profile = await getOwnWorkerProfile(user.id);
  if (!profile) redirect("/onboarding");

  const t = await getTranslations("Feed");
  const tCommon = await getTranslations("Common");

  let page: Awaited<ReturnType<typeof getWorkerFeed>>;
  try {
    page = await getWorkerFeed();
  } catch {
    return <ErrorState title={t("loadError")} description={tCommon("error")} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <DeckProvider items={page.cards} cursor={page.nextCursor}>
        <SwipeDeck />
      </DeckProvider>
    </div>
  );
}
