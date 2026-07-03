import { describe, it, expect } from "vitest";
import en from "../../../messages/en.json";
import sq from "../../../messages/sq.json";

// Collect every dotted key path in a nested message object.
function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? keyPaths(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("message catalogs", () => {
  it("sq and en have identical key sets", () => {
    const enKeys = keyPaths(en).sort();
    const sqKeys = keyPaths(sq).sort();
    expect(sqKeys).toEqual(enKeys);
  });

  it("has no empty string values", () => {
    const values = (obj: Record<string, unknown>): string[] =>
      Object.values(obj).flatMap((v) =>
        v && typeof v === "object" ? values(v as Record<string, unknown>) : [String(v)],
      );
    expect(values(en).every((v) => v.trim().length > 0)).toBe(true);
    expect(values(sq).every((v) => v.trim().length > 0)).toBe(true);
  });
});
