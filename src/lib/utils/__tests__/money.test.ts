import { describe, it, expect } from "vitest";
import { centsToEuros, eurosToCents, formatEur } from "../money";

describe("eurosToCents", () => {
  it("parses whole and decimal euros to cents", () => {
    expect(eurosToCents("3.50")).toBe(350);
    expect(eurosToCents("400")).toBe(40000);
    expect(eurosToCents(4)).toBe(400);
  });

  it("accepts a comma decimal separator (Kosovo/Albanian input)", () => {
    expect(eurosToCents("3,50")).toBe(350);
  });

  it("rejects sub-cent precision instead of rounding it", () => {
    expect(eurosToCents("10.005")).toBeNull();
    expect(eurosToCents("3,505")).toBeNull();
  });

  it("rejects empty, non-numeric, and negative input", () => {
    expect(eurosToCents("")).toBeNull();
    expect(eurosToCents("abc")).toBeNull();
    expect(eurosToCents("-5")).toBeNull();
  });
});

describe("centsToEuros", () => {
  it("converts cents back to euros", () => {
    expect(centsToEuros(350)).toBe(3.5);
    expect(centsToEuros(40000)).toBe(400);
  });
});

describe("formatEur", () => {
  it("hides a trailing .00 but keeps real decimals", () => {
    expect(formatEur(350)).toBe("€3.50");
    expect(formatEur(40000)).toBe("€400");
  });
});
