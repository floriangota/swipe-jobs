import { describe, it, expect } from "vitest";
import { toListingView, toListingCardView, type ListingRow } from "../types";

// GOLDEN RULE (security.md, api-contract §Conventions): last_name / phone / email
// must NEVER appear in a pre-match response. A listing is a pre-match, worker-visible
// (in M5) object, so its serialized shape must carry no contact fields — even if the
// DB row is adversarially polluted with them. This is a required release gate.
const FORBIDDEN = ["last_name", "lastName", "phone", "email", "contact_phone", "contactPhone", "contact_email", "contactEmail"];

const row: ListingRow = {
  id: "11111111-1111-1111-1111-111111111111",
  city_id: "22222222-2222-2222-2222-222222222222",
  category_id: "33333333-3333-3333-3333-333333333333",
  title: "Barista",
  description: "Make great coffee.",
  job_type: "part_time",
  required_experience: "none",
  pay_min: 350,
  pay_max: 400,
  pay_period: "hourly",
  status: "active",
  created_at: "2026-07-03T00:00:00.000Z",
  updated_at: "2026-07-03T00:00:00.000Z",
};

describe("toListingView (golden rule)", () => {
  it("maps the row to a camelCase view", () => {
    const view = toListingView(row);
    expect(view.id).toBe(row.id);
    expect(view.payMin).toBe(350);
    expect(view.payMax).toBe(400);
    expect(view.jobType).toBe("part_time");
    expect(view.status).toBe("active");
  });

  it("never emits contact fields, even from a polluted row", () => {
    const polluted = {
      ...row,
      last_name: "Krasniqi",
      phone: "+38344123456",
      email: "boss@example.com",
      contact_phone: "+38344123456",
      contact_email: "boss@example.com",
    } as ListingRow;

    const view = toListingView(polluted);
    for (const key of FORBIDDEN) {
      expect(view).not.toHaveProperty(key);
    }
  });
});

describe("toListingCardView (golden rule)", () => {
  it("carries only public, pre-match-safe fields", () => {
    const card = toListingCardView(toListingView(row), {
      businessName: "Café Ballkoni",
      cityName: "Ferizaj",
    });
    expect(card.businessName).toBe("Café Ballkoni");
    expect(card.cityName).toBe("Ferizaj");
    for (const key of FORBIDDEN) {
      expect(card).not.toHaveProperty(key);
    }
  });
});
