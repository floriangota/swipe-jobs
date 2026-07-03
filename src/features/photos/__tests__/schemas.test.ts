import { describe, it, expect } from "vitest";
import { photoUploadSchema } from "../schemas";

describe("photoUploadSchema", () => {
  it("accepts worker_photo and employer_logo", () => {
    expect(photoUploadSchema.safeParse({ type: "worker_photo" }).success).toBe(true);
    expect(photoUploadSchema.safeParse({ type: "employer_logo" }).success).toBe(true);
  });

  it("rejects an unknown type", () => {
    expect(photoUploadSchema.safeParse({ type: "listing_photo" }).success).toBe(false);
  });

  it("rejects a missing type", () => {
    expect(photoUploadSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(photoUploadSchema.safeParse({ type: "worker_photo", extra: 1 }).success).toBe(false);
  });
});
