import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
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
const BOSS_SIZE = 130;
const BOSS_HEALTH = 20;
const BOSS_SPEED = 2; // px per frame, horizontal oscillation
const ESCORT_GAP = 12;

// 4 escort positions around the boss (diamond: top / bottom / left / right)
const ESCORT_OFFSETS = [
  { dx: BOSS_SIZE / 2 - ENEMY_SIZE / 2, dy: -(ENEMY_SIZE + ESCORT_GAP) }, // top
  { dx: BOSS_SIZE / 2 - ENEMY_SIZE / 2, dy: BOSS_SIZE + ESCORT_GAP },     // bottom
  { dx: -(ENEMY_SIZE + ESCORT_GAP),     dy: BOSS_SIZE / 2 - ENEMY_SIZE / 2 }, // left
  { dx: BOSS_SIZE + ESCORT_GAP,         dy: BOSS_SIZE / 2 - ENEMY_SIZE / 2 }, // right
];

type GameEnemy = Enemy & { type: "enemy1" | "enemy2" };
type Explosion = { id: number; x: number; y: number };
type BossState = { x: number; y: number; health: number; vx: number };

function playGameOverSound() {
  if (Platform.OS !== "web") return;
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx() as AudioContext;
    [
      { freq: 523, start: 0.0 },
      { freq: 415, start: 0.22 },
      { freq: 349, start: 0.44 },
      { freq: 262, start: 0.66 },
    ].forEach(({ freq, start }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.2);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.22);
    });
  } catch (_) {}
}

const PLANE_IMAGES: Record<string, ReturnType<typeof require>> = {
  green: require("../assets/aircraft/green_player.png"),
  red: require("../assets/aircraft/red_player.png"),
};

// Generic AABB helpers
function bulletHitsRect(
  b: Bullet,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  return (
    b.x < rx + rw &&
    b.x + BULLET_WIDTH > rx &&
    b.y < ry + rh &&
    b.y + BULLET_HEIGHT > ry
  );
}

function playerHitsRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  return (
    px < rx + rw &&
    px + PLAYER_SIZE > rx &&
    py < ry + rh &&
    py + PLAYER_SIZE > ry
  );
}

export default function Gameplay() {
  const params = useLocalSearchParams<{ plane?: string }>();
  const planeImage =
    PLANE_IMAGES[params.plane ?? ""] ??
    require("../assets/aircraft/player.png");

  // ── Game-logic refs (no stale-closure risk in intervals) ──
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<GameEnemy[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const enemySpeedRef = useRef(BASE_ENEMY_SPEED);
  const isGameOverRef = useRef(false);
  const isTouchingRef = useRef(false);
  const isPausedRef = useRef(false); // true while boss popup is visible
  const bossModeRef = useRef(false);
  const bossRef = useRef<BossState | null>(null);
  const escortHealthRef = useRef<number[]>([2, 2, 2, 2]);
  const bulletCounter = useRef(0);
  const enemyCounter = useRef(0);
  const expCounter = useRef(0);
  const playerPosRef = useRef({
    x: width / 2 - PLAYER_SIZE / 2,
    y: height - 180,
  });

  // ── Render state ──
  const [playerPosition, setPlayerPosition] = useState(playerPosRef.current);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<GameEnemy[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [showBossPopup, setShowBossPopup] = useState(false);
  const [bossMode, setBossMode] = useState(false);
  const [bossData, setBossData] = useState<{
    x: number;
    y: number;
    health: number;
  } | null>(null);
  const [escortHealth, setEscortHealth] = useState([2, 2, 2, 2]);
  const [nightBg, setNightBg] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  useEffect(() => {
    if (gameOver) {
      router.replace({ pathname: "/gameover", params: { score: scoreRef.current } });
    }
  }, [gameOver]);

  // Level progression every 30 s; after level 3 runs 30 s → boss popup
  useEffect(() => {
    const timer = setInterval(() => {
      if (isGameOverRef.current) return;
      const lv = levelRef.current;
      if (lv < 3) {
        const next = lv + 1;
        levelRef.current = next;
        enemySpeedRef.current = BASE_ENEMY_SPEED * next;
        setLevel(next);
      } else if (!bossModeRef.current) {
        isPausedRef.current = true;
        setShowBossPopup(true);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Auto-fire — only while touching
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGameOverRef.current || isPausedRef.current || !isTouchingRef.current) return;
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

  // Enemy spawn — stops in boss mode and while paused
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const spawnNext = () => {
      if (!isGameOverRef.current && !bossModeRef.current && !isPausedRef.current) {
        const lv = levelRef.current;
        const type: "enemy1" | "enemy2" =
          lv >= 2 && Math.random() < (lv >= 3 ? 0.55 : 0.4) ? "enemy2" : "enemy1";
        enemiesRef.current = [
          ...enemiesRef.current,
          {
            id: enemyCounter.current++,
            x: Math.random() * (width - ENEMY_SIZE),
            y: -ENEMY_SIZE,
            health: type === "enemy2" ? 2 : 1,
            type,
          },
        ];
      }
      const lv = levelRef.current;
      timeoutId = setTimeout(spawnNext, lv >= 3 ? 900 : lv >= 2 ? 1200 : 1500);
    };
    timeoutId = setTimeout(spawnNext, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  // ── Master game loop (~60 fps) ──
  useEffect(() => {
    const loop = setInterval(() => {
      if (isGameOverRef.current || isPausedRef.current) return;

      // Move all bullets upward
      let newBullets = bulletsRef.current
        .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
        .filter((b) => b.y > -BULLET_HEIGHT);

      const newExps: Explosion[] = [];

      // ════════════════ BOSS MODE ════════════════
      if (bossModeRef.current && bossRef.current) {
        const boss = bossRef.current;

        // Oscillate boss horizontally
        let newVx = boss.vx;
        let newBossX = boss.x + newVx * BOSS_SPEED;
        if (newBossX <= 0 || newBossX >= width - BOSS_SIZE) {
          newVx = -newVx;
          newBossX = Math.max(0, Math.min(newBossX, width - BOSS_SIZE));
        }
        bossRef.current = { ...boss, x: newBossX, vx: newVx };

        // Current escort absolute positions
        const escorts = ESCORT_OFFSETS.map((off, i) => ({
          x: newBossX + off.dx,
          y: boss.y + off.dy,
          health: escortHealthRef.current[i],
          index: i,
        }));

        // Bullets → escorts
        const hitBullets = new Set<number>();
        let escortChanged = false;
        for (const b of newBullets) {
          if (hitBullets.has(b.id)) continue;
          for (const esc of escorts) {
            if (esc.health <= 0) continue;
            if (bulletHitsRect(b, esc.x, esc.y, ENEMY_SIZE, ENEMY_SIZE)) {
              hitBullets.add(b.id);
              escortHealthRef.current[esc.index]--;
              escortChanged = true;
              if (escortHealthRef.current[esc.index] <= 0) {
                newExps.push({ id: expCounter.current++, x: esc.x, y: esc.y });
                scoreRef.current += 10;
              }
              break;
            }
          }
        }

        // Bullets → boss body
        for (const b of newBullets) {
          if (hitBullets.has(b.id)) continue;
          if (bulletHitsRect(b, newBossX, boss.y, BOSS_SIZE, BOSS_SIZE)) {
            hitBullets.add(b.id);
            bossRef.current.health--;
            if (bossRef.current.health <= 0) {
              // Boss defeated → victory
              newExps.push({
                id: expCounter.current++,
                x: newBossX + BOSS_SIZE / 2 - 25,
                y: boss.y,
              });
              isGameOverRef.current = true;
              setExplosions((prev) => [...prev, ...newExps]);
              setBossData(null);
              router.replace({
                pathname: "/victory",
                params: { score: scoreRef.current },
              });
              return;
            }
          }
        }

        newBullets = newBullets.filter((b) => !hitBullets.has(b.id));
        bulletsRef.current = newBullets;
        setBullets([...newBullets]);
        setBossData({ x: newBossX, y: boss.y, health: bossRef.current.health });
        if (escortChanged) setEscortHealth([...escortHealthRef.current]);

        // Player → boss collision
        const { x: px, y: py } = playerPosRef.current;
        if (playerHitsRect(px, py, newBossX, boss.y, BOSS_SIZE, BOSS_SIZE)) {
          livesRef.current = Math.max(0, livesRef.current - 1);
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            isGameOverRef.current = true;
            playGameOverSound();
            setGameOver(true);
            return;
          }
        }

        // Player → escort collision
        for (const esc of escorts) {
          if (esc.health <= 0) continue;
          if (playerHitsRect(px, py, esc.x, esc.y, ENEMY_SIZE, ENEMY_SIZE)) {
            livesRef.current = Math.max(0, livesRef.current - 1);
            escortHealthRef.current[esc.index] = 0;
            escortChanged = true;
            setLives(livesRef.current);
            setEscortHealth([...escortHealthRef.current]);
            if (livesRef.current <= 0) {
              isGameOverRef.current = true;
              playGameOverSound();
              setGameOver(true);
              return;
            }
            break;
          }
        }

        if (newExps.length > 0) {
          setScore(scoreRef.current);
          setExplosions((prev) => [...prev, ...newExps]);
          const ids = new Set(newExps.map((e) => e.id));
          setTimeout(() => {
            setExplosions((prev) => prev.filter((e) => !ids.has(e.id)));
          }, 500);
        }
        return;
      }
      // ════════════════ END BOSS MODE ════════════════

      // Regular mode: move enemies
      const speed = enemySpeedRef.current;
      let newEnemies = enemiesRef.current.map((e) => ({ ...e, y: e.y + speed }));

      // Bullet → enemy collision (damage-based; enemy2 needs 2 hits)
      const hitBullets = new Set<number>();
      const enemyDamage = new Map<number, number>();
      for (const b of newBullets) {
        if (hitBullets.has(b.id)) continue;
        for (const e of newEnemies) {
          if (bulletHitsRect(b, e.x, e.y, ENEMY_SIZE, ENEMY_SIZE)) {
            hitBullets.add(b.id);
            enemyDamage.set(e.id, (enemyDamage.get(e.id) ?? 0) + 1);
            break;
          }
        }
      }

      const destroyedIds = new Set<number>();
      newEnemies = newEnemies.map((e) => {
        const dmg = enemyDamage.get(e.id) ?? 0;
        if (dmg === 0) return e;
        const remaining = e.health - dmg;
        if (remaining <= 0) {
          destroyedIds.add(e.id);
          scoreRef.current += 10;
          newExps.push({ id: expCounter.current++, x: e.x, y: e.y });
          return e;
        }
        return { ...e, health: remaining };
      });

      // Player → enemy collision
      const { x: px, y: py } = playerPosRef.current;
      const playerHitIds = new Set<number>();
      for (const e of newEnemies) {
        if (destroyedIds.has(e.id)) continue;
        if (playerHitsRect(px, py, e.x, e.y, ENEMY_SIZE, ENEMY_SIZE)) {
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

      // Enemies that slipped past the bottom
      const escaped = newEnemies.filter(
        (e) =>
          e.y >= height + ENEMY_SIZE &&
          !destroyedIds.has(e.id) &&
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

      newBullets = newBullets.filter((b) => !hitBullets.has(b.id));
      newEnemies = newEnemies.filter(
        (e) =>
          !destroyedIds.has(e.id) &&
          !playerHitIds.has(e.id) &&
          e.y < height + ENEMY_SIZE
      );

      bulletsRef.current = newBullets;
      enemiesRef.current = newEnemies;
      setBullets([...newBullets]);
      setEnemies([...newEnemies]);

      if (newExps.length > 0 || enemyDamage.size > 0) setScore(scoreRef.current);
      if (newExps.length > 0) {
        setExplosions((prev) => [...prev, ...newExps]);
        const ids = new Set(newExps.map((e) => e.id));
        setTimeout(() => {
          setExplosions((prev) => prev.filter((e) => !ids.has(e.id)));
        }, 500);
      }
    }, 16);

    return () => clearInterval(loop);
  }, []);

  // ── Boss entry handlers ──
  const handleBossYes = () => {
    const startX = width / 2 - BOSS_SIZE / 2;
    const startY = 90;
    bossRef.current = { x: startX, y: startY, health: BOSS_HEALTH, vx: 1 };
    escortHealthRef.current = [2, 2, 2, 2];
    bossModeRef.current = true;
    isPausedRef.current = false;
    enemiesRef.current = [];
    setEnemies([]);
    setBossData({ x: startX, y: startY, health: BOSS_HEALTH });
    setEscortHealth([2, 2, 2, 2]);
    setBossMode(true);
    setNightBg(true);
    setShowBossPopup(false);
  };

  const handleBossNo = () => {
    isPausedRef.current = false;
    setShowBossPopup(false);
  };

  // ── Pause handlers ──
  const handlePause = () => {
    isPausedRef.current = true;
    isTouchingRef.current = false;
    setShowPauseMenu(true);
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setShowPauseMenu(false);
  };

  const handleQuit = () => {
    router.replace("/menu");
  };

  // ── Pan responder ──
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      isTouchingRef.current = true;
    },
    onPanResponderMove: (_, g) => {
      isTouchingRef.current = true;
      const x = Math.max(0, Math.min(g.moveX - PLAYER_SIZE / 2, width - PLAYER_SIZE));
      const y = Math.max(0, Math.min(g.moveY - PLAYER_SIZE / 2, height - PLAYER_SIZE));
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

  // Escort render positions (derived from bossData render state)
  const escortRenderPos = bossData
    ? ESCORT_OFFSETS.map((off, i) => ({
        x: bossData.x + off.dx,
        y: bossData.y + off.dy,
        alive: escortHealth[i] > 0,
        key: i,
      }))
    : [];

  return (
    <View style={styles.wrapper}>
      {/* ── Game canvas — PanResponder lives here only ── */}
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Background — switches to night for boss */}
        <Image
          source={
            nightBg
              ? require("../assets/backgrounds/night_ocean_bg.png")
              : require("../assets/backgrounds/ocean_bg.png")
          }
          style={styles.background}
        />

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

      {/* Regular enemies (hidden during boss fight) */}
      {!bossMode &&
        enemies.map((e) => (
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

      {/* Boss ship */}
      {bossMode && bossData && (
        <Image
          source={require("../assets/enemies/boss.png")}
          style={{
            position: "absolute",
            width: BOSS_SIZE,
            height: BOSS_SIZE,
            left: bossData.x,
            top: bossData.y,
          }}
        />
      )}

      {/* Boss escorts (enemy2, diamond formation) */}
      {bossMode &&
        bossData &&
        escortRenderPos.map(
          (esc) =>
            esc.alive && (
              <Image
                key={esc.key}
                source={require("../assets/enemies/enemy2.png")}
                style={{
                  position: "absolute",
                  width: ENEMY_SIZE,
                  height: ENEMY_SIZE,
                  left: esc.x,
                  top: esc.y,
                }}
              />
            )
        )}

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
        style={[styles.player, { left: playerPosition.x, top: playerPosition.y }]}
      />
      </View>
      {/* ── End game canvas ── */}

      {/* HUD — outside PanResponder so buttons receive touches */}
      <View style={styles.topBar}>
        <View style={styles.heartsRow}>
          {Array.from({ length: 3 }, (_, i) => (
            <Text key={i} style={styles.heart}>
              {i < lives ? "❤️" : "🖤"}
            </Text>
          ))}
        </View>
        <View
          style={[
            styles.levelBadge,
            { backgroundColor: bossMode ? "#8b0000" : levelColor },
          ]}
        >
          <Text style={styles.levelText}>{bossMode ? "BOSS" : `LV ${level}`}</Text>
        </View>
        <View style={styles.rightGroup}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={handlePause}
            activeOpacity={0.8}
          >
            <Text style={styles.pauseBtnText}>⏸</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Boss health bar */}
      {bossMode && bossData && (
        <View style={styles.bossBarContainer}>
          <Text style={styles.bossBarLabel}>👾 BOSS HP</Text>
          <View style={styles.bossBarTrack}>
            <View
              style={[
                styles.bossBarFill,
                { width: `${(bossData.health / BOSS_HEALTH) * 100}%` as any },
              ]}
            />
          </View>
        </View>
      )}

      {/* Pause menu */}
      <Modal visible={showPauseMenu} transparent animationType="fade">
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseBox}>
            <Text style={styles.pauseTitle}>⏸  PAUSED</Text>
            <TouchableOpacity
              style={[styles.pauseMenuBtn, styles.resumeBtn]}
              onPress={handleResume}
              activeOpacity={0.85}
            >
              <Text style={styles.pauseMenuBtnText}>▶  RESUME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pauseMenuBtn, styles.quitBtn]}
              onPress={handleQuit}
              activeOpacity={0.85}
            >
              <Text style={styles.pauseMenuBtnText}>✕  QUIT TO MENU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Boss territory popup */}
      <Modal visible={showBossPopup} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupBox}>
            <Text style={styles.popupIcon}>👾</Text>
            <Text style={styles.popupTitle}>WARNING!</Text>
            <Text style={styles.popupMessage}>
              You are entering{"\n"}Boss Territory!
            </Text>
            <Text style={styles.popupSub}>
              The boss is guarded by 4 enemy drones.{"\n"}Do you dare to proceed?
            </Text>
            <View style={styles.popupButtons}>
              <TouchableOpacity
                style={[styles.popupBtn, styles.popupBtnYes]}
                onPress={handleBossYes}
                activeOpacity={0.85}
              >
                <Text style={styles.popupBtnText}>YES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupBtn, styles.popupBtnNo]}
                onPress={handleBossNo}
                activeOpacity={0.85}
              >
                <Text style={styles.popupBtnText}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
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
  heartsRow: { flexDirection: "row", gap: 4 },
  heart: { fontSize: 24 },
  levelBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 },
  levelText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  rightGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  pauseBtn: {
    width: 38,
    height: 38,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseBtnText: { fontSize: 18, color: "#fff" },
  pauseOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseBox: {
    width: width * 0.75,
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 32,
    alignItems: "center",
    gap: 14,
  },
  pauseTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 3,
    marginBottom: 6,
  },
  pauseMenuBtn: {
    width: "100%" as any,
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resumeBtn: { backgroundColor: "#ff9800" },
  quitBtn: { backgroundColor: "#555" },
  pauseMenuBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  bossBarContainer: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    zIndex: 10,
    alignItems: "center",
  },
  bossBarLabel: {
    color: "#ff4444",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 4,
  },
  bossBarTrack: {
    width: "100%",
    height: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    overflow: "hidden",
  },
  bossBarFill: {
    height: "100%",
    backgroundColor: "#ff4444",
    borderRadius: 6,
  },

  player: { position: "absolute", width: PLAYER_SIZE, height: PLAYER_SIZE },

  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupBox: {
    width: width * 0.82,
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ff4444",
    padding: 28,
    alignItems: "center",
  },
  popupIcon: { fontSize: 56, marginBottom: 8 },
  popupTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#ff4444",
    marginBottom: 12,
    letterSpacing: 2,
  },
  popupMessage: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 28,
  },
  popupSub: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  popupButtons: { flexDirection: "row", gap: 16 },
  popupBtn: {
    width: 110,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  popupBtnYes: { backgroundColor: "#ff4444" },
  popupBtnNo: { backgroundColor: "#555" },
  popupBtnText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
});
