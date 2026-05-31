import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function Gameplay() {
  return (
    <View style={styles.container}>
      
      {/* Background */}
      <Image
        source={require("../assets/backgrounds/ocean_bg.png")}
        style={styles.background}
      />

      <View style={styles.topBar}>
        <Text style={styles.text}>❤️ 100</Text>
        <Text style={styles.text}>⭐ 0</Text>
      </View>
      {/* Player Aircraft */}
      <Image
        source={require("../assets/aircraft/player.png")}
        style={styles.player}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  background: {
    position: "absolute",
    width: width,
    height: height,
    resizeMode: "cover",
  },

  topBar: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  text: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },

  player: {
    width: 100,
    height: 100,
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
  },
});