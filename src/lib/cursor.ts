// Keyset cursor over (created_at, id), opaque base64url. Shared by the feed, the
// candidate stack, the match inbox, and chat history — keyset (not offset) keeps
// pages stable as rows are swiped away / new messages arrive above the cursor.
// Lifted from features/swipe in M6 when chat became a second consumer.

export interface Keyset {
  createdAt: string;
  id: string;
}

export function encodeCursor(k: Keyset): string {
  return Buffer.from(`${k.createdAt}|${k.id}`).toString("base64url");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function decodeCursor(cursor: string): Keyset | null {
  try {
    const [createdAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (!createdAt || !id) return null;
    // Validate the shape (timestamp | uuid) so a hostile/garbage cursor decodes to
    // null → treated as the first page, rather than reaching Postgres as an invalid
    // cast and 500-ing. Every consumer keys on (timestamptz, uuid).
    if (!UUID_RE.test(id) || Number.isNaN(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 30;

export function clampLimit(limit?: number, opts?: { def?: number; max?: number }): number {
  const def = opts?.def ?? DEFAULT_PAGE_SIZE;
  const max = opts?.max ?? MAX_PAGE_SIZE;
  return Math.min(Math.max(limit ?? def, 1), max);
}
