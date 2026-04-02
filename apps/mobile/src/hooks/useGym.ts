// apps/mobile/src/hooks/useGym.ts
import { useState, useEffect, useCallback } from "react";
import { fetchCapacity, bookSlot, GymCapacity } from "../api/client";

type BookingState = "idle" | "loading" | "success" | "error";

export function useGym(gymId: string) {
  const [capacity, setCapacity] = useState<GymCapacity | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(true);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapacity(gymId)
      .then(setCapacity)
      .catch((e: Error) => setCapacityError(e.message))
      .finally(() => setCapacityLoading(false));
  }, [gymId]);

  const book = useCallback(async () => {
    setBookingState("loading");
    setBookingError(null);
    try {
      const slotTime = new Date(Date.now() + 3600_000).toISOString(); // next hour
      await bookSlot(gymId, "user-demo-123", slotTime);
      setBookingState("success");
    } catch (e) {
      setBookingState("error");
      setBookingError(e instanceof Error ? e.message : "Unknown error");
    }
  }, [gymId]);

  return { capacity, capacityLoading, capacityError, bookingState, bookingError, book };
}