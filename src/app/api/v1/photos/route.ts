import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/features/auth/rate-limit";
import { photoUploadSchema } from "@/features/photos/schemas";
import { MAX_UPLOAD_BYTES } from "@/features/photos/constants";
import { uploadPhoto, UploadError } from "@/features/photos/service/photo.service";

// POST /photos (api-contract.md §7). Multipart upload → validate → strip EXIF →
// re-encode → private bucket → row status=pending. Node runtime (sharp needs it).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);
  if (user.status !== "active") return err("account_inactive", "This account is not active.", 403);

  const rl = await checkRateLimit(`photo_upload:${user.id}`); // tight limit wired in M9
  if (!rl.ok) {
    const res = err("rate_limited", "Too many uploads. Please wait and try again.", 429);
    if (rl.retryAfterSeconds) res.headers.set("Retry-After", String(rl.retryAfterSeconds));
    return res;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return err("invalid_input", "Expected multipart form data.", 400);
  }

  const parsed = photoUploadSchema.safeParse({ type: form.get("type") });
  if (!parsed.success) return err("invalid_input", "Invalid photo type.", 400);

  // A worker may only upload a worker_photo; an employer only an employer_logo.
  const expected =
    user.role === "worker" ? "worker_photo" : user.role === "employer" ? "employer_logo" : null;
  if (!expected || parsed.data.type !== expected) {
    return err("forbidden", "Photo type does not match your account.", 403);
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return err("invalid_input", "No file uploaded.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return err("too_large", "Image exceeds the size limit.", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const photo = await uploadPhoto(user.id, parsed.data.type, buffer);
    return NextResponse.json(
      { data: { photo_id: photo.id, status: photo.status } },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof UploadError) {
      if (e.code === "too_large") return err("too_large", "Image exceeds the size limit.", 413);
      if (e.code === "upload_failed") return err("upload_failed", "Couldn't save the image.", 500);
      return err(e.code, "That image couldn't be processed.", 400); // invalid_image / unsupported_format / dimensions_too_large
    }
    return err("upload_failed", "Couldn't save the image.", 500);
  }
}
