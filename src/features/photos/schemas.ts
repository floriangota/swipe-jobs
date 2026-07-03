import { z } from "zod";

// The uploaded file itself is validated in the service (magic bytes, dimensions,
// re-encode via sharp) — Zod only guards the accompanying multipart `type` field.
export const photoTypeEnum = z.enum(["worker_photo", "employer_logo"]);

export const photoUploadSchema = z.strictObject({
  type: photoTypeEnum,
});
export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;
