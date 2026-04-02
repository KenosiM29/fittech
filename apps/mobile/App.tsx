import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { GymCapacityScreen } from "./src/screens/GymCapacityScreen";

export default function App() {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#0A0F1E" }}><ActivityIndicator /></View>;
  return <GymCapacityScreen />;
}


