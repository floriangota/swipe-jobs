import { describe, it, expect } from "vitest";
import { matchStatusUpdateSchema, messageSchema, MESSAGE_MAX_LENGTH } from "../schemas";

describe("messageSchema", () => {
  it("accepts a normal body and trims it", () => {
    const parsed = messageSchema.safeParse({ body: "  Hello there  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.body).toBe("Hello there");
  });

  it("rejects an empty body", () => {
    expect(messageSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only body", () => {
    expect(messageSchema.safeParse({ body: "   \n\t  " }).success).toBe(false);
  });

  it("rejects a missing or non-string body", () => {
    expect(messageSchema.safeParse({}).success).toBe(false);
    expect(messageSchema.safeParse({ body: 42 }).success).toBe(false);
    expect(messageSchema.safeParse(null).success).toBe(false);
  });

  it(`rejects a body over ${MESSAGE_MAX_LENGTH} characters`, () => {
    expect(messageSchema.safeParse({ body: "x".repeat(MESSAGE_MAX_LENGTH) }).success).toBe(true);
    expect(messageSchema.safeParse({ body: "x".repeat(MESSAGE_MAX_LENGTH + 1) }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(messageSchema.safeParse({ body: "hi", admin: true }).success).toBe(false);
  });
});

describe("matchStatusUpdateSchema", () => {
  it.each(["closed_by_worker", "closed_by_employer", "hired"] as const)(
    "accepts %s",
    (status) => {
      expect(matchStatusUpdateSchema.safeParse({ status }).success).toBe(true);
    },
  );

  it("rejects 'active' (closed/hired are terminal — no reopen in MVP)", () => {
    expect(matchStatusUpdateSchema.safeParse({ status: "active" }).success).toBe(false);
  });

  it("rejects unknown statuses and unknown fields", () => {
    expect(matchStatusUpdateSchema.safeParse({ status: "deleted" }).success).toBe(false);
    expect(
      matchStatusUpdateSchema.safeParse({ status: "hired", force: true }).success,
    ).toBe(false);
  });
});
