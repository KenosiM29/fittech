// apps/api/src/db/mock-db.ts

export interface Gym {
  id: string;
  name: string;
  capacity: number;       // max slots per time window
  currentCount: number;   // current bookings
}

export interface Booking {
  id: string;
  gymId: string;
  userId: string;
  slotTime: string;       // ISO string e.g. "2025-06-01T18:00:00Z"
  createdAt: string;
}

// In-memory store — replace with DynamoDB/Postgres in production
const gyms = new Map<string, Gym>([
  ["gym-001", { id: "gym-001", name: "FitTech City Central", capacity: 50, currentCount: 22 }],
  ["gym-002", { id: "gym-002", name: "FitTech Sandton", capacity: 80, currentCount: 71 }],
]);

const bookings = new Map<string, Booking>();

export const db = {
  getGym: (id: string): Gym | undefined => gyms.get(id),

  getBookingsForSlot: (gymId: string, slotTime: string): Booking[] =>
    [...bookings.values()].filter(
      (b) => b.gymId === gymId && b.slotTime === slotTime
    ),

  createBooking: (booking: Booking): Booking => {
    bookings.set(booking.id, booking);
    const gym = gyms.get(booking.gymId);
    if (gym) gym.currentCount += 1;
    return booking;
  },
};