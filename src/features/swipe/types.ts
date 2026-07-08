import type {
  ExperienceLevel,
  JobType,
  ListingCardView,
  PayPeriod,
} from "@/features/listings/types";

export type SwipeDirection = "left" | "right";

/** A feed card is the worker-swipe view of a listing — contact-free by construction. */
export type FeedCard = ListingCardView;

/** Row shape returned by the `worker_feed` DB function (contact fields never selected). */
export interface FeedRow {
  id: string;
  city_id: string;
  category_id: string;
  title: string;
  description: string | null;
  job_type: JobType;
  required_experience: ExperienceLevel;
  pay_min: number;
  pay_max: number | null;
  pay_period: PayPeriod;
  status: string;
  created_at: string;
  updated_at: string;
  business_name: string;
  city_name: string;
}

/** Row shape returned by the `listing_candidates` DB function (first name + last INITIAL only). */
export interface CandidateRow {
  swipe_id: string;
  swipe_created_at: string;
  worker_profile_id: string;
  first_name: string;
  last_initial: string;
  experience_level: ExperienceLevel;
}

/**
 * A pre-match worker as seen by an employer. GOLDEN RULE: carries NO contact fields
 * (no last_name / phone / email) — only first name + last initial. A CI test asserts it.
 */
export interface CandidateCardView {
  workerProfileId: string;
  firstName: string;
  lastInitial: string;
  experienceLevel: ExperienceLevel;
}

export function toFeedCard(row: FeedRow): FeedCard {
  return {
    id: row.id,
    title: row.title,
    businessName: row.business_name,
    cityName: row.city_name,
    jobType: row.job_type,
    requiredExperience: row.required_experience,
    payMin: row.pay_min,
    payMax: row.pay_max,
    payPeriod: row.pay_period,
  };
}

export function toCandidateCardView(row: CandidateRow): CandidateCardView {
  // GOLDEN RULE: emit only pre-match-safe fields. The DB function never selects the
  // surname/phone/email, and this mapper never adds them.
  return {
    workerProfileId: row.worker_profile_id,
    firstName: row.first_name,
    lastInitial: row.last_initial,
    experienceLevel: row.experience_level,
  };
}
