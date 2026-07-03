import { describe, it, expect } from "vitest";
import { toPhotoView, type PhotoRow } from "../types";

describe("toPhotoView", () => {
  it("never leaks storage_path (the internal private-bucket object path)", () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "worker_photo",
      status: "approved",
      storage_path: "user-uuid/secret-object.jpg",
      created_at: "2026-07-03T00:00:00.000Z",
      updated_at: "2026-07-03T00:00:00.000Z",
    } as PhotoRow;

    const view = toPhotoView(row);
    expect(view).not.toHaveProperty("storage_path");
    expect(view.id).toBe(row.id);
    expect(view.type).toBe("worker_photo");
    expect(view.status).toBe("approved");
  });
});
