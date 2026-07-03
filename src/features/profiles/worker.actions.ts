"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { visibilitySchema, workerProfileSchema, type WorkerProfileInput } from "./schemas";
import {
  createWorkerProfile,
  getOwnWorkerProfile,
  setWorkerVisibility,
  updateWorkerProfile,
} from "./service/worker-profile.service";
import { getCategories, getLanguages } from "./service/reference-data.service";

export type ProfileErrorCode = "invalid_input" | "save_failed" | "wrong_role";
export type ProfileFormState =
  | { error?: ProfileErrorCode; fieldErrors?: Record<string, string[]> }
  | undefined;

/** Create or update the current worker's profile. Redirects to /profile on success. */
export async function saveWorkerProfile(input: WorkerProfileInput): Promise<ProfileFormState> {
  const user = await requireUser();
  if (user.role !== "worker") return { error: "wrong_role" };

  const parsed = workerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Reject bogus/inactive category or language ids BEFORE the destructive
  // join-replace (Zod only checks uuid shape). Guards against a failed insert
  // leaving the profile's join sets wiped. (Full transactional atomicity via an
  // RPC is a follow-up hardening — see review.)
  const [cats, langs] = await Promise.all([getCategories(), getLanguages()]);
  const validCat = new Set(cats.map((c) => c.id));
  const validLang = new Set(langs.map((l) => l.id));
  if (
    parsed.data.category_ids.some((id) => !validCat.has(id)) ||
    parsed.data.language_ids.some((id) => !validLang.has(id))
  ) {
    return { error: "invalid_input" };
  }

  try {
    const existing = await getOwnWorkerProfile(user.id);
    if (existing) await updateWorkerProfile(user.id, parsed.data);
    else await createWorkerProfile(user.id, parsed.data);
  } catch {
    return { error: "save_failed" };
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function toggleWorkerVisibility(isVisible: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (user.role !== "worker") return { ok: false };

  const parsed = visibilitySchema.safeParse({ is_visible: isVisible });
  if (!parsed.success) return { ok: false };

  await setWorkerVisibility(user.id, parsed.data.is_visible);
  revalidatePath("/profile");
  return { ok: true };
}
