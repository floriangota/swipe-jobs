export type NotificationType = "new_match" | "new_message" | "new_candidate" | "system";

// Payload shapes the DB triggers build. All CONTACT-FREE by construction: pre-match
// surfaces (new_candidate) carry first name + last initial only; match/message
// payloads may carry the post-match display name, never phone/email/surname alone.
export interface NewMatchPayload {
  match_id: string;
  listing_id: string;
  listing_title: string;
  counterpart_name: string;
}
export interface NewMessagePayload {
  match_id: string;
  message_id: string;
  sender_name: string;
  preview: string;
}
export interface NewCandidatePayload {
  listing_id: string;
  listing_title: string;
  worker_name: string;
}
export interface SystemPayload {
  title?: string;
  body?: string;
}

export type NotificationPayload =
  | NewMatchPayload
  | NewMessagePayload
  | NewCandidatePayload
  | SystemPayload
  | Record<string, unknown>;

export interface NotificationRow {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  readAt: string | null;
  createdAt: string;
}

export function toNotificationView(row: NotificationRow): NotificationView {
  // Field-by-field: the payload passes through as the triggers built it (contact-free),
  // and this mapper never adds contact fields. A CI test asserts it.
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
