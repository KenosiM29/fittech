// apps/mobile/src/api/client.ts

const BASE_URL = "http://192.168.1.45:3001"; // Change to your deployed URL

export interface GymCapacity {
  gymId: string;
  name: string;
  capacity: number;
  currentCount: number;
  percentFull: number;
}

export async function fetchCapacity(gymId: string): Promise<GymCapacity> {
  const res = await fetch(`${BASE_URL}/gyms/${gymId}/capacity`);
  if (!res.ok) throw new Error("Failed to fetch capacity");
  return res.json() as Promise<GymCapacity>;
}

export async function bookSlot(gymId: string, userId: string, slotTime: string) {
  const res = await fetch(`${BASE_URL}/gyms/${gymId}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, slotTime }),
  });
  if (!res.ok) {
    const body = await res.json() as { error: string };
    throw new Error(body.error ?? "Booking failed");
  }
  return res.json() as Promise<{ bookingId: string }>;
}