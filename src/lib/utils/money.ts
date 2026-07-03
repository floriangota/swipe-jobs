// Money is stored as integer minor units (EUR cents) everywhere — never floats.
// These helpers convert only at the UI boundary (forms in, display out).

/**
 * Parse a euro amount (string or number) to integer cents. Accepts comma OR period
 * as the decimal separator (Kosovo/Albanian users type commas). Invalid, negative,
 * or sub-cent (>2 decimal places) input → null, so it's rejected rather than silently
 * rounded.
 */
export function eurosToCents(euros: string | number): number | null {
  const normalized = String(euros).replace(",", ".").trim();
  if (normalized === "") return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  if (/\.\d{3,}$/.test(normalized)) return null; // reject sub-cent precision
  return Math.round(n * 100);
}

/** Cents → euro number (e.g. to seed a form field). */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/** Format cents as EUR, hiding a trailing .00 (350 → "€3.50", 40000 → "€400"). */
export function formatEur(cents: number): string {
  const euros = cents / 100;
  const body = Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
  return `€${body}`;
}
