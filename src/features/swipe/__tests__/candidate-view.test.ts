import { describe, it, expect } from "vitest";
import { toCandidateCardView, toFeedCard, type CandidateRow, type FeedRow } from "../types";

// GOLDEN RULE (required release gate): last_name / phone / email (and employer
// contact_*) must NEVER appear in a pre-match response. The candidate stack and the
// feed are pre-match surfaces, so their DTOs must carry no contact fields — even from
// an adversarially polluted DB row.
const FORBIDDEN = [
  "last_name",
  "lastName",
  "phone",
  "email",
  "contact_phone",
  "contactPhone",
  "contact_email",
  "contactEmail",
];

describe("toCandidateCardView (golden rule)", () => {
  it("exposes only first name + last initial", () => {
    const row: CandidateRow = {
      swipe_id: "s1",
      swipe_created_at: "2026-07-03T00:00:00.000Z",
      worker_profile_id: "w1",
      first_name: "Arben",
      last_initial: "S",
      experience_level: "1_3y",
    };
    const view = toCandidateCardView(row);
    expect(view.firstName).toBe("Arben");
    expect(view.lastInitial).toBe("S");
    expect(view.experienceLevel).toBe("1_3y");
  });

  it("never emits contact fields, even from a polluted row", () => {
    const polluted = {
      swipe_id: "s1",
      swipe_created_at: "2026-07-03T00:00:00.000Z",
      worker_profile_id: "w1",
      first_name: "Arben",
      last_initial: "S",
      experience_level: "none",
      last_name: "Statovci",
      phone: "+38344123456",
      email: "arben@example.com",
    } as unknown as CandidateRow;

    const view = toCandidateCardView(polluted);
    for (const key of FORBIDDEN) {
      expect(view).not.toHaveProperty(key);
    }
  });
});

describe("toFeedCard (golden rule)", () => {
  it("carries no employer contact fields", () => {
    const polluted = {
      id: "l1",
      city_id: "c1",
      category_id: "cat1",
      title: "Barista",
      description: null,
      job_type: "part_time",
      required_experience: "none",
      pay_min: 350,
      pay_max: 400,
      pay_period: "hourly",
      status: "active",
      created_at: "2026-07-03T00:00:00.000Z",
      updated_at: "2026-07-03T00:00:00.000Z",
      business_name: "Café Ballkoni",
      city_name: "Ferizaj",
      contact_phone: "+38344000000",
      contact_email: "boss@example.com",
    } as unknown as FeedRow;

    const card = toFeedCard(polluted);
    expect(card.businessName).toBe("Café Ballkoni");
    expect(card.cityName).toBe("Ferizaj");
    for (const key of FORBIDDEN) {
      expect(card).not.toHaveProperty(key);
    }
  });
});
