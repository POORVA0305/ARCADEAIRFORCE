import React, { useState } from "react";
import {
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const PLAYER_SIZE = 100;

export default function Gameplay() {
  const [playerPosition, setPlayerPosition] = useState({
    x: width / 2 - PLAYER_SIZE / 2,
    y: height - 180,
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderMove: (_, gesture) => {
      let x = gesture.moveX - PLAYER_SIZE / 2;
      let y = gesture.moveY - PLAYER_SIZE / 2;

      // Keep plane inside screen
      x = Math.max(0, Math.min(x, width - PLAYER_SIZE));
      y = Math.max(0, Math.min(y, height - PLAYER_SIZE));

      setPlayerPosition({
        x,
        y,
      });
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Background */}
      <Image
        source={require("../assets/backgrounds/ocean_bg.png")}
        style={styles.background}
      />

      {/* HUD */}
      <View style={styles.topBar}>
        <Text style={styles.text}>❤️ 100</Text>
        <Text style={styles.text}>⭐ 0</Text>
      </View>

      {/* Player Aircraft */}
      <Image
        source={require("../assets/aircraft/player.png")}
        style={[
          styles.player,
          {
            left: playerPosition.x,
            top: playerPosition.y,
          },
        ]}
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
    zIndex: 10,
  },

  text: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },

  player: {
    position: "absolute",
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
});