import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function GameOverScreen() {
  const { score } = useLocalSearchParams<{ score?: string }>();
  const finalScore = parseInt(score ?? "0", 10);

  return (
    <ImageBackground
      source={require("../assets/backgrounds/menu_bg.png")}
      style={styles.background}
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>GAME OVER</Text>

        <Text style={styles.subtitle}>Final Score</Text>
        <Text style={styles.score}>⭐ {finalScore}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/menu")}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>PLAY AGAIN</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#ff4444",
    textShadowColor: "#000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: "#aaa",
  },
  score: {
    fontSize: 52,
    fontWeight: "bold",
    color: "#ffd700",
    marginBottom: 48,
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
