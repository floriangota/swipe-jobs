import { describe, it, expect } from "vitest";
import {
  categoryUpsertSchema,
  photoReviewSchema,
  reportResolveSchema,
  suspendSchema,
} from "../schemas";

describe("photoReviewSchema", () => {
  it("accepts approved/rejected only", () => {
    expect(photoReviewSchema.safeParse({ decision: "approved" }).success).toBe(true);
    expect(photoReviewSchema.safeParse({ decision: "rejected" }).success).toBe(true);
    expect(photoReviewSchema.safeParse({ decision: "pending" }).success).toBe(false);
    expect(photoReviewSchema.safeParse({ decision: "approved", x: 1 }).success).toBe(false);
  });
});

describe("reportResolveSchema", () => {
  it.each(["dismiss", "suspend_user", "remove_listing"] as const)("accepts %s", (action) => {
    expect(reportResolveSchema.safeParse({ action }).success).toBe(true);
  });
  it("rejects unknown actions and over-long notes", () => {
    expect(reportResolveSchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(reportResolveSchema.safeParse({ action: "dismiss", note: "x".repeat(501) }).success).toBe(false);
  });
});

describe("suspendSchema", () => {
  it("requires a non-empty reason", () => {
    expect(suspendSchema.safeParse({ reason: "spam bot" }).success).toBe(true);
    expect(suspendSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(suspendSchema.safeParse({}).success).toBe(false);
  });
});

describe("categoryUpsertSchema", () => {
  const valid = { slug: "barista", name_sq: "Barist", name_en: "Barista" };
  it("accepts a valid create (no id)", () => {
    expect(categoryUpsertSchema.safeParse(valid).success).toBe(true);
  });
  it("accepts an update (with id)", () => {
    expect(
      categoryUpsertSchema.safeParse({ ...valid, id: "11111111-1111-4111-8111-111111111111" }).success,
    ).toBe(true);
  });
  it("rejects a bad slug (uppercase/spaces)", () => {
    expect(categoryUpsertSchema.safeParse({ ...valid, slug: "Bar ista" }).success).toBe(false);
    expect(categoryUpsertSchema.safeParse({ ...valid, slug: "a" }).success).toBe(false);
  });
  it("requires both language names", () => {
    expect(categoryUpsertSchema.safeParse({ slug: "barista", name_en: "Barista" }).success).toBe(false);
  });
  it("rejects unknown fields", () => {
    expect(categoryUpsertSchema.safeParse({ ...valid, evil: true }).success).toBe(false);
  });
});
