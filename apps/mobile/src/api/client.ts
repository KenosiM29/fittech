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
    let percent = Number.isFinite(rawPercent)
      ? Math.min(100, Math.max(0, Math.round(rawPercent)))
      : 0;

    // If the server explicitly marks the gym as full but percent is missing/0,
    // present it as 100% to the UI.
    if ((item.isFull === true || item.is_full === true) && percent < 100) {
      percent = 100;
    }

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
    // Try to locate a time value in common fields. If none parse as a date,
    // synthesize a stable ISO time based on 'now' rounded to the next 30-minute
    // interval plus an offset by index. This ensures slots always have a
    // sensible time and a human-friendly label instead of 'slot-<gym>-<idx>'.
    const candidate = s.slotTime ?? s.time ?? s.slot_time ?? s.startTime ?? s.start_time ?? s.id ?? null;
    let parsedDate: Date | null = null;
    if (candidate != null) {
      const asStr = String(candidate);
      const d = new Date(asStr);
      if (!Number.isNaN(d.getTime())) parsedDate = d;
    }

    // If we couldn't parse a date from the server, create a fallback time.
    if (!parsedDate) {
      const now = new Date();
      // Round up to the next 30-minute mark
      const mins = now.getMinutes();
      const rounded = mins % 30 === 0 ? mins : mins + (30 - (mins % 30));
      const base = new Date(now);
      base.setMinutes(rounded, 0, 0);
      // Add idx*30 minutes so multiple synthesized slots are distinct and stable
      parsedDate = new Date(base.getTime() + idx * 30 * 60 * 1000);
    }

    const slotTime = parsedDate.toISOString();

    // Build a human-friendly label: prefer an explicit label, otherwise format the time
    let label = typeof s.label === "string" && s.label.trim() !== "" ? s.label : undefined;
    if (!label) {
      const hours = parsedDate.getHours();
      const minutes = parsedDate.getMinutes();
      const ampm = hours >= 12 ? "pm" : "am";
      const hour12 = ((hours + 11) % 12) + 1;
      label = minutes === 0 ? `${hour12}${ampm}` : `${hour12}:${String(minutes).padStart(2, "0")}${ampm}`;
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

  const rawPct = Number(raw.percentFull ?? 0);
  let pct = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, Math.round(rawPct))) : 0;
  if ((raw.isFull === true || raw.is_full === true) && pct < 100) pct = 100;

  return {
    gymId:        String(raw.gymId        ?? gymId),
    name:         String(raw.name         ?? "Fit Tech Sandton"),
    capacity:     Number(raw.capacity     ?? 0),
    currentCount: Number(raw.currentCount ?? 0),
    percentFull:  pct,
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