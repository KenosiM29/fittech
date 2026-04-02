// apps/api/src/__tests__/booking.service.test.ts
import { describe, it, expect } from "vitest";
import { bookSlot } from "../services/booking.service";

const SLOT = "2025-06-01T18:00:00Z";

describe("bookSlot", () => {
  it("returns GYM_NOT_FOUND for unknown gym", async () => {
    const result = await bookSlot("nonexistent", "user-1", SLOT);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("GYM_NOT_FOUND");
  });

  it("books a slot successfully", async () => {
    const result = await bookSlot("gym-001", "user-test-1", SLOT);
    expect(result.success).toBe(true);
  });

  it("prevents double-booking the same user in the same slot", async () => {
    await bookSlot("gym-001", "user-dupe", SLOT);
    const second = await bookSlot("gym-001", "user-dupe", SLOT);
    expect(second.success).toBe(false);
    if (!second.success) expect(second.reason).toBe("ALREADY_BOOKED");
  });
});