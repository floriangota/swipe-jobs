import { describe, it, expect } from "vitest";
import { markReadSchema } from "../schemas";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("markReadSchema", () => {
  it("accepts an empty object (mark all)", () => {
    const parsed = markReadSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.ids).toBeUndefined();
  });

  it("accepts an array of uuids", () => {
    expect(markReadSchema.safeParse({ ids: [UUID] }).success).toBe(true);
  });

  it("rejects non-uuid ids", () => {
    expect(markReadSchema.safeParse({ ids: ["not-a-uuid"] }).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(markReadSchema.safeParse({ ids: [UUID], all: true }).success).toBe(false);
  });
});
