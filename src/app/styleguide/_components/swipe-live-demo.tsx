"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/features/listings/components/listing-card";
import { SwipeCard } from "@/features/swipe/components/swipe-card";
import { MatchMoment } from "@/features/swipe/components/match-moment";
import type { ListingCardView } from "@/features/listings/types";

// Sample content — the real swipe deck (feed + candidates) is auth-gated; this showcases
// the drag physics + the match moment on the design surface.
const samples: ListingCardView[] = [
  { id: "1", title: "Barista", businessName: "Café Ballkoni", cityName: "Ferizaj", jobType: "part_time", requiredExperience: "none", payMin: 350, payMax: 400, payPeriod: "hourly" },
  { id: "2", title: "Waiter", businessName: "Restaurant Amuza", cityName: "Ferizaj", jobType: "full_time", requiredExperience: "1_3y", payMin: 40000, payMax: 50000, payPeriod: "monthly" },
  { id: "3", title: "Warehouse", businessName: "Viva Fresh", cityName: "Ferizaj", jobType: "shift", requiredExperience: "none", payMin: 300, payMax: null, payPeriod: "hourly" },
];

export function SwipeLiveDemo() {
  const t = useTranslations("Styleguide");
  const [index, setIndex] = useState(0);
  const [matchOpen, setMatchOpen] = useState(false);
  const card = samples[index % samples.length]!;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative aspect-[3/4] w-full max-w-[340px]">
        <SwipeCard
          key={index}
          onCommit={() => setIndex((i) => i + 1)}
          likeLabel={t("swipeStampYes")}
          nopeLabel={t("swipeStampNo")}
        >
          <ListingCard listing={card} />
        </SwipeCard>
      </div>
      <Button intent="outline" onClick={() => setMatchOpen(true)}>
        {t("previewMatch")}
      </Button>
      <MatchMoment open={matchOpen} name="Arben" onClose={() => setMatchOpen(false)} />
    </div>
  );
}
