// apps/api/src/services/booking.service.ts
import { db } from "../db/mock-db";
import crypto from "crypto";

// A simple in-process mutex per gymId+slotTime.
// In production: replace with Redis SETNX or a DB row-level lock.
const locks = new Set<string>();

export type BookingResult =
  | { success: true; bookingId: string }
  | { success: false; reason: "GYM_NOT_FOUND" | "SLOT_FULL" | "ALREADY_BOOKED" | "LOCK_CONTENTION" };

export async function bookSlot(
  gymId: string,
  userId: string,
  slotTime: string
): Promise<BookingResult> {
  const gym = db.getGym(gymId);
  if (!gym) return { success: false, reason: "GYM_NOT_FOUND" };

  const lockKey = `${gymId}:${slotTime}`;

  // Reject immediately if another request holds the lock
  if (locks.has(lockKey)) {
    return { success: false, reason: "LOCK_CONTENTION" };
  }

  locks.add(lockKey);

  try {
    const existingBookings = db.getBookingsForSlot(gymId, slotTime);

    // Prevent double-booking for same user
    const alreadyBooked = existingBookings.some((b) => b.userId === userId);
    if (alreadyBooked) return { success: false, reason: "ALREADY_BOOKED" };

    // Check capacity
    if (existingBookings.length >= gym.capacity) {
      return { success: false, reason: "SLOT_FULL" };
    }

    const booking = db.createBooking({
      id: crypto.randomUUID(),
      gymId,
      userId,
      slotTime,
      createdAt: new Date().toISOString(),
    });

    return { success: true, bookingId: booking.id };
  } finally {
    locks.delete(lockKey); // Always release the lock
  }
}