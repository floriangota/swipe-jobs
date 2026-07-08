import { describe, it, expect } from "vitest";
import { GET } from "../route";

// Contact fields that must NEVER leak in a pre-match response (docs/security.md).
const CONTACT_FIELDS = ["last_name", "phone", "email"] as const;

describe("GET /api/health", () => {
  it("returns { status: 'ok' }", async () => {
    const res = GET();
    await expect(res.json()).resolves.toEqual({ status: "ok" });
  });

  it("does not leak contact fields", async () => {
    const body = (await GET().json()) as Record<string, unknown>;
    for (const field of CONTACT_FIELDS) {
      expect(body).not.toHaveProperty(field);
    }
  });
});

/**
 * GOLDEN-RULE RELEASE GATE (docs/security.md, api-contract.md).
 *
 * Required CI gate: contact fields (last_name, phone, email) must be ABSENT from
 * every pre-match response. There are no profile/feed/candidate/match endpoints
 * yet (they arrive M1+), so these assertions are staged as `todo` and MUST be
 * implemented alongside those endpoints. Do not remove.
 */
describe("golden rule: contact hidden until match", () => {
  it.todo("GET /worker/profile/:id omits last_name & phone when requester is not matched");
  it.todo("GET /feed cards never include last_name, phone, or email");
  it.todo("GET /listings/:id/candidates omits contact fields (pre-match)");
  // "GET /matches/:id reveals contact only to the two matched parties" — implemented
  // in M6: features/chat/__tests__/chat-views.test.ts (DTO gate) on top of the DB
  // gate (the match_detail SECURITY DEFINER function yields zero rows to non-parties).
});
