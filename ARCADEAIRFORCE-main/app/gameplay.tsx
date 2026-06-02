import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Bullet } from "../src/game/entities/Bullet";
import { Enemy } from "../src/game/entities/Enemy";

const { width, height } = Dimensions.get("window");

const PLAYER_SIZE = 100;
const BULLET_WIDTH = 20;
const BULLET_HEIGHT = 40;
const ENEMY_SIZE = 80;
const BASE_ENEMY_SPEED = 4;
const BULLET_SPEED = 12;
const FIRE_INTERVAL = 200;

type GameEnemy = Enemy & { type: "enemy1" | "enemy2" };
type Explosion = { id: number; x: number; y: number };

// Synthesised descending game-over jingle via Web Audio API (web only)
function playGameOverSound() {
  if (Platform.OS !== "web") return;
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx() as AudioContext;
    const notes = [
      { freq: 523, start: 0.0 },
      { freq: 415, start: 0.22 },
      { freq: 349, start: 0.44 },
      { freq: 262, start: 0.66 },
    ];
    notes.forEach(({ freq, start }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + 0.2
      );
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.22);
    });
  } catch (_) {
    // Audio not available in this environment
  }
}

const PLANE_IMAGES: Record<string, ReturnType<typeof require>> = {
  green: require("../assets/aircraft/green_player.png"),
  red: require("../assets/aircraft/red_player.png"),
};

export default function Gameplay() {
  const params = useLocalSearchParams<{ plane?: string }>();
  const planeImage =
    PLANE_IMAGES[params.plane ?? ""] ??
    require("../assets/aircraft/player.png");

  // --- Game logic refs (avoid stale closures in intervals) ---
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<GameEnemy[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const enemySpeedRef = useRef(BASE_ENEMY_SPEED);
  const isGameOverRef = useRef(false);
  const isTouchingRef = useRef(false);
  const bulletCounter = useRef(0);
  const enemyCounter = useRef(0);
  const expCounter = useRef(0);
  const playerPosRef = useRef({
    x: width / 2 - PLAYER_SIZE / 2,
    y: height - 180,
  });

  // --- Render state ---
  const [playerPosition, setPlayerPosition] = useState(playerPosRef.current);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<GameEnemy[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  // Navigate to game over screen when lives hit 0
  useEffect(() => {
    if (gameOver) {
      router.replace({
        pathname: "/gameover",
        params: { score: scoreRef.current },
      });
    }
  }, [gameOver]);

  // AABB collision check between a bullet and an enemy
  const checkCollision = (b: Bullet, e: GameEnemy) =>
    b.x < e.x + ENEMY_SIZE &&
    b.x + BULLET_WIDTH > e.x &&
    b.y < e.y + ENEMY_SIZE &&
    b.y + BULLET_HEIGHT > e.y;

  // Level progression: advance every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (isGameOverRef.current) return;
      const currentLevel = levelRef.current;
      if (currentLevel < 3) {
        const nextLevel = currentLevel + 1;
        levelRef.current = nextLevel;
        // Speed doubles per level: L1=4, L2=8, L3=12
        enemySpeedRef.current = BASE_ENEMY_SPEED * nextLevel;
        setLevel(nextLevel);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Auto-fire: spawn a bullet every 200ms, only while the player is touching the plane
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGameOverRef.current || !isTouchingRef.current) return;
      const pos = playerPosRef.current;
      bulletsRef.current = [
        ...bulletsRef.current,
        {
          id: bulletCounter.current++,
          x: pos.x + PLAYER_SIZE / 2 - BULLET_WIDTH / 2,
          y: pos.y,
        },
      ];
    }, FIRE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Enemy spawn: interval shrinks each level, enemy2 appears from level 2
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const spawnNext = () => {
      if (!isGameOverRef.current) {
        const lv = levelRef.current;
        // Level 2: 40% enemy2, Level 3: 55% enemy2
        const type: "enemy1" | "enemy2" =
          lv >= 2 && Math.random() < (lv >= 3 ? 0.55 : 0.4)
            ? "enemy2"
            : "enemy1";
        enemiesRef.current = [
          ...enemiesRef.current,
          {
            id: enemyCounter.current++,
            x: Math.random() * (width - ENEMY_SIZE),
            y: -ENEMY_SIZE,
            // enemy2 takes 2 bullets to destroy
            health: type === "enemy2" ? 2 : 1,
            type,
          },
        ];
      }
      const lv = levelRef.current;
      const delay = lv >= 3 ? 900 : lv >= 2 ? 1200 : 1500;
      timeoutId = setTimeout(spawnNext, delay);
    };

    timeoutId = setTimeout(spawnNext, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  // Master game loop (~60 fps): move, collide, score, life loss
  useEffect(() => {
    const loop = setInterval(() => {
      if (isGameOverRef.current) return;

      const speed = enemySpeedRef.current;

      // Move bullets upward; discard those off-screen
      let newBullets = bulletsRef.current
        .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
        .filter((b) => b.y > -BULLET_HEIGHT);

      // Move enemies downward
      let newEnemies = enemiesRef.current.map((e) => ({
        ...e,
        y: e.y + speed,
      }));

      // Collision detection — damage based (enemy2 needs 2 hits)
      const hitBullets = new Set<number>();
      // enemyId → bullets that hit it this frame
      const enemyDamage = new Map<number, number>();
      const newExps: Explosion[] = [];

      for (const b of newBullets) {
        if (hitBullets.has(b.id)) continue;
        for (const e of newEnemies) {
          if (checkCollision(b, e)) {
            hitBullets.add(b.id);
            enemyDamage.set(e.id, (enemyDamage.get(e.id) ?? 0) + 1);
            break;
          }
        }
      }

      // Apply damage; only destroy when health reaches 0
      const destroyedEnemyIds = new Set<number>();
      newEnemies = newEnemies.map((e) => {
        const dmg = enemyDamage.get(e.id) ?? 0;
        if (dmg === 0) return e;
        const remaining = e.health - dmg;
        if (remaining <= 0) {
          destroyedEnemyIds.add(e.id);
          scoreRef.current += 10;
          newExps.push({ id: expCounter.current++, x: e.x, y: e.y });
          return e; // filtered out below
        }
        return { ...e, health: remaining };
      });

      // Player-enemy collision: enemy body touches player → lose 1 life, remove enemy
      const { x: px, y: py } = playerPosRef.current;
      const playerHitIds = new Set<number>();

      for (const e of newEnemies) {
        if (destroyedEnemyIds.has(e.id)) continue;
        if (
          px < e.x + ENEMY_SIZE &&
          px + PLAYER_SIZE > e.x &&
          py < e.y + ENEMY_SIZE &&
          py + PLAYER_SIZE > e.y
        ) {
          playerHitIds.add(e.id);
        }
      }

      if (playerHitIds.size > 0) {
        livesRef.current = Math.max(0, livesRef.current - playerHitIds.size);
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          isGameOverRef.current = true;
          playGameOverSound();
          setGameOver(true);
          return;
        }
      }

      // Enemies that slipped past the bottom (not destroyed/hit) cost a life each
      const escaped = newEnemies.filter(
        (e) =>
          e.y >= height + ENEMY_SIZE &&
          !destroyedEnemyIds.has(e.id) &&
          !playerHitIds.has(e.id)
      );

      if (escaped.length > 0) {
        livesRef.current = Math.max(0, livesRef.current - escaped.length);
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          isGameOverRef.current = true;
          playGameOverSound();
          setGameOver(true);
          return;
        }
      }

      // Remove destroyed / player-hit / escaped entities
      newBullets = newBullets.filter((b) => !hitBullets.has(b.id));
      newEnemies = newEnemies.filter(
        (e) =>
          !destroyedEnemyIds.has(e.id) &&
          !playerHitIds.has(e.id) &&
          e.y < height + ENEMY_SIZE
      );

      bulletsRef.current = newBullets;
      enemiesRef.current = newEnemies;

      setBullets([...newBullets]);
      setEnemies([...newEnemies]);

      if (newExps.length > 0 || enemyDamage.size > 0) {
        setScore(scoreRef.current);
      }
      if (newExps.length > 0) {
        setExplosions((prev) => [...prev, ...newExps]);
        // Remove each explosion after 500ms
        const ids = new Set(newExps.map((e) => e.id));
        setTimeout(() => {
          setExplosions((prev) => prev.filter((e) => !ids.has(e.id)));
        }, 500);
      }
    }, 16);

    return () => clearInterval(loop);
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      isTouchingRef.current = true;
    },
    onPanResponderMove: (_, g) => {
      isTouchingRef.current = true;
      const x = Math.max(
        0,
        Math.min(g.moveX - PLAYER_SIZE / 2, width - PLAYER_SIZE)
      );
      const y = Math.max(
        0,
        Math.min(g.moveY - PLAYER_SIZE / 2, height - PLAYER_SIZE)
      );
      playerPosRef.current = { x, y };
      setPlayerPosition({ x, y });
    },
    onPanResponderRelease: () => {
      isTouchingRef.current = false;
    },
    onPanResponderTerminate: () => {
      isTouchingRef.current = false;
    },
  });

  const levelColor =
    level === 3 ? "#ff4444" : level === 2 ? "#ff9800" : "#4caf50";

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Background */}
      <Image
        source={require("../assets/backgrounds/ocean_bg.png")}
        style={styles.background}
      />

      {/* HUD */}
      <View style={styles.topBar}>
        <View style={styles.heartsRow}>
          {Array.from({ length: 3 }, (_, i) => (
            <Text key={i} style={styles.heart}>
              {i < lives ? "❤️" : "🖤"}
            </Text>
          ))}
        </View>
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.levelText}>LV {level}</Text>
        </View>
        <Text style={styles.scoreText}>⭐ {score}</Text>
      </View>

      {/* Bullets */}
      {bullets.map((b) => (
        <Image
          key={b.id}
          source={require("../assets/bullets/bullet.png")}
          style={{
            position: "absolute",
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            left: b.x,
            top: b.y,
          }}
        />
      ))}

      {/* Enemies */}
      {enemies.map((e) => (
        <Image
          key={e.id}
          source={
            e.type === "enemy2"
              ? require("../assets/enemies/enemy2.png")
              : require("../assets/enemies/enemy1.png")
          }
          style={{
            position: "absolute",
            width: ENEMY_SIZE,
            height: ENEMY_SIZE,
            left: e.x,
            top: e.y,
          }}
        />
      ))}

      {/* Explosions */}
      {explosions.map((exp) => (
        <Text
          key={exp.id}
          style={{
            position: "absolute",
            fontSize: 52,
            left: exp.x,
            top: exp.y,
            zIndex: 20,
          }}
        >
          💥
        </Text>
      ))}

      {/* Player */}
      <Image
        source={planeImage}
        style={[
          styles.player,
          { left: playerPosition.x, top: playerPosition.y },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: "absolute", width, height },
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  heartsRow: {
    flexDirection: "row",
    gap: 4,
  },
  heart: { fontSize: 24 },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  levelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scoreText: {
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
