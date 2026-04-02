import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CapacityRingProps {
  percentFull: number; 
  size?: number;
}

function getColor(pct: number): string {
  if (pct < 50) return "#22c55e"; 
  if (pct < 80) return "#f59e0b"; 
  return "#ef4444";               
}

export const CapacityRing: React.FC<CapacityRingProps> = ({ percentFull, size = 160 }) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentFull / 100) * circumference;
  const color = getColor(percentFull);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
       
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none"
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
        <Text style={[styles.percent, { color }]}>{percentFull}%</Text>
        <Text style={styles.label}>Full</Text>
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