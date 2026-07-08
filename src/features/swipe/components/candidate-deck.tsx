"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { toast } from "@/stores/toast-store";
import { ListingCardSkeleton } from "@/features/listings/components/listing-card";
import { EmptyState } from "@/components/ui/states";
import { useDeck, type DeckState } from "../store";
import { SwipeCard, type SwipeCardHandle } from "./swipe-card";
import { CandidateCard } from "./candidate-card";
import { MatchMoment } from "./match-moment";
import type { CandidateCardView } from "../types";

/** The employer's candidate deck: swipe workers who right-swiped this listing; a mutual
 *  right-swipe fires the "It's a match!" moment. */
export function CandidateDeck({ listingId }: { listingId: string }) {
  const t = useTranslations("Candidates");
  const items = useDeck((s: DeckState<CandidateCardView>) => s.items);
  const cursor = useDeck((s: DeckState<CandidateCardView>) => s.cursor);
  const loadingMore = useDeck((s: DeckState<CandidateCardView>) => s.loadingMore);
  const removeTop = useDeck((s: DeckState<CandidateCardView>) => s.removeTop);
  const restoreTop = useDeck((s: DeckState<CandidateCardView>) => s.restoreTop);
  const appendPage = useDeck((s: DeckState<CandidateCardView>) => s.appendPage);
  const setLoadingMore = useDeck((s: DeckState<CandidateCardView>) => s.setLoadingMore);

  const cardRef = useRef<SwipeCardHandle>(null);
  const [match, setMatch] = useState<{ name: string; matchId: string | null } | null>(null);

  const prefetch = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/v1/listings/${listingId}/candidates?cursor=${encodeURIComponent(cursor)}`,
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data: CandidateCardView[];
          meta?: { next_cursor: string | null };
        };
        appendPage(json.data ?? [], json.meta?.next_cursor ?? null);
      }
    } catch {
      // keep the loaded deck
    } finally {
      setLoadingMore(false);
    }
  }, [listingId, cursor, loadingMore, appendPage, setLoadingMore]);

  useEffect(() => {
    if (items.length === 0 && cursor && !loadingMore) void prefetch();
  }, [items.length, cursor, loadingMore, prefetch]);

  async function commit(dir: "left" | "right") {
    const candidate = items[0];
    if (!candidate) return;
    removeTop();
    if (items.length <= 3) void prefetch();

    try {
      const res = await fetch(
        `/api/v1/listings/${listingId}/candidates/${candidate.workerProfileId}/swipe`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ direction: dir }),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { matched?: boolean; match_id?: string | null };
        };
        if (json.data?.matched) {
          setMatch({ name: candidate.firstName, matchId: json.data.match_id ?? null });
        }
      } else if (res.status !== 409) {
        restoreTop(candidate);
        toast.error({ title: t("swipeFailed") });
      }
    } catch {
      restoreTop(candidate);
      toast.error({ title: t("swipeFailed") });
    }
  }

  const top = items[0];
  const behind = items.slice(1, 3);

  return (
    <>
      <div className="flex flex-col items-center">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[340px]">
          {top ? (
            <>
              {behind
                .slice()
                .reverse()
                .map((candidate, i) => {
                  const depth = behind.length - i;
                  return (
                    <div
                      key={candidate.workerProfileId}
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.045})`,
                        opacity: 1 - depth * 0.18,
                      }}
                    >
                      <CandidateCard candidate={candidate} />
                    </div>
                  );
                })}
              <SwipeCard
                key={top.workerProfileId}
                ref={cardRef}
                onCommit={commit}
                likeLabel={t("stampYes")}
                nopeLabel={t("stampNo")}
              >
                <CandidateCard candidate={top} />
              </SwipeCard>
            </>
          ) : loadingMore || cursor ? (
            <ListingCardSkeleton />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState title={t("empty")} description={t("emptyBody")} />
            </div>
          )}
        </div>

        {top && (
          <div className="mt-7 flex items-center justify-center gap-5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t("pass")}
              onClick={() => cardRef.current?.fling("left")}
              className="flex size-14 items-center justify-center rounded-full border-2 border-destructive bg-card text-destructive shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-6">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t("match")}
              onClick={() => cardRef.current?.fling("right")}
              className="flex size-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-7">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>

      <MatchMoment
        open={match !== null}
        name={match?.name ?? null}
        matchId={match?.matchId ?? null}
        onClose={() => setMatch(null)}
      />
    </>
  );
}
