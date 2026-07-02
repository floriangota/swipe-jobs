import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema } from "../schemas";

describe("signupSchema", () => {
  it("accepts a valid worker signup and defaults locale to sq", () => {
    const result = signupSchema.safeParse({
      email: "a@b.com",
      password: "supersecret",
      role: "worker",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.locale).toBe("sq");
  });

  it("rejects role=admin (no self-assignment)", () => {
    const result = signupSchema.safeParse({
      email: "a@b.com",
      password: "supersecret",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short passwords", () => {
    const result = signupSchema.safeParse({
      email: "a@b.com",
      password: "short",
      role: "worker",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const result = signupSchema.safeParse({
      email: "a@b.com",
      password: "supersecret",
      role: "worker",
      isAdmin: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});
