import { z } from "zod";

// Kept in sync with the DB check constraint (messages_body_max_length).
export const MESSAGE_MAX_LENGTH = 2000;

// strictObject => unknown fields are rejected (docs/security.md).
export const messageSchema = z.strictObject({
  body: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});
export type MessageInput = z.infer<typeof messageSchema>;

// 'active' is deliberately absent: closed/hired are terminal, no reopen in MVP.
// Which side may set which value is enforced by the update_match_status function.
export const matchStatusUpdateSchema = z.strictObject({
  status: z.enum(["closed_by_worker", "closed_by_employer", "hired"]),
});
export type MatchStatusUpdateInput = z.infer<typeof matchStatusUpdateSchema>;
