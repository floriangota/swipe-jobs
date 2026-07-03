import { ListingCard, ListingCardSkeleton } from "@/features/listings/components/listing-card";
import type { ListingCardView } from "@/features/listings/types";

// Sample content for the design showcase (real listings come from M3 data; photos M4).
const samples: ListingCardView[] = [
  {
    id: "sample-1",
    title: "Barista",
    businessName: "Café Ballkoni",
    cityName: "Ferizaj",
    jobType: "part_time",
    requiredExperience: "none",
    payMin: 350,
    payMax: 400,
    payPeriod: "hourly",
  },
  {
    id: "sample-2",
    title: "Waiter",
    businessName: "Restaurant Amuza",
    cityName: "Ferizaj",
    jobType: "full_time",
    requiredExperience: "1_3y",
    payMin: 40000,
    payMax: 50000,
    payPeriod: "monthly",
  },
];

export function ListingCardDemo() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      {samples.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
      <ListingCardSkeleton />
    </div>
  );
}
