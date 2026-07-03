// Deterministic gradient palette for avatar/card fallbacks when no photo exists
// (worker photo / employer logo are optional; a gradient stands in until then).
// Warm-forward (brand) with a couple of cool blues for variety, so a feed of
// cards doesn't repeat the same fill.

export const cardGradients = [
  "linear-gradient(160deg, oklch(0.63 0.23 8), oklch(0.74 0.17 46))", // coral → amber
  "linear-gradient(160deg, oklch(0.6 0.22 355), oklch(0.69 0.2 22))", // pink → coral
  "linear-gradient(160deg, oklch(0.72 0.16 58), oklch(0.63 0.21 20))", // amber → coral
  "linear-gradient(160deg, oklch(0.62 0.2 12), oklch(0.66 0.16 300))", // coral → violet
  "linear-gradient(160deg, oklch(0.58 0.18 320), oklch(0.68 0.19 18))", // magenta → coral
  "linear-gradient(160deg, oklch(0.55 0.16 250), oklch(0.62 0.13 205))", // blue → teal
  "linear-gradient(160deg, oklch(0.52 0.2 264), oklch(0.6 0.16 300))", // indigo → violet
] as const;

// Small stable string hash (FNV-ish) → index. Same seed always maps to the same
// gradient, so an entity keeps its color across renders.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function gradientFor(seed: string): string {
  return cardGradients[hashSeed(seed) % cardGradients.length]!;
}
