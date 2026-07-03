// Keyset cursor over (created_at, id), opaque base64url. Used by the feed and the
// candidate stack — both anti-join out already-swiped rows, so keyset (not offset)
// keeps pages stable as the deck is swiped down.

export interface Keyset {
  createdAt: string;
  id: string;
}

export function encodeCursor(k: Keyset): string {
  return Buffer.from(`${k.createdAt}|${k.id}`).toString("base64url");
}

export function decodeCursor(cursor: string): Keyset | null {
  try {
    const [createdAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 30;

export function clampLimit(limit?: number): number {
  return Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
}
