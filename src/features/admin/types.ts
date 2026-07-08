// Admin-side view types. The admin is trusted and sees full data by design, gated at
// BOTH layers (requireRole('admin') + DB policies/functions) — so these views may carry
// contact fields the golden rule hides from ordinary users.

export type PhotoType = "worker_photo" | "employer_logo";
export type PhotoStatus = "pending" | "approved" | "rejected";
export type ReportReason = "inappropriate_photo" | "spam" | "harassment" | "fake" | "other";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type UserRole = "worker" | "employer" | "admin";
export type UserStatus = "active" | "suspended" | "deleted";

export interface PendingPhotoView {
  id: string;
  type: PhotoType;
  status: PhotoStatus;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string; // worker full name or business name
  createdAt: string;
  signedUrl: string | null;
}

export interface ReportView {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reporterEmail: string;
  reportedUserId: string | null;
  reportedListingId: string | null;
  reportedMessageId: string | null;
  createdAt: string;
}

export interface AdminUserView {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface AdminCategoryView {
  id: string;
  slug: string;
  nameSq: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AuditLogView {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminMetrics {
  users: { total: number; workers: number; employers: number; admins: number; suspended: number };
  listings: { active: number; paused: number; closed: number };
  matches: { total: number; hired: number };
  queues: { pendingPhotos: number; openReports: number };
}
