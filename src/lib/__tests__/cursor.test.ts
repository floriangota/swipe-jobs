import { describe, it, expect } from "vitest";
import { clampLimit, decodeCursor, encodeCursor } from "../cursor";

describe("cursor", () => {
  it("round-trips a keyset (including timestamps with special chars)", () => {
    const k = {
      createdAt: "2026-07-03T12:34:56.789+00:00",
      id: "11111111-1111-4111-8111-111111111111",
    };
    expect(decodeCursor(encodeCursor(k))).toEqual(k);
  });

  it("returns null for a malformed cursor", () => {
    expect(decodeCursor("not-a-valid-cursor")).toBeNull();
  });

  it("returns null for a well-formed base64 cursor with a garbage payload", () => {
    // 'x|y' is valid base64url and splits into two non-empty parts, but neither is a
    // timestamp|uuid — must decode to null (→ first page), not slip through and 500
    // when Postgres tries to cast it.
    expect(decodeCursor(Buffer.from("x|y").toString("base64url"))).toBeNull();
    // valid timestamp but non-uuid id
    expect(
      decodeCursor(Buffer.from("2026-07-03T00:00:00.000Z|not-a-uuid").toString("base64url")),
    ).toBeNull();
    // valid uuid but non-timestamp
    expect(
      decodeCursor(Buffer.from("nope|11111111-1111-4111-8111-111111111111").toString("base64url")),
    ).toBeNull();
  });

  it("clamps the page limit to 1..30", () => {
    expect(clampLimit(undefined)).toBe(15);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(1000)).toBe(30);
    expect(clampLimit(10)).toBe(10);
  });

  it("supports per-consumer default/max (chat history pages larger)", () => {
    expect(clampLimit(undefined, { def: 30, max: 50 })).toBe(30);
    expect(clampLimit(1000, { def: 30, max: 50 })).toBe(50);
    expect(clampLimit(0, { def: 30, max: 50 })).toBe(1);
  });
});
