import { describe, it, expect } from "vitest";
import { reportSchema } from "../schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

describe("reportSchema", () => {
  it("accepts exactly one target + a valid reason", () => {
    expect(reportSchema.safeParse({ reported_message_id: UUID, reason: "harassment" }).success).toBe(true);
    expect(reportSchema.safeParse({ reported_listing_id: UUID, reason: "spam" }).success).toBe(true);
    expect(reportSchema.safeParse({ reported_user_id: UUID, reason: "fake" }).success).toBe(true);
  });

  it("rejects zero targets", () => {
    expect(reportSchema.safeParse({ reason: "other" }).success).toBe(false);
  });

  it("rejects more than one target", () => {
    expect(
      reportSchema.safeParse({ reported_user_id: UUID, reported_listing_id: UUID2, reason: "spam" }).success,
    ).toBe(false);
  });

  it("rejects an unknown reason and unknown fields", () => {
    expect(reportSchema.safeParse({ reported_user_id: UUID, reason: "nonsense" }).success).toBe(false);
    expect(reportSchema.safeParse({ reported_user_id: UUID, reason: "spam", extra: 1 }).success).toBe(false);
  });

  it("caps details length", () => {
    expect(
      reportSchema.safeParse({ reported_user_id: UUID, reason: "other", details: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});
