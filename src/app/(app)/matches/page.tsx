import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { listMatches } from "@/features/chat/service/match.service";
import { MatchList } from "@/features/chat/components/match-list";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Matches");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

// The matches inbox (both roles). This is also where a worker discovers a new match
// (their live "It's a match!" moment is M7 notifications territory).
export default async function MatchesPage() {
  const user = await requireRole("worker", "employer");
  const t = await getTranslations("Matches");
  const tCommon = await getTranslations("Common");

  let page: Awaited<ReturnType<typeof listMatches>>;
  try {
    page = await listMatches(user.id);
  } catch {
    return <ErrorState title={t("loadError")} description={tCommon("error")} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
      {page.matches.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={user.role === "worker" ? t("emptyBodyWorker") : t("emptyBodyEmployer")}
          action={
            user.role === "worker" ? (
              <Link href="/feed" className={cn(buttonVariants({ intent: "primary", size: "sm" }))}>
                {t("browseJobs")}
              </Link>
            ) : (
              <Link
                href="/listings"
                className={cn(buttonVariants({ intent: "primary", size: "sm" }))}
              >
                {t("viewListings")}
              </Link>
            )
          }
        />
      ) : (
        <MatchList initialItems={page.matches} initialCursor={page.nextCursor} />
      )}
    </div>
  );
}
