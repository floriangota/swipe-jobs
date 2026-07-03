import type { Locale } from "@/i18n/config";

export type ExperienceLevel = "none" | "under_1y" | "1_3y" | "over_3y";
export type Availability = "full_time" | "part_time" | "weekends" | "evenings";

export const experienceLevels: ExperienceLevel[] = ["none", "under_1y", "1_3y", "over_3y"];
export const availabilities: Availability[] = ["full_time", "part_time", "weekends", "evenings"];

export interface LookupItem {
  id: string;
  name_sq: string;
  name_en: string;
}

export interface Category extends LookupItem {
  slug: string;
  sort_order: number;
}
export interface Language extends LookupItem {
  code: string;
  sort_order: number;
}
export interface BusinessType extends LookupItem {
  slug: string;
  sort_order: number;
}
export interface City {
  id: string;
  name: string;
  country: string;
}

/** Bilingual display name for a lookup item, by the active locale. */
export function localizedName(item: LookupItem, locale: Locale): string {
  return locale === "sq" ? item.name_sq : item.name_en;
}

// Public shape of a worker profile (contact fields present ONLY for owner/match).
export interface WorkerProfileView {
  id: string;
  firstName: string;
  lastName: string | null; // stripped unless owner or matched
  lastInitial: string;
  bio: string | null;
  experienceLevel: ExperienceLevel;
  phone: string | null; // stripped unless owner or matched
  isVisible: boolean;
  photoId: string | null; // approved-photo FK (M4); null = show placeholder
  categoryIds: string[];
  languageIds: string[];
  availabilities: Availability[];
}

export interface EmployerProfileView {
  id: string;
  businessName: string;
  businessTypeId: string | null;
  description: string | null;
  logoId: string | null; // approved-logo FK (M4); null = show placeholder
  contactPhone: string | null; // stripped unless owner or matched
  contactEmail: string | null; // stripped unless owner or matched
}
