const BASE_URL = "http://192.168.18.28:8081"; 

export interface GymCapacity {
  gymId:        string;
  name:         string;
  capacity:     number;
  currentCount: number;
  percentFull:  number;
}

export interface GymSummary {
  gymId:        string;
  name:         string;
  address:      string;
  currentCount: number;
  capacity:     number;
  percentFull:  number;
  isFull:       boolean;
}

export interface TimeSlot {
  slotTime:  string;
  label:     string;
  available: boolean;
}

export async function fetchAllGyms(): Promise<GymSummary[]> {
  const res = await fetch(`${BASE_URL}/gyms`);
  if (!res.ok) throw new Error(`Failed to fetch gyms (${res.status})`);

  const raw = await res.json();

  return raw.map((item: any) => ({
    gymId:        String(item.gymId),
    name:         String(item.name         ?? "Unknown Gym"),
    address:      String(item.address      ?? ""),
    currentCount: Number(item.currentCount ?? 0),
    capacity:     Number(item.capacity     ?? 0),
    percentFull:  Number(item.percentFull  ?? 0),
    isFull:       Boolean(item.isFull      ?? item.percentFull >= 100),
  }));
}

export async function fetchSlots(gymId: string): Promise<TimeSlot[]> {
  const res = await fetch(`${BASE_URL}/gyms/${gymId}/slots`);
  if (!res.ok) throw new Error(`Failed to fetch slots (${res.status})`);
  return res.json();
}

export async function fetchCapacity(gymId: string): Promise<GymCapacity> {
  const url = `${BASE_URL}/gyms/${gymId}/capacity`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const raw = await res.json();
  console.log("RAW API RESPONSE:", JSON.stringify(raw));

  return {
    gymId:        String(raw.gymId        ?? gymId),
    name:         String(raw.name         ?? "Unknown Gym"),
    capacity:     Number(raw.capacity     ?? 0),
    currentCount: Number(raw.currentCount ?? 0),
    percentFull:  Number(raw.percentFull  ?? 0),
  };
}

export async function bookSlot(
  gymId:    string,
  userId:   string,
  slotTime: string
): Promise<{ bookingId: string }> {
  const res = await fetch(`${BASE_URL}/gyms/${gymId}/book`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ userId, slotTime }),
  });

  const body = await res.json() as { error?: string; bookingId?: string };

  if (!res.ok) {
    throw new Error(body.error ?? "Booking failed");
  }

  return { bookingId: body.bookingId! };
}