import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CapacityRingProps {
  percentFull: number; 
  size?: number;
}

function getColor(pct: number): string {
  if (pct < 50) return "#16A34A";
  if (pct < 80) return "#B45309";
  return "#DC2626";
}

export const CapacityRing: React.FC<CapacityRingProps> = ({ percentFull, size = 160 }) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(100, Math.round(percentFull)));
  const strokeDash = (clamped / 100) * circumference;
  const color = getColor(clamped);

  return (
    <View style={[styles.container, { backgroundColor: '#111827', borderRadius: size / 2, padding: 8 }]}> 
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#374151" strokeWidth={strokeWidth} fill="none"
        />
        
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          rotation="-90" origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      
      <View style={[StyleSheet.absoluteFillObject, styles.labelContainer]}>
  <Text style={[styles.percent, { color: clamped >= 100 ? '#DC2626' : '#FFFFFF' }]}>{clamped}%</Text>
  <Text style={[styles.label, { color: '#E5E7EB' }]}>{`${clamped}% full`}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  labelContainer: { alignItems: "center", justifyContent: "center" },
  percent: { fontSize: 32, fontWeight: "700" },
  label: { fontSize: 13, color: "#6b7280", marginTop: 2 },
});