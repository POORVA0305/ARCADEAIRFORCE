import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { router } from "expo-router";

export default function Menu() {
  return (
    <ImageBackground
      source={require("../assets/backgrounds/menu_bg.png")}
      style={styles.background}
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>
          ARCADE AIR FORCE
        </Text>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => router.push("/gameplay")}
        >
          <Text style={styles.buttonText}>
            START GAME
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingTop: 180,
},

  title: {
  fontSize: 42,
  fontWeight: "bold",
  color: "#fff",
  marginBottom: 120,
},

  playButton: {
    width: 300,
    height: 90,
    backgroundColor: "#ff9800",
    borderRadius: 15,

    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "bold",
  },
});