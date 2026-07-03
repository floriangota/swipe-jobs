import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { processImage } from "../image";
import { MAX_UPLOAD_BYTES } from "../constants";
import { toPhotoView, type PhotoRow, type PhotoType, type PhotoView } from "../types";

const BUCKET = "photos";
const SIGNED_URL_TTL = 60 * 60; // 1 hour
const PHOTO_COLUMNS = "id, type, status, storage_path, created_at, updated_at";

export type UploadErrorCode =
  | "too_large"
  | "invalid_image"
  | "unsupported_format"
  | "dimensions_too_large"
  | "upload_failed";

export class UploadError extends Error {
  code: UploadErrorCode;
  constructor(code: UploadErrorCode) {
    super(code);
    this.code = code;
    this.name = "UploadError";
  }
}

/**
 * Validate + re-encode (EXIF stripped) + store a photo in the private bucket, then
 * insert a photos row as `pending`. Uses the RLS client so storage + table policies
 * enforce per-user ownership (path must be under photos/{userId}/…). `userId` must
 * be the authenticated caller — it is re-checked by RLS.
 */
export async function uploadPhoto(
  userId: string,
  type: PhotoType,
  input: Buffer,
): Promise<PhotoView> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("too_large");

  let processed: Buffer;
  try {
    processed = await processImage(input);
  } catch (e) {
    const code = e instanceof Error && "code" in e ? (e as { code: string }).code : "invalid_image";
    throw new UploadError(code as UploadErrorCode);
  }

  const supabase = await createClient();
  const storagePath = `${userId}/${randomUUID()}.jpg`;

  const up = await supabase.storage.from(BUCKET).upload(storagePath, processed, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (up.error) throw new UploadError("upload_failed");

  const { data, error } = await supabase
    .from("photos")
    .insert({ user_id: userId, storage_path: storagePath, type }) // status defaults to 'pending'
    .select(PHOTO_COLUMNS)
    .single();

  if (error || !data) {
    // Best-effort cleanup so a failed insert doesn't orphan the stored object.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new UploadError("upload_failed");
  }

  const view = toPhotoView(data as PhotoRow);
  // Supersede older PENDING uploads of the same type so repeated "Change photo"
  // taps don't pile up in the moderation queue (best-effort; never touches an
  // approved/rejected photo).
  await prunePriorPending(supabase, userId, type, view.id);
  return view;
}

async function prunePriorPending(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: PhotoType,
  keepId: string,
): Promise<void> {
  const { data } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("status", "pending")
    .neq("id", keepId);
  const rows = (data ?? []) as { id: string; storage_path: string }[];
  if (rows.length === 0) return;
  await supabase.storage.from(BUCKET).remove(rows.map((r) => r.storage_path));
  await supabase.from("photos").delete().in(
    "id",
    rows.map((r) => r.id),
  );
}

/**
 * Delete a photo the caller owns (RLS-scoped). Deletes the ROW first (source of
 * truth — this also fires ON DELETE SET NULL to unlink the profile), then removes
 * the storage object best-effort. A failed object removal only ever orphans an
 * object (harmless — it can never be served without a row), never leaves a row
 * pointing at a missing object. False if not found/owned.
 */
export async function deleteOwnPhoto(photoId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .select("storage_path");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { storage_path: string }[];
  if (rows.length === 0) return false; // not found / not owned (RLS)

  await supabase.storage.from(BUCKET).remove([rows[0]!.storage_path]);
  return true;
}

/**
 * A short-lived signed URL for an APPROVED photo owned by the caller, or null if
 * the photo isn't theirs / isn't approved / can't be signed — so the UI falls back
 * to the placeholder. Cross-user display (the feed) is M5.
 */
export async function getOwnApprovedPhotoUrl(photoId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("photos")
    .select("storage_path, status")
    .eq("id", photoId)
    .maybeSingle();
  const row = data as { storage_path: string; status: PhotoRow["status"] } | null;
  if (!row || row.status !== "approved") return null;

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL);
  return signed?.signedUrl ?? null;
}
