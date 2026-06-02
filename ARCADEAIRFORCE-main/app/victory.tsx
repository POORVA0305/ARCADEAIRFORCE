import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function VictoryScreen() {
  const { score } = useLocalSearchParams<{ score?: string }>();
  const finalScore = parseInt(score ?? "0", 10);

  return (
    <ImageBackground
      source={require("../assets/backgrounds/menu_bg.png")}
      style={styles.background}
    >
      <View style={styles.overlay}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.title}>VICTORY!</Text>
        <Text style={styles.subtitle}>Boss Defeated!</Text>
        <Text style={styles.score}>⭐ {finalScore}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/menu")}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>MAIN MENU</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  trophy: { fontSize: 80, marginBottom: 4 },
  title: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#ffd700",
    textShadowColor: "#000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    marginBottom: 4,
  },
  subtitle: { fontSize: 22, color: "#ccc" },
  score: {
    fontSize: 52,
    fontWeight: "bold",
    color: "#ffd700",
    marginBottom: 52,
  },
  button: {
    width: 260,
    height: 70,
    backgroundColor: "#ff9800",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ff9800",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
