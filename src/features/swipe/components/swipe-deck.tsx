"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { toast } from "@/stores/toast-store";
import { ListingCard, ListingCardSkeleton } from "@/features/listings/components/listing-card";
import { EmptyState } from "@/components/ui/states";
import { useDeck, type DeckState } from "../store";
import { SwipeCard, type SwipeCardHandle } from "./swipe-card";
import type { FeedCard } from "../types";

/** The worker's swipe feed: a draggable deck of listing cards. */
export function SwipeDeck() {
  const t = useTranslations("Feed");
  const items = useDeck((s: DeckState<FeedCard>) => s.items);
  const cursor = useDeck((s: DeckState<FeedCard>) => s.cursor);
  const loadingMore = useDeck((s: DeckState<FeedCard>) => s.loadingMore);
  const removeTop = useDeck((s: DeckState<FeedCard>) => s.removeTop);
  const restoreTop = useDeck((s: DeckState<FeedCard>) => s.restoreTop);
  const appendPage = useDeck((s: DeckState<FeedCard>) => s.appendPage);
  const setLoadingMore = useDeck((s: DeckState<FeedCard>) => s.setLoadingMore);

  const cardRef = useRef<SwipeCardHandle>(null);

  const prefetch = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/v1/feed?cursor=${encodeURIComponent(cursor)}`);
      if (res.ok) {
        const json = (await res.json()) as {
          data: FeedCard[];
          meta?: { next_cursor: string | null };
        };
        appendPage(json.data ?? [], json.meta?.next_cursor ?? null);
      }
    } catch {
      // keep the loaded deck; the user can keep swiping what's there
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, appendPage, setLoadingMore]);

  // If the deck empties while more pages exist, pull the next page (covers fast swiping
  // outrunning the on-commit prefetch).
  useEffect(() => {
    if (items.length === 0 && cursor && !loadingMore) void prefetch();
  }, [items.length, cursor, loadingMore, prefetch]);

  async function commit(dir: "left" | "right") {
    const card = items[0];
    if (!card) return;
    removeTop(); // optimistic — the card has already flung off-screen
    if (items.length <= 3) void prefetch();

    try {
      const res = await fetch(`/api/v1/listings/${card.id}/swipe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ direction: dir }),
      });
      // 409 already-swiped / 404 gone are terminal (consumed) — only a real failure rolls back.
      if (!res.ok && res.status !== 409 && res.status !== 404) {
        restoreTop(card);
        toast.error({ title: t("swipeFailed") });
      }
    } catch {
      restoreTop(card);
      toast.error({ title: t("swipeFailed") });
    }
  }

  const top = items[0];
  const behind = items.slice(1, 3);

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[340px]">
        {top ? (
          <>
            {behind
              .slice()
              .reverse()
              .map((card, i) => {
                const depth = behind.length - i; // 1 = closest behind the top
                return (
                  <div
                    key={card.id}
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.045})`,
                      opacity: 1 - depth * 0.18,
                    }}
                  >
                    <ListingCard listing={card} />
                  </div>
                );
              })}
            <SwipeCard
              key={top.id}
              ref={cardRef}
              onCommit={commit}
              likeLabel={t("stampYes")}
              nopeLabel={t("stampNo")}
            >
              <ListingCard listing={top} />
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
            aria-label={t("interested")}
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
  );
}
