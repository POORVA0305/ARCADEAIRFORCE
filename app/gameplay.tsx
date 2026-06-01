import { Enemy } from "../src/game/entities/Enemy";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";


import {
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Bullet } from "../src/game/entities/Bullet";

const { width, height } = Dimensions.get("window");

const PLAYER_SIZE = 100;
const BULLET_WIDTH = 20;
const BULLET_HEIGHT = 40;
const ENEMY_SIZE = 80;
const ENEMY_SPEED = 4;

export default function Gameplay() {
  const [playerPosition, setPlayerPosition] = useState({
    x: width / 2 - PLAYER_SIZE / 2,
    y: height - 180,
  });

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);

  const enemyCounter = useRef(0);
  const playerPositionRef = useRef(playerPosition);

  const bulletCounter = useRef(0);
  useEffect(() => {
  playerPositionRef.current = playerPosition;
}, [playerPosition]);
  
  // Auto Fire
useEffect(() => {
  const fireInterval = setInterval(() => {
    const currentPosition =
      playerPositionRef.current;

    const newBullet: Bullet = {
      id: bulletCounter.current++,

      x:
        currentPosition.x +
        PLAYER_SIZE / 2 -
        BULLET_WIDTH / 2,

      y: currentPosition.y,
    };

    setBullets((prev) => [
      ...prev,
      newBullet,
    ]);
  }, 200);

  return () => clearInterval(fireInterval);
}, []);

useEffect(() => {
  const spawnInterval = setInterval(() => {
    const newEnemy: Enemy = {
      id: enemyCounter.current++,

      x: Math.random() * (width - ENEMY_SIZE),

      y: -ENEMY_SIZE,

      health: 1,
    };

    setEnemies((prev) => [
      ...prev,
      newEnemy,
    ]);
  }, 1500);

  return () =>
    clearInterval(spawnInterval);
}, []);

  // Bullet Movement
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setBullets((prev) =>
        prev
          .map((bullet) => ({
            ...bullet,
            y: bullet.y - 12,
          }))
          .filter(
            (bullet) =>
              bullet.y > -BULLET_HEIGHT
          )
      );
    }, 16);

    return () => clearInterval(moveInterval);
  }, []);

  useEffect(() => {
  const moveEnemies = setInterval(() => {
    setEnemies((prev) =>
      prev
        .map((enemy) => ({
          ...enemy,
          y: enemy.y + ENEMY_SPEED,
        }))
        .filter(
          (enemy) =>
            enemy.y < height + ENEMY_SIZE
        )
    );
  }, 16);

  return () =>
    clearInterval(moveEnemies);
}, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderMove: (_, gesture) => {
      let x = gesture.moveX - PLAYER_SIZE / 2;
      let y = gesture.moveY - PLAYER_SIZE / 2;

      x = Math.max(
        0,
        Math.min(x, width - PLAYER_SIZE)
      );

      y = Math.max(
        0,
        Math.min(y, height - PLAYER_SIZE)
      );

      setPlayerPosition({
        x,
        y,
      });
    },
  });

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
    >
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

      {/* Bullets */}
      {bullets.map((bullet) => (
        <Image
          key={bullet.id}
          source={require("../assets/bullets/bullet.png")}
          style={{
            position: "absolute",
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            left: bullet.x,
            top: bullet.y,
          }}
        />
      ))}

      {/* Enemies */}
  {enemies.map((enemy) => (
  <Image
    key={enemy.id}
    source={require("../assets/enemies/enemy1.png")}
    style={{
      position: "absolute",
      width: ENEMY_SIZE,
      height: ENEMY_SIZE,
      left: enemy.x,
      top: enemy.y,
    }}
  />
  ))}

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
    width,
    height,
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