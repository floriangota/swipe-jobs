import { describe, it, expect } from "vitest";
import { createInMemoryLimiter } from "../rate-limit";

const BUDGET = { limit: 3, windowSec: 60 };

describe("in-memory rate limiter (fixed window)", () => {
  it("allows up to the limit, then blocks with a Retry-After", () => {
    const check = createInMemoryLimiter();
    const t0 = 1_000_000;
    expect(check("login:a", BUDGET, t0).ok).toBe(true);
    expect(check("login:a", BUDGET, t0).ok).toBe(true);
    expect(check("login:a", BUDGET, t0).ok).toBe(true);
    const blocked = check("login:a", BUDGET, t0);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("keys are isolated", () => {
    const check = createInMemoryLimiter();
    const t0 = 2_000_000;
    for (let i = 0; i < 3; i++) check("login:a", BUDGET, t0);
    expect(check("login:a", BUDGET, t0).ok).toBe(false); // a is exhausted
    expect(check("login:b", BUDGET, t0).ok).toBe(true); // b is fresh
  });

  it("resets after the window elapses", () => {
    const check = createInMemoryLimiter();
    const t0 = 3_000_000;
    for (let i = 0; i < 3; i++) check("swipe:u", BUDGET, t0);
    expect(check("swipe:u", BUDGET, t0).ok).toBe(false);
    const later = t0 + 61_000; // past the 60s window
    expect(check("swipe:u", BUDGET, later).ok).toBe(true);
  });
});
