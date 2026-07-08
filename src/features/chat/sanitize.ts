// Chat message sanitization is the shared free-text sanitizer (docs/security.md).
// Re-exported here under its original name so chat call sites + tests stay stable.
export { sanitizeText as sanitizeMessageBody } from "@/lib/sanitize";
