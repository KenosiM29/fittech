import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  ScrollView, StatusBar, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { getActiveBookingGymId } from "../hooks/useGym";
import Svg, { Circle } from "react-native-svg";
import { useGyms, useGymDetail } from "../hooks/useGym";
import { GymSummary, TimeSlot, fetchCapacity, GymCapacity } from "../api/client";

const C = {
  bg:          "#111827", 
  surface:     "#0B1220",
  card:        "#0F1724",
  border:      "#1F2937",
  orange:      "#D97706",
  green:       "#16A34A",
  red:         "#DC2626",
  amber:       "#B45309",
  blue:        "#2563EB",
  textPrimary: "#E6EEF6",
  textSec:     "#9AA8B8",
  textMuted:   "#6B7280",
};

function getCapacityColor(pct: number) {
  if (pct < 50) return C.green;
  if (pct < 80) return C.amber;
  return C.red;
}

function getStatus(pct: number, isFull: boolean) {
  if (isFull)   return { label: "Full",     color: C.red   };
  if (pct < 50) return { label: "Quiet",    color: C.green };
  if (pct < 80) return { label: "Moderate", color: C.amber };
  return              { label: "Busy",      color: C.red   };
}

const MiniRing: React.FC<{ pct: number; size?: number }> = ({ pct, size = 52 }) => {
  const sw    = 5;
  const r     = (size - sw) / 2;
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  const circ  = 2 * Math.PI * r;
  const dash  = (clamped >= 100 ? circ : (clamped / 100) * circ);
  const color = getCapacityColor(clamped);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={C.border} strokeWidth={sw} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={`${dash} ${clamped >= 100 ? 0 : circ}`} strokeLinecap="round"
          rotation="-90" origin={`${size/2},${size/2}`} />
      </Svg>
      <Text style={{ fontSize: size > 60 ? 16 : 11, fontWeight: "700", color }}>{clamped}%</Text>
    </View>
  );
};

const StatusPill: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <View style={[styles.statusPill, { backgroundColor: color + "20", borderColor: color + "50" }]}>
    <View style={[styles.statusDot, { backgroundColor: color }]} />
    <Text style={[styles.statusTxt, { color }]}>{label}</Text>
  </View>
);

const GymCard: React.FC<{ gym: GymSummary; onPress: () => void }> = ({ gym, onPress }) => {
  const pct = Number(gym.percentFull ?? 0);
  const status    = getStatus(pct, Boolean(gym.isFull));
  const available = Number(gym.capacity ?? 0) - Number(gym.currentCount ?? 0);
  return (
  <TouchableOpacity style={styles.gymCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.gymCardLeft}>
        <View style={styles.gymCardHeader}>
          <Text style={styles.gymCardName} numberOfLines={1}>{gym.name}</Text>
          <StatusPill label={status.label} color={status.color} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="location-outline" size={14} color={C.textSec} style={{ marginRight: 6 }} />
          <Text style={styles.gymCardAddress} numberOfLines={1}>{gym.address}</Text>
        </View>
        <View style={styles.gymCardStats}>
          <Text style={styles.gymCardStat}>
            <Text style={{ color: C.textPrimary, fontWeight: "600" }}>{gym.currentCount}</Text>
            <Text style={{ color: C.textSec }}>/{gym.capacity} people</Text>
          </Text>
          <Text style={{ marginLeft: 12, fontSize: 13, fontWeight: "600",
            color: available > 0 ? C.green : C.red }}>
            {available > 0 ? `${available} spots left` : "No spots"}
          </Text>
        </View>
      </View>
  <MiniRing pct={Number(gym.percentFull ?? 0)} />
    </TouchableOpacity>
  );
};

const SlotPicker: React.FC<{
  slots: TimeSlot[];
  selected: string | null;
  onSelect: (s: string) => void;
}> = ({ slots, selected, onSelect }) => (
  <View style={styles.slotGrid}>
    {slots.length === 0 && (
      <Text style={{ color: C.textSec, fontSize: 14 }}>No slots available today.</Text>
    )}
    {slots.map((slot) => {
      const isSelected = selected === slot.slotTime;
      return (
        <TouchableOpacity
          key={slot.slotTime}
          style={[
            styles.slotChip,
            !slot.available && styles.slotChipFull,
            isSelected       && styles.slotChipSelected,
          ]}
          onPress={() => slot.available && onSelect(slot.slotTime)}
          disabled={!slot.available}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.slotChipTxt,
            !slot.available && { color: C.textMuted },
            isSelected       && { color: "#fff" },
          ]}>
            {slot.label}
          </Text>
          {!slot.available && (
            <Text style={styles.slotFullTxt}>Full</Text>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const GymDetailModal: React.FC<{
  gym: GymSummary;
  visible: boolean;
  onClose: () => void;
}> = ({ gym, visible, onClose }) => {
  const {
    slots, slotsLoading, selectedSlot, setSelectedSlot,
    bookingState, bookingError, book,
  } = useGymDetail(gym.gymId);

  const isBooked  = bookingState === "success";
  const isBooking = bookingState === "loading";
  const activeBookingId = getActiveBookingGymId();
  const status    = getStatus(Number(gym.percentFull ?? 0), Boolean(gym.isFull));
  const available = Math.max(0, gym.capacity - gym.currentCount);

  const getBtnLabel = () => {
  if (isBooked)  return "✓ Booking Confirmed";
  if (isBooking) return "Booking…";
  if (gym.isFull) return "Gym is full";
  if (!selectedSlot) return "Select a time slot above";
  const match = slots.find((s) => s.slotTime === selectedSlot);
  return `Book slot at ${match?.label ?? ""}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
        >
         
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

        
          <Text style={styles.modalName}>{gym.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="location-outline" size={14} color={C.textSec} style={{ marginRight: 6 }} />
            <Text style={styles.modalAddress} numberOfLines={1}>{gym.address}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsBox}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{gym.currentCount}</Text>
              <Text style={styles.statLbl}>Inside now</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{gym.capacity}</Text>
              <Text style={styles.statLbl}>Capacity</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: available > 0 ? C.green : C.red }]}>
                {available}
              </Text>
              <Text style={styles.statLbl}>Available</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MiniRing pct={Number(gym.percentFull ?? 0)} size={52} />
              <Text style={styles.statLbl}>{`${Math.min(100, Math.max(0, Math.round(Number(gym.percentFull ?? 0))))}% full`}</Text>
            </View>
          </View>

          <View style={{ marginTop: 16, marginBottom: 20 }}>
            <StatusPill label={status.label} color={status.color} />
          </View>

          <View style={styles.divider} />

          {gym.isFull ? (
            <>
              <View style={styles.fullBanner}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="close-circle" size={18} color="#F87171" style={{ marginRight: 8 }} />
                  <Text style={styles.fullBannerTitle}>Gym is currently full</Text>
                </View>
                <Text style={styles.fullBannerSub}>
                  You can reserve the next available slot — you'll be guaranteed entry when
                  a spot opens up.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  isBooked  && { backgroundColor: C.green, borderColor: C.green },
                  isBooking && { opacity: 0.7 },
                  activeBookingId && activeBookingId !== gym.gymId && { backgroundColor: "#2A3740", borderColor: C.border, opacity: 0.9 },
                ]}
                onPress={() => { /* disabled when full */ }}
                disabled={true}
                activeOpacity={0.85}
              >
                {isBooking
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.bookBtnTxt}>{activeBookingId && activeBookingId !== gym.gymId ? "Booking locked to another gym" : getBtnLabel()}</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Pick a time slot</Text>
              <Text style={styles.sectionSub}>
                Select when you want to work out today
              </Text>

              {slotsLoading
                ? <ActivityIndicator color={C.orange} style={{ marginVertical: 24 }} />
                : <SlotPicker slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} />
              }

              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  (!selectedSlot || isBooking) && { backgroundColor: "#1C2637", borderColor: C.border },
                  isBooked && { backgroundColor: C.green, borderColor: C.green },
                ]}
                onPress={() => book(gym)}
                disabled={!selectedSlot || isBooked || isBooking || (Boolean(activeBookingId) && activeBookingId !== gym.gymId)}
                activeOpacity={0.85}
              >
                {isBooking
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[
                      styles.bookBtnTxt,
                      !selectedSlot && !isBooked && { color: C.textSec },
                    ]}>
                      {activeBookingId && activeBookingId !== gym.gymId ? "Booking locked to another gym" : getBtnLabel()}
                    </Text>
                }
              </TouchableOpacity>
            </>
          )}

          {bookingState === "error" && (
            <View style={styles.errBanner}>
              <Text style={styles.errBannerTxt}>
                {bookingError ?? "Booking failed — please try again."}
              </Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export const GymCapacityScreen: React.FC = () => {
  const { gyms, loading, error, reload } = useGyms();
  const [selectedGym, setSelectedGym]   = useState<GymSummary | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!gyms || gyms.length === 0) {
     
      setSelectedGym({
        gymId: "fittech-sandton",
        name: "Fit Tech Sandton",
        address: "Sandton, Johannesburg",
        currentCount: 100,
        capacity: 100,
        percentFull: 100,
        isFull: true,
      });
      return;
    }

    const found = gyms.find((g) => String(g.name).toLowerCase().includes("sandton") || g.name === "Fit Tech Sandton");
    const base = found ?? gyms[0];
    if (base) {
      const normalizedPct = Number.isFinite(Number(base.percentFull)) ? Math.min(100, Math.max(0, Math.round(Number(base.percentFull)))) : 0;
      const adjusted = {
        ...base,
        percentFull: base.isFull ? 100 : normalizedPct,
      } as GymSummary;
      setSelectedGym(adjusted);
    }
  }, [loading, gyms]);

  const {
    slots, slotsLoading, selectedSlot, setSelectedSlot,
    bookingState, bookingError, book,
  } = useGymDetail(selectedGym?.gymId ?? null);

  // Keep an authoritative detail object fetched from the capacity endpoint so UI shows accurate numbers
  const [detailGym, setDetailGym] = useState<GymSummary | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!selectedGym) {
      setDetailGym(null);
      return;
    }
    fetchCapacity(selectedGym.gymId)
      .then((cap: GymCapacity) => {
        if (!mounted) return;
        setDetailGym({
          gymId: cap.gymId,
          name: cap.name,
          address: selectedGym.address ?? "",
          currentCount: cap.currentCount,
          capacity: cap.capacity,
          percentFull: cap.percentFull,
          isFull: cap.percentFull >= 100,
        });
      })
      .catch(() => {
        if (mounted) setDetailGym(selectedGym);
      });
    return () => { mounted = false; };
  }, [selectedGym]);

  const displayGym = detailGym ?? selectedGym;
  const displayPct = displayGym
    ? (displayGym.isFull ? 100 : Math.min(100, Math.max(0, Math.round(Number(displayGym.percentFull ?? 0)))))
    : 0;
  const displayIsFull = Boolean(displayGym?.isFull) || displayPct >= 100;

  // Debug: surface the authoritative values to Metro/Expo logs so we can verify
  // the running bundle is using the edited code.
  // Remove or gate this in production.
  // eslint-disable-next-line no-console
  console.log("[FT DEBUG] displayPct=", displayPct, "displayIsFull=", displayIsFull, "detailGym=", displayGym?.gymId ?? displayGym);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={styles.loadingTxt}>Loading gyms near you…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.centered}>
          <Text style={styles.errTitle}>Could not load gyms</Text>
          <Text style={styles.errSub}>{error}</Text>
          <TouchableOpacity
            style={[styles.bookBtn, { marginTop: 24, paddingHorizontal: 32 }]}
            onPress={reload}
          >
            <Text style={styles.bookBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
  <View style={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Johannesburg</Text>
            <Text style={styles.headerTitle}>FitTech Gyms</Text>
          </View>
          <View style={styles.liveWrap}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTxt}>LIVE</Text>
            </View>
            {getActiveBookingGymId() && (
              <View style={styles.bookingLock}>
                <Text style={styles.bookingLockTxt}>Booking locked to a gym</Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryPill, { borderColor: C.green + "50", backgroundColor: C.green + "15" }]}>
            <Text style={[styles.summaryVal, { color: C.green }]}>{displayGym && !displayGym.isFull ? 1 : 0}</Text>
            <Text style={[styles.summaryLbl, { color: C.green }]}>Open</Text>
          </View>
          <View style={[styles.summaryPill, { borderColor: C.red + "50", backgroundColor: C.red + "15" }]}>
            <Text style={[styles.summaryVal, { color: C.red }]}>{displayGym && displayGym.isFull ? 1 : 0}</Text>
            <Text style={[styles.summaryLbl, { color: C.red }]}>Full</Text>
          </View>
          <View style={[styles.summaryPill, { borderColor: C.blue + "50", backgroundColor: C.blue + "15" }]}>
            <Text style={[styles.summaryVal, { color: C.blue }]}>{displayGym ? 1 : 0}</Text>
            <Text style={[styles.summaryLbl, { color: C.blue }]}>Total</Text>
          </View>
        </View>

    {displayGym && (
          <>
            <Text style={styles.sectionHeader}>FitTech Sandton</Text>

      <GymCard gym={displayGym} onPress={() => {}} />

            
            <View style={{ marginTop: 12 }}>
              <View style={styles.statsBox}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{displayGym.currentCount}</Text>
                  <Text style={styles.statLbl}>Inside now</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{displayGym.capacity}</Text>
                  <Text style={styles.statLbl}>Capacity</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: Math.max(0, displayGym.capacity - displayGym.currentCount) > 0 ? C.green : C.red }]}>{Math.max(0, displayGym.capacity - displayGym.currentCount)}</Text>
                  <Text style={styles.statLbl}>Available</Text>
                </View>
                <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <MiniRing pct={displayPct} size={64} />
                    <Text style={styles.statLbl}>{`${displayPct}% full`}</Text>
                  </View>
              </View>

              <View style={{ marginTop: 16, marginBottom: 20 }}>
                <StatusPill label={getStatus(displayPct, displayIsFull).label} color={getStatus(displayPct, displayIsFull).color} />
              </View>

              <View style={styles.divider} />

              {/* Slot picker area */}
              <Text style={styles.sectionTitle}>Pick a time slot</Text>
              <Text style={styles.sectionSub}>Select when you want to work out today</Text>

              {slotsLoading
                ? <ActivityIndicator color={C.orange} style={{ marginVertical: 24 }} />
                : <SlotPicker slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} />
              }

              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  (!selectedSlot || bookingState === "loading") && { backgroundColor: "#1C2637", borderColor: C.border },
                  bookingState === "success" && { backgroundColor: C.green, borderColor: C.green },
                ]}
                onPress={() => book(displayGym)}
                disabled={!selectedSlot || bookingState === "success" || bookingState === "loading" || displayGym.isFull}
                activeOpacity={0.85}
              >
                {bookingState === "loading"
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.bookBtnTxt, !selectedSlot && { color: C.textSec }]}>{displayGym.isFull ? "Gym is full" : bookingState === "success" ? "✓ Booking Confirmed" : (!selectedSlot ? "Select a time slot above" : `Book ${selectedSlot}`)}</Text>
                }
              </TouchableOpacity>

              {bookingState === "error" && (
                <View style={styles.errBanner}>
                  <Text style={styles.errBannerTxt}>{bookingError ?? "Booking failed — please try again."}</Text>
                </View>
              )}
            </View>
          </>
        )}
  </View>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1, padding: 20 },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: C.bg },

  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  headerSub:   { fontSize: 12, color: C.textSec, letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: C.textPrimary },

  liveBadge:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.green + "20", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: C.green + "40" },
  liveDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  liveTxt:     { fontSize: 10, fontWeight: "700", color: C.green, letterSpacing: 1.5 },
  liveWrap:    { alignItems: "flex-end", justifyContent: "center" },
  bookingLock: { marginTop: 8, backgroundColor: "#122026", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#253a43" },
  bookingLockTxt: { color: C.textSec, fontSize: 12 },

  summaryRow:  { flexDirection: "row", gap: 10, marginBottom: 24 },
  summaryPill: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  summaryVal:  { fontSize: 22, fontWeight: "700" },
  summaryLbl:  { fontSize: 11, fontWeight: "600", marginTop: 2, letterSpacing: 0.5 },

  sectionHeader: { fontSize: 13, fontWeight: "700", color: C.textSec, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 4 },

  gymCard:        { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  gymCardLeft:    { flex: 1, marginRight: 12 },
  gymCardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  gymCardName:    { fontSize: 16, fontWeight: "700", color: C.textPrimary, flex: 1 },
  gymCardAddress: { fontSize: 12, color: C.textSec, marginBottom: 8 },
  gymCardStats:   { flexDirection: "row", alignItems: "center" },
  gymCardStat:    { fontSize: 13 },

  statusPill:  { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusTxt:   { fontSize: 12, fontWeight: "600" },

 
  statsBox:     { flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 18, paddingHorizontal: 8, alignItems: "center" },
  statItem:     { flex: 1, alignItems: "center" },
  statVal:      { fontSize: 22, fontWeight: "700", color: C.textPrimary },
  statLbl:      { fontSize: 11, color: C.textSec, marginTop: 3 },
  statDivider:  { width: 1, height: 40, backgroundColor: C.border },

  modalSafe:    { flex: 1, backgroundColor: C.bg },
  modalScroll:  { padding: 24, paddingBottom: 48 },
  modalHeader:  { flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 },
  closeBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  closeTxt:     { color: C.textSec, fontSize: 14, fontWeight: "600" },
  modalName:    { fontSize: 26, fontWeight: "700", color: C.textPrimary, marginBottom: 6 },
  modalAddress: { fontSize: 13, color: C.textSec, marginBottom: 20 },

  divider:      { height: 1, backgroundColor: C.border, marginVertical: 20 },

  sectionTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, marginBottom: 4 },
  sectionSub:   { fontSize: 13, color: C.textSec, marginBottom: 16 },

  slotGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  slotChip:         { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, alignItems: "center", minWidth: 72 },
  slotChipFull:     { borderColor: C.textMuted, backgroundColor: C.bg, opacity: 0.4 },
  slotChipSelected: { backgroundColor: C.orange, borderColor: C.orange },
  slotChipTxt:      { fontSize: 14, fontWeight: "600", color: C.textSec },
  slotFullTxt:      { fontSize: 10, color: C.textMuted, marginTop: 2 },

  fullBanner:       { backgroundColor: "#2D1010", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#7F2020" },
  fullBannerTitle:  { fontSize: 15, fontWeight: "700", color: "#FCA5A5", marginBottom: 6 },
  fullBannerSub:    { fontSize: 13, color: "#FDA4A4", lineHeight: 20 },

  bookBtn:      { borderRadius: 16, paddingVertical: 18, alignItems: "center", borderWidth: 1, backgroundColor: C.orange, borderColor: C.orange },
  bookBtnTxt:   { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.4 },

  errBanner:    { marginTop: 12, backgroundColor: "#3F1515", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#7F2020" },
  errBannerTxt: { color: "#FCA5A5", fontSize: 14, textAlign: "center" },
  errTitle:     { fontSize: 20, fontWeight: "700", color: C.textPrimary },
  errSub:       { fontSize: 14, color: C.textSec, marginTop: 6, textAlign: "center" },
  loadingTxt:   { marginTop: 14, color: C.textSec, fontSize: 15 },
});