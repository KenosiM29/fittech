import { useState, useEffect, useCallback } from "react";
import { fetchAllGyms, fetchSlots, bookSlot, GymSummary, TimeSlot } from "../api/client";
import { Platform } from "react-native";

let activeBookingGymId: string | null = null;

let AsyncStorage: any = null;
if (Platform.OS) {
  try {
    
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch (e) {
    AsyncStorage = null;
  }
}

const ACTIVE_BOOKING_KEY = "ft_active_booking_gym";

export function getActiveBookingGymId() {
  return activeBookingGymId;
}

async function loadActiveBookingFromStorage() {
  if (!AsyncStorage) return;
  try {
    const v = await AsyncStorage.getItem(ACTIVE_BOOKING_KEY);
    if (v) activeBookingGymId = v;
  } catch (e) {
  }
}

async function persistActiveBooking(gymId: string | null) {
  if (!AsyncStorage) {
    activeBookingGymId = gymId;
    return;
  }
  try {
    if (gymId) await AsyncStorage.setItem(ACTIVE_BOOKING_KEY, gymId);
    else await AsyncStorage.removeItem(ACTIVE_BOOKING_KEY);
    activeBookingGymId = gymId;
  } catch (e) {
    activeBookingGymId = gymId;
  }
}

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

  useEffect(() => { loadActiveBookingFromStorage(); }, []);

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
    setSelectedSlot(null);
    setBookingState("idle");
    setBookingError(null);
  }, [gymId]);

  const book = useCallback(async (gym: { isFull: boolean }) => {
    if (!gymId) return;
    if (gym.isFull) {
      setBookingState("error");
      setBookingError("Gym is full — cannot book a slot right now.");
      return;
    }

    if (activeBookingGymId && activeBookingGymId !== gymId) {
      setBookingState("error");
      setBookingError("You already have an active booking at another gym.");
      return;
    }
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
  // Persist that this gym now has an active booking
  await persistActiveBooking(gymId);
      setBookingState("success");
    } catch (e) {
      setBookingState("error");
      setBookingError(e instanceof Error ? e.message : "Booking failed");
    }
  }, [gymId, selectedSlot]);

  return { slots, slotsLoading, selectedSlot, setSelectedSlot, bookingState, bookingError, book };
}