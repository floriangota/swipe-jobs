import { describe, it, expect } from "vitest";
import { toNotificationView, type NotificationRow } from "../types";

// GOLDEN RULE: notification payloads are built contact-free by the DB triggers
// (new_candidate = first name + last initial; match/message = post-match display
// name only). The mapper must never add contact fields, even from a polluted row.
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

describe("toNotificationView (golden rule)", () => {
  it("maps the row and preserves the contact-free payload", () => {
    const row: NotificationRow = {
      id: "n1",
      type: "new_candidate",
      payload: { listing_id: "l1", listing_title: "Barista", worker_name: "Arben S." },
      read_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
    };
    const view = toNotificationView(row);
    expect(view.type).toBe("new_candidate");
    expect(view.payload).toEqual(row.payload);
    expect(view.readAt).toBeNull();
  });

  it("never introduces top-level contact fields, even from a polluted row", () => {
    const polluted = {
      id: "n1",
      type: "new_match",
      payload: { match_id: "m1", counterpart_name: "Café Ballkoni" },
      read_at: null,
      created_at: "2026-07-08T00:00:00.000Z",
      last_name: "Statovci",
      phone: "+38344123456",
      email: "arben@example.com",
    } as unknown as NotificationRow;

    const view = toNotificationView(polluted);
    for (const key of FORBIDDEN) {
      expect(view).not.toHaveProperty(key);
    }
  });
});
