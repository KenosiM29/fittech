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

  // Normalize response: API may return an array, an object with a `gyms` array,
  // or a keyed object. Convert to an array safely before mapping.
  const items: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.gyms)
    ? raw.gyms
    : raw && typeof raw === "object"
    ? Object.values(raw)
    : [];

  if (!Array.isArray(items)) {
    // Fallback: return empty list and log for debugging
    console.warn("fetchAllGyms: unexpected response shape", raw);
    return [];
  }

  return items.map((item: any, idx: number) => {
    // Prefer explicit id fields, fall back to index-based stable id so React keys are never the string "undefined".
    const rawId = item.gymId ?? item.id ?? item.gym_id ?? `${String(item.name ?? 'gym')}-${idx}`;
    // Normalize percentFull: round and clamp to [0,100]
    const rawPercent = Number(item.percentFull ?? 0);
    const percent = Number.isFinite(rawPercent)
      ? Math.min(100, Math.max(0, Math.round(rawPercent)))
      : 0;

    return {
      gymId:        String(rawId),
      name:         String(item.name         ?? "Fit Tech Sandton"),
      address:      String(item.address      ?? ""),
      currentCount: Number(item.currentCount ?? 0),
      capacity:     Number(item.capacity     ?? 0),
      percentFull:  percent,
      isFull:       Boolean(item.isFull ?? percent >= 100),
    };
  });
}

export async function fetchSlots(gymId: string): Promise<TimeSlot[]> {
  const res = await fetch(`${BASE_URL}/gyms/${gymId}/slots`);
  if (!res.ok) throw new Error(`Failed to fetch slots (${res.status})`);

  const raw = await res.json();

  const items: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.slots)
    ? raw.slots
    : raw && typeof raw === "object"
    ? Object.values(raw)
    : [];

  return items.map((s: any, idx: number) => {
    // Ensure a stable, unique slotTime for use as a React key
    const rawTime = s.slotTime ?? s.time ?? s.slot_time ?? s.id ?? null;
    const slotTime = rawTime != null ? String(rawTime) : `slot-${gymId}-${idx}`;

    // Build a human-friendly label: prefer an explicit label, otherwise format the time
    let label = typeof s.label === "string" && s.label.trim() !== "" ? s.label : undefined;
    if (!label) {
      const parsed = new Date(slotTime);
      if (!Number.isNaN(parsed.getTime())) {
        // Format like '1pm', '2pm', or '1:30pm' if minutes are non-zero
        const hours = parsed.getHours();
        const minutes = parsed.getMinutes();
        const ampm = hours >= 12 ? "pm" : "am";
        const hour12 = ((hours + 11) % 12) + 1;
        label = minutes === 0 ? `${hour12}${ampm}` : `${hour12}:${String(minutes).padStart(2, "0")}${ampm}`;
      } else {
        label = slotTime;
      }
    }

    return {
      slotTime,
      label:     String(label),
      available: Boolean(s.available ?? s.isAvailable ?? true),
    } as TimeSlot;
  });
}

export async function fetchCapacity(gymId: string): Promise<GymCapacity> {
  const url = `${BASE_URL}/gyms/${gymId}/capacity`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const raw = await res.json();
  console.log("RAW API RESPONSE:", JSON.stringify(raw));

  return {
    gymId:        String(raw.gymId        ?? gymId),
  name:         String(raw.name         ?? "Fit Tech Sandton"),
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