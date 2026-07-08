import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";
import type { ListingInput } from "../schemas";
import {
  toListingView,
  type ListingRow,
  type ListingStatus,
  type ListingView,
  type MyListingItem,
} from "../types";

/** Sanitize free text on write (docs/security.md); empty after cleaning → null. */
function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = sanitizeText(value);
  return cleaned.length > 0 ? cleaned : null;
}

const LISTING_COLUMNS =
  "id, city_id, category_id, title, description, job_type, required_experience, pay_min, pay_max, pay_period, status, created_at, updated_at";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

async function getEmployerProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("employer_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}

// Opaque page cursor. Offset-backed (fine for MVP scale — a single employer's
// listings); consumers treat it as opaque, so it can move to keyset later.
function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}
function decodeCursor(cursor: string): number {
  const n = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

export interface OwnListingsPage {
  items: MyListingItem[];
  nextCursor: string | null;
}

/**
 * The employer's own listings, newest first, cursor-paginated, with real
 * interested/matched engagement counts (see getEngagementCounts).
 */
export async function getOwnListings(
  userId: string,
  opts?: { cursor?: string | null; limit?: number },
): Promise<OwnListingsPage> {
  const supabase = await createClient();
  const employerProfileId = await getEmployerProfileId(supabase, userId);
  if (!employerProfileId) return { items: [], nextCursor: null };

  const limit = Math.min(Math.max(opts?.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const offset = opts?.cursor ? decodeCursor(opts.cursor) : 0;

  // Fetch limit + 1 to detect whether another page exists.
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("employer_profile_id", employerProfileId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ListingRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const views = pageRows.map(toListingView);
  const counts = await getEngagementCounts(
    supabase,
    views.map((v) => v.id),
  );
  const items: MyListingItem[] = views.map((view) => ({
    ...view,
    interestedCount: counts.get(view.id)?.interested ?? 0,
    matchedCount: counts.get(view.id)?.matched ?? 0,
  }));

  return { items, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
}

interface EngagementCount {
  interested: number;
  matched: number;
}

/** Real interested/matched counts per listing (M5) — replaces the M3 placeholders. */
async function getEngagementCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingIds: string[],
): Promise<Map<string, EngagementCount>> {
  const map = new Map<string, EngagementCount>();
  if (listingIds.length === 0) return map;

  const { data, error } = await supabase.rpc("listing_engagement_counts", {
    p_listing_ids: listingIds,
  });
  if (error) throw new Error(error.message);

  for (const r of (data ?? []) as {
    listing_id: string;
    interested_count: number;
    matched_count: number;
  }[]) {
    map.set(r.listing_id, {
      interested: Number(r.interested_count),
      matched: Number(r.matched_count),
    });
  }
  return map;
}

/** A single listing owned by the caller (M3). Worker read of active listings = M5. */
export async function getListing(userId: string, listingId: string): Promise<ListingView | null> {
  const supabase = await createClient();
  const employerProfileId = await getEmployerProfileId(supabase, userId);
  if (!employerProfileId) return null;

  const { data } = await supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("id", listingId)
    .eq("employer_profile_id", employerProfileId)
    .maybeSingle();

  const row = data as ListingRow | null;
  return row ? toListingView(row) : null;
}

export async function createListing(
  userId: string,
  cityId: string,
  input: ListingInput,
): Promise<void> {
  const supabase = await createClient();
  const employerProfileId = await getEmployerProfileId(supabase, userId);
  if (!employerProfileId) throw new Error("Employer profile not found");

  const { error } = await supabase.from("listings").insert({
    employer_profile_id: employerProfileId,
    city_id: cityId, // denormalized from the employer; never client-supplied
    category_id: input.category_id,
    title: input.title,
    description: cleanText(input.description),
    job_type: input.job_type,
    required_experience: input.required_experience,
    pay_min: input.pay_min,
    pay_max: input.pay_max ?? null,
    pay_period: input.pay_period,
    // status defaults to 'active'
  });
  if (error) throw new Error(error.message);
}

/**
 * Update a listing's content. Ownership-scoped (id + employer_profile_id). Does NOT
 * change city_id (fixed from the employer) or status (use setListingStatus).
 * Returns false when no owned row matched (not found / not owner).
 */
export async function updateListing(
  userId: string,
  listingId: string,
  input: ListingInput,
): Promise<boolean> {
  const supabase = await createClient();
  const employerProfileId = await getEmployerProfileId(supabase, userId);
  if (!employerProfileId) return false;

  const { data, error } = await supabase
    .from("listings")
    .update({
      category_id: input.category_id,
      title: input.title,
      description: cleanText(input.description),
      job_type: input.job_type,
      required_experience: input.required_experience,
      pay_min: input.pay_min,
      pay_max: input.pay_max ?? null,
      pay_period: input.pay_period,
    })
    .eq("id", listingId)
    .eq("employer_profile_id", employerProfileId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data != null;
}

/** Change a listing's status (pause / close / reactivate). Ownership-scoped. */
export async function setListingStatus(
  userId: string,
  listingId: string,
  status: ListingStatus,
): Promise<boolean> {
  const supabase = await createClient();
  const employerProfileId = await getEmployerProfileId(supabase, userId);
  if (!employerProfileId) return false;

  const { data, error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("employer_profile_id", employerProfileId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data != null;
}
