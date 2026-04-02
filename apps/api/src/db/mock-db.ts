// apps/api/src/db/mock-db.ts

export interface Gym {
  id: string;
  name: string;
  location: string;
  address: string;
  capacity: number;
  currentCount: number;
  coordinates: { lat: number; lng: number };
}

export interface Booking {
  id: string;
  gymId: string;
  userId: string;
  slotTime: string;
  createdAt: string;
}

const gyms = new Map<string, Gym>([
  ["gym-001", {
    id: "gym-001",
    name: "FitTech Sandton",
    location: "Sandton",
    address: "Sandton City Mall, Johannesburg, 2196",
    capacity: 50,
    currentCount: 48,
    coordinates: { lat: -26.1076, lng: 28.0567 },
  }],
  ["gym-002", {
    id: "gym-002",
    name: "FitTech Rosebank",
    location: "Rosebank",
    address: "The Zone, Oxford Rd, Rosebank, 2196",
    capacity: 60,
    currentCount: 20,
    coordinates: { lat: -26.1452, lng: 28.0436 },
  }],
  ["gym-003", {
    id: "gym-003",
    name: "FitTech Fourways",
    location: "Fourways",
    address: "Fourways Mall, Johannesburg, 2055",
    capacity: 80,
    currentCount: 80,
    coordinates: { lat: -26.0168, lng: 28.0106 },
  }],
  ["gym-004", {
    id: "gym-004",
    name: "FitTech Maboneng",
    location: "Maboneng",
    address: "Arts on Main, Maboneng, Johannesburg, 2094",
    capacity: 40,
    currentCount: 10,
    coordinates: { lat: -26.2041, lng: 28.0473 },
  }],
  ["gym-005", {
    id: "gym-005",
    name: "FitTech Soweto",
    location: "Soweto",
    address: "Maponya Mall, Klipspruit Valley Rd, Soweto, 1811",
    capacity: 70,
    currentCount: 55,
    coordinates: { lat: -26.2677, lng: 27.8742 },
  }],
]);

const bookings = new Map<string, Booking>();

export const db = {
  getAllGyms: (): Gym[] => [...gyms.values()],
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