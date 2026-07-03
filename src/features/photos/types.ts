export type PhotoType = "worker_photo" | "employer_logo";
export type PhotoStatus = "pending" | "approved" | "rejected";

export const photoTypes: PhotoType[] = ["worker_photo", "employer_logo"];

/** Raw photos row (snake_case) as selected from Postgres. */
export interface PhotoRow {
  id: string;
  type: PhotoType;
  status: PhotoStatus;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

/**
 * Serialized photo for the client. Deliberately OMITS storage_path — the object
 * path in the private bucket is internal and never leaves the server; clients get
 * a short-lived signed URL only for an approved photo.
 */
export interface PhotoView {
  id: string;
  type: PhotoType;
  status: PhotoStatus;
  createdAt: string;
}

export function toPhotoView(row: PhotoRow): PhotoView {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
  };
}
