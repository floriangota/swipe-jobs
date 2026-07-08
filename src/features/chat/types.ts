export type MatchStatus = "active" | "closed_by_worker" | "closed_by_employer" | "hired";

/** Which side of the match the CALLER is on (from the match_detail DB function). */
export type CallerSide = "worker" | "employer";

/** Row shape returned by the `match_inbox` DB function (no phone/email — the inbox
 *  is not the reveal point; only the counterpart's display name is unlocked). */
export interface MatchInboxRow {
  match_id: string;
  status: MatchStatus;
  matched_at: string;
  listing_id: string;
  listing_title: string;
  counterpart_name: string;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_sender_user_id: string | null;
  unread_count: number;
  activity_at: string;
}

/**
 * One conversation row in the matches inbox. Post-match the counterpart's full name
 * is unlocked, but GOLDEN RULE: this view still carries NO phone/email — contact
 * goes through the match detail endpoint only. A CI test asserts it.
 */
export interface MatchListItemView {
  id: string;
  status: MatchStatus;
  matchedAt: string;
  listingId: string;
  listingTitle: string;
  counterpartName: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageIsMine: boolean;
  unreadCount: number;
  activityAt: string;
}

/** Row shape returned by the `match_detail` DB function — the DB only yields this row
 *  to the two match parties (party check inside the SECURITY DEFINER function). */
export interface MatchDetailRow {
  match_id: string;
  status: MatchStatus;
  matched_at: string;
  listing_id: string;
  listing_title: string;
  caller_side: CallerSide;
  counterpart_name: string;
  contact_phone: string | null;
  contact_email: string | null;
}

/**
 * THE golden-rule reveal point (api-contract.md §6): the only view in the app that
 * carries the counterpart's contact. Safe by construction — the match_detail DB
 * function returns zero rows to anyone who is not a party to the match.
 */
export interface MatchDetailView {
  id: string;
  status: MatchStatus;
  matchedAt: string;
  listingId: string;
  listingTitle: string;
  callerSide: CallerSide;
  counterpartName: string;
  contactPhone: string | null;
  contactEmail: string | null;
}

/** Raw messages row (snake_case) as selected from Postgres. */
export interface MessageRow {
  id: string;
  match_id: string;
  sender_user_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

/** A chat message. Carries no contact fields — only the sender's user id (needed to
 *  align bubbles), which both parties legitimately hold post-match. */
export interface MessageView {
  id: string;
  matchId: string;
  senderUserId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function toMatchListItemView(row: MatchInboxRow, callerUserId: string): MatchListItemView {
  // GOLDEN RULE: emit only inbox-safe fields — never phone/email (detail-only reveal).
  return {
    id: row.match_id,
    status: row.status,
    matchedAt: row.matched_at,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    counterpartName: row.counterpart_name,
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at,
    lastMessageIsMine:
      row.last_message_sender_user_id != null && row.last_message_sender_user_id === callerUserId,
    unreadCount: Number(row.unread_count),
    activityAt: row.activity_at,
  };
}

export function toMatchDetailView(row: MatchDetailRow): MatchDetailView {
  // Explicit field-by-field copy: exactly the revealed fields, nothing extra from
  // an unexpectedly wider row.
  return {
    id: row.match_id,
    status: row.status,
    matchedAt: row.matched_at,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    callerSide: row.caller_side,
    counterpartName: row.counterpart_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
  };
}

export function toMessageView(row: MessageRow): MessageView {
  return {
    id: row.id,
    matchId: row.match_id,
    senderUserId: row.sender_user_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
