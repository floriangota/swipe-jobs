import { describe, it, expect } from "vitest";
import { clampLimit, decodeCursor, encodeCursor } from "../cursor";

describe("cursor", () => {
  it("round-trips a keyset (including timestamps with special chars)", () => {
    const k = { createdAt: "2026-07-03T12:34:56.789+00:00", id: "abc-123-def" };
    expect(decodeCursor(encodeCursor(k))).toEqual(k);
  });

  it("returns null for a malformed cursor", () => {
    expect(decodeCursor("not-a-valid-cursor")).toBeNull();
  });

  it("clamps the page limit to 1..30", () => {
    expect(clampLimit(undefined)).toBe(15);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(1000)).toBe(30);
    expect(clampLimit(10)).toBe(10);
  });
});
