import type { ExperienceLevel } from "@/features/profiles/types";

// required_experience shares its value set with a worker's experience_level (schema
// doc) so feed matching lines up in M5 — reuse the type rather than redeclare it.
export type { ExperienceLevel };

export type JobType = "full_time" | "part_time" | "shift" | "temporary";
export type PayPeriod = "hourly" | "monthly";
export type ListingStatus = "active" | "paused" | "closed";

export const jobTypes: JobType[] = ["full_time", "part_time", "shift", "temporary"];
export const payPeriods: PayPeriod[] = ["hourly", "monthly"];
export const listingStatuses: ListingStatus[] = ["active", "paused", "closed"];

/** Raw listings row (snake_case) as selected from Postgres. This table has no contact fields. */
export interface ListingRow {
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
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

/** Serialized listing (camelCase). Carries NO employer contact fields (golden rule). */
export interface ListingView {
  id: string;
  cityId: string;
  categoryId: string;
  title: string;
  description: string | null;
  jobType: JobType;
  requiredExperience: ExperienceLevel;
  payMin: number; // cents, EUR
  payMax: number | null; // null = exact pay
  payPeriod: PayPeriod;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

/** A listing plus its engagement counts (PLACEHOLDER 0 until M5) for the employer dashboard. */
export interface MyListingItem extends ListingView {
  interestedCount: number;
  matchedCount: number;
}

/**
 * The premium card workers swipe (M5). Only public, pre-match-safe fields —
 * never last_name / phone / email of the employer (golden rule).
 */
export interface ListingCardView {
  id: string;
  title: string;
  businessName: string;
  cityName: string;
  jobType: JobType;
  requiredExperience: ExperienceLevel;
  payMin: number;
  payMax: number | null;
  payPeriod: PayPeriod;
}

/** Pure row → view mapper. Contact fields excluded by construction. */
export function toListingView(row: ListingRow): ListingView {
  return {
    id: row.id,
    cityId: row.city_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    jobType: row.job_type,
    requiredExperience: row.required_experience,
    payMin: row.pay_min,
    payMax: row.pay_max,
    payPeriod: row.pay_period,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Build the swipe-card view from a listing + its (public) employer/city labels. */
export function toListingCardView(
  view: ListingView,
  labels: { businessName: string; cityName: string },
): ListingCardView {
  return {
    id: view.id,
    title: view.title,
    businessName: labels.businessName,
    cityName: labels.cityName,
    jobType: view.jobType,
    requiredExperience: view.requiredExperience,
    payMin: view.payMin,
    payMax: view.payMax,
    payPeriod: view.payPeriod,
  };
}
