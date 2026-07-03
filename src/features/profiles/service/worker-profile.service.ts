import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WorkerProfileInput } from "../schemas";
import type { Availability, ExperienceLevel, WorkerProfileView } from "../types";

interface WorkerProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  experience_level: ExperienceLevel;
  phone: string | null;
  is_visible: boolean;
  photo_id: string | null;
}

function lastInitial(lastName: string): string {
  return lastName.trim().charAt(0).toUpperCase();
}

function toView(
  row: WorkerProfileRow,
  categoryIds: string[],
  languageIds: string[],
  availabilities: Availability[],
): WorkerProfileView {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    lastInitial: lastInitial(row.last_name),
    bio: row.bio,
    experienceLevel: row.experience_level,
    phone: row.phone,
    isVisible: row.is_visible,
    photoId: row.photo_id,
    categoryIds,
    languageIds,
    availabilities,
  };
}

/**
 * GOLDEN RULE: strip contact fields for anyone who is not the owner or a matched
 * employer. In M2 no matches exist, so non-owners never reach this with data
 * (RLS blocks them); the match-gated read + reveal is finalized in M5. Callers
 * that surface another worker to an employer MUST run this until then.
 */
export function stripWorkerContact(view: WorkerProfileView): WorkerProfileView {
  return { ...view, lastName: null, phone: null };
}

export async function getOwnWorkerProfile(userId: string): Promise<WorkerProfileView | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("worker_profiles")
    .select("id, first_name, last_name, bio, experience_level, phone, is_visible, photo_id")
    .eq("user_id", userId)
    .maybeSingle();

  const row = profile as WorkerProfileRow | null;
  if (!row) return null;

  const [cats, langs, avails] = await Promise.all([
    supabase.from("worker_categories").select("category_id").eq("worker_profile_id", row.id),
    supabase.from("worker_languages").select("language_id").eq("worker_profile_id", row.id),
    supabase.from("worker_availabilities").select("availability").eq("worker_profile_id", row.id),
  ]);

  return toView(
    row,
    (cats.data ?? []).map((r) => (r as { category_id: string }).category_id),
    (langs.data ?? []).map((r) => (r as { language_id: string }).language_id),
    (avails.data ?? []).map((r) => (r as { availability: Availability }).availability),
  );
}

async function replaceJoins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  input: WorkerProfileInput,
): Promise<void> {
  await Promise.all([
    supabase.from("worker_categories").delete().eq("worker_profile_id", profileId),
    supabase.from("worker_languages").delete().eq("worker_profile_id", profileId),
    supabase.from("worker_availabilities").delete().eq("worker_profile_id", profileId),
  ]);

  await Promise.all([
    insertJoinRows(
      supabase,
      "worker_categories",
      input.category_ids.map((category_id) => ({ worker_profile_id: profileId, category_id })),
    ),
    insertJoinRows(
      supabase,
      "worker_languages",
      input.language_ids.map((language_id) => ({ worker_profile_id: profileId, language_id })),
    ),
    insertJoinRows(
      supabase,
      "worker_availabilities",
      input.availabilities.map((availability) => ({ worker_profile_id: profileId, availability })),
    ),
  ]);
}

async function insertJoinRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  rows: Record<string, string>[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(`Failed to save ${table}: ${error.message}`);
}

export async function createWorkerProfile(userId: string, input: WorkerProfileInput): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("worker_profiles")
    .insert({
      user_id: userId,
      first_name: input.first_name,
      last_name: input.last_name,
      bio: input.bio ?? null,
      experience_level: input.experience_level,
      phone: input.phone ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create worker profile");
  await replaceJoins(supabase, (data as { id: string }).id, input);
}

export async function updateWorkerProfile(userId: string, input: WorkerProfileInput): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("worker_profiles")
    .update({
      first_name: input.first_name,
      last_name: input.last_name,
      bio: input.bio ?? null,
      experience_level: input.experience_level,
      phone: input.phone ?? null,
    })
    .eq("user_id", userId)
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update worker profile");
  await replaceJoins(supabase, (data as { id: string }).id, input);
}

export async function setWorkerVisibility(userId: string, isVisible: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("worker_profiles")
    .update({ is_visible: isVisible })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
