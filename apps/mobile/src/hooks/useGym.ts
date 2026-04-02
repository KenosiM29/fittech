// apps/mobile/src/hooks/useGym.ts
import { useState, useEffect, useCallback } from "react";
import { fetchAllGyms, fetchSlots, bookSlot, GymSummary, TimeSlot } from "../api/client";

type BookingState = "idle" | "loading" | "success" | "error";

export function useGyms() {
  const [gyms, setGyms] = useState<GymSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAllGyms()
      .then(setGyms)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { gyms, loading, error, reload: load };
}

export function useGymDetail(gymId: string | null) {
  const [slots, setSlots]               = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId) return;
    setSlotsLoading(true);
    fetchSlots(gymId)
      .then(setSlots)
      .catch(console.error)
      .finally(() => setSlotsLoading(false));
    // reset state when gym changes
    setSelectedSlot(null);
    setBookingState("idle");
    setBookingError(null);
  }, [gymId]);

  const book = useCallback(async (gym: { isFull: boolean }) => {
    if (!gymId) return;
    // if full, book next available slot automatically
    const slotTime = gym.isFull
      ? new Date(Date.now() + 3600_000).toISOString()
      : selectedSlot;

    if (!slotTime) {
      setBookingError("Please select a time slot first.");
      return;
    }

    setBookingState("loading");
    setBookingError(null);
    try {
      await bookSlot(gymId, "user-demo-123", slotTime);
      setBookingState("success");
    } catch (e) {
      setBookingState("error");
      setBookingError(e instanceof Error ? e.message : "Booking failed");
    }
  }, [gymId, selectedSlot]);

  return { slots, slotsLoading, selectedSlot, setSelectedSlot, bookingState, bookingError, book };
}