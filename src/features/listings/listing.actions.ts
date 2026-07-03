"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getCategories } from "@/features/profiles/service/reference-data.service";
import { getOwnEmployerProfile } from "@/features/profiles/service/employer-profile.service";
import { listingSchema, listingStatusUpdateSchema, type ListingInput } from "./schemas";
import { createListing, setListingStatus, updateListing } from "./service/listing.service";
import type { ListingStatus } from "./types";

export type ListingErrorCode =
  | "invalid_input"
  | "save_failed"
  | "wrong_role"
  | "not_verified"
  | "not_found";
export type ListingFormState =
  | { error?: ListingErrorCode; fieldErrors?: Record<string, string[]> }
  | undefined;

/**
 * Create (listingId null) or update an employer's listing. Employer-only and
 * verification-gated (approved M3 deviation: unverified employers cannot post).
 * Ownership + role are re-enforced in the service query and Postgres RLS.
 * Redirects to /listings on success.
 */
export async function saveListing(
  listingId: string | null,
  input: ListingInput,
): Promise<ListingFormState> {
  const user = await requireUser();
  if (user.role !== "employer") return { error: "wrong_role" };
  if (!user.emailVerified) return { error: "not_verified" };

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Belt-and-suspenders: Zod only checks the uuid shape. Reject a bogus/inactive category.
  const categories = await getCategories();
  if (!categories.some((c) => c.id === parsed.data.category_id)) {
    return { error: "invalid_input" };
  }

  // Must have an employer profile to own a listing (city is denormalized from it).
  const profile = await getOwnEmployerProfile(user.id);
  if (!profile) return { error: "save_failed" };

  try {
    if (listingId) {
      const ok = await updateListing(user.id, listingId, parsed.data);
      if (!ok) return { error: "not_found" };
    } else {
      await createListing(user.id, user.cityId, parsed.data);
    }
  } catch {
    return { error: "save_failed" };
  }

  revalidatePath("/listings");
  redirect("/listings");
}

/** Pause / close / reactivate a listing. Employer-only, verification-gated, ownership-scoped. */
export async function updateListingStatus(
  listingId: string,
  status: ListingStatus,
): Promise<{ ok: boolean; error?: ListingErrorCode }> {
  const user = await requireUser();
  if (user.role !== "employer") return { ok: false, error: "wrong_role" };
  if (!user.emailVerified) return { ok: false, error: "not_verified" };

  const parsed = listingStatusUpdateSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  let ok: boolean;
  try {
    ok = await setListingStatus(user.id, listingId, parsed.data.status);
  } catch {
    return { ok: false, error: "save_failed" };
  }
  if (!ok) return { ok: false, error: "not_found" };

  revalidatePath("/listings");
  return { ok: true };
}
