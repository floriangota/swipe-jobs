import { describe, it, expect } from "vitest";
import { listingSchema, listingStatusUpdateSchema } from "../schemas";

const valid = {
  category_id: "11111111-1111-4111-8111-111111111111",
  title: "Barista",
  description: "Make great coffee.",
  job_type: "part_time",
  required_experience: "none",
  pay_min: 350, // €3.50 in cents
  pay_max: 400,
  pay_period: "hourly",
} as const;

describe("listingSchema", () => {
  it("accepts a valid listing", () => {
    expect(listingSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an exact rate (pay_max omitted)", () => {
    const { pay_max, ...rest } = valid;
    void pay_max;
    expect(listingSchema.safeParse(rest).success).toBe(true);
  });

  it("coerces an empty-string pay_max to undefined (exact rate)", () => {
    const result = listingSchema.safeParse({ ...valid, pay_max: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pay_max).toBeUndefined();
  });

  it("rejects pay_min of 0 (must be > 0)", () => {
    expect(listingSchema.safeParse({ ...valid, pay_min: 0 }).success).toBe(false);
  });

  it("rejects a negative pay_min", () => {
    expect(listingSchema.safeParse({ ...valid, pay_min: -100 }).success).toBe(false);
  });

  it("rejects pay_max < pay_min", () => {
    expect(listingSchema.safeParse({ ...valid, pay_min: 500, pay_max: 400 }).success).toBe(false);
  });

  it("rejects a missing pay_min", () => {
    const { pay_min, ...rest } = valid;
    void pay_min;
    expect(listingSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-integer pay_min (cents must be whole)", () => {
    expect(listingSchema.safeParse({ ...valid, pay_min: 3.5 }).success).toBe(false);
  });

  it("rejects an unknown field (strict)", () => {
    expect(listingSchema.safeParse({ ...valid, is_featured: true }).success).toBe(false);
  });

  it("rejects an invalid job_type enum", () => {
    expect(listingSchema.safeParse({ ...valid, job_type: "internship" }).success).toBe(false);
  });

  it("rejects an invalid required_experience enum", () => {
    expect(listingSchema.safeParse({ ...valid, required_experience: "senior" }).success).toBe(false);
  });

  it("rejects a non-uuid category_id", () => {
    expect(listingSchema.safeParse({ ...valid, category_id: "barista" }).success).toBe(false);
  });

  it("rejects a title over 80 chars", () => {
    expect(listingSchema.safeParse({ ...valid, title: "x".repeat(81) }).success).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(listingSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });
});

describe("listingStatusUpdateSchema", () => {
  it("accepts active / paused / closed", () => {
    for (const status of ["active", "paused", "closed"] as const) {
      expect(listingStatusUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects an unknown status (no draft state)", () => {
    expect(listingStatusUpdateSchema.safeParse({ status: "draft" }).success).toBe(false);
  });
});
