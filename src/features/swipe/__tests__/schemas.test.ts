import { describe, it, expect } from "vitest";
import { swipeSchema } from "../schemas";

describe("swipeSchema", () => {
  it("accepts left and right", () => {
    expect(swipeSchema.safeParse({ direction: "left" }).success).toBe(true);
    expect(swipeSchema.safeParse({ direction: "right" }).success).toBe(true);
  });

  it("rejects an unknown direction", () => {
    expect(swipeSchema.safeParse({ direction: "up" }).success).toBe(false);
  });

  it("rejects a missing direction", () => {
    expect(swipeSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(swipeSchema.safeParse({ direction: "right", extra: 1 }).success).toBe(false);
  });
});
