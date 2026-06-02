import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
} from "react-native";
import { router } from "expo-router";

const PLANES = [
  {
    key: "green",
    label: "Green Eagle",
    source: require("../assets/aircraft/green_player.png"),
  },
  {
    key: "red",
    label: "Red Falcon",
    source: require("../assets/aircraft/red_player.png"),
  },
];

export default function Menu() {
  const [selectedPlane, setSelectedPlane] = useState("green");

  return (
    <ImageBackground
      source={require("../assets/backgrounds/menu_bg.png")}
      style={styles.background}
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>ARCADE AIR FORCE</Text>

        <Text style={styles.sectionTitle}>SELECT YOUR PLANE</Text>

        <View style={styles.planeRow}>
          {PLANES.map((plane) => (
            <TouchableOpacity
              key={plane.key}
              style={[
                styles.planeCard,
                selectedPlane === plane.key && styles.planeCardSelected,
              ]}
              onPress={() => setSelectedPlane(plane.key)}
              activeOpacity={0.8}
            >
              <Image source={plane.source} style={styles.planeImage} />
              <Text style={styles.planeLabel}>{plane.label}</Text>
              {selectedPlane === plane.key && (
                <Text style={styles.checkmark}>✓ Selected</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() =>
            router.push({
              pathname: "/gameplay",
              params: { plane: selectedPlane },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>START GAME</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 100,
  },
  title: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 44,
    textAlign: "center",
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#ffd700",
    fontWeight: "bold",
    marginBottom: 20,
    letterSpacing: 3,
  },
  planeRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 52,
  },
  planeCard: {
    width: 130,
    height: 160,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  planeCardSelected: {
    borderColor: "#ffd700",
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  planeImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    marginBottom: 8,
  },
  planeLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  checkmark: {
    color: "#ffd700",
    fontSize: 12,
    fontWeight: "bold",
  },
  playButton: {
    width: 280,
    height: 80,
    backgroundColor: "#ff9800",
    borderRadius: 15,
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
