// apps/mobile/src/screens/GymCapacityScreen.tsx
import React from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, SafeAreaView,
} from "react-native";
import { CapacityRing } from "../components/CapacityRing";
import { useGym } from "../hooks/useGym";

const GYM_ID = "gym-001";

export const GymCapacityScreen: React.FC = () => {
  const { capacity, capacityLoading, capacityError, bookingState, bookingError, book } =
    useGym(GYM_ID);

  if (capacityLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Checking gym capacity…</Text>
      </View>
    );
  }

  if (capacityError || !capacity) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load gym data.</Text>
        <Text style={styles.errorSub}>{capacityError}</Text>
      </View>
    );
  }

  const isBooked = bookingState === "success";
  const isBooking = bookingState === "loading";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Live Capacity</Text>
        <Text style={styles.gymName}>{capacity.name}</Text>

        <View style={styles.ringWrapper}>
          <CapacityRing percentFull={capacity.percentFull} size={180} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{capacity.currentCount}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{capacity.capacity}</Text>
            <Text style={styles.statLabel}>Capacity</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{capacity.capacity - capacity.currentCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.bookBtn, isBooked && styles.bookBtnSuccess, isBooking && styles.bookBtnDisabled]}
          onPress={book}
          disabled={isBooked || isBooking}
          activeOpacity={0.8}
        >
          {isBooking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>
              {isBooked ? "✓ Slot Booked!" : "Book a Slot"}
            </Text>
          )}
        </TouchableOpacity>

        {bookingState === "error" && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{bookingError ?? "Booking failed. Try again."}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { alignItems: "center", padding: 24, paddingTop: 48 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  heading: { fontSize: 13, fontWeight: "600", color: "#6b7280", letterSpacing: 1.2, textTransform: "uppercase" },
  gymName: { fontSize: 22, fontWeight: "700", color: "#111827", marginTop: 6, textAlign: "center" },
  ringWrapper: { marginVertical: 32 },
  statsRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "100%", justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: "#111827" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  divider: { width: 1, backgroundColor: "#e5e7eb" },
  bookBtn: { marginTop: 24, backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, width: "100%", alignItems: "center" },
  bookBtnSuccess: { backgroundColor: "#22c55e" },
  bookBtnDisabled: { opacity: 0.7 },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorBanner: { marginTop: 12, backgroundColor: "#fef2f2", borderRadius: 10, padding: 14, width: "100%" },
  errorBannerText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 15 },
  errorText: { fontSize: 18, fontWeight: "600", color: "#dc2626" },
  errorSub: { fontSize: 14, color: "#6b7280", marginTop: 6 },
});